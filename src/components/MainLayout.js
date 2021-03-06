import React, { Component } from "react";
import ReactMapboxGl, { Popup, ZoomControl } from "react-mapbox-gl";
import { parse as wktParse } from 'wellknown';
import GraphStore from '@graphy/memory.dataset.fast';
import { OperationalPointsLayer } from './OperationalPointsLayer';
import { TileFramesLayer } from './TileFramesLayer';
import { RoutesLayer } from './RoutesLayer';
import { RoutesInfo } from './RoutesInfo';
import { OPInternalView } from './OPInternalView';
import { HelpPage } from './HelpPage';
import RDFetch from '../workers/RDFetch.worker';
import { TileFetcherWorkerPool } from '../workers/TileFetcherWorkerPool';
import { NetworkGraph } from '../algorithm/NetworkGraph';
import { PathFinder } from '../algorithm/PathFinder';
import { findIntersectedTiles } from '../algorithm/VoxTraversal';
import Utils from '../utils/Utils';
import loadingGifPath from '../img/loading.gif';
import eraLogoPath from '../img/era-logo.png';
import { GEOSPARQL, RDFS, SKOS, ERA } from '../utils/NameSpaces';
import {
    Container,
    Sidebar,
    Sidenav,
    Input,
    InputNumber,
    InputGroup,
    SelectPicker,
    Content,
    Icon,
    Alert,
    Divider,
    Loader
} from "rsuite";
import {
    ERALogo,
    eraLogoWrapper,
    infoButton,
    input,
    inputGroup,
    selectStyle,
    sideBar,
    sidebarHeader,
    stickyMenu,
    mapStyle,
    StyledPopup,
    LoadingGIF,
    randomRouteStyle
} from '../styles/Styles';
import {
    ERA_VOCABULARY,
    ERA_VEHICLE_TYPES,
    ERA_VEHICLES,
    IMPLEMENTATION_TILES,
    ABSTRACTION_TILES,
    IMPLEMENTATION_ZOOM,
    ABSTRACTION_ZOOM
} from '../config/config';

const MapBox = ReactMapboxGl({
    accessToken:
        "pk.eyJ1Ijoic3VzaGlsZ2hhbWJpciIsImEiOiJjazUyZmNvcWExM2ZrM2VwN2I5amVkYnF5In0.76xcCe3feYPHsDo8eXAguw"
});

/**
 * PROBLEMS TO SOLVE:
 * 1. Stopping condition to avoid "infinite" queries 
 * 2. Put the algorithm inside a worker (?)
 * 
 **/
class MainLayout extends Component {
    constructor(props) {
        super(props);
        this.state = {
            center: [4.3556, 50.8376],
            zoom: [10],
            queryBounds: null,
            queryBoundsOpts: {
                padding: { top: 70, bottom: 70, right: 70, left: 70 }
            },
            bounds: null,
            microNodes: {},
            popup: null,
            loading: false,
            showTileFrames: true,
            internalView: false,
            helpPage: false,
            tileFrames: new Map(),
            compatibilityVehicleType: null,
            compatibilityVehicle: null,
            vehiclesTypes: [],
            vehicles: [],
            from: '',
            to: '',
            maxRoutes: 1,
            routes: [],
            calculatingRoutes: false,
            loaderMessage: null,
            routeFilter: new Set(),
            internalViewNode: null,
            internalViewPath: null,
            pathColor: null
        };
        // Web Workers pool for fetching data tiles
        this.tileFetcherPool = new TileFetcherWorkerPool();
        // RDF graph store
        this.graphStore = GraphStore();
        // Rail network graph for path finding
        this.networkGraph = new NetworkGraph();
        // Route calculator object
        this.pathFinder = null;

        this.allMicroNodes = {};
        this.from = {};
        this.to = {};

        this.fetchVocabulary();
        this.fetchVehicleTypes();
        this.fetchVehicles()
    }

    componentDidMount() {
        this.fetchImplementationTile(this.state.center);
    }

