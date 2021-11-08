import EventEmitter from "events";
import TinyQueue from 'tinyqueue';
import { point } from '@turf/helpers';
import distance from '@turf/distance'
import Utils from '../utils/Utils.js';
import { NetworkGraph } from './NetworkGraph.js';
import { NAVIGS } from '../utils/NameSpaces.js';

export class PathFinder extends EventEmitter {
    constructor(props) {
        super();
        this.props = props;
        this.die = false;
    }

    // Yen's algorithm for top-k paths (https://en.wikipedia.org/wiki/Yen%27s_algorithm).
    async yen(from, to, K) {
        // Top-k paths
        const ksp = [];
        // Run A* to find first path
        const sp = await this.AStar(from, to, this.props.networkGraph);
        if (this.props.debug) console.debug('DEBUG: FIRST SHORTEST PATH', sp);

        if (sp) {
            // Emit this first path for rendering
            this.emit('path', sp);
            ksp.push(sp);

            for (let k = 1; k < K; k++) {
                // Heap that will hold the new alternative paths
                if (this.props.debug) console.debug('DEBUG: K = ', k);
                //const candidates = new TinyQueue([], (a, b) => { return a.length - b.length });
                const prevPath = ksp[k - 1];
                if (!prevPath) break;
                const nextShortestPath = null;

                if (this.props.debug) console.debug('DEBUG: -------------------------------------');
                // Iterate over the nodes of the previous found path
                for (let i = 0; i < prevPath.nodes.length - 2; i++) {
                    // Create a clone of the network graph that can be altered to allow finding new shortest paths
                    const NGClone = this.cloneNetworkGraph(this.props.networkGraph);
                    // Node from which an alternative route will be calculated
                    const spurNode = NGClone.nodes.get(prevPath.nodes[i].id);
                    if (this.props.debug) console.debug('DEBUG: SPUR NODE', spurNode);

                    // The sequence of nodes that lead to the spur node
                    const rootPath = {
                        nodes: Utils.deepClone(prevPath.nodes).slice(0, i),
                        edges: Utils.deepClone(prevPath.edges).slice(0, i)
                    };
                    if (this.props.debug) console.debug('DEBUG: ROOT PATH', rootPath);

                    // Go over all the, so far, found shortest paths and remove the edge following the spur node
                    // if the path matches the root path.
                    ksp.forEach(p => {
                        if (this.pathsAreEqual(rootPath.nodes, p.nodes.slice(0, i))) {
                            spurNode.depEdges.delete(p.edges[i]);
                        }
                    });

                    // Remove all the root path nodes from the cloned network graph
                    rootPath.nodes.forEach(n => {
                        NGClone.nodes.delete(n.id);
                    });
                    // Remove the first SoL-related net element to avoid calculating the same shortest path as before
                    if (i === 0) NGClone.nodes.delete(prevPath.nodes[1].id);

                    // If spur node is FROM add all possible micro net elements except the previously used one
                    const microNEs = i === 0 ? from.microNEs.filter(p => p !== prevPath.nodes[0].id)
                        : [{ value: prevPath.nodes[i].id }];

                    // Calculate new path with A* from spur to destination
                    const spurPath = await this.AStar({
                        microNEs: microNEs,
                        lngLat: spurNode.lngLat,
                        length: spurNode.length || 0
                    }, to, NGClone);
                    if (spurPath) {
                        const newPath = {
                            nodes: rootPath.nodes.concat(spurPath.nodes),
                            edges: rootPath.edges.concat(spurPath.edges)
                        };
                        if (this.props.debug) console.debug('DEBUG: FOUND PATH', newPath);

                        // Check that the spur path does not exist already
                        if (!this.containsPath(newPath, ksp)) {
                            // Measure new path's length and add it to the heap
                            newPath.length = this.calculatePathLength(newPath);
                            if (newPath.length > prevPath.length) {
                                if (this.props.debug) console.debug('DEBUG: NEW PATH', newPath);
                                // Force the new path finding for performance
                                nextShortestPath = newPath;
                                break;
                            }
                            //candidates.push(newPath);
                        }
                    }
                }

                //const newK = candidates.pop();
                //ksp.push(newK);
                //this.emit('path', newK);

                if (nextShortestPath) {
                    if (this.props.debug) console.debug('DEBUG: NEW SHORTEST PATH', newK);
                    ksp.push(nextShortestPath);
                    this.emit('path', nextShortestPath);
                }
            }

            this.emit('done');
            return 'done';
        } else {
            // There are no possible paths
            return null;
        }
    }

