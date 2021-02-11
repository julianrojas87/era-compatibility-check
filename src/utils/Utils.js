import { stringQuadToQuad } from 'rdf-string';
import { namedNode, literal } from '@rdfjs/data-model';
import { a, ERA, GEOSPARQL, RDFS } from './NameSpaces';

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

function queryGraphStore(params) {
    let res = {};
    let obj = null;

    // Handle Object being a NamedNode or a Literal
    if (params.o) {
        obj = /(https?):\/\//.test(params.o) ? namedNode(params.o) : literal(params.o);
    }

    // Execute query
    const iterator = params.store.match(
        params.s ? namedNode(params.s) : null,
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
                        if (!path.includes(q.object.value)) {
                            res[q.subject.value][q.predicate.value].push(q.object.value);
                        }
                    } else {
                        if (path !== q.object.value) {
                            const arr = [path, q.object.value];
                            res[q.subject.value][q.predicate.value] = arr;
                        }
                    }
                } else {
                    res[q.subject.value][q.predicate.value] = q.object.value;
                }

            } else {
                res[q.subject.value] = { [q.predicate.value]: q.object.value };
            }
        }
        return res;
    } else {
        return null;
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
            label: `${vh[v][ERA.typeVersionNumber]} - ${vh[v][RDFS.label]}`,
            value: v
        }
    }));
}

async function getAllVehicles(store) {
    const vhs = queryGraphStore({
        store: store,
        p: a,
        o: ERA.Vehicle
    });

    return await Promise.all(Object.keys(vhs).map(async v => {
        const vh = queryGraphStore({
            store: store,
            s: v
        });

        return {
            label: `${vh[v][ERA.vehicleNumber]} - ${vh[v][ERA.vehicleSeries] || ''}`,
            value: v
        }
    }));
}

function getVehicleInfo(v, store) {
    const vh = queryGraphStore({
        store: store,
        s: v
    });

    if (vh && vh[v]) {
        vh[v]['@id'] = v;
        return vh[v];
    }
}

function getMicroNodeInfo(geometry, lngLat, graphStore) {
    // Query for MicroNode Implementation ID
    const mnImplId = queryGraphStore({
        store: graphStore,
        p: GEOSPARQL.hasGeometry,
        o: geometry
    });

    if (mnImplId) {
        // Query for all MicroNode attributes
        const sid = Object.keys(mnImplId)[0];
        const mnImpl = queryGraphStore({
            store: graphStore,
            s: sid
        });
        // Query for MicroNode Type
        const type = queryGraphStore({
            store: graphStore,
            s: mnImpl[sid][ERA.opType]
        });

        mnImpl[sid]['@id'] = sid;
        if (lngLat) mnImpl[sid].lngLat = [lngLat.lng, lngLat.lat];
        mnImpl[sid][ERA.opType] = type[mnImpl[sid][ERA.opType]];
        mnImpl[sid][ERA.opType]['@id'] = Object.keys(type)[0];

        return mnImpl[sid];
    }
}