    fetchVocabulary() {
        const rdfetcht = new RDFetch();
        rdfetcht.addEventListener('message', e => {
            if (e.data === 'done') {
                rdfetcht.terminate();
            } else {
                this.graphStore.add(Utils.rebuildQuad(e.data));
            }
        });
        rdfetcht.postMessage({
            url: ERA_VOCABULARY,
            headers: { 'Accept': 'application/n-quads' }
        });
    }

    fetchVehicleTypes() {
        const rdfetcht = new RDFetch();
        Alert.info('Loading Vehicles and Vehicle Types...', 3000);
        rdfetcht.addEventListener('message', e => {
            if (e.data === 'done') {
                rdfetcht.terminate();
                this.setVehicleTypesPicker();
                Alert.info('Vehicle Types loaded successfully', 3000);
            } else {
                this.graphStore.add(Utils.rebuildQuad(e.data));
            }
        });
        rdfetcht.postMessage({
            url: ERA_VEHICLE_TYPES,
            headers: { 'Accept': 'text/turtle' }
        });
    }

    fetchVehicles() {
        const rdfetcht = new RDFetch();
        let count = 0;
        let currentSubject = null;
        let tempGraphStore = GraphStore();

        rdfetcht.addEventListener('message', e => {
            if (e.data === 'done') {
                rdfetcht.terminate();
                this.setVehiclePicker(tempGraphStore);
                Alert.info('Vehicles loaded successfully', 3000);
            } else {
                const q = Utils.rebuildQuad(e.data);

                if (q.subject.value !== currentSubject) {
                    currentSubject = q.subject.value;
                    count++;
                    if (count % 50000 === 0) {
                        this.setVehiclePicker(tempGraphStore);
                        tempGraphStore = GraphStore();
                    }
                }

                this.graphStore.add(q);
                tempGraphStore.add(q);
            }
        });
        rdfetcht.postMessage({
            url: ERA_VEHICLES,
            headers: { 'Accept': 'text/turtle' }
        });
    }

    fetchImplementationTile = (coords, force) => {
        return new Promise(resolve => {
            const tileFetcher = this.tileFetcherPool.runTask(IMPLEMENTATION_TILES, IMPLEMENTATION_ZOOM, coords, null, force);
            if (tileFetcher) {
                // Show loading gif
                this.toggleLoading(true);
                let i = 0;

                const ondata = e => {
                    const quad = e.data.quad;
                    if (quad) {
                        // Store all RDFJS quads in Graphy's graph store for later querying
                        const n = this.graphStore.add(quad);
                        // Extract Operational Point location for visualization
                        if (quad.predicate.value === GEOSPARQL.asWKT) {
                            i++;
                            const subject = quad.subject.value;
                            const coords = wktParse(quad.object.value).coordinates;
                            this.allMicroNodes[subject] = coords;
                            // Throttle MN rendering for performance
                            if (i % 400 === 0) this.renderMicroNodes();
                        }
                    }
                    if (e.data.done) {
                        tileFetcher.dispatchEvent(new Event('done'));
                    }
                };
                const ondone = () => {
                    this.renderMicroNodes();
                    if (this.tileFetcherPool.allWorkersFree()) {
                        // Hide loading gif
                        this.toggleLoading(false);
                    }
                    tileFetcher.removeEventListener('data', ondata);
                    tileFetcher.removeEventListener('done', ondone);
                    resolve();
                };

                tileFetcher.addEventListener('data', ondata);
                tileFetcher.addEventListener('done', ondone);
            } else {
                this.renderMicroNodes();
                resolve();
            }
        });
    }

