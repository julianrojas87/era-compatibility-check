import React, { Component, Fragment } from "react";
import { Panel, Steps, Loader, Button } from 'rsuite';
import Utils from "../utils/Utils";
import RouteRenderer from "../workers/RouteRenderer.worker";
import { ERA, RDFS, SKOS } from '../utils/NameSpaces';
import { getPhrase } from "../utils/Languages";
import {
    stepStyle,
    panelStyle,
    tableHeaderStyle,
    cellStyle
} from '../styles/Styles';

export class RoutesInfo extends Component {
    constructor(props) {
        super(props);
        this.state = {
            panels: [],
            routeStructures: []
        };
        // Cache of fetched OP for route structures
        this.opCache = new Map();
    }

    onExpand = e => {
        this.props.routeExpansionHandler(e);
    }

    getRouteHeader = (route, index) => {
        return (
            <span>{`${getPhrase('route', this.props.language)} ${index} (${route.length / 1000} km): `}{this.getCompatibility(route)}</span>
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

    getOperationalPointTitle = (op, internal, route) => {
        // Get OP Type info
        if (op[ERA.opType].value) {
            op[ERA.opType] = Utils.queryGraphStore({
                s: op[ERA.opType],
                store: this.props.graphStore
            })[op[ERA.opType].value];
        }

        return (
            <span>
                <a href={op['@id']} target={'_blank'} style={{ color: '#000' }}>
                    {`${Utils.getLiteralInLanguage(op[RDFS.label], this.props.language)} (${Utils.getLiteralInLanguage(op[ERA.opType][SKOS.prefLabel], this.props.language)})`}
                </a>
                {internal && (
                    <Button style={{ marginLeft: '5px' }} size="xs" appearance="ghost"
                        onClick={() => { this.props.toggleInternalView(true, op, route) }}>See internal connectivity</Button>
                )}
            </span>
        );
    }

    getLabel = (sub, p) => {
        let s = null;

        if (typeof sub === 'object') {
            s = sub.value;
        } else {
            s = sub;
        }

        if (s) {
            const l = Utils.queryGraphStore({
                store: this.props.graphStore,
                s: s
            })

            if (l) {
                return Utils.getLiteralInLanguage(l[s][p], this.props.language);
            } else {
                return (<span style={{ color: 'red' }}>{`unknown term ${p} in KG`}</span>)
            }
        }
    }

    formatValues = values => {
        if (values || values === false) {
            const res = [];
            if (Array.isArray(values)) {
                res.push((
                    <ul key='ul'>
                        {values.map(v => {
                            if (Utils.isValidHttpUrl(v.value)) {
                                return (<li key={v}><a href={v.value} target='_blank'>{this.getLabel(v, SKOS.prefLabel)}</a></li>);
                            } else {
                                return (<li key={v.value}>{v.value}</li>);
                            }
                        })}
                    </ul>
                ));
            } else {
                if (typeof values === 'object') {
                    if (Utils.isValidHttpUrl(values.value)) {
                        res.push(
                            <div key='div' style={{ textAlign: 'center' }}>
                                <span key={values.value}><a href={values.value} target='_blank'>{this.getLabel(values, SKOS.prefLabel)}</a></span>
                            </div>
                        );
                    } else {
                        res.push(
                            <div key='div' style={{ textAlign: 'center' }}>
                                <span key={values.value}>{values.value}</span>
                            </div>
                        );
                    }
                } else {
                    res.push(
                        <div key='div' style={{ textAlign: 'center' }}>
                            <span key={values}><a href={values} target='_blank'>{this.getLabel(values, RDFS.label)}</a></span>
                        </div>
                    );
                }
            }
            return res;
        } else {
            return (
                <div key='div' style={{ textAlign: 'center' }}>
                    <span style={{ color: 'orange' }}>no data</span>
                </div>
            );
        }
    }

    getCompatibility = comp => {
        switch (comp) {
            case "YES":
                return (<span style={{ color: 'green' }}>YES</span>);
            case "NO":
                return (<span style={{ color: 'red' }}>NO</span>);
            case "UNKNOWN":
                return (<span style={{ color: 'orange' }}>unkwown</span>);
        }
    }

    getTrackDescription = (desc, reps) => {
        if (!reps) {
            return (
                <span>
                    <span style={{ fontWeight: 'bold' }}>Track:</span>
                    <a href={desc.id} target={'_blank'}> {this.getLabel(desc.id, ERA.trackId)} </a>
                    {`(${desc.length / 1000} km)`}
                </span>);
        } else {
            return (
                <div>
                    <span><span style={{ fontWeight: 'bold' }}>Track:</span> <a href={desc.id} target={'_blank'}> {this.getLabel(desc.id, ERA.trackId)}</a></span><br />
                    <span><span style={{ fontWeight: 'bold' }}>Vehicle Type:</span> <a href={this.props.compatibilityVehicleType} target={'_blank'}>{this.getLabel(this.props.compatibilityVehicleType, ERA.typeVersionNumber)}</a></span><br />
                    <table style={{ width: '100%', marginTop: '5px' }}>
                        <thead>
                            <tr style={tableHeaderStyle}>
                                <th style={tableHeaderStyle}>Properties</th>
                                <th style={tableHeaderStyle}>Compatible</th>
                                <th style={tableHeaderStyle}>Track</th>
                                <th style={tableHeaderStyle}>Vehicle</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.keys(reps).map((rep, i) => {
                                const compatibility = reps[rep].compatible ? 'YES'
                                    : reps[rep].compatible === false ? 'NO'
                                        : reps[rep].values.track === ERA.notApplicable ? 'YES'
                                            : 'UNKNOWN';
                                return (
                                    <tr key={`rep-${i}`} style={{ borderBottom: '1px solid black' }}>
                                        <td style={cellStyle}>
                                            <ul>
                                                {reps[rep].predicates.map((p, i) => {
                                                    return (
                                                        <li key={i}><a href={p} target={'_blank'}>{this.getLabel(p, RDFS.label)}</a></li>
                                                    );
                                                })}
                                            </ul>
                                        </td>
                                        <td style={{ ...cellStyle, textAlign: 'center' }}>
                                            {this.getCompatibility(compatibility)}
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

    complementRoute = nodes => {
        const toFetch = new Set();

        for (const n of nodes) {
            if (n.lngLat) {
                n.opId = Utils.getOPIdFromCoords(n.lngLat, this.props.graphStore);
                if (!this.opCache.has(n.opId)) toFetch.add(n.opId);
            } else {
                n.trackId = Utils.getTrackIdFromMicroNetElement(n.id, this.props.graphStore);
            }
        }

        return Array.from(toFetch);
    }

    updateCaches = async (opCache, locations, quads) => {
        this.opCache = opCache;
        this.props.updateOPLocations(locations);
        this.props.graphStore.addAll(quads.map(Utils.rebuildQuad));
    }

    assembleRoute = (route, fromLoc, toLoc) => {
        return new Promise((resolve, reject) => {
            const renderer = new RouteRenderer();
            renderer.addEventListener('message', e => {
                const {
                    steps, tracks, length,
                    opCache, locations, quads
                } = e.data;

                this.updateCaches(opCache, locations, quads);
                resolve({ steps, tracks, length });
            });

            // Add route element relevant IDs
            const toFetch = this.complementRoute(route.path);

            renderer.postMessage({
                route,
                fromLoc,
                toLoc,
                toFetch,
                opCache: this.opCache
            });
        });
    }

    async componentDidUpdate(prevProps) {
        const { routes } = this.props;
        const newRoutes = JSON.stringify(prevProps.routes) !== JSON.stringify(routes);
        const newVehicle = prevProps.compatibilityVehicleType !== this.props.compatibilityVehicleType;
        const newLanguage = prevProps.language !== this.props.language

        if (newRoutes || newVehicle || newLanguage) {
            const panels = [];
            let routeStructures = [];

            if (routes.length > 0) {
                await this.props.setLoaderMessage(getPhrase('fetchingData', this.props.language));
                const fromLoc = this.props.from.lngLat;
                const toLoc = this.props.to.lngLat;

                for (const [i, r] of routes.entries()) {
                    if (!this.state.panels[i] || newVehicle) {
                        let routeStructure = null;

                        let t0 = new Date();
                        if (!this.state.routeStructures[i]) {
                            // Build route structure for the first time
                            routeStructure = await this.assembleRoute(r, fromLoc, toLoc);
                        } else {
                            routeStructure = this.state.routeStructures[i];
                        }
                        console.log('Creating route UI structure took', new Date() - t0, 'ms');

                        routeStructures.push(routeStructure);
                        const { steps, tracks, length } = routeStructure;
                        let report = [];
                        // Register path length
                        r.length = length;

                        // Perform route compatibility if a vehicle type has been selected
                        t0 = new Date();
                        if (this.props.compatibilityVehicleType) {
                            report = this.props.checkCompatibility(tracks);
                        }
                        console.log('Compatibility report took', new Date() - t0, 'ms');

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
                                            key={`step-${steps[key][RDFS.label].value}`}
                                            status={'process'}
                                            title={this.getOperationalPointTitle(steps[key], false, r)}
                                            description={i < Object.keys(steps).length - 1 ? this.getTrackDescription(tracks[i], report[i]) : null}>
                                        </Steps.Item>
                                    ))}
                                </Steps>
                            </Panel>
                        );
                    } else {
                        // A panel was collapsed or expanded, so just change state
                        const p = this.state.panels[i];
                        panels.push({ ...p, props: { ...p.props, expanded: r.renderNodes } });
                        routeStructures = this.state.routeStructures;
                    }
                }
            }

            // Display route info panels
            this.setState({ panels, routeStructures });
            await this.props.setLoaderMessage(null);
        }
    }

    render() {
        const { panels } = this.state;

        return (
            <Fragment>{panels}</Fragment>
        );
    }
}