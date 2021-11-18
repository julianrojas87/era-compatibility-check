import wktParse from 'wellknown';
import * as rdfString from 'rdf-string';
import rdfjs from '@rdfjs/data-model';
import { a, ERA, GEOSPARQL, WGS84, RDFS, OWL, RDF } from './NameSpaces.js';

const { stringQuadToQuad } = rdfString;
const { namedNode, literal, blankNode } = rdfjs;

function long2Tile(long, zoom) {
    return (Math.floor((long + 180) / 360 * Math.pow(2, zoom)));
}

function lat2Tile(lat, zoom) {
    return (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)));
}

function tile2long(x, z) {
    return (x / Math.pow(2, z) * 360 - 180);
}

function tile2lat(y, z) {
    var n = Math.PI - 2 * Math.PI * y / Math.pow(2, z);
    return (180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))));
}

function longLat2Tile(lngLat, z) {
    return `${long2Tile(lngLat[0], z)}/${lat2Tile(lngLat[1], z)}`;
}

function isValidHttpUrl(string) {
    let url;

    try {
        url = new URL(string);
    } catch (_) {
        return false;
    }

    return url.protocol === "http:" || url.protocol === "https:";
}

// Returns the amount of pixels for a given relative viewport height
function vh(v) {
    var h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    return (v * h) / 100;
}

// Returns the amount of pixels for a given relative viewport width
function vw(v) {
    var w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    return (v * w) / 100;
}

function getTileFrame(coords, z, asXY) {
    let tile = null;
    if (asXY) {
        tile = { x: coords[0], y: coords[1] };
    } else {
        tile = { x: long2Tile(coords[0], z), y: lat2Tile(coords[1], z) };
    }
    // Get the coordinates for the clock-wise [A, B, C, D, A] square
    const A = [tile2long(tile.x, z), tile2lat(tile.y, z)];
    const B = [tile2long(tile.x + 1, z), tile2lat(tile.y, z)];
    const C = [tile2long(tile.x + 1, z), tile2lat(tile.y + 1, z)];
    const D = [tile2long(tile.x, z), tile2lat(tile.y + 1, z)];

    return [A, B, C, D, A];
}

function rebuildQuad(str) {
    return stringQuadToQuad(str);
}

function processTopologyQuads(quads, NG) {
    for (const quad of quads) {
        /**
         * Build rail Network Graph (NG) from RDF quads.
         * The NG is a data structure G = (V, E) 
         * where V are built from era:NetElement entities and
         * E are built from era:NetRelation entities,
         * which have been simplified by the SPARQL CONSTRUCT queries
         * to simple entities that are era:linkedTo each other.
         * 
        */
        if (quad.predicate.value === GEOSPARQL.asWKT) {
            // Got node geo coordinates
            NG.setNode({
                id: quad.subject.value,
                lngLat: wktParse(quad.object.value).coordinates
            });
        } else if (quad.predicate.value === ERA.length) {
            // Got era:length property
            NG.setNode({
                id: quad.subject.value,
                length: quad.object.value
            });
        } else if (quad.predicate.value === ERA.lineNationalId) {
            // Got era:lineNationalId property
            NG.setNode({
                id: quad.subject.value,
                lineNationalId: quad.object.value
            });
        } else if (quad.predicate.value === ERA.partOf) {
            // Got era:partOf property then link NG node to its meso-level entity
            NG.setNode({
                id: quad.subject.value,
                mesoElement: quad.object.value
            });
        } else if (quad.predicate.value === ERA.linkedTo) {
            // Got a era:linkedTo property that indicates a reachable node
            NG.setNode({
                id: quad.subject.value,
                nextNode: quad.object.value
            });
        }
    }
}

