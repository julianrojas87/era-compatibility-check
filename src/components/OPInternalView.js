import React, { useState, useEffect } from "react";
import { Modal, Alert } from "rsuite";
import { RDFS, ERA } from "../utils/NameSpaces";
import Utils from "../utils/Utils";
import { Graph } from "react-d3-graph";


export const OPInternalView = ({
    internalViewNode,
    internalViewPath,
    pathColor,
    show,
    toggleInternalView,
    graphStore
}) => {
    const [op, setOp] = useState(null);
    const [display, setDisplay] = useState(false);
    const [schema, setSchema] = useState(null);

    // The graph global configuration
    const schemaConfig = {
        width: Utils.vw(70),
        height: Utils.vh(70),
        directed: true,
        nodeHighlightBehavior: false,
        staticGraph: true,
        node: {
            size: 500,
            color: "#aaaaaa",
            labelProperty: "label"
        },
        link: {
            renderLabel: true,
            markerWidth: 4,
            markerHeight: 4
        },
    };

    const isRouteLink = inl => {
        if (inl[ERA.startPort]) {
            if (internalViewPath.nodes.includes(inl[ERA.startPort]) && internalViewPath.nodes.includes(inl[ERA.endPort])) {
                return true;
            } else {
                return false;
            }
        } else {
            if (internalViewPath.nodes.includes(new URL(inl.source).toString()) 
                && internalViewPath.nodes.includes(new URL(inl.target).toString())) {
                return true;
            } else {
                return false;
            }
        }
    }

    const isNodeClicked = nodeId => {
        for (const l of schema.links) {
            if (l.source === nodeId && !isRouteLink(l)) return true;
        }

        return false;
    }

    const buildSchema = (ivn, ivp) => {
        const inNPs = [];
        const outNPs = [];
        const routeLinks = [];

        // Retrieve all node ports for this OP
        const nodePorts = Utils.getAllNodePorts(graphStore, ivn[ERA.hasAbstraction]);
        for (const np of nodePorts) {
            const node = {
                id: decodeURIComponent(np),
                label: <a href={np} target='_blank'>{np.substring(np.indexOf('#') + 1)}</a>
            };

            // Check if this is a NodePort of the route
            if (ivp.nodes.includes(np)) {
                node.color = pathColor;

                // Add route link to the diagram
                const index = ivp.nodes.indexOf(np);
                const inl = ivp.edges[index];

                if (!Utils.isMicroLink(inl, graphStore)) {
                    routeLinks.push({
                        source: decodeURIComponent(ivp.nodes[index]),
                        target: decodeURIComponent(ivp.nodes[index + 1]),
                        label: <a href={inl} target='_blank'>{inl.substring(inl.indexOf('#') + 1)}</a>,
                        color: pathColor,
                        strokeWidth: 2,
                        type: "CURVE_SMOOTH"
                    });
                }
            }

            // Check if NodePort is incoming or outgoing
            if (Utils.isNodePortIncoming(np, graphStore)) {
                inNPs.push(node);
            } else {
                outNPs.push(node);
            }
        }

        // Assign coordinates to Node Ports and create Internal Node Links
        let Y = 100;
        inNPs.forEach(np => {
            np.labelPosition = "left";
            np.x = Utils.vw(25);
            np.y = Y;
            Y += 70;
        });

        Y = 100;
        outNPs.forEach(np => {
            np.labelPosition = "right";
            np.x = Utils.vw(45);
            np.y = Y;
            Y += 70;
        });

        // Hack to manipulate the DOM directly.
        // We have to wrap the state setter in a promise to make sure the DOM is completely rendered
        // and then proceed to directly manipulate it.
        Promise.resolve()
            .then(() => { setSchema({ nodes: [...inNPs, ...outNPs], links: [...routeLinks] }) })
            .then(() => {
                // Add Operational Point frame
                const svgns = "http://www.w3.org/2000/svg";
                const frame = document.createElementNS(svgns, "rect");
                frame.setAttribute("x", Utils.vw(25));
                frame.setAttribute("y", 70);
                frame.setAttribute("height", Math.max(inNPs.length, outNPs.length) * 70);
                frame.setAttribute("width", Utils.vw(45) - Utils.vw(25));
                frame.setAttribute("rx", 20);
                frame.setAttribute("style", "stroke: #0c3d78; stroke-width: 4; fill: transparent;");
                const zoomable = document.getElementById("graph-id-graph-container-zoomable");
                zoomable.insertBefore(frame, zoomable.firstChild);

                // Fix arrow heads
                routeLinks.forEach(routeLink => {
                    // Create a new <marker> with the same color of the route link
                    const marker = document.getElementById("marker-small").cloneNode(true);
                    marker.setAttribute("id", "marker-route");
                    marker.setAttribute("fill", pathColor);
                    document.querySelector("#graph-id-graph-wrapper svg defs").appendChild(marker);

                    // Change route link reference to the new arrow head (<marker>)
                    const routePath = document.getElementById(`${routeLink.source},${routeLink.target}`);
                    routePath.setAttribute("marker-end", "url(#marker-route)");
                    // Add CSS class for dashed animation
                    routePath.classList.add("route-link");
                });
            });
    }

    const onClickNode = nodeId => {
        if (isNodeClicked(nodeId)) {
            // Remove all links starting from this node except for the route link
            setSchema(prevSchema => {
                return { nodes: prevSchema.nodes, links: prevSchema.links.filter(l => isRouteLink(l) || l.source !== nodeId) };
            });
        } else {
            // Add all the routes starting from this node
            const links = [];
            const inls = Utils.getAllInternalNodeLinksFromNodePort(new URL(nodeId).toString(), graphStore);

            if (inls.length > 0) {
                for (const inl of inls) {
                    if (!isRouteLink(inl)) {
                        links.push({
                            source: decodeURIComponent(nodeId),
                            target: decodeURIComponent(inl[ERA.endPort]),
                            label: <a href={inl["@id"]} target='_blank'>{inl["@id"].substring(inl["@id"].indexOf('#') + 1)}</a>,
                            type: "CURVE_SMOOTH"
                        });
                    }
                }
                setSchema(prevSchema => {
                    return { nodes: prevSchema.nodes, links: [...prevSchema.links, ...links] };
                });
            } else {
                Alert.warning(`There are no Internal Node Links starting from this Node Port`, 3000);
            }
        }
    }

    useEffect(() => {
        setOp(internalViewNode);
        setDisplay(show);
        // New OP has been selected, proceed to build its diagram
        if (internalViewNode) {
            buildSchema(internalViewNode, internalViewPath);
        }
    }, [internalViewNode, show]);

    if (op && schema) {
        return <div className="modal-container">
            <Modal overflow size="lg" show={display} onHide={() => { toggleInternalView(false) }}>
                <Modal.Header>
                    <Modal.Title>Internal connectivity of {op[RDFS.label]} ({op[ERA.uopid]})</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Graph
                        id="graph-id"
                        data={schema}
                        config={schemaConfig}
                        onClickNode={onClickNode}
                    />
                </Modal.Body>
            </Modal>
        </div>
    }

    return null;
}