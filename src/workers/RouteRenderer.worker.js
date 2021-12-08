import GraphStore from '@graphy/memory.dataset.fast';
import { ROUTE_INFO } from '../config/config';
import { GEOSPARQL } from '../utils/NameSpaces';
import Utils from '../utils/Utils';
import { Parser } from 'n3';
import { parse as wktParse } from 'wellknown';
import { quadToStringQuad } from 'rdf-string';


self.addEventListener('message', async e => {
    const { route, fromLoc, toLoc, toFetch, opCache } = e.data;
    const graphStore = GraphStore();

    // Fetch all missing triples related to this route
    const locations = await fetchRouteTriples(toFetch, graphStore);

    // Build route structures
    const steps = [];
    const tracks = [];
    let first = false;
    let length = 0;

    for (const node of route.path) {
        // Prune initial nodes that are not in FROM OP
        if (!first && node.lngLat) {
            if (fromLoc.join('') === node.lngLat.join('')) {
                first = true;
            } else {
                continue;
            }
        }

        if (node.lngLat) {
            // NetElement belongs to an OP
            let op = null;
            if(opCache.has(node.opId)) {
                op = opCache.get(node.opId)
            } else {
                op = Utils.getOPInfo(node.opId, graphStore);
                opCache.set(node.opId, op);
            }
            
            if (!steps[op['@id']]) {
                steps[op['@id']] = op;
            }
        } else {
            // NetElement belongs to a SoL
            length += node.length;
            tracks.push({
                id: node.trackId || Utils.getTrackIdFromMicroNetElement(node.id, graphStore),
                length: node.length
            });
        }

        // Make sure we stop at a node in TO OP
        if (node.lngLat && toLoc.join('') === node.lngLat.join('')) {
            break;
        }
    }

    self.postMessage({ 
        steps, tracks, length, 
        locations, opCache, quads: [...graphStore].map(quadToStringQuad)
    });
});


async function fetchRouteTriples(ops, graphStore) {
    const locations = [];
    const res = await fetch(ROUTE_INFO, {
        method: 'POST',
        headers: { 'Accept': 'application/n-triples' },
        body: JSON.stringify(ops)
    });

    const rdfParser = new Parser({ format: 'N-Triples' });
    const quads = rdfParser.parse(await res.text());
    for(const q of quads) {
        if(q.predicate.value === GEOSPARQL.asWKT) {
            locations.push([q.subject.value, wktParse(q.object.value).coordinates]);
        }
        graphStore.add(q);
    }

    return locations;
}