import Utils from "../utils/Utils";
import { ABSTRACTION_ZOOM } from "../config/config";

/**
 * Adapted from https://github.com/vHawk/tiles-intersect
 * which is an implementation of http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.42.3443&rep=rep1&type=pdf
 */

export function findIntersectedTiles(from, to) {
    // Add 0.5 to each tile coordinate to draw the line from their center
    const a = [
        Utils.long2Tile(from[0], ABSTRACTION_ZOOM) + 0.5,
        Utils.lat2Tile(from[1], ABSTRACTION_ZOOM) + 0.5
    ];

    const b = [
        Utils.long2Tile(to[0], ABSTRACTION_ZOOM) + 0.5,
        Utils.lat2Tile(to[1], ABSTRACTION_ZOOM) + 0.5
    ];

    let x = Math.floor(a[0]);
    let y = Math.floor(a[1]);
    const endX = Math.floor(b[0]);
    const endY = Math.floor(b[1]);

    let points = [[x, y]];

    if (x === endX && y === endY) return points;

    const stepX = Math.sign(b[0] - a[0]);
    const stepY = Math.sign(b[1] - a[1]);

    const toX = Math.abs(a[0] - x - Math.max(0, stepX));
    const toY = Math.abs(a[1] - y - Math.max(0, stepY));

    const vX = Math.abs(a[0] - b[0]);
    const vY = Math.abs(a[1] - b[1]);

    let tMaxX = toX / vX;
    let tMaxY = toY / vY;

    const tDeltaX = 1 / vX;
    const tDeltaY = 1 / vY;

    while (!(x === endX && y === endY)) {
        if (tMaxX < tMaxY) {
            tMaxX = tMaxX + tDeltaX;
            x = x + stepX;
        } else {
            tMaxY = tMaxY + tDeltaY;
            y = y + stepY;
        }
        
        points.push([x, y]);
    }

    return points;
}