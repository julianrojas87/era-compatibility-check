import commander from 'commander';
import GraphStore from '@graphy/memory.dataset.fast';
import { NetworkGraph } from '../src/algorithm/NetworkGraph.js';
import { PathFinder } from '../src/algorithm/PathFinder.js';
import undici from 'undici';
import N3 from "n3";
import Utils from '../src/utils/Utils.js';
import { ERA } from '../src/utils/NameSpaces.js';
import {
    IMPLEMENTATION_TILES,
    ABSTRACTION_TILES,
    ABSTRACTION_ZOOM
} from '../src/config/config.js';

const GRAPH = 'http://era.europa.eu/knowledge-graph'
const NTRIPLES = 'application/n-triples';
const SPARQL = `https://linked.ec-dataplatform.eu/sparql?default-graph-uri=${GRAPH}&format=${NTRIPLES}&query=`;

const program = new commander.Command();

program
    .option('--from <from>', 'origin OP URI')
    .option('--to <to>', 'destination OP URI')
    .option('--zoom <zoom>', 'zoom level for topology tile fetching')
    .option('--debug', 'logging level');

program.parse(process.argv);

// Logging level
const debug = program.debug;
// Topology zoom
const tz = program.zoom || ABSTRACTION_ZOOM;
// Init KG store
const graphStore = GraphStore();
// Init Network Graph
const NG = new NetworkGraph();
// Tile cache
const tileCache = new Set();

async function main() {
    const fromId = program.from;
    const toId = program.to;

    // Get geolocations of OPs
    await fetchOPLocation([fromId, toId]);

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
    await Promise.all([
        fetchTileSet(fromCoords),
        fetchTileSet(toCoords)
    ]);

    // FROM and TO objects
    const from = {};
    const to = {};

    // Get reachable micro NetElements of FROM Operational Point
    const fromMicroNEs = Utils.getMicroNetElements(fromId, graphStore)
        .filter(ne => NG.nodes.has(ne.value))
        .map(ne => ne.value);;
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
        .filter(ne => NG.nodes.has(ne.value))
        .map(ne => ne.value);;
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
        tileCache,
        tilesBaseURI: ABSTRACTION_TILES,
        zoom: tz,
        fetch,
        debug
    });

    const t0 = new Date();
    // Calculate route
    const path = await pathFinder.aStar({ from, to, NG });
    
    console.info(`INFO: Found route: `, JSON.stringify(path, null, 3));
    console.info('Route caluclated in', new Date() - t0, 'ms');
}

async function fetch(url, opts) {
    const { body } = await undici.request(url, opts);
    return body;
}

async function fetchOPLocation(ops) {
    console.info('INFO: Fetching Operational Points geolocation...');

    const params = ops.map((op, i) => {
        return `
        <${op}> wgs:location ?loc_${i}.
        ?loc_${i} geosparql:asWKT ?wkt_${i}.`;
    }).join('\n');

    const query = `
    PREFIX wgs: <http://www.w3.org/2003/01/geo/wgs84_pos#>
    PREFIX geosparql: <http://www.opengis.net/ont/geosparql#>
    CONSTRUCT WHERE {
        ${params}
    }`;

    const opts = { headers: { Accept: NTRIPLES } };

    const quads = new N3.Parser({ format: 'N-Triples' })
        .parse(await (await fetch(SPARQL + encodeURIComponent(query), opts)).text());
    graphStore.addAll(quads);
}

async function fetchTileSet(coords) {
    await Promise.all([
        fetchImplTile({ coords }),
        fetchAbsTile({ coords })
    ]);
}

async function fetchImplTile({ coords }) {
    const tileUrl = `${IMPLEMENTATION_TILES}/${15}/${Utils.long2Tile(coords[0], 15)}/${Utils.lat2Tile(coords[1], 15)}`;
    if (!tileCache.has(tileUrl)) {
        tileCache.add(tileUrl);
        console.info('INFO: Fetching tile ', tileUrl);
        const quads = new N3.Parser({ format: 'N-triples' })
            .parse(await (await fetch(tileUrl, { headers: { Accept: NTRIPLES } })).text());
        graphStore.addAll(quads);
    }
}

async function fetchAbsTile({ coords }) {
    const tileUrl = `${ABSTRACTION_TILES}/${tz}/${Utils.long2Tile(coords[0], tz)}/${Utils.lat2Tile(coords[1], tz)}`;
    if (!tileCache.has(tileUrl)) {
        tileCache.add(tileUrl);
        console.info('INFO: Fetching tile ', tileUrl);
        const quads = new N3.Parser({ format: 'N-triples' })
            .parse(await (await fetch(tileUrl, { headers: { Accept: NTRIPLES } })).text());
        Utils.processTopologyQuads(quads, NG);
    }
}

main();