function queryGraphStore(params) {
    let res = {};
    let sub = null;
    let obj = null;

    // Handle Subject being a NamedNode or a BlankNode
    if (params.s) {
        if (params.s.value) {
            sub = params.s.value.startsWith('n3-') ? blankNode(params.s.value) : namedNode(params.s.value);
        } else {
            sub = params.s.startsWith('n3-') ? blankNode(params.s) : namedNode(params.s);
        }
    }

    // Handle Object being a NamedNode, Literal or BlankNode
    if (params.o) {
        obj = /(https?):\/\//.test(params.o) ? namedNode(params.o) : params.o.startsWith('n3-') ? blankNode(params.o) : literal(params.o);
    }

    // Execute query
    const iterator = params.store.match(
        sub,
        params.p ? namedNode(params.p) : null,
        obj
    );

    // Extract results (if any)
    if (iterator.size > 0) {
        for (const q of iterator) {
            if (res[q.subject.value]) {
                let path = res[q.subject.value][q.predicate.value];
                if (path) {
                    if (Array.isArray(path)) {
                        if (path.findIndex(o => o.value === q.object.value && o.language === q.object.language) < 0) {
                            res[q.subject.value][q.predicate.value].push(q.object);
                        }
                    } else {
                        if (path.value !== q.object.value) {
                            const arr = [path, q.object];
                            res[q.subject.value][q.predicate.value] = arr;
                        }
                    }
                } else {
                    res[q.subject.value][q.predicate.value] = q.object;
                }

            } else {
                res[q.subject.value] = { [q.predicate.value]: q.object };
            }
        }
        return res;
    } else {
        return null;
    }
}

function getPropertyDomain(property, store) {
    const domain = queryGraphStore({ s: property, p: RDFS.domain, store })

    if (!domain) return [];

    const domainBN = domain[property][RDFS.domain];

    if (domainBN && domainBN.startsWith('n3-')) {
        const domains = [];
        const unionBN = queryGraphStore({ s: domainBN, p: OWL.unionOf, store })[domainBN][OWL.unionOf];
        let domainList = queryGraphStore({ s: unionBN, store })[unionBN];
        domains.push(domainList[RDF.first]);

        while (domainList[RDF.rest] != RDF.nil) {
            domainList = queryGraphStore({ s: domainList[RDF.rest], store })[domainList[RDF.rest]];
            domains.push(domainList[RDF.first]);
        }

        return domains
    } else {
        return [domainBN];
    }
}

async function getAllOperationalPoints(store) {
    const ops = queryGraphStore({
        store,
        p: RDFS.label
    });

    if (ops) {
        return await Promise.all(Object.keys(ops).map(async op => {
            const opp = queryGraphStore({
                store,
                s: op
            });

            const label = opp[op][RDFS.label];

            return {
                value: op,
                label: `${Array.isArray(label) ? label.map(l => l.value).join(' / ')
                    : label.value} - ${opp[op][ERA.uopid].value}`,
                location: Array.isArray(opp[op][WGS84.location]) ? opp[op][WGS84.location][0].value
                    : opp[op][WGS84.location].value
            }
        }));
    }
}

async function getAllVehicleTypes(store) {
    const vhs = queryGraphStore({
        store: store,
        p: a,
        o: ERA.VehicleType
    });

    return await Promise.all(Object.keys(vhs).map(async v => {
        const vh = queryGraphStore({
            store: store,
            s: v
        });

        return {
            label: `${vh[v][ERA.typeVersionNumber].value} - ${vh[v][RDFS.label] ? vh[v][RDFS.label].value : ''}`,
            value: v
        }
    }));
}

function getOPInfo(opid, store) {
    // Query for all OP attributes
    const op = queryGraphStore({ store, s: opid });
    // Check this is an OP
    if (op && op[opid][ERA.uopid]) {
        // Query for OP Type
        if (op[opid][ERA.opType]) {
            const type = op[opid][ERA.opType].value;
            const opType = queryGraphStore({
                store,
                s: op[opid][ERA.opType]
            });

            if (opType) {
                op[opid][ERA.opType] = opType[type];
                op[opid][ERA.opType]['@id'] = type;
            }
        }

        // Query for OP location
        if (op[opid][WGS84.location]) {
            const l = Array.isArray(op[opid][WGS84.location]) ? op[opid][WGS84.location][0].value
                : op[opid][WGS84.location].value;
            const loc = queryGraphStore({
                store,
                s: l
            })[l];

            if (loc) {
                op[opid][WGS84.location] = loc;
                op[opid][WGS84.location]['@id'] = l;
            }
        }

        // Query for country info
        if (op[opid][ERA.inCountry]) {
            const cIds = Array.isArray(op[opid][ERA.inCountry]) ? op[opid][ERA.inCountry] : [op[opid][ERA.inCountry]];
            const cInfo = {};

            cIds.forEach(cId => {
                const country = queryGraphStore({
                    store,
                    s: cId.value
                });

                if (country) {
                    cInfo[cId.value] = country[cId.value];
                } else {
                    cInfo[cId.value] = null;
                }
            });

            op[opid][ERA.inCountry] = cInfo

        }

        // Attach entity @id
        op[opid]['@id'] = opid;

        return op[opid];
    }
}

