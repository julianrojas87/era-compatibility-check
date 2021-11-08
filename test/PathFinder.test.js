import commander from 'commander';
import GraphStore from '@graphy/memory.dataset.fast';
import { NetworkGraph } from '../src/algorithm/NetworkGraph.js';
import { PathFinder } from '../src/algorithm/PathFinder.js';
import undici from 'undici';
import n3 from "n3";
import Utils from '../src/utils/Utils.js';
import { a, ERA } from '../src/utils/NameSpaces.js';
import {
    ERA_ONTOLOGY,
    ERA_TYPES,
    ERA_OPERATIONAL_POINTS,
    IMPLEMENTATION_TILES,
    IMPLEMENTATION_ZOOM,
    ABSTRACTION_TILES,
    ABSTRACTION_ZOOM
} from '../src/config/config.js';

const TURTLE = 'text/turtle';
const NTRIPLES = 'application/n-triples';

const program = new commander.Command();

program
    .option('--from <from>', 'origin OP URI')
    .option('--to <to>', 'destination OP URI')
    .option('--debug', 'logging level');

program.parse(process.argv);

// Logging level
const debug = program.debug;
// Init KG store
const graphStore = GraphStore();
// Init Network Graph
const NG = new NetworkGraph();
// Tile cache
const tileCache = new Set();

async function main() {
    await Promise.all([
        fetchOntology(),
        fetchSKOS(),
        fetchOPs()
    ]);

    const fromId = program.from;
    const toId = program.to;

    // Get geolocations of OPs
    const fromCoords = Utils.getCoordsFromOP(fromId, graphStore);
    if (!fromCoords) {
        console.error(`ERROR: Couldn't find location of provided FROM OP ${fromId}`);
        return;
    }
    const toCoords = Utils.getCoordsFromOP(toId, graphStore);
    if (!toCoords) {
        console.error(`ERROR: Couldn't find location of provided FROM OP ${toId}`);
        return;
    }

    // Fetch initial data tiles
    await fetchTileSet(fromCoords),
    await fetchTileSet(toCoords)

    // FROM and TO objects
    const from = {};
    const to = {};

    // Get reachable micro NetElements of FROM Operational Point
    const fromMicroNEs = Utils.getMicroNetElements(fromId, graphStore)
        .filter(ne => NG.nodes.has(ne.value));
    const fromOp = Utils.getOPInfo(fromId, graphStore);
    const fromLabel = Utils.getLiteralInLanguage(fromOp[ERA.opName], 'en');

    if (fromMicroNEs.length === 0) {
        // Show warning of disconnected NetElement
        console.error(`ERROR: Operational Point ${fromLabel} is not connected to the rail network`);
        return;
    }

    // Set FROM OP parameters
    from.microNEs = fromMicroNEs;
    from.lngLat = fromCoords;
    from.length = 0

    // Get reachable micro NetElements of FROM Operational Point
    const toMicroNEs = Utils.getMicroNetElements(toId, graphStore)
        .filter(ne => NG.nodes.has(ne.value));
    const toOp = Utils.getOPInfo(toId, graphStore);
    const toLabel = Utils.getLiteralInLanguage(toOp[ERA.opName], 'en');

    if (toMicroNEs.length === 0) {
        // Show warning of disconnected NetElement
        console.error(`ERROR: Operational Point ${toLabel} is not connected to the rail network`);
        return;
    }

    // Set TO OP parameters
    to.microNEs = toMicroNEs;
    to.lngLat = toCoords;
    to.length = 0

    console.info(`INFO: Calculating shortest path between ${fromLabel} and ${toLabel}...`);
    const pathFinder = new PathFinder({
        networkGraph: NG,
        graphStore: graphStore,
        fetchAbstractionTile: fetchAbsTile,
        fetchImplementationTile: fetchImplTile,
        tileCache,
        tilesBaseURI: ABSTRACTION_TILES,
        zoom: ABSTRACTION_ZOOM,
        debug
    });

    const path = await pathFinder.AStar(from, to, NG);
    console.info(`INFO: Found route: `, JSON.stringify(path, null, 3));
}