    async AStar(from, to, NG) {
        if (this.props.debug) console.debug('DEBUG: FROM: ', from);
        if (this.props.debug) console.debug('DEBUG: TO: ', to);

        // Nodes distance map
        const pathMap = new Map();
        // All the possible departure micro NetElements
        const fromSet = new Set(from.microNEs.map(mn => mn.value));
        // All the possible arrival micro NetElements
        const toSet = new Set(to.microNEs.map(mn => mn.value));
        // Set to store visited nodes
        const explored = new Set();
        // Set to avoid adding the same Node to the queue more than once 
        const queued = new Set();
        // Priority queue
        const queue = new TinyQueue([], (a, b) => { return a.cost - b.cost });

        // Add all starting NetElements to the queue with initial metrics
        const initDist = from.lngLat ? distance(point(from.lngLat), point(to.lngLat)) : null;

        for (const f of from.microNEs) {
            queue.push({
                id: f.value,
                distance: initDist,
                length: from.length || 0,
                cost: 0
            });
            queued.add(f);
        }

        // In this variable we will store the found arrival NetElement
        let dest = null;

        while (queue.length) {
            const here = queue.pop();
            if (this.props.debug) console.debug('DEBUG: HERE: ', here);

            // Arrived at destination
            if (toSet.has(here.id)) {
                dest = here.id;
                break;
            };

            // Kill switch
            if (this.die) break;

            const hereNode = NG.nodes.get(here.id);
            if (this.props.debug) console.debug('DEBUG: HERE\'s node: ', hereNode);

            // Add micro and meso node to visited list
            explored.add(here.id);
            explored.add(hereNode.mesoElement)
            // Skip if no there are no outgoing edges from this node, it means it is a dead end
            if (hereNode.depEdges.size > 0) {
                // Iterate over the departing edges
                for (const [i, e] of hereNode.depEdges.entries()) {
                    const edge = NG.edges.get(e);

                    // Get next node considering bidirectional edges
                    let next = null;
                    if (edge.navigability === NAVIGS.Both && edge.to === here.id) {
                        next = { id: edge.from };
                    } else {
                        next = { id: edge.to };
                    }

                    let nextNode = NG.nodes.get(next.id);
                    if (this.props.debug) {
                        console.debug('DEBUG: NEXT: ', next);
                        console.debug('DEBUG: NEXT node: ', nextNode);
                    };

                    // If undefined it means it was deliberately removed to find alternative paths, so skip it
                    if (!nextNode) continue;
                    // Skip if previously explored
                    if (explored.has(next.id) || explored.has(nextNode.mesoElement)) continue;

                    /**
                     * Is possible this next node belongs to a tile we haven't fetched yet.
                     * We know it is so if the next node does not have associated departing edges,
                     * or does not have values for neither length and geolocation
                     * or because its tile is not in the cache.
                     * So get on it and fetch the tile!
                    */
                    if (nextNode.depEdges.size === 0 || (!nextNode.lngLat && !nextNode.length)
                        || (nextNode.lngLat && !this.props.tileCache.has(
                            `${this.props.tilesBaseURI}/${this.props.zoom}/${Utils.longLat2Tile(nextNode.lngLat, this.props.zoom)}`
                        ))) {
                        if (this.props.debug) console.debug('DEBUG: FETCHING TILE: ', next.id);
                        nextNode = await this.getMissingTile(next.id, nextNode, NG);
                        if (this.props.debug) console.debug('DEBUG: FETCHED NEXT node: ', nextNode);
                        // If no nextNode is returned it means we reached the end of the line
                        if (!nextNode) continue;
                    }

                    /**
                     * Calculate the accumulated cost of this potential next node 
                     * based on its length and distance to the destination.
                    */

                    // First get the Haversine distance to the destination. If not possible to calculate 
                    // (because NetElement is from a SoL and does not have a geolocation) 
                    // then get the geolocation of the next node that belongs to an OP.
                    // Fallback to use the distance of the current node.
                    let geoDist = null;
                    if (nextNode.lngLat) {
                        // Next node has geolocation
                        geoDist = distance(point(nextNode.lngLat), point(to.lngLat));
                    } else {
                        let nn = nextNode;
                        let hereId = here.id;
                        let nextId = next.id;

                        // Find the next node with geolocation. Consider the case where more than one consecutive
                        // micro NetElement exist within a SoL.
                        while (geoDist === null) {
                            // Make sure to avoid reverse edges to prevent infinite loops
                            const nextNextNodeId = this.getValidNextNode(hereId, nextId, nn, NG);
                            const nextNextNode = NG.nodes.get(nextNextNodeId);
                            if (this.props.debug) console.debug('DEBUG: NEXT NEXT node', nextNextNode);
                            if (nextNextNode) {
                                if (nextNextNode.lngLat) {
                                    geoDist = distance(point(nextNextNode.lngLat), point(to.lngLat));
                                } else if (nextNextNode.depEdges.size > 0) {
                                    hereId = nextId;
                                    nextId = nextNextNodeId;
                                    nn = nextNextNode;
                                } else {
                                    // We reached a tile limit. 
                                    // Use the geolocation of the current node as approximate reference.
                                    geoDist = here.distance;
                                }
                            } else {
                                // We reached the end of a line. 
                                // Use the geolocation of the current node as approximate reference.
                                geoDist = here.distance;
                            }
                        }
                    }

                    // Get NetElement length if given otherwise use the latest known length from previous nodes.
                    // Use a factor of 10 on the length to allow the geo distance heuristic to influence the queue.
                    const length = nextNode.length / 10 || 0;
                    if (this.props.debug) console.debug(`GEO-DISTANCE: ${geoDist}`);
                    if (this.props.debug) console.debug(`TRACK LENGTH: ${length}`);

                    // Assign cost of next node as the sum of above metrics plus the cost accumulated so far to get here.
                    next.cost = geoDist + length + here.cost;

                    // Register next node metrics
                    next.distance = geoDist;
                    next.length = length;

                    // Add to the path map if it's a shorter route or a newly discovered node
                    if (pathMap.has(next.id)) {
                        if (next.cost < pathMap.get(next.id).cost) {
                            pathMap.set(next.id, {
                                from: here.id,
                                edge: e,
                                cost: next.cost,
                                length: nextNode.length || 0,
                                lngLat: nextNode.lngLat
                            });
                            if (this.props.debug) console.debug('DEBUG: PathMap set: ', next.id, e, here.id, next.cost);
                        }
                    } else {
                        pathMap.set(next.id, {
                            from: here.id,
                            edge: e,
                            cost: next.cost,
                            length: nextNode.length || 0,
                            lngLat: nextNode.lngLat
                        });
                        if (this.props.debug) console.debug('DEBUG: PathMap set: ', next.id, e, here.id, next.cost);
                    }

                    // Add to the queue
                    if (!queued.has(next.id)) {
                        queue.push(next);
                        queued.add(next.id);
                        if (this.props.debug) console.debug('DEBUG: Queued: ', next);
                    }
                }
                if (this.props.debug) console.debug('DEBUG: *************************************');
            }
        }

        if (dest) {
            // Rebuild path
            if (this.props.debug) console.debug('DEGUB: Resulting PathMap', pathMap);
            let totLength = 0;
            let node = pathMap.get(dest);
            const path = { nodes: [{ id: dest, length: node.length, lngLat: node.lngLat }], edges: [] };
            totLength += node.length;

            while (!fromSet.has(node.from)) {
                const prevNode = { id: node.from };
                path.edges.unshift(node.edge);
                // Get previous pathMap node
                node = pathMap.get(node.from);
                prevNode.length = node.length;
                prevNode.lngLat = node.lngLat;

                path.nodes.unshift(prevNode);
                totLength += node.length;
            }
            path.nodes.unshift({ id: node.from, length: from.length, lngLat: from.lngLat });
            path.edges.unshift(node.edge);
            path.length = totLength;
            if (this.props.debug) console.debug('DEBUG: PATH: ', path);
            return path;
        } else {
            // We didn't find a route :(
            return null;
        }
    }

