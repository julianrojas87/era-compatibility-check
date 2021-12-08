import React, { Component } from "react";
import ReactMapboxGl, { ZoomControl } from "react-mapbox-gl";
import queryString from 'query-string';
import { parse as wktParse } from 'wellknown';
import GraphStore from '@graphy/memory.dataset.fast';
import { OperationalPointsLayer } from './OperationalPointsLayer';
import { TileFramesLayer } from './TileFramesLayer';
import { RoutesLayer } from './RoutesLayer';
import { RoutesInfo } from './RoutesInfo';
import { RoutesExport } from './RoutesExport';
import { RoutesPermalink } from './RoutesPermalink';
import { OPInternalView } from './OPInternalView';
import { OPPopup } from "./OPPopup";
import { HelpPage } from './HelpPage';
import RDFetch from '../workers/RDFetch.worker';
import { TileFetcherWorkerPool } from '../workers/TileFetcherWorkerPool';
import { NetworkGraph } from '../algorithm/NetworkGraph';
//import PFWorker from '../workers/PathFinder.worker';
//import { findIntersectedTiles } from '../algorithm/VoxTraversal';
import { verifyCompatibility } from '../algorithm/Compatibility';
import Utils from '../utils/Utils';
import loadingGifPath from '../img/loading.gif';
import { GEOSPARQL, RDFS } from '../utils/NameSpaces';
import { getPhrase } from "../utils/Languages";
import {
    Container,
    Sidebar,
    Sidenav,
    InputNumber,
    SelectPicker,
    Content,
    Icon,
    Alert,
    Divider,
    Loader
} from "rsuite";
import {
    infoButton,
    inputStyle,
    selectStyle,
    sideBar,
    sidebarHeader,
    stickyMenu,
    mapStyle,
    LoadingGIF,
    randomRouteStyle
} from '../styles/Styles';
import {
    ERA_ONTOLOGY,
    ERA_TYPES,
    ERA_OPERATIONAL_POINTS,
    ERA_VEHICLE_TYPES,
    IMPLEMENTATION_TILES,
    ABSTRACTION_TILES,
    OSRM_API,
    IMPLEMENTATION_ZOOM,
    ABSTRACTION_ZOOM
} from '../config/config';