function getMicroNodePorts(store, mn) {
    // Get Operational Point abstraction ID
    const mna = queryGraphStore({
        store: store,
        s: mn,
        p: ERA.hasAbstraction
    })[mn][ERA.hasAbstraction];

    // Query for all the NodePorts associated to this MicroNode
    const queryNps = queryGraphStore({
        store: store,
        p: ERA.belongsToNode,
        o: mna
    });

    // There are disconnected MicroNodes
    if (queryNps) {
        return Object.keys(queryNps);
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

    for (const inl of Object.keys(links)) {
        if (isInternalNodeLink(inl, store)) {
            inls.push({
                '@id': inl,
                ...queryGraphStore({ store, s: inl })[inl]
            });
        }
    }

    return inls;
}

function getMicroNodeFromNodePort(np, store) {
    // Get the associated MicroNode
    const mn = queryGraphStore({
        store: store,
        s: np,
        p: ERA.belongsToNode
    })[np][ERA.belongsToNode];

    if (Array.isArray(mn)) {
        return mn[0];
    } else {
        return mn;
    }
}

function getOperationalPointFromMicroNode(mn, store) {
    // Get the Operational Point ID
    const opid = queryGraphStore({
        store: store,
        s: mn,
        p: ERA.hasImplementation
    });

    if (opid) {
        const op = opid[mn][ERA.hasImplementation]
        // Get the Operational Point info
        const opObj = queryGraphStore({
            store: store,
            s: op
        });

        if (opObj) {
            opObj[op]['@id'] = op;
            // Query for MicroNode Type
            const type = queryGraphStore({
                store: store,
                s: opObj[op][ERA.opType]
            });

            opObj[op][ERA.opType] = type[opObj[op][ERA.opType]];
            opObj[op][ERA.opType]['@id'] = Object.keys(type)[0];

            return opObj[op];
        } else {
            return null;
        }
    } else {
        return null;
    }
}

function getNodePortInfo(np, store) {
    return queryGraphStore({
        store: store,
        s: np
    })[np];
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

function getTrackFromMicroLink(ml, store) {
    return queryGraphStore({
        store: store,
        s: ml,
        p: ERA.hasImplementation
    })[ml][ERA.hasImplementation];
}

function isNodePortIncoming(np, store) {
    const inLinks = queryGraphStore({
        store: store,
        p: ERA.endPort,
        o: np
    });

    for (const l of Object.keys(inLinks)) {
        if (isMicroLink(l, store)) {
            return true;
        }
    }

    return false;
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

function checkCompatibility(t, vehicle, store, includesVehicle) {
    const track = queryGraphStore({
        store: store,
        s: t
    })[t];
    track['@id'] = t;
    const report = {};
    let vehicleType = vehicle;

    if (includesVehicle) {
        vehicleType = vehicle[ERA.vehicleType];
    }

    // Check Gauging
    const gauging = compareEqualValues(track[ERA.gaugingProfile], vehicleType[ERA.gaugingProfile]);
    report[ERA.gaugingProfile] = {
        predicates: [ERA.gaugingProfile],
        compatible: gauging && gauging.length > 0,
        values: {
            track: track[ERA.gaugingProfile],
            vehicle: vehicleType[ERA.gaugingProfile]
        }
    }

    // Check Train detection system
    const tds = compareEqualValues(track[ERA.trainDetectionSystem], vehicleType[ERA.trainDetectionSystem]);
    report[ERA.trainDetectionSystem] = {
        predicates: [ERA.trainDetectionSystem],
        compatible: tds && tds.length > 0,
        values: {
            track: track[ERA.trainDetectionSystem],
            vehicle: vehicleType[ERA.trainDetectionSystem]
        }
    }

    // Check Hot axle box detection
    const habd = track[ERA.hasHotAxleBoxDetector] && vehicleType[ERA.axleBearingConditionMonitoring];
    report[ERA.hasHotAxleBoxDetector] = {
        predicates: [ERA.hasHotAxleBoxDetector, ERA.axleBearingConditionMonitoring],
        compatible: habd,
        values: {
            track: track[ERA.hasHotAxleBoxDetector],
            vehicle: vehicleType[ERA.axleBearingConditionMonitoring]
        }
    }

    // Check Rail inclination
    const ri = compareEqualValues(track[ERA.railInclination], vehicleType[ERA.railInclination]);
    report[ERA.railInclination] = {
        predicates: [ERA.railInclination],
        compatible: ri,
        values: {
            track: track[ERA.railInclination],
            vehicle: vehicleType[ERA.railInclination]
        }
    }

    // Check Wheelset gauge
    const wsg = compareEqualValues(track[ERA.wheelSetGauge], vehicleType[ERA.wheelSetGauge]);
    report[ERA.wheelSetGauge] = {
        predicates: [ERA.wheelSetGauge],
        compatible: wsg && wsg.length > 0,
        values: {
            track: track[ERA.wheelSetGauge],
            vehicle: vehicleType[ERA.wheelSetGauge]
        }
    }

    // Check Minimum wheel diameter
    const mwd = parseInt(vehicleType[ERA.minimumWheelDiameter]) >= parseInt(track[ERA.minimumWheelDiameter]);
    report[ERA.minimumWheelDiameter] = {
        predicates: [ERA.minimumWheelDiameter],
        compatible: mwd,
        values: {
            track: track[ERA.minimumWheelDiameter],
            vehicle: vehicleType[ERA.minimumWheelDiameter]
        }
    }

    // Check Minimum horizontal radius
    const mhr = parseInt(track[ERA.minimumHorizontalRadius]) >= parseInt(vehicleType[ERA.minimumHorizontalRadius]);
    report[ERA.minimumHorizontalRadius] = {
        predicates: [ERA.minimumHorizontalRadius],
        compatible: mhr,
        values: {
            track: track[ERA.minimumHorizontalRadius],
            vehicle: vehicleType[ERA.minimumHorizontalRadius]
        }
    }

    // Check min temperature
    const mint = parseInt(vehicleType[ERA.minimumTemperature]) <= parseInt(track[ERA.minimumTemperature]);
    report[ERA.minimumTemperature] = {
        predicates: [ERA.minimumTemperature],
        compatible: mint,
        values: {
            track: track[ERA.minimumTemperature],
            vehicle: vehicleType[ERA.minimumTemperature]
        }
    }

    // Check max temperature
    const maxt = parseInt(vehicleType[ERA.maximumTemperature]) >= parseInt(track[ERA.maximumTemperature]);
    report[ERA.maximumTemperature] = {
        predicates: [ERA.maximumTemperature],
        compatible: maxt,
        values: {
            track: track[ERA.maximumTemperature],
            vehicle: vehicleType[ERA.maximumTemperature]
        }
    }

    // Check energy supply system
    const ess = compareEqualValues(track[ERA.energySupplySystem], vehicleType[ERA.energySupplySystem]);
    report[ERA.energySupplySystem] = {
        predicates: [ERA.energySupplySystem],
        compatible: ess,
        values: {
            track: track[ERA.energySupplySystem],
            vehicle: vehicleType[ERA.energySupplySystem]
        }
    }

    // Check max current at standstill per pantograph
    const mcsp = parseFloat(vehicleType[ERA.maxCurrentStandstillPantograph]) <= parseFloat(track[ERA.maxCurrentStandstillPantograph]);
    report[ERA.maxCurrentStandstillPantograph] = {
        predicates: [ERA.maxCurrentStandstillPantograph],
        compatible: mcsp,
        values: {
            track: parseFloat(track[ERA.maxCurrentStandstillPantograph]),
            vehicle: parseFloat(vehicleType[ERA.maxCurrentStandstillPantograph])
        }
    }

    // Check min contact wire height
    const mincwh = parseFloat(vehicleType[ERA.minimumContactWireHeight]) <= parseFloat(track[ERA.minimumContactWireHeight]);
    report[ERA.minimumContactWireHeight] = {
        predicates: [ERA.minimumContactWireHeight],
        compatible: mincwh,
        values: {
            track: parseFloat(track[ERA.minimumContactWireHeight]),
            vehicle: parseFloat(vehicleType[ERA.minimumContactWireHeight])
        }
    }

    // Check max contact wire height
    const maxcwh = parseFloat(vehicleType[ERA.maximumContactWireHeight]) >= parseFloat(track[ERA.maximumContactWireHeight]);
    report[ERA.maximumContactWireHeight] = {
        predicates: [ERA.maximumContactWireHeight],
        compatible: maxcwh,
        values: {
            track: parseFloat(track[ERA.maximumContactWireHeight]),
            vehicle: parseFloat(vehicleType[ERA.maximumContactWireHeight])
        }
    }

    // Check contact strip materials
    const csm = compareEqualValues(track[ERA.contactStripMaterial], vehicleType[ERA.contactStripMaterial]);
    report[ERA.contactStripMaterial] = {
        predicates: [ERA.contactStripMaterial],
        compatible: csm,
        values: {
            track: track[ERA.contactStripMaterial],
            vehicle: vehicleType[ERA.contactStripMaterial]
        }
    }

    // Noise restrictions
    const nrs = track[ERA.isQuietRoute] === 'false' || (track[ERA.isQuietRoute] === 'true'
        && vehicle[ERA.operationalRestriction] !== 'http://era.europa.eu/concepts/restrictions#2.7.7');
    report[ERA.operationalRestriction] = {
        predicates: [ERA.operationalRestriction, ERA.isQuietRoute],
        compatible: nrs,
        values: {
            track: track[ERA.isQuietRoute],
            vehicle: vehicle[ERA.operationalRestriction]
        }
    }
    return report;
}

function compareEqualValues(p1, p2) {
    if (Array.isArray(p1)) {
        if (Array.isArray(p2)) {
            return p1.filter(p => p2.includes(p));
        } else {
            if (p1.includes(p2)) return [p2];
            return null;
        }
    } else {
        if (Array.isArray(p2)) {
            if (p2.includes(p1)) return [p1];
            return null;
        } else {
            if (p1 === p2) return [p1];
            return null;
        }
    }
}

export default {
    long2Tile,
    lat2Tile,
    tile2long,
    tile2lat,
    vh,
    vw,
    isValidHttpUrl,
    getTileFrame,
    rebuildQuad,
    queryGraphStore,
    getVehicleInfo,
    getAllVehicleTypes,
    getAllVehicles,
    getMicroNodeInfo,
    getMicroNodePorts,
    getAllNodePorts,
    getAllInternalNodeLinksFromNodePort,
    getMicroNodeFromNodePort,
    getOperationalPointFromMicroNode,
    getNodePortInfo,
    isMicroLink,
    isInternalNodeLink,
    isNodePortIncoming,
    getTrackFromMicroLink,
    checkCompatibility,
    deepClone
};