    fetchAbstractionTile = ({ coords, asXY, zoom, force }) => {
        return new Promise(resolve => {
            const tileFetcher = this.tileFetcherPool.runTask(ABSTRACTION_TILES, zoom || ABSTRACTION_ZOOM, coords, asXY, force);
            // Draw tile frame on the map
            this.drawTileFrame(coords, ABSTRACTION_ZOOM, asXY);
            if (tileFetcher) {
                // Show loading gif
                this.toggleLoading(true);

                const ondata = e => {
                    // Build rail network graph
                    const quad = e.data.quad;
                    if (quad) {
                        if (quad.predicate.value === ERA.startPort) {
                            this.networkGraph.addEdge({
                                id: quad.subject.value,
                                from: quad.object.value
                            });
                            this.networkGraph.addNode({
                                id: quad.object.value,
                                edge: quad.subject.value
                            });
                        } else if (quad.predicate.value === ERA.endPort) {
                            this.networkGraph.addEdge({
                                id: quad.subject.value,
                                to: quad.object.value
                            });
                        } else if (quad.predicate.value === ERA.bidirectional && quad.object.value === 'true') {
                            this.networkGraph.setBidirectional(quad.subject.value);
                        } else if (quad.predicate.value === GEOSPARQL.asWKT) {
                            this.networkGraph.addNode({
                                id: quad.subject.value,
                                lngLat: wktParse(quad.object.value).coordinates
                            });
                            // Add this quad also to the RDF store for visualization
                            this.graphStore.add(quad);
                        } else if (quad.predicate.value === ERA.belongsToNode) {
                            this.networkGraph.addNode({
                                id: quad.subject.value,
                                microNode: quad.object.value
                            });
                            this.graphStore.add(quad);
                        }

                        // Add the the quad to the RDF graph store
                        this.graphStore.add(quad);

                    }

                    if (e.data.done) {
                        tileFetcher.dispatchEvent(new Event('done'));
                    }
                }

                const ondone = () => {
                    if (this.tileFetcherPool.allWorkersFree()) {
                        // Hide loading gif
                        this.toggleLoading(false);
                    }

                    tileFetcher.removeEventListener('data', ondata);
                    tileFetcher.removeEventListener('done', ondone);
                    resolve();
                }

                tileFetcher.addEventListener('data', ondata);
                tileFetcher.addEventListener('done', ondone)
            } else {
                resolve();
            }
        });
    }

    renderMicroNodes = () => {
        let arr = {};
        let mns = Object.keys(this.allMicroNodes);

        // Filter out MicroNodes outside viewport
        if (this.state.bounds) {
            mns = mns.filter(mn => {
                return this.state.bounds.contains(this.allMicroNodes[mn]);
            });
        }
        // If route filter is given, display only associated MNs
        if (this.state.routeFilter.size > 0) {
            mns = mns.filter(mn => {
                return this.state.routeFilter.has(this.allMicroNodes[mn].join('_'));
            });
        }

        for (const mn of mns) {
            arr[mn] = this.allMicroNodes[mn];
        }

        this.setState(() => { return { microNodes: arr } });
    }

    updateRouteFilter = filter => {
        this.setState({ routeFilter: filter }, () => {
            this.renderMicroNodes();
        });
    }

    routeExpansionHandler = index => {
        const expanded = this.state.routes.map((r, i) => {
            let state = false;
            if (i === index) {
                state = !r.renderNodes;
            }

            return { ...r, renderNodes: state };
        });
        this.setState({ routes: expanded });
    }

    toggleLoading = state => {
        this.setState({ loading: state });
    }

    drawTileFrame = (coords, zoom, asXY) => {
        let tf = Utils.getTileFrame(coords, zoom, asXY);
        if (!this.state.tileFrames.has(tf[0].join())) {
            this.setState(state => {
                return {
                    tileFrames: state.tileFrames.set(tf[0].join(), [tf])
                };
            });
        }
        this.setState({ showTileFrames: true });
    }

    popupData = data => {
        this.setState({ popup: data });
    }

    closePopup = () => {
        this.setState({ popup: null });
    }

    setVehicleTypesPicker = async () => {
        const vts = await Utils.getAllVehicleTypes(this.graphStore);
        this.setState({ vehicleTypes: vts });
    }

    setVehiclePicker = async gs => {
        const vhs = await Utils.getAllVehicles(gs);

        this.setState(state => {
            return { vehicles: [...state.vehicles, ...vhs] }
        });
    }

    setCompatibilityVehicleType = v => {
        this.setState({
            compatibilityVehicleType: v,
            compatibilityVehicle: null
        });
    };

    setCompatibilityVehicle = async v => {
        const vInfo = await Utils.getVehicleInfo(v, this.graphStore);
        const vType = await Utils.getVehicleInfo(vInfo[ERA.vehicleType], this.graphStore);
        let svt = null;

        if (vType) {
            svt = vType['@id']
        }

        this.setState({
            compatibilityVehicle: v,
            compatibilityVehicleType: svt,
        });
    };

