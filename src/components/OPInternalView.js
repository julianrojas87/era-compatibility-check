import React, { useState, useEffect } from "react";
import { Modal } from "rsuite";
import { RDFS, ERA } from "../utils/NameSpaces";
import { FACETED_BASE_URI } from "../config/config";
import Utils from "../utils/Utils";
import {
    opBaseNodeDiagram,
    nodeLabelStyle,
    opNormalNodeDiagram,
    opRouteNodeDiagram
} from '../styles/Styles';

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
        nodeHighlightBehavior: true,
        staticGraph: true,
        node: {
            color: "lightgreen",
            size: 500,
            highlightStrokeColor: "blue",
            labelProperty: "label"
        },
        link: {
            highlightColor: "#18ab10",
        },
    };

    const buildSchema = (ivn, ivp) => {
        const inNPs = [];
        const outNPs = [];
        const links = [];

        // Retrieve all node ports for this OP
        const nodePorts = Utils.getAllNodePorts(graphStore, ivn[ERA.hasAbstraction]);
        let firstRouteNP = null;

        for (const np of nodePorts) {
            // Check if this is a NodePort of the route
            if (ivp.nodes.includes(np)) {
                if (firstRouteNP) {
                    const inNode = {
                        color: pathColor
                    }
                    const outNode = {
                        color: pathColor
                    }
                    if (ivp.nodes.indexOf(np) > ivp.nodes.indexOf(firstRouteNP)) {
                        // np is the outgoing NodePort
                        outNode.id = np;
                        outNode.label = <a href={FACETED_BASE_URI + np} target='_blank'>{np.substring(np.indexOf('#') + 1)}</a>;
                        inNode.id = firstRouteNP;
                        inNode.label = <a href={FACETED_BASE_URI + firstRouteNP} target='_blank'>{firstRouteNP.substring(firstRouteNP.indexOf('#') + 1)}</a>;
                    } else {
                        // np in the incoming NodePort
                        inNode.id = np;
                        inNode.label = <a href={FACETED_BASE_URI + np} target='_blank'>{np.substring(np.indexOf('#') + 1)}</a>;
                        outNode.id = firstRouteNP;
                        outNode.label = <a href={FACETED_BASE_URI + firstRouteNP} target='_blank'>{firstRouteNP.substring(firstRouteNP.indexOf('#') + 1)}</a>;
                    }

                    // Add route node ports to proper arrays
                    inNPs.push(inNode);
                    outNPs.push(outNode);
                    // Create special route link
                    links.push({
                        source: inNode.id,
                        target: outNode.id,
                        color: pathColor,
                        type: "CURVE_SMOOTH"
                    });
                } else {
                    firstRouteNP = np;
                }
            } else {
                const otherNode = {
                    id: np,
                    label: <a href={FACETED_BASE_URI + np} target='_blank'>{np.substring(np.indexOf('#') + 1)}</a>,
                    color: "#aaaaaa"
                }
                // Check if NodePort is incoming or outgoing
                if (Utils.isNodePortIncoming(np, graphStore)) {
                    inNPs.push(otherNode);
                } else {
                    outNPs.push(otherNode);
                }
            }
        }

        // Assign coordinates to Node Ports and create Internal Node Links
        let Y = 100;
        inNPs.forEach(np => {
            np.labelPosition = "left";
            np.x = Utils.vw(25);
            np.y = Y;
            Y += 50;

            for (const inl of Utils.getAllInternalNodeLinksFromNodePort(np.id, graphStore)) {
                links.push({
                    source: np.id,
                    target: inl[ERA.endPort],
                    type: "CURVE_SMOOTH"
                });
            }
        });

        Y = 100;
        outNPs.forEach(np => {
            np.labelPosition = "right";
            np.x = Utils.vw(45);
            np.y = Y;
            Y += 50;
        });

        setSchema({ nodes: [...inNPs, ...outNPs], links: [...links] });
    }

    /*const cleanDiagram = () => {
        schema.nodes.forEach(n => removeNode(n));
        schema.links = [];
    }*/

    const onClickNode = function (nodeId) {
        window.alert(`Clicked node ${nodeId}`);
    };

    const onClickLink = function (source, target) {
        window.alert(`Clicked link between ${source} and ${target}`);
    };

    useEffect(() => {
        setOp(internalViewNode);
        setDisplay(show);
        // New OP has been selected, proceed to build its diagram
        if (internalViewNode) {
            //cleanDiagram();
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
                        id="graph-id" // id is mandatory
                        data={schema}
                        config={schemaConfig}
                        onClickNode={onClickNode}
                        onClickLink={onClickLink}
                    />
                </Modal.Body>
            </Modal>
        </div>
    }

    return null;
}