    async getMissingTile(mne, node, NG) {
        const coords = node.lngLat || Utils.getCoordsFromMicroNetElement(mne, this.props.graphStore);

        if (coords) {
            await this.props.fetchImplementationTile({ coords });
            await this.props.fetchAbstractionTile({ coords });
            node = NG.nodes.get(mne);

            if (node.depEdges.size === 0 || (!node.lngLat && !node.length)) {
                // Fallback to force tile fetching. We should never end up here
                await this.props.fetchImplementationTile({ coords, rebuild: true, force: true });
                await this.props.fetchAbstractionTile({ coords, force: true });
                node = NG.nodes.get(mne);
            }

            return node;
        }

        return null;
    }

    getValidNextNode(hereId, nextId, node, NG) {
        for (const e of node.depEdges.values()) {
            const edge = NG.edges.get(e);
            if (edge.to !== hereId && edge.from !== hereId) {
                return edge.to !== nextId ? edge.to : edge.from;
            }
        }
    }

    cloneNetworkGraph(ng) {
        const newNG = new NetworkGraph();
        newNG.nodes = Utils.deepClone(ng.nodes);
        newNG.edges = Utils.deepClone(ng.edges);
        return newNG;
    }

    pathsAreEqual(p1, p2) {
        let i = p1.length;
        while (i--) {
            if (p1[i] && p2[i] && p1[i].id !== p2[i].id) return false;
        }
        return true;
    }

    calculatePathLength(p) {
        let length = 0;
        for (const node of p.nodes) {
            if (node.length) length += node.length;
        }

        return length;
    }

    containsPath(p, paths) {
        for (const path of paths) {
            if (this.pathsAreEqual(p.nodes, path.nodes)) {
                return true;
            }
        }

        return false;
    }

    get queue() {
        return this._queue;
    }
}