    fromTo = async feature => {
        // Data is already being fetched so do nothing in the meantime
        if (this.state.loading) return false;

        // Start building network graph
        await this.fetchAbstractionTile({ coords: feature.lngLat });
        if (!this.from.ports && this.state.to !== feature[RDFS.label]) {
            // Get the NodePorts of this MicroNode
            const nodePorts = Utils.getMicroNodePorts(this.graphStore, feature['@id']);
            if (nodePorts) {
                this.from.ports = nodePorts;
                this.from.lngLat = feature.lngLat;
                this.setState({ from: feature[RDFS.label] });
            } else {
                this.setState({ showTileFrames: false });
                // Show warning of disconnected MicroNode
                Alert.warning(`This Operational Point (${feature[RDFS.label]}) is not connected to the railway infrastructure`, 10000);
            }
        } else if (this.state.from !== feature[RDFS.label]) {
            // Get the NodePorts of this MicroNode
            const nodePorts = Utils.getMicroNodePorts(this.graphStore, feature['@id']);
            if (nodePorts) {
                this.to.ports = nodePorts;
                this.to.lngLat = feature.lngLat
                this.setState({ to: feature[RDFS.label] });
            } else {
                this.setState({ showTileFrames: false });
                // Show warning of disconnected MicroNode
                Alert.warning(`This Operational Point (${feature[RDFS.label]}) is not connected to the railway infrastructure`, 10000);
                this.to = {};
            }
        }

        // Perform source selection and run Dijkstra if FROM and TO are defined and are not the same
        if (this.from.ports && this.to.ports && !this.to.ports.includes(this.from.ports[0]) && this.state.routes.length <= 0) {
            // Fit map to selected query
            this.setState({
                queryBounds: [this.from.lngLat, this.to.lngLat]
            });

            // Set OP filter to show only FROM and TO
            const filter = new Set([
                wktParse(Utils.getNodePortInfo(this.from.ports[0], this.graphStore)[GEOSPARQL.asWKT]).coordinates.join('_'),
                wktParse(Utils.getNodePortInfo(this.to.ports[0], this.graphStore)[GEOSPARQL.asWKT]).coordinates.join('_')
            ]);
            this.updateRouteFilter(filter);

            // Gather all the tiles intersected by the straight line between origin and destination
            const intersectedTiles = findIntersectedTiles(this.from.lngLat, this.to.lngLat);

            await Promise.all(intersectedTiles.map(async tile => {
                return this.fetchAbstractionTile({ coords: tile, asXY: true });
            }));

            this.pathFinder = new PathFinder({
                networkGraph: this.networkGraph,
                graphStore: this.graphStore,
                fetchAbstractionTile: this.fetchAbstractionTile,
                fetchImplementationTile: this.fetchImplementationTile
            });

            this.pathFinder.on('path', path => {
                if (path) {
                    this.setState(state => {
                        return {
                            routes: [...state.routes, {
                                path,
                                renderNodes: false,
                                style: randomRouteStyle()
                            }]
                        };
                    }, () => { this.renderMicroNodes() });
                }
            });

            this.pathFinder.on('done', () => { this.setState({ showTileFrames: false, calculatingRoutes: false }) });

            this.setLoaderMessage('Calculating routes...');
            if (!(await this.pathFinder.yen(this.from, this.to, this.state.maxRoutes))) {
                if (!this.pathFinder.die) {
                    Alert.warning('There are no possible routes between these two locations', 10000);
                    this.setState({ showTileFrames: false, calculatingRoutes: false });
                }
            }
        }
    }