async function fetch(url, accept) {
    if (debug) console.debug(`DEBUG: Fetching data from ${url}...`);
    const { body } = await undici.request(url, { headers: { 'Accept': accept } });
    const parser = new n3.StreamParser();

    return body.pipe(parser);
}

async function fetchOPs() {
    console.info('INFO: Fetching Operational Points...');
    const quads = await fetch(ERA_OPERATIONAL_POINTS, TURTLE);
    for await (const quad of quads) {
        graphStore.add(quad);
    }
}

async function fetchOntology() {
    console.info('INFO: Fetching ERA Ontology...');
    const quads = await fetch(ERA_ONTOLOGY, TURTLE);
    for await (const quad of quads) {
        graphStore.add(quad);
    }
}

async function fetchSKOS() {
    console.info('INFO: Fetching ERA SKOS vocabularies...');
    const quads = await fetch(ERA_TYPES, TURTLE);
    for await (const quad of quads) {
        graphStore.add(quad);
    }
}

async function fetchTileSet(coords) {
    await fetchImplTile({ coords });
    await fetchAbsTile({ coords });
}

async function fetchImplTile({ coords }) {
    const z = IMPLEMENTATION_ZOOM;
    const tileUrl = `${IMPLEMENTATION_TILES}/${z}/${Utils.long2Tile(coords[0], z)}/${Utils.lat2Tile(coords[1], z)}`;
    const quads = await fetch(tileUrl, NTRIPLES);
    for await (const quad of quads) {
        graphStore.add(quad);
    }
    tileCache.add(tileUrl);
}

async function fetchAbsTile({ coords }) {
    const z = ABSTRACTION_ZOOM;
    const tileUrl = `${ABSTRACTION_TILES}/${z}/${Utils.long2Tile(coords[0], z)}/${Utils.lat2Tile(coords[1], z)}`;
    const quads = await fetch(tileUrl, NTRIPLES);
    for await (const quad of quads) {
        if (quad.predicate.value === a && quad.object.value === ERA.NetElement) {
            // Got a era:NetElement then create a node in the NG
            NG.setNode({ id: quad.subject.value });
        } else if (quad.predicate.value === ERA.length) {
            // Got era:length property then add to the corresponding node in the NG 
            NG.setNode({
                id: quad.subject.value,
                length: quad.object.value
            });
        } else if (quad.predicate.value === ERA.elementPart) {
            // Got era:elementPart property then link NG node to its meso-level entity
            NG.setNode({
                id: quad.object.value,
                mesoElement: quad.subject.value
            });
        } else if (quad.predicate.value === ERA.NetRelation) {
            // Got a era:NetRelation then create node in the NG
            NG.setEdge({ id: quad.subject.value });
        } else if (quad.predicate.value === ERA.elementA) {
            // Got a topological relation (era:elementA) then add corresponding node and edge to NG.
            // No edge direction can be inferred yet. We need navigability for it.
            NG.setEdge({
                id: quad.subject.value,
                A: quad.object.value
            });
            NG.setNode({ id: quad.object.value })
        } else if (quad.predicate.value === ERA.elementB) {
            // Got a topological relation (era:elementB) then add corresponding node and edge to NG.
            // No edge direction can be inferred yet. We need navigability for it.
            NG.setEdge({
                id: quad.subject.value,
                B: quad.object.value
            });
            NG.setNode({ id: quad.object.value })
        } else if (quad.predicate.value === ERA.navigability) {
            // Got era:navigability then set edges direction accordingly.
            NG.setEdge({
                id: quad.subject.value,
                navigability: quad.object.value
            });
        }

        graphStore.add(quad);
    }
    tileCache.add(tileUrl)
    // Complement with geo info and clean up the NG
    Utils.complementNetworkGraph(NG, graphStore);
}

main();