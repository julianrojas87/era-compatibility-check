import React, { Component, Fragment } from "react";
import { Panel, Steps, Loader } from 'rsuite';
import Utils from "../utils/Utils";
import { ERA, RDFS, SKOS, WGS84 } from '../utils/NameSpaces';
import { stepStyle, panelStyle, cellStyle } from '../styles/Styles';
import { FACETED_BASE_URI } from '../config/config';

export class RoutesInfo extends Component {
    constructor(props) {
        super(props);
        this.state = {
            panels: []
        };
    }

    onExpand = e => {
        this.props.routeExpansionHandler(e);
    }

    getRouteHeader = (route, index) => {
        return (
            <span>{`Route ${index}: `}{this.getCompatibility(route)}</span>
        );
    }

    getCompatibility(route) {
        if (route.compatibility) {
            if (route.compatibility === 'calculating') {
                return (<Loader size={'xs'} style={{ left: '5%' }}></Loader>);
            } else if (route.compatibility === 'compatible') {
                return (<span style={{ color: 'green' }}>Compatible</span>);
            } else {
                return (<span style={{ color: 'red' }}>Incompatible</span>);
            }
        } else {
            return null;
        }
    }

    getOperationalPointTitle = op => {
        return (
            <a
                href={`${FACETED_BASE_URI}${encodeURIComponent(op['@id'])}`}
                target={'_blank'}
                style={{ color: '#000' }}
            >{`${op[RDFS.label]} (${op[ERA.opType][SKOS.prefLabel]})`}</a>
        );
    }

    getLabel = (s, p) => {
        const l = Utils.queryGraphStore({
            store: this.props.graphStore,
            s: s
        })

        if (l) {
            return l[s][p];
        } else {
            return (<span style={{ color: 'red' }}>unknown term in KG</span>)
        }
    }


    formatValues = values => {
        if (values) {
            const res = [];
            if (Array.isArray(values)) {
                for (const v of values) {
                    if (Utils.isValidHttpUrl(v)) {
                        res.push(
                            <span key={v} style={{ float: 'left', clear: 'left' }}>
                                - <a href={`${FACETED_BASE_URI}${encodeURIComponent(v)}`} target={'_blank'}>{this.getLabel(v, SKOS.prefLabel)}</a>
                            </span>);
                    } else {
                        res.push(<span key={v}>{v}</span>);
                    }
                }
            } else {
                if (Utils.isValidHttpUrl(values)) {
                    res.push(<span key={values}><a href={`${FACETED_BASE_URI}${encodeURIComponent(values)}`} target={'_blank'}>{this.getLabel(values, SKOS.prefLabel)}</a></span>);
                } else {
                    res.push(<span key={values}>{values}</span>);
                }
            }
            return res;
        } else {
            return (<span style={{ color: 'orange' }}>no data</span>)
        }
    }