    checkCompatibility = route => {
        if (this.state.compatibilityVehicleType) {
            if (this.state.compatibilityVehicle) {
                const v = Utils.getVehicleInfo(this.state.compatibilityVehicle, this.graphStore);
                const vt = Utils.getVehicleInfo(this.state.compatibilityVehicleType, this.graphStore);
                v[ERA.vehicleType] = vt;

                const report = route.map(t => {
                    return Utils.checkCompatibility(t, v, this.graphStore, true);
                });
                return report;
            } else {
                const vt = Utils.getVehicleInfo(this.state.compatibilityVehicleType, this.graphStore);
                const report = route.map(t => {
                    return Utils.checkCompatibility(t, vt, this.graphStore);
                });
                return report;
            }
        } else if (this.state.compatibilityVehicle) {
            const v = Utils.getVehicleInfo(this.state.compatibilityVehicle, this.graphStore);
            const report = route.map(t => {
                return Utils.checkCompatibility(t, v, this.graphStore, true);
            });
            return report;
        }
    };

    setLoaderMessage = m => {
        return new Promise(resolve => {
            if (m) {
                this.setState({ calculatingRoutes: true, loaderMessage: m }, () => { resolve() });
            } else {
                this.setState({ calculatingRoutes: false }, () => { resolve() });
            }
        });
    }

    setMaxRoutes(n) {
        this.setState({ maxRoutes: n });
    }

    clearVehicleType = () => {
        this.setState({ compatibilityVehicleType: null });
    }

    clearVehicle = () => {
        this.setState({ compatibilityVehicle: null });
    }

    clearRoutes(param) {
        if (this.pathFinder) this.pathFinder.die = true;

        if (param === 'from') {
            this.from = {};
            this.setState({ from: '' });
        } else {
            this.to = {};
            this.setState({ to: '' });
        }

        this.setState({
            routes: [],
            routeFilter: new Set(),
            tileFrames: new Map(),
            showTileFrames: false,
            calculatingRoutes: false,
            loading: false
        }, () => { this.renderMicroNodes() });
    }

    toggleInternalView = (show, mn, route) => {
        this.setState({
            internalView: show,
            internalViewNode: mn,
            internalViewPath: route ? route.path : null,
            pathColor: route ? route.style['line-color'] : null
        });
    };

    toggleHelpPage = show => {
        this.setState({ helpPage: show });
    }

    onDragEnd = map => {
        const center = map.getCenter();
        this.setState({ bounds: map.getBounds(), popup: null });
        this.fetchImplementationTile([center.lng, center.lat]);
        this.renderMicroNodes();
    }

    onZoomEnd = map => {
        const center = map.getCenter();
        this.setState({ bounds: map.getBounds(), popup: null });
        this.fetchImplementationTile([center.lng, center.lat]);
        this.renderMicroNodes();
    }

