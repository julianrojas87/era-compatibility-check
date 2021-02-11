import React, { useState, useEffect } from "react";
import { Modal, Toggle } from "rsuite";
import { RDFS, ERA } from "../utils/NameSpaces";
import { FACETED_BASE_URI } from "../config/config";
import Utils from "../utils/Utils";
import Diagram, { useSchema } from 'beautiful-react-diagrams';
import {
    opBaseNodeDiagram,
    nodeLabelStyle,
    opNormalNodeDiagram,
    opRouteNodeDiagram
} from '../styles/Styles';
import 'beautiful-react-diagrams/styles.css';


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
    const [canvasHeight, setCanvasHeight] = useState(0);
    // create diagrams schema
    const [schema, { onChange, addNode, removeNode }] = useSchema();

    const opBaseNode = ({ data }) => {
        return (<div style={opBaseNodeDiagram(data.size)}></div>);
    }

    const opNormalNode = ({ id, content, data }) => {
        return (
            <div style={opNormalNodeDiagram}>
                <div style={{ textAlign: data.switchAlign }}>
                    <Toggle size={'sm'} onChange={checked => data.onChange(checked, id)} />
                </div>
                <div role="button" style={nodeLabelStyle}>
                    {content}
                </div>
            </div>
        );
    }

    const opRouteNode = ({ id, content, data }) => {
        return (
            <div style={opRouteNodeDiagram(pathColor)}>
                <div style={{ textAlign: data.switchAlign }}>
                    <Toggle size={'sm'} onChange={checked => data.onChange(checked, id)} />
                </div>
                <div role="button" style={nodeLabelStyle}>
                    {content}
                </div>
            </div>
        );
    }

    const isRouteLink = inl => {
        console.log(inl)
        let from = null;
        let to = null;
        for (const n of schema.nodes) {
            if (n.id === inl[ERA.startPort]) {
                from = n;
                if (to) break;
            }
            if (n.id === inl[ERA.endPort]) {
                to = n;
                if (from) break;
            }
        }

        console.log(from, to);


        if (from.className === 'route-node' && to.className === 'route-node') {
            return true;
        }

        return false
    }

    const onChangeNodePort = (checked, np) => {
        if (checked) {
            // Find and add all nodes starting from this Node Port
            const inls = Utils.getAllInternalNodeLinksFromNodePort(np, graphStore);
            for (const inl of inls) {
                if (!isRouteLink(inl)) {
                    schema.links.push({
                        input: np,
                        output: inl[ERA.endPort],
                        className: 'normal-link'
                    });
                }
            }
        } else {
            schema.links = schema.links.filter(l => l.input !== np || l.className !== 'normal-link');
        }

        // Trigger change for re-render
        onChange(schema);
    };

    const buildSchema = (ivn, ivp) => {
        const inNPs = [];
        const outNPs = [];

        // Retrieve all node ports for this OP
        const nodePorts = Utils.getAllNodePorts(graphStore, ivn[ERA.hasAbstraction]);
        let firstRouteNP = null;

        for (const np of nodePorts) {
            // Check if this is a NodePort of the route
            if (ivp.nodes.includes(np)) {
                if (firstRouteNP) {
                    const inNode = {
                        render: opRouteNode,
                        data: { onChange: onChangeNodePort, switchAlign: 'right' },
                        className: 'route-node'
                    }
                    const outNode = {
                        render: opRouteNode,
                        data: { onChange: onChangeNodePort, switchAlign: 'left' },
                        className: 'route-node'
                    }
                    if (ivp.nodes.indexOf(np) > ivp.nodes.indexOf(firstRouteNP)) {
                        // np is the outgoing NodePort
                        outNode.id = np;
                        outNode.content = <a href={FACETED_BASE_URI + np} target='_blank'>{np.substring(np.indexOf('#') + 1)}</a>;
                        inNode.id = firstRouteNP;
                        inNode.content = <a href={FACETED_BASE_URI + firstRouteNP} target='_blank'>{firstRouteNP.substring(firstRouteNP.indexOf('#') + 1)}</a>;
                    } else {
                        // np in the incoming NodePort
                        inNode.id = np;
                        inNode.content = <a href={FACETED_BASE_URI + np} target='_blank'>{np.substring(np.indexOf('#') + 1)}</a>;
                        outNode.id = firstRouteNP;
                        outNode.content = <a href={FACETED_BASE_URI + firstRouteNP} target='_blank'>{firstRouteNP.substring(firstRouteNP.indexOf('#') + 1)}</a>;
                    }

                    // Add route node ports to proper arrays
                    inNPs.push(inNode);
                    outNPs.push(outNode);
                    // Create special route link
                    schema.links.push({
                        input: inNode.id,
                        output: outNode.id,
                        className: 'route-link'
                    });
                } else {
                    firstRouteNP = np;
                }
            } else {
                const otherNode = {
                    id: np,
                    content: <a href={FACETED_BASE_URI + np} target='_blank'>{np.substring(np.indexOf('#') + 1)}</a>,
                    render: opNormalNode,
                    data: { onChange: onChangeNodePort }
                }
                // Check if NodePort is incoming or outgoing
                if (Utils.isNodePortIncoming(np, graphStore)) {
                    otherNode.data.switchAlign = 'right';
                    inNPs.push(otherNode);
                } else {
                    otherNode.data.switchAlign = 'left';
                    outNPs.push(otherNode);
                }
            }
        }

        // Build base node according to the amount of node ports
        const baseNodeHeight = Math.max(inNPs.length, outNPs.length);
        const baseNode = {
            id: 'op',
            disableDrag: true,
            coordinates: [Utils.vw(18.75), 40],
            data: { size: baseNodeHeight },
            render: opBaseNode,
            className: 'base-node'
        };
        // Add the base node to the diagram
        addNode(baseNode);

        // Set canvas size
        setCanvasHeight((baseNodeHeight * 10) + 10);

        // Assign coordinates to input Node Ports and render
        const baseNodeHeightPx = Utils.vh(baseNodeHeight * 10);
        let inY = 55;

        inNPs.forEach(np => {
            const label = np.id.substring(np.id.indexOf('#') + 1).length * 8.6;
            const inX = Utils.vw(18.75) - (label > Utils.vw(20) ? Utils.vw(20) : label) + 80;
            np.coordinates = [inX, inY];
            inY += baseNodeHeightPx / inNPs.length;
            addNode(np);
        });

        // Assign coordinates to output Node Ports and render
        inY = 55;
        outNPs.forEach(np => {
            const inX = Utils.vw(56.25) - 80;
            np.coordinates = [inX, inY];
            inY += baseNodeHeightPx / outNPs.length;
            addNode(np);
        });
    }

    const cleanDiagram = () => {
        schema.nodes.forEach(n => removeNode(n));
        schema.links = [];
    }

    useEffect(() => {
        setOp(internalViewNode);
        setDisplay(show);
        // New OP has been selected, proceed to build its diagram
        if (internalViewNode) {
            cleanDiagram();
            buildSchema(internalViewNode, internalViewPath);
        }
    }, [internalViewNode, show]);

    if (op) {
        return <div className="modal-container">
            <Modal overflow size="lg" show={display} onHide={() => { toggleInternalView(false) }}>
                <Modal.Header>
                    <Modal.Title>Internal connectivity of {op[RDFS.label]} ({op[ERA.uopid]})</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div style={{ height: `${canvasHeight}vh` }}>
                        <Diagram schema={schema} onChange={onChange} />
                    </div>
                </Modal.Body>
            </Modal>
        </div>
    }

    return null;
}