    getTrackDescription = (desc, reps) => {
        if (!reps) {
            return (<span><span style={{ fontWeight: 'bold' }}>Track:</span> <a href={`${FACETED_BASE_URI}${encodeURIComponent(desc)}`} target={'_blank'}>{desc}</a></span>);
        } else {
            return (
                <div>
                    <span><span style={{ fontWeight: 'bold' }}>Track:</span> <a href={`${FACETED_BASE_URI}${encodeURIComponent(desc)}`} target={'_blank'}>{desc}</a></span><br />
                    <span><span style={{ fontWeight: 'bold' }}>Vehicle:</span> <a href={`${FACETED_BASE_URI}${encodeURIComponent(this.props.compatibilityVehicle)}`} target={'_blank'}>{this.getLabel(this.props.compatibilityVehicle, RDFS.label)}</a></span>
                    <table style={{ width: '100%', marginTop: '5px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid black', borderTop: '1px solid black' }}>
                                <th style={{ borderLeft: '1px solid black', borderRight: '1px solid black' }}>Property(ies)</th>
                                <th style={{ borderLeft: '1px solid black', borderRight: '1px solid black' }}>Compatible</th>
                                <th style={{ borderLeft: '1px solid black', borderRight: '1px solid black' }}>Track</th>
                                <th style={{ borderLeft: '1px solid black', borderRight: '1px solid black' }}>Vehicle</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.keys(reps).map((rep, i) => {
                                const unknown = (!reps[rep].values.track || !reps[rep].values.vehicle);
                                return (
                                    <tr key={`rep-${i}`} style={{ borderBottom: '1px solid black' }}>
                                        <td style={{ borderLeft: '1px solid black', borderRight: '1px solid black', textAling: 'center' }}>
                                            {reps[rep].predicates.map((p, i) => {
                                                return (
                                                    <span key={i} style={{ float: 'left', clear: 'left' }}>
                                                        - <a href={`${FACETED_BASE_URI}${encodeURIComponent(p)}`} target={'_blank'}>{this.getLabel(p, RDFS.label)}</a>
                                                    </span>
                                                );
                                            })}
                                        </td>
                                        <td style={cellStyle}>
                                            {unknown ? (<span style={{ color: 'orange' }}>UNKNOWN</span>) : (reps[rep].compatible ? (<span style={{ color: 'green' }}>YES</span>) : (<span style={{ color: 'red' }}>NO</span>))}
                                        </td>
                                        <td style={cellStyle}>{this.formatValues(reps[rep].values.track)}</td>
                                        <td style={cellStyle}>{this.formatValues(reps[rep].values.vehicle)}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            );
        }
    }

    async componentDidUpdate(prevProps) {
        const { routes } = this.props;
        if (JSON.stringify(prevProps.routes) !== JSON.stringify(routes)
            || prevProps.compatibilityVehicle !== this.props.compatibilityVehicle) {
            const panels = [];

            for (const [i, r] of routes.entries()) {
                // Get the sequence of steps of the route
                const steps = {};
                const tracks = [];
                const report = [];

                for (const np of r.path.nodes) {
                    const mn = Utils.getMicroNodeFromNodePort(np, this.props.graphStore);
                    let op = Utils.getOperationalPointFromMicroNode(mn, this.props.graphStore);

                    if (!op) {
                        // Implementation tile for this OP hasn't been fetched yet
                        const npDetails = Utils.getNodePortInfo(np, this.props.graphStore);
                        await this.props.fetchImplementationTile([
                            parseFloat(npDetails[WGS84.longitude]),
                            parseFloat(npDetails[WGS84.latitude])
                        ]);
                        op = Utils.getOperationalPointFromMicroNode(mn, this.props.graphStore);

                        // Force tile fetch, most likely necessary dut to wrong caching
                        if (!op) {
                            await Promise.all([
                                this.props.fetchImplementationTile([
                                    parseFloat(npDetails[WGS84.longitude]),
                                    parseFloat(npDetails[WGS84.latitude])
                                ], true),
                                this.props.fetchAbstractionTile([
                                    parseFloat(npDetails[WGS84.longitude]),
                                    parseFloat(npDetails[WGS84.latitude])], false, true)
                            ]);
                            op = Utils.getOperationalPointFromMicroNode(mn, this.props.graphStore);
                        }
                    }

                    if (!steps[op['@id']]) steps[op['@id']] = op;
                }

                for (const e of r.path.edges) {
                    if (Utils.isMicroLink(e, this.props.graphStore)) {
                        tracks.push(Utils.getTrackFromMicroLink(e, this.props.graphStore));
                    }
                }

                // Flag that we have data to perform route compatibility
                if (this.props.compatibilityVehicle) {
                    report = this.props.checkCompatibility(tracks);
                }

                panels.push(
                    <Panel
                        key={`panel-${i + 1}`}
                        style={panelStyle(r.style['line-color'])}
                        header={this.getRouteHeader(r, i + 1)}
                        eventKey={i}
                        onSelect={this.onExpand}
                        expanded={r.renderNodes}
                        collapsible shaded>
                        <Steps current={0} vertical style={{ stepStyle }}>
                            {Object.keys(steps).map((key, i) => (
                                <Steps.Item
                                    key={`step-${steps[key][RDFS.label]}`}
                                    status={'process'}
                                    title={this.getOperationalPointTitle(steps[key])}
                                    description={i < Object.keys(steps).length - 1 ? this.getTrackDescription(tracks[i], report[i]) : null}>
                                </Steps.Item>
                            ))}
                        </Steps>
                    </Panel>
                );
            }
            this.setState({ panels: panels });
        }
    }

    render() {
        const { panels } = this.state;

        return (
            <Fragment>{panels}</Fragment>
        );
    }
}