const MapBox = ReactMapboxGl({
    accessToken:
        "pk.eyJ1Ijoic3VzaGlsZ2hhbWJpciIsImEiOiJjazUyZmNvcWExM2ZrM2VwN2I5amVkYnF5In0.76xcCe3feYPHsDo8eXAguw"
});

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
            displayOPs: {},
            popup: null,
            loading: false,
            showTileFrames: true,
            internalView: false,
            helpPage: false,
            tileFrames: new Map(),
            compatibilityVehicleType: null,
            operationalPoints: [],
            fetchingOPs: true,
            vehiclesTypes: [],
            fetchingVTs: true,
            from: '',
            to: '',
            maxRoutes: 1,
            routes: [],
            calculatingRoutes: false,
            loaderMessage: null,
            routeFilter: new Set(),
            internalViewNode: null,
            internalViewPath: null,
            pathColor: null,
            language: "en"
        };
        // Web Workers pool for fetching data tiles
        this.tileFetcherPool = new TileFetcherWorkerPool();
        // RDF graph store
        this.graphStore = GraphStore();
        // Rail network graph for path finding
        this.networkGraph = new NetworkGraph();
        // Route calculator object
        this.pathFinder = null;

        this.allOPLocations = {};
        this.from = {};
        this.to = {};

        this.fetchVocabulary();
        this.fetchTypes();
        this.fetchOperationalPoints();
        this.fetchVehicleTypes();
    }

    componentDidMount() {
        this.loadPermalinkInfo();
    }

    componentDidUpdate() {
        const { language } = this.state;
        const storedLanguage = window.localStorage.getItem("language") || "en";

        if (language !== storedLanguage) {
            this.setState({ language: storedLanguage });
        }
    }

    loadPermalinkInfo = async () => {
        const { fromId, fromLat, fromLng, toId, toLat,
            toLng, maxRoutes, compatibilityVehicleType } = queryString.parse(this.props.location.search);

        this.setState({
            maxRoutes: maxRoutes || 1,
            compatibilityVehicleType: compatibilityVehicleType || null
        });

        if (fromId && fromLat && fromLng && toId && toLat && toLng) {
            try {
                // Fetch from and to tiles
                const fromCoords = [parseFloat(fromLng), parseFloat(fromLat)];
                const toCoords = [parseFloat(toLng), parseFloat(toLat)];

                await Promise.all([
                    this.fetchImplementationTile({ coords: fromCoords }),
                    this.fetchAbstractionTile({ coords: fromCoords }),
                    this.fetchImplementationTile({ coords: toCoords }),
                    this.fetchAbstractionTile({ coords: toCoords })
                ])

                // Set from and to OPs
                this.setState({ from: fromId, to: toId }, () => {
                    // Call route calculation function
                    this.fromTo();
                });
            } catch (e) {
                console.error(e);
                Alert.error(getPhrase('wrongPermalink', this.state.language), 5000);
            }
        } else {
            this.fetchImplementationTile({ coords: this.state.center, zoom: 10 });
        }
    }

    fetchVocabulary = () => {
        const rdfetcht = new RDFetch();
        rdfetcht.addEventListener("message", (e) => {
            if (e.data === "done") {
                rdfetcht.terminate();
                this.setState({ justFetchedVocabulary: true });
            } else {
                this.graphStore.add(Utils.rebuildQuad(e.data));
            }
        });
        rdfetcht.postMessage({ url: ERA_ONTOLOGY });
    };

    fetchTypes = () => {
        const rdfetcht = new RDFetch();
        rdfetcht.addEventListener("message", (e) => {
            if (e.data === "done") {
                rdfetcht.terminate();
            } else {
                this.graphStore.add(Utils.rebuildQuad(e.data));
            }
        });
        rdfetcht.postMessage({ url: ERA_TYPES });
    };

    fetchOperationalPoints() {
        const rdfetcht = new RDFetch();
        let count = 0;
        let currentSubject = null;
        let tempGraphStore = GraphStore();

        rdfetcht.addEventListener('message', e => {
            if (e.data === 'done') {
                rdfetcht.terminate();
                this.setState({ fetchingOPs: false });
                this.setOPPickers(tempGraphStore);
            } else {
                const q = Utils.rebuildQuad(e.data);

                if (q.subject.value !== currentSubject) {
                    currentSubject = q.subject.value;
                    count++;
                    if (count % 10000 === 0) {
                        this.setOPPickers(tempGraphStore);
                        tempGraphStore = GraphStore();
                    }
                }

                this.graphStore.add(q);
                tempGraphStore.add(q);
            }
        });

        rdfetcht.postMessage({
            url: ERA_OPERATIONAL_POINTS,
            headers: { 'Accept': 'text/turtle' }
        });
    }

    fetchVehicleTypes() {
        const rdfetcht = new RDFetch();

        rdfetcht.addEventListener('message', e => {
            if (e.data === 'done') {
                rdfetcht.terminate();
                this.setVehicleTypesPicker();
                this.setState({ initLoad: false });
            } else {
                this.graphStore.add(Utils.rebuildQuad(e.data));
            }
        });
        rdfetcht.postMessage({
            url: ERA_VEHICLE_TYPES,
            headers: { 'Accept': 'text/turtle' }
        });
    }

    fetchImplementationTile = ({ coords, asXY, zoom, force, rebuild }) => {
        return new Promise(resolve => {
            const tileFetcher = this.tileFetcherPool.runTask(
                IMPLEMENTATION_TILES,
                zoom || IMPLEMENTATION_ZOOM,
                coords, asXY, force
            );

            if (tileFetcher) {
                let setLoader = false;
                // Show loading gifs
                this.toggleLoading(true);
                if (!this.state.calculatingRoute && !this.state.loaderMessage) {
                    setLoader = true;
                    this.setLoaderMessage(getPhrase('fetchingData', this.state.language));
                }

                // New Graphy RDF store object to avoid reread issue (if rebuild)
                const tileGraph = rebuild ? GraphStore() : this.graphStore;
                let i = 0;

                const ondata = e => {
                    const quad = e.data.quad;
                    if (quad) {
                        // Store all RDFJS quads in Graphy's graph store for later querying
                        tileGraph.add(quad);

                        // Extract Operational Point location for visualization
                        if (quad.predicate.value === GEOSPARQL.asWKT) {
                            i++;
                            const subject = quad.subject.value;
                            const coords = wktParse(quad.object.value).coordinates;
                            this.allOPLocations[subject] = coords;
                            // Throttle MN rendering for performance
                            if (i % 400 === 0) this.renderOperationalPoints();
                        }
                    }
                    if (e.data.done) {
                        tileFetcher.dispatchEvent(new Event('done'));
                    }
                };
                const ondone = () => {
                    if (this.tileFetcherPool.allWorkersFree()) {
                        // Hide loading gifs
                        this.toggleLoading(false);
                        if (!this.state.calculatingRoutes && setLoader) {
                            this.setLoaderMessage(null);
                        }
                    }
                    tileFetcher.removeEventListener('data', ondata);
                    tileFetcher.removeEventListener('done', ondone);

                    // Merge RDF graph in new Graphy store to avoid multiple triple reading issues
                    if (rebuild) {
                        tileGraph.addQuads(this.graphStore.quads());
                        this.graphStore = tileGraph;
                    }

                    this.renderOperationalPoints();
                    resolve();
                };

                tileFetcher.addEventListener('data', ondata);
                tileFetcher.addEventListener('done', ondone);
            } else {
                this.renderOperationalPoints();
                resolve();
            }
        });
    }

    fetchAbstractionTile = ({ coords, asXY, zoom, force }) => {
        return new Promise(resolve => {
            const tileFetcher = this.tileFetcherPool.runTask(
                ABSTRACTION_TILES,
                zoom || ABSTRACTION_ZOOM,
                coords, asXY, force
            );
            // Draw tile frame on the map
            this.drawTileFrame(coords, ABSTRACTION_ZOOM, asXY);

            if (tileFetcher) {
                // Show loading gifs
                this.toggleLoading(true);
                if (!this.state.calculatingRoutes) {
                    this.setLoaderMessage(getPhrase('fetchingData', this.state.language));
                }

                const ondata = e => {
                    const quad = e.data.quad;
                    if (quad) {
                        Utils.processTopologyQuads([quad], this.networkGraph)
                    } else if (e.data.done) {
                        tileFetcher.dispatchEvent(new Event('done'));
                    }
                }

                const ondone = () => {
                    if (this.tileFetcherPool.allWorkersFree()) {
                        // Hide loading gifs
                        this.toggleLoading(false);
                        if (!this.state.calculatingRoutes) {
                            this.setLoaderMessage(null);
                        }
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

    renderOperationalPoints = () => {
        const obj = {};
        let mns = Object.keys(this.allOPLocations);

        // Filter out Operational Points outside viewport
        if (this.state.bounds) {
            mns = mns.filter(mn => this.state.bounds.contains(this.allOPLocations[mn]));
        }
        // If route filter is given, display only associated OPs
        if (this.state.routeFilter.size > 0) {
            mns = mns.filter(mn => this.state.routeFilter.has(this.allOPLocations[mn].join('_')));
        }

        for (const mn of mns) {
            obj[mn] = this.allOPLocations[mn];
        }

        this.setState(() => { return { displayOPs: obj } });
    }

    updateOPLocations = locs => {
        locs.forEach(l => {
            this.allOPLocations[l[0]] = l[1];
        });
        this.renderOperationalPoints();
    }

    updateRouteFilter = filter => {
        this.setState({ routeFilter: filter }, () => {
            this.renderOperationalPoints();
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

    setOPPickers = async opgs => {
        const ops = await Utils.getAllOperationalPoints(opgs);
        if (ops) {
            this.setState(state => {
                return {
                    operationalPoints: [...state.operationalPoints, ...ops].sort((a, b) => a.label.localeCompare(b.label))
                }
            });
        }
    }

    setVehicleTypesPicker = async () => {
        const vts = await Utils.getAllVehicleTypes(this.graphStore);
        this.setState({ vehicleTypes: vts, fetchingVTs: false });
    }

    setCompatibilityVehicleType = v => {
        this.setState({ compatibilityVehicleType: v });
    };

    selectOperationalPoint = async (op, opLoc, type) => {
        // Get OP geolocation
        const lngLat = Utils.getCoordsFromLocation(opLoc, this.graphStore);
        // Start building network graph.
        await Promise.all([
            this.fetchImplementationTile({ coords: lngLat }),
            //this.fetchAbstractionTile({ coords: lngLat })
        ]);

        if (type === 'from') {
            if (this.state.to) {
                // We have both FROM and TO, start the route planning process
                this.setState({ from: op }, () => {
                    this.fromTo();
                });
            } else {
                // We have only FROM, then zoom in to its location
                this.setState({ from: op, center: lngLat, zoom: [14] });
            }
        } else {
            if (this.state.from) {
                // We have both FROM and TO, start the route planning process
                this.setState({ to: op }, () => {
                    this.fromTo();
                });
            } else {
                // We have only TO, then zoom in to its location
                this.setState({ to: op, center: lngLat, zoom: [14] });
            }
        }
    }

    fitMap = coords => {
        return new Promise((resolve, reject) => {
            this.setState({ queryBounds: coords }, () => {
                resolve();
            })
        });
    }

    fromTo = async () => {
        // Data is already being fetched so do nothing in the meantime
        if (this.state.loading) return false;

        // Get reachable micro NetElements of FROM Operational Point
        const fromMicroNEs = Utils.getMicroNetElements(this.state.from, this.graphStore);
        const fromOp = Utils.getOPInfo(this.state.from, this.graphStore);

        if (fromMicroNEs.length === 0) {
            this.setState({ showTileFrames: false });
            const label = Utils.getLiteralInLanguage(fromOp[RDFS.label], this.state.language);
            // Show warning of disconnected NetElement
            Alert.warning(getPhrase('disconnectedOP', this.state.language, label), 10000);
            return;
        }

        // Get geolocation of FROM OP
        this.from.lngLat = Utils.getCoordsFromOP(this.state.from, this.graphStore);
        this.from.microNEs = fromMicroNEs;

        // Get reachable micro NetElements of TO Operational Point
        const toMicroNEs = Utils.getMicroNetElements(this.state.to, this.graphStore);
        const toOp = Utils.getOPInfo(this.state.to, this.graphStore);

        if (toMicroNEs.length === 0) {
            this.setState({ showTileFrames: false });
            const label = Utils.getLiteralInLanguage(toOp[RDFS.label], this.state.language);
            // Show warning of disconnected NetElement
            Alert.warning(getPhrase('disconnectedOP', this.state.language, label), 10000);
            return;
        }

        // Get geolocation of TO OP
        this.to.lngLat = Utils.getCoordsFromOP(this.state.to, this.graphStore);
        this.to.microNEs = toMicroNEs;

        // Handle case where FROM and TO are the same
        if (this.state.from === this.state.to) {
            Alert.warning('Please select different FROM and TO Operational Points', 5000);
            return;
        }

        // Fit map to selected query
        await this.fitMap([this.from.lngLat, this.to.lngLat]);

        // Set OP filter to show only FROM and TO
        this.updateRouteFilter(new Set([
            this.from.lngLat.join('_'),
            this.to.lngLat.join('_')
        ]));

        const t0 = new Date();

        // Call OSRM API
        const osrmURL = `${OSRM_API}?from=${this.from.lngLat.join(',')}&to=${this.to.lngLat.join(',')}`;
        const res = await fetch(osrmURL);

        res.json().then(route => {
            if (route && route.length > 0) {
                console.log('Route calculated in', new Date() - t0, 'ms');
                // Report found route
                this.setState({
                    routes: [{
                        path: route,
                        renderNodes: false,
                        style: randomRouteStyle()
                    }]
                });
            } else {
                // There are no routes between the given OPs
                Alert.warning('There are no possible routes between these two locations', 10000);
            }

            // Route planner finished, remove tiles and loading data signals
            this.setState({ showTileFrames: false });
            this.toggleRouteCalculation(false);
        });

        // Start loading animations
        this.toggleRouteCalculation(true);
        this.setLoaderMessage(getPhrase('calculatingRoutes', this.state.language));
    }

    checkCompatibility = route => {
        if (this.state.compatibilityVehicleType) {
            const reports = route.map(track => {
                return verifyCompatibility(track, this.state.compatibilityVehicleType, this.graphStore);
            });
            return reports;
        }
    };

    toggleRouteCalculation = flag => {
        this.setState({ calculatingRoutes: flag });
    }

    setLoaderMessage = (m) => {
        return new Promise(resolve => {
            this.setState({ loaderMessage: m }, () => { resolve() });
        });
    }

    setMaxRoutes(n) {
        this.setState({ maxRoutes: n });
    }

    clearVehicleType = () => {
        this.setState({ compatibilityVehicleType: null });
    }

    clearRoutes(param) {
        if (this.pathFinder) {
            // Kill web worker
            this.pathFinder.terminate();
            this.pathFinder = null;
        }

        if (param === 'from') {
            this.from = {};
            this.setState({ from: '' });
        } else {
            this.to = {};
            this.setState({ to: '' });
        }

        this.setLoaderMessage(null);
        this.setState({
            routes: [],
            routeFilter: new Set(),
            tileFrames: new Map(),
            showTileFrames: false,
            calculatingRoutes: false,
            loading: false
        }, () => { this.renderOperationalPoints() });
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
        this.setState({
            bounds: map.getBounds()
        }, () => {
            if (!this.state.calculatingRoutes) {
                this.fetchImplementationTile({ coords: [center.lng, center.lat] });
            }
        });
    }

    onZoomEnd = map => {
        const center = map.getCenter();
        this.setState({
            bounds: map.getBounds()
        }, () => {
            if (!this.state.calculatingRoutes) {
                this.fetchImplementationTile({ coords: [center.lng, center.lat] });
            }
        });
    }

    render() {
        const {
            center,
            zoom,
            queryBounds,
            queryBoundsOpts,
            displayOPs,
            popup,
            loading,
            tileFrames,
            helpPage,
            internalView,
            internalViewNode,
            internalViewPath,
            pathColor,
            showTileFrames,
            operationalPoints,
            fetchingOPs,
            vehicleTypes,
            fetchingVTs,
            routes,
            from,
            to,
            maxRoutes,
            calculatingRoutes,
            loaderMessage,
            compatibilityVehicleType,
            language
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
                                <div style={sidebarHeader}>
                                    <span style={{ marginLeft: 12 }}>{getPhrase("routeCompatibilityCheck", language)}</span>
                                    <Icon icon="info-circle" size="lg" style={infoButton}
                                        title={getPhrase("howToUse", language)} onClick={() => this.toggleHelpPage(true)} />
                                </div>
                            </Sidenav.Header>

                            <SelectPicker
                                style={selectStyle}
                                placeholder={getPhrase("from", language)}
                                onSelect={(op, item) => this.selectOperationalPoint(op, item.location, 'from')}
                                onClean={() => this.clearRoutes('from')}
                                data={operationalPoints}
                                value={from}
                                renderMenu={menu => {
                                    if (fetchingOPs) {
                                        return (
                                            <p style={{ padding: 4, color: '#999', textAlign: 'center' }}>
                                                <Icon icon="spinner" spin />{getPhrase('loading', language)}...
                                            </p>
                                        )
                                    }
                                    return menu;
                                }}
                                renderValue={(value, item) => {
                                    return (
                                        <div>
                                            <span style={{ color: '#575757' }}>
                                                {getPhrase("from", language)}:
                                            </span>{' '}
                                            {item && item.label}
                                        </div>
                                    )
                                }}>
                            </SelectPicker>

                            <SelectPicker
                                style={selectStyle}
                                placeholder={getPhrase("to", language)}
                                onSelect={(op, item) => this.selectOperationalPoint(op, item.location, 'to')}
                                onClean={() => this.clearRoutes('to')}
                                data={operationalPoints}
                                value={to}
                                renderMenu={menu => {
                                    if (fetchingOPs) {
                                        return (
                                            <p style={{ padding: 4, color: '#999', textAlign: 'center' }}>
                                                <Icon icon="spinner" spin />{getPhrase('loading', language)}...
                                            </p>
                                        )
                                    }
                                    return menu;
                                }}
                                renderValue={(value, item) => {
                                    return (
                                        <div>
                                            <span style={{ color: '#575757' }}>
                                                {getPhrase("to", language)}:
                                            </span>{' '}
                                            {item && item.label}
                                        </div>
                                    )
                                }}>
                            </SelectPicker>

                            <InputNumber
                                min={1}
                                value={maxRoutes}
                                style={inputStyle}
                                prefix={getPhrase("maxNumberOfRoutes", language)}
                                onChange={n => this.setMaxRoutes(n)} />

                            <SelectPicker
                                style={selectStyle}
                                placeholder={getPhrase("selectVehicleType", language)}
                                onSelect={v => this.setCompatibilityVehicleType(v)}
                                onClean={this.clearVehicleType}
                                data={vehicleTypes}
                                value={compatibilityVehicleType}
                                renderMenu={menu => {
                                    if (fetchingVTs) {
                                        return (
                                            <p style={{ padding: 4, color: '#999', textAlign: 'center' }}>
                                                <Icon icon="spinner" spin />{getPhrase('loading', language)}...
                                            </p>
                                        )
                                    }
                                    return menu;
                                }}>
                            </SelectPicker>

                            <Divider />
                        </div>

                        <RoutesInfo
                            from={this.from}
                            to={this.to}
                            routes={routes}
                            graphStore={this.graphStore}
                            routeExpansionHandler={this.routeExpansionHandler}
                            updateOPLocations={this.updateOPLocations}
                            compatibilityVehicleType={compatibilityVehicleType}
                            checkCompatibility={this.checkCompatibility}
                            setLoaderMessage={this.setLoaderMessage}
                            //toggleInternalView={this.toggleInternalView}
                            language={language}>
                        </RoutesInfo>

                        {loaderMessage && (
                            <Loader vertical size={'lg'} speed={'normal'} content={loaderMessage}></Loader>
                        )}

                        {!calculatingRoutes &&
                            <Container>
                                <RoutesExport
                                    routes={routes}
                                    graphStore={this.graphStore}
                                    from={from}
                                    to={to}
                                    routeExpansionHandler={this.routeExpansionHandler}
                                    setLoaderMessage={this.setLoaderMessage}
                                    compatibilityVehicleType={compatibilityVehicleType}
                                    checkCompatibility={this.checkCompatibility}
                                    toggleInternalView={this.toggleInternalView} />

                                <RoutesPermalink
                                    location={this.props.location}
                                    fromId={from}
                                    fromLoc={this.from.lngLat}
                                    toId={to}
                                    toLoc={this.to.lngLat}
                                    routes={routes}
                                    maxRoutes={maxRoutes}
                                    compatibilityVehicleType={compatibilityVehicleType} />
                            </Container>
                        }

                    </Sidebar>
                    <Container>
                        <Content>
                            <MapBox
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
                                    displayOPs={displayOPs}
                                    graphStore={this.graphStore}
                                    popupData={this.popupData}
                                ></OperationalPointsLayer>

                                {popup && (
                                    <OPPopup
                                        popup={popup}
                                        language={language}
                                        closePopup={this.closePopup}>
                                    </OPPopup>
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
