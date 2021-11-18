import Utils from '../utils/Utils';
import { ERA } from '../utils/NameSpaces';

function getTrackPropertyValue(t, params) {
    const value = Utils.deepLookup(t, params);
    // Check track applicability
    if (!value) {
        if (t[ERA.notApplicable]?.findIndex(na => na.value === params[params.length - 1]) >= 0) {
            return ERA.notApplicable;
        } else if (t[ERA.notYetAvailable]?.findIndex(nya => nya.value === params[params.length - 1]) >= 0) {
            return ERA.notYetAvailable;
        } else {
            return null;
        }
    } else {
        return value;
    }
}

export function verifyCompatibility(t, vt, store) {
    const track = Utils.getTrackInfo(t.id, store);
    const vehicleType = Utils.getVehicleTypeInfo(vt, store);
    const report = {};

    // Check Gauging profile
    const gauging = compareEqualValues(track[ERA.gaugingProfile], vehicleType[ERA.gaugingProfile]);
    report[ERA.gaugingProfile] = {
        predicates: [ERA.gaugingProfile],
        compatible: gauging && gauging.length > 0,
        values: {
            track: getTrackPropertyValue(track, [ERA.gaugingProfile]),
            vehicle: vehicleType[ERA.gaugingProfile]
        }
    }

    // Check Train detection system type as part of SET Train Detection System
    const tds = compareEqualValues(Utils.deepLookup(track, [ERA.trainDetectionSystem, ERA.trainDetectionSystemType]),
        vehicleType[ERA.trainDetectionSystemType]);
    report[ERA.trainDetectionSystem] = {
        predicates: [ERA.trainDetectionSystemType],
        compatible: tds && tds.length > 0,
        values: {
            track: getTrackPropertyValue(track, [ERA.trainDetectionSystem, ERA.trainDetectionSystemType]),
            vehicle: vehicleType[ERA.trainDetectionSystemType]
        }
    }

    // Check Hot axle box detection
    const trackHabd = track[ERA.hasHotAxleBoxDetector];
    const vehicleHabd = vehicleType[ERA.axleBearingConditionMonitoring];
    let habd = undefined;

    if (trackHabd && vehicleHabd) {
        habd = trackHabd.value === 'true' && vehicleHabd;
    }

    report[ERA.hasHotAxleBoxDetector] = {
        predicates: [ERA.hasHotAxleBoxDetector, ERA.axleBearingConditionMonitoring],
        compatible: habd,
        values: {
            track: getTrackPropertyValue(track, [ERA.hasHotAxleBoxDetector]),
            vehicle: vehicleType[ERA.axleBearingConditionMonitoring]
        }
    }

    // Check Rail inclination
    const ri = compareEqualValues(track[ERA.railInclination], vehicleType[ERA.railInclination]);
    report[ERA.railInclination] = {
        predicates: [ERA.railInclination],
        compatible: ri,
        values: {
            track: getTrackPropertyValue(track, [ERA.railInclination]),
            vehicle: vehicleType[ERA.railInclination]
        }
    }

    // Check Wheelset gauge
    const wsg = compareEqualValues(track[ERA.wheelSetGauge], vehicleType[ERA.wheelSetGauge]);
    report[ERA.wheelSetGauge] = {
        predicates: [ERA.wheelSetGauge],
        compatible: wsg && wsg.length > 0,
        values: {
            track: getTrackPropertyValue(track, [ERA.wheelSetGauge]),
            vehicle: vehicleType[ERA.wheelSetGauge]
        }
    }

    // Check Minimum wheel diameter
    const trackMwd = track[ERA.minimumWheelDiameter];
    const vehicleMwd = vehicleType[ERA.minimumWheelDiameter];
    let mwd = undefined;

    if (trackMwd && vehicleMwd) {
        mwd = parseInt(trackMwd.value) >= parseInt(vehicleMwd.value);
    }

    report[ERA.minimumWheelDiameter] = {
        predicates: [ERA.minimumWheelDiameter],
        compatible: mwd,
        values: {
            track: getTrackPropertyValue(track, [ERA.minimumWheelDiameter]),
            vehicle: vehicleType[ERA.minimumWheelDiameter]
        }
    }

    // Check Minimum horizontal radius
    const trackMhr = track[ERA.minimumHorizontalRadius];
    const vehicleMhr = vehicleType[ERA.minimumHorizontalRadius];
    let mhr = undefined;

    if (trackMhr && vehicleMhr) {
        mhr = parseInt(trackMhr.value) >= parseInt(vehicleMhr.value);
    }

    report[ERA.minimumHorizontalRadius] = {
        predicates: [ERA.minimumHorizontalRadius],
        compatible: mhr,
        values: {
            track: getTrackPropertyValue(track, [ERA.minimumHorizontalRadius]),
            vehicle: vehicleType[ERA.minimumHorizontalRadius]
        }
    }

    // Check min temperature
    const trackMint = track[ERA.minimumTemperature];
    const vehicleMint = vehicleType[ERA.minimumTemperature];
    let mint = undefined;

    if (trackMint && vehicleMint) {
        mint = parseInt(vehicleMint.value) <= parseInt(trackMint.value);
    }

    report[ERA.minimumTemperature] = {
        predicates: [ERA.minimumTemperature],
        compatible: mint,
        values: {
            track: getTrackPropertyValue(track, [ERA.minimumTemperature]),
            vehicle: vehicleType[ERA.minimumTemperature]
        }
    }

    // Check max temperature
    const trackMaxt = track[ERA.maximumTemperature];
    const vehicleMaxt = vehicleType[ERA.maximumTemperature];
    let maxt = undefined;

    if (trackMaxt && vehicleMaxt) {
        maxt = parseInt(vehicleMaxt.value) >= parseInt(trackMaxt.value);
    }

    report[ERA.maximumTemperature] = {
        predicates: [ERA.maximumTemperature],
        compatible: maxt,
        values: {
            track: getTrackPropertyValue(track, [ERA.maximumTemperature]),
            vehicle: vehicleType[ERA.maximumTemperature]
        }
    }

    // Check energy supply system as part of SET Contact Line System
    const ess = compareEqualValues(Utils.deepLookup(track, [ERA.contactLineSystem, ERA.energySupplySystem]),
        vehicleType[ERA.energySupplySystem]);
    report[ERA.energySupplySystem] = {
        predicates: [ERA.energySupplySystem],
        compatible: ess,
        values: {
            track: getTrackPropertyValue(track, [ERA.contactLineSystem, ERA.energySupplySystem]),
            vehicle: vehicleType[ERA.energySupplySystem]
        }
    }

    // Check max current at standstill per pantograph as part of SET Contact Line System
    const trackMscp = Utils.deepLookup(track, [ERA.contactLineSystem, ERA.maxCurrentStandstillPantograph]);
    const vehicleMscp = vehicleType[ERA.maxCurrentStandstillPantograph];
    let mcsp = undefined;

    if (trackMscp && vehicleMscp) {
        mcsp = parseFloat(vehicleMscp.value) <= parseFloat(trackMscp.value);
    }

    report[ERA.maxCurrentStandstillPantograph] = {
        predicates: [ERA.maxCurrentStandstillPantograph],
        compatible: mcsp,
        values: {
            track: getTrackPropertyValue(track, [ERA.contactLineSystem, ERA.maxCurrentStandstillPantograph]),
            vehicle: vehicleType[ERA.maxCurrentStandstillPantograph]
        }
    }

    // Check min contact wire height
    const trackMincwh = track[ERA.minimumContactWireHeight];
    const vehicleMincwh = vehicleType[ERA.minimumContactWireHeight];
    let mincwh = undefined;

    if (trackMincwh && vehicleMincwh) {
        if(Array.isArray(vehicleMincwh)) {
            mincwh = false;
            for(const v of vehicleMincwh) {
                if(parseFloat(v.value) <= parseFloat(trackMincwh.value)) {
                    mincwh = true;
                    break;
                }
            }
        } else {
            mincwh = parseFloat(vehicleMincwh.value) <= parseFloat(trackMincwh.value);
        }
    }

    report[ERA.minimumContactWireHeight] = {
        predicates: [ERA.minimumContactWireHeight],
        compatible: mincwh,
        values: {
            track: getTrackPropertyValue(track, [ERA.minimumContactWireHeight]),
            vehicle: vehicleType[ERA.minimumContactWireHeight]
        }
    }

    // Check max contact wire height
    const trackMaxcwh = track[ERA.maximumContactWireHeight];
    const vehicleMaxcwh = vehicleType[ERA.maximumContactWireHeight];
    let maxcwh = undefined;

    if (trackMaxcwh && vehicleMaxcwh) {
        if(Array.isArray(vehicleMaxcwh)) {
            maxcwh = false;
            for(const v of vehicleMaxcwh) {
                if(parseFloat(v.value) <= parseFloat(trackMaxcwh.value)) {
                    maxcwh = true;
                    break;
                }
            }
        } else {
            maxcwh = parseFloat(vehicleMaxcwh.value) >= parseFloat(trackMaxcwh.value);
        }
    }

    report[ERA.maximumContactWireHeight] = {
        predicates: [ERA.maximumContactWireHeight],
        compatible: maxcwh,
        values: {
            track: getTrackPropertyValue(track, [ERA.maximumContactWireHeight]),
            vehicle: vehicleType[ERA.maximumContactWireHeight]
        }
    }

    // Check contact strip materials
    const csm = compareEqualValues(track[ERA.contactStripMaterial], vehicleType[ERA.contactStripMaterial]);
    report[ERA.contactStripMaterial] = {
        predicates: [ERA.contactStripMaterial],
        compatible: csm,
        values: {
            track: getTrackPropertyValue(track, [ERA.contactStripMaterial]),
            vehicle: vehicleType[ERA.contactStripMaterial]
        }
    }

    // Noise restrictions (this property applies to era:Vehicle instances which we do not have anymore)
    const trackNrs = track[ERA.isQuietRoute];
    //const vehicleNrs = vehicle[ERA.operationalRestriction];
    let nrs = undefined;

    if (trackNrs /*&& vehicleNrs*/) {
        nrs = track[ERA.isQuietRoute].value === 'false' /*|| (track[ERA.isQuietRoute].value === 'true'
            && vehicle[ERA.operationalRestriction].value !== 'http://era.europa.eu/concepts/restrictions#2.7.7')*/;
    }

    report[ERA.operationalRestriction] = {
        predicates: [ERA.operationalRestriction, ERA.isQuietRoute],
        compatible: nrs,
        values: {
            track: getTrackPropertyValue(track, [ERA.isQuietRoute]),
            vehicle: null
        }
    }
    return report;
}

function compareEqualValues(p1, p2) {
    if (p1 && p2) {
        if (Array.isArray(p1)) {
            if (Array.isArray(p2)) {
                return p1.filter(p => p2.findIndex(q => p.value === q.value) >= 0);
            } else {
                if (p1.findIndex(p => p.value === p2.value) >= 0) return [p2];
                return null;
            }
        } else {
            if (Array.isArray(p2)) {
                if (p2.findIndex(p => p.value === p1.value) >= 0) return [p1];
                return null;
            } else {
                if (p1.value === p2.value) return [p1];
                return null;
            }
        }
    }
}