    render() {
        const {
            center,
            zoom,
            queryBounds,
            queryBoundsOpts,
            microNodes,
            popup,
            loading,
            tileFrames,
            helpPage,
            internalView,
            internalViewNode,
            internalViewPath,
            pathColor,
            showTileFrames,
            vehicleTypes,
            vehicles,
            routes,
            from,
            to,
            maxRoutes,
            calculatingRoutes,
            loaderMessage,
            compatibilityVehicleType,
            compatibilityVehicle
        } = this.state;

        return (
            <div className="show-fake-browser sidebar-page">
                <Container>
                    <OPInternalView
                        show={internalView}
                        toggleInternalView={this.toggleInternalView}
                        internalViewNode={internalViewNode}
                        internalViewPath={internalViewPath}
                        pathColor={pathColor}
                        graphStore={this.graphStore}>
                    </OPInternalView>
                    <HelpPage show={helpPage} toggleHelpPage={this.toggleHelpPage}></HelpPage>
                    <Sidebar style={sideBar}>
                        <div style={stickyMenu}>
                            <Sidenav.Header>
                                <div style={eraLogoWrapper}><ERALogo src={eraLogoPath}></ERALogo></div>
                                <div style={sidebarHeader}>
                                    <span style={{ marginLeft: 12 }}>Route Compatibility Check</span>
                                    <Icon icon="info-circle" size="lg" style={infoButton}
                                        title="how to use this application" onClick={() => this.toggleHelpPage(true)} />
                                </div>
                            </Sidenav.Header>

                            <InputGroup inside style={inputGroup}>
                                <InputGroup.Addon>FROM:</InputGroup.Addon>
                                <Input style={input} disabled value={from}></Input>
                                <InputGroup.Button onClick={() => this.clearRoutes('from')}>
                                    <Icon icon="times-circle" />
                                </InputGroup.Button>
                            </InputGroup>

                            <InputGroup inside style={inputGroup}>
                                <InputGroup.Addon>TO:</InputGroup.Addon>
                                <Input style={input} disabled value={to}></Input>
                                <InputGroup.Button onClick={() => this.clearRoutes('to')}>
                                    <Icon icon="times-circle" />
                                </InputGroup.Button>
                            </InputGroup>

                            <InputNumber
                                min={1}
                                value={maxRoutes}
                                style={{ fontSize: '22px' }}
                                prefix={"Max number of routes:"}
                                onChange={n => this.setMaxRoutes(n)} />

                            <SelectPicker
                                style={selectStyle}
                                placeholder={'Select a Vehicle Type'}
                                onSelect={v => this.setCompatibilityVehicleType(v)}
                                onClean={this.clearVehicleType}
                                data={vehicleTypes}
                                value={compatibilityVehicleType}>
                            </SelectPicker>

                            <SelectPicker
                                style={selectStyle}
                                placeholder={'Select a Vehicle'}
                                onSelect={v => this.setCompatibilityVehicle(v)}
                                onClean={this.clearVehicle}
                                data={vehicles}
                                value={compatibilityVehicle}>
                            </SelectPicker>

                            <Divider />
                        </div>

                        <RoutesInfo
                            routes={routes}
                            graphStore={this.graphStore}
                            routeExpansionHandler={this.routeExpansionHandler}
                            setLoaderMessage={this.setLoaderMessage}
                            fetchImplementationTile={this.fetchImplementationTile}
                            fetchAbstractionTile={this.fetchAbstractionTile}
                            compatibilityVehicleType={compatibilityVehicleType}
                            compatibilityVehicle={compatibilityVehicle}
                            checkCompatibility={this.checkCompatibility}
                            toggleInternalView={this.toggleInternalView}>
                        </RoutesInfo>

                        {calculatingRoutes && (<Loader size={'lg'} speed={'normal'} content={loaderMessage}></Loader>)}

                    </Sidebar>
                    <Container>
                        <Content>
                            <MapBox
                                // eslint-disable-next-line
                                style="mapbox://styles/mapbox/light-v10"
                                containerStyle={mapStyle}
                                center={center}
                                zoom={zoom}
                                fitBounds={queryBounds}
                                fitBoundsOptions={queryBoundsOpts}
                                onDragEnd={this.onDragEnd}
                                onZoomEnd={this.onZoomEnd}
                            >
                                <RoutesLayer
                                    routes={routes}
                                    graphStore={this.graphStore}
                                    updateRouteFilter={this.updateRouteFilter}
                                ></RoutesLayer>

                                {showTileFrames && (<TileFramesLayer tileFrames={tileFrames}></TileFramesLayer>)}

                                <OperationalPointsLayer
                                    microNodes={microNodes}
                                    graphStore={this.graphStore}
                                    popupData={this.popupData}
                                    closePopup={this.closePopup}
                                    fromTo={this.fromTo}
                                ></OperationalPointsLayer>

                                {popup && (
                                    <Popup coordinates={popup.lngLat}>
                                        <StyledPopup>
                                            <h2>{popup[RDFS.label]}</h2>
                                            <div><strong>@id: </strong>{popup['@id']}</div>
                                            {popup[ERA.tafTapCode] !== '' && (
                                                <div><strong>TAF/TAP code: </strong>{popup[ERA.tafTapCode]}</div>
                                            )}
                                            <div><strong>type: </strong>{popup[ERA.opType][SKOS.prefLabel]}</div>
                                            {popup[ERA.opType][RDFS.description] !== '' &&
                                                <div><strong>description: </strong>{popup[ERA.opType][SKOS.definition]}</div>
                                            }
                                        </StyledPopup>
                                    </Popup>
                                )}

                                <ZoomControl position={'top-left'} />
                            </MapBox>

                            {loading && (
                                <LoadingGIF src={loadingGifPath}></LoadingGIF>
                            )}
                        </Content>
                    </Container>
                </Container>
            </div>
        );
    }
}

export default MainLayout;