function getCountryInfo(country, store) {
    const c = queryGraphStore({ store, s: country });
    if (c[country]) {
        c[country]['@id'] = country;
        return c[country];
    }
}


function getOPInfoFromLocation(geometry, lngLat, graphStore) {
    // Query for OP ID
    const opId = queryGraphStore({
        store: graphStore,
        p: WGS84.location,
        o: geometry
    });

    if (opId) {
        // Query for all OP attributes
        const op = getOPInfo(Object.keys(opId)[0], graphStore);
        if (lngLat) op.lngLat = [lngLat.lng, lngLat.lat];

        return op;
    }
}

function getOperationalPointFromMesoElement(me, store) {
    // Get the Operational Point ID
    const op = queryGraphStore({
        store,
        p: ERA.hasAbstraction,
        o: me
    });

    if (op) {
        const opid = Object.keys(op)[0];
        // Get the Operational Point info
        return getOPInfo(opid, store);
    } else {
        return null;
    }
}

function getOPFromMicroNetElement(mne, store) {
    // Get associated meso NetElement
    const ne = queryGraphStore({ store, p: ERA.elementPart, o: mne });
    const mesoNeId = Object.keys(ne)[0];
    // Get associated OP if any
    return getOperationalPointFromMesoElement(mesoNeId, store);
}

function getTrackIdFromMicroNetElement(mne, store) {
    const track = queryGraphStore({
        store: store,
        p: ERA.hasAbstraction,
        o: mne
    });

    if (track) {
        return Object.keys(track)[0];
    } else {
        return null;
    }
}

function getCoordsFromOP(op, store) {
    const loc = queryGraphStore({ store, s: op, p: WGS84.location });
    if (loc) {
        const l = loc[op][WGS84.location];
        return getCoordsFromLocation(Array.isArray(l) ? l[0].value : l.value, store);
    }
    return null;
}

function getCoordsFromLocation(loc, store) {
    const location = queryGraphStore({ store, s: loc })[loc];
    return wktParse(location[GEOSPARQL.asWKT].value).coordinates;
}

function getLengthFromMicroNetElement(mne, store) {
    // Get micro NetElement properties
    const microNe = queryGraphStore({ store, s: mne });
    return parseFloat(microNe[mne][ERA.length].value);
}

function getMicroNetElements(op, store) {
    // Get Operational Point meso NetElement
    const mesoNe = queryGraphStore({
        store: store,
        s: op,
        p: ERA.hasAbstraction
    })[op][ERA.hasAbstraction].value;

    // Query for all micro NetElements associated to this meso NetElement
    const queryNps = queryGraphStore({
        store: store,
        s: mesoNe,
        p: ERA.elementPart
    });

    // There are disconnected NetElements
    if (queryNps) {
        return Array.isArray(queryNps[mesoNe][ERA.elementPart])
            ? queryNps[mesoNe][ERA.elementPart] : [queryNps[mesoNe][ERA.elementPart]];
    } else {
        return [];
    }
}

function getVehicleTypeInfo(v, store) {
    const vh = queryGraphStore({ store, s: v });

    if (vh && vh[v]) {
        vh[v]['@id'] = v;
        return vh[v];
    }
}

function getTrackInfo(t, store) {
    const track = queryGraphStore({ store, s: t });

    if (track && track[t]) {
        track[t]['@id'] = t;

        // Expand train detection system (if any)
        if (track[t][ERA.trainDetectionSystem]) {
            const tdsId = track[t][ERA.trainDetectionSystem].value;
            const tds = queryGraphStore({ s: tdsId, store })[tdsId];
            if (tds) {
                track[t][ERA.trainDetectionSystem] = tds;
                track[t][ERA.trainDetectionSystem]['@id'] = tdsId;
            }
        }

        return track[t];
    }
}

function getAllNodePorts(store, mn) {
    // Query for all the NodePorts associated to this MicroNode
    const queryNps = queryGraphStore({
        store: store,
        p: ERA.belongsToNode,
        o: mn
    });

    // There are disconnected MicroNodes
    if (queryNps) {
        return Object.keys(queryNps);
    }
}

function getAllInternalNodeLinksFromNodePort(np, store) {
    const inls = [];
    const links = queryGraphStore({
        store,
        p: ERA.startPort,
        o: np,
    });

    if (links) {
        for (const inl of Object.keys(links)) {
            if (isInternalNodeLink(inl, store)) {
                inls.push({
                    '@id': inl,
                    ...queryGraphStore({ store, s: inl })[inl]
                });
            }
        }
    }

    return inls;
}

function isMicroLink(ml, store) {
    const q = queryGraphStore({
        store: store,
        s: ml,
        p: a,
        o: ERA.MicroLink
    });

    return q !== null;
}

function isInternalNodeLink(inl, store) {
    const q = queryGraphStore({
        store: store,
        s: inl,
        p: a,
        o: ERA.InternalNodeLink
    });

    return q !== null;
}

function isNodePortIncoming(np, store) {
    const inLinks = queryGraphStore({
        store: store,
        p: ERA.endPort,
        o: np
    });

    if (inLinks) {
        for (const l of Object.keys(inLinks)) {
            if (isMicroLink(l, store)) {
                return true;
            }
        }
    }

    return false;
}

function getMicroLinkFromNodePort(np, store) {
    const links = queryGraphStore({
        store: store,
        o: np
    });

    if (links) {
        for (const l of Object.keys(links)) {
            if (isMicroLink(l, store)) {
                return queryGraphStore({
                    store: store,
                    s: l
                })[l]
            }
        }
    }
}

function deepClone(obj) {
    let copy;

    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (obj instanceof Map) {
        return new Map(deepClone(Array.from(obj)));
    }

    if (obj instanceof Set) {
        return new Set(deepClone(Array.from(obj)));
    }

    if (obj instanceof Array) {
        copy = [];
        for (let i = 0, len = obj.length; i < len; i++) {
            copy[i] = deepClone(obj[i]);
        }
        return copy;
    }

    if (obj instanceof Object) {
        copy = {};
        for (const attr in obj) {
            if (obj.hasOwnProperty(attr)) {
                copy[attr] = deepClone(obj[attr]);
            }
        }
        return copy;
    }
    throw new Error('Unable to copy object! Its type isn\'t supported');
}

function deepLookup(obj, paths) {
    if (paths.length === 1) {
        return obj[paths[0]];
    } else {
        const path = paths.shift();
        if (obj[path]) {
            deepLookup(obj[path], paths);
        } else {
            return null;
        }
    }
}

function concatToPosition(fullList, partList, page, size) {
    const newList = [...fullList];
    let position = page * size;

    for (let i = 0; i < size; i++) {
        if (partList[i]) {
            newList[position + i] = partList[i];
        }
    }

    return newList;
}

function getLiteralInLanguage(values, language) {
    if (!values) {
        return '';
    } else if (Array.isArray(values)) {
        let i = values.findIndex(v => v.language === language);
        if (i < 0) {
            i = values.findIndex(v => v.language === 'en');
            if (i < 0) return values[0].value;
            return values[i].value;
        } else {
            return values[i].value;
        }
    } else {
        return values.value;
    }
}

export default {
    concatToPosition,
    long2Tile,
    lat2Tile,
    tile2long,
    tile2lat,
    longLat2Tile,
    vh,
    vw,
    isValidHttpUrl,
    getTileFrame,
    rebuildQuad,
    processTopologyQuads,
    queryGraphStore,
    getAllOperationalPoints,
    getAllVehicleTypes,
    getOPInfo,
    getCountryInfo,
    getOPInfoFromLocation,
    getOPFromMicroNetElement,
    getCoordsFromOP,
    getCoordsFromLocation,
    getLengthFromMicroNetElement,
    getMicroNetElements,
    getVehicleTypeInfo,
    getTrackInfo,
    getAllNodePorts,
    getAllInternalNodeLinksFromNodePort,
    getOperationalPointFromMesoElement,
    isMicroLink,
    isInternalNodeLink,
    isNodePortIncoming,
    getTrackIdFromMicroNetElement,
    getMicroLinkFromNodePort,
    deepClone,
    deepLookup,
    getPropertyDomain,
    getLiteralInLanguage
};
