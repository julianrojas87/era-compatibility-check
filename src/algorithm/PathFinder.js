import { EventEmitter } from "events";
import TinyQueue from 'tinyqueue';
import { point } from '@turf/helpers';
import distance from '@turf/distance'
import Utils from '../utils/Utils';
import { WGS84 } from '../utils/NameSpaces';
import { NetworkGraph } from './NetworkGraph';

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
        // Run Dijkstra to find first path
        const sp = await this.dijkstra(from, to, this.props.networkGraph);
        if (sp) {
            // Emit this first path for rendering
            this.emit('path', sp);
            ksp.push(sp);

            for (let k = 1; k < K; k++) {
                // Heap that will hold the new alternative paths
                const candidates = new TinyQueue([], (a, b) => { return a.cost - b.cost });
                const prevPath = ksp[k - 1];
                if (!prevPath) break;

                // Iterate over the nodes of the previous found path
                for (let i = 0; i < prevPath.nodes.length - 2; i++) {
                    // Create a clone of the network graph that can be altered to allow finding new shortest paths
                    const NGClone = this.cloneNetworkGraph(this.props.networkGraph);
                    // Node from which an alternative route will be calculated
                    const spurNode = NGClone.nodes.get(prevPath.nodes[i]);
                    // The sequence of nodes that lead to the spur node
                    const rootPath = {
                        nodes: Utils.deepClone(prevPath.nodes).slice(0, i),
                        edges: Utils.deepClone(prevPath.edges).slice(0, i)
                    };

                    // Go over all the, so far, found shortest paths and remove the edge following the spur node
                    // if the path matches the root path.
                    ksp.forEach(p => {
                        if (this.pathsAreEqual(rootPath.nodes, p.nodes.slice(0, i))) {
                            spurNode.edges.delete(p.edges[i]);
                        }
                    });
                    // Remove all the root path nodes from the network graph
                    rootPath.nodes.forEach(n => {
                        NGClone.nodes.delete(n);
                    });

                    // If spur node is FROM add all possible node ports except the previously used one
                    let ports = i === 0 ? from.ports.filter(p => p !== prevPath.nodes[i]) : [prevPath.nodes[i]];
                    // Calculate new path with Dijkstra from spur to destination
                    const spurPath = await this.dijkstra({ ports: ports, lngLat: spurNode.lngLat }, to, NGClone);
                    if (spurPath) {
                        const newPath = {
                            nodes: rootPath.nodes.concat(spurPath.nodes),
                            edges: rootPath.edges.concat(spurPath.edges)
                        };

                        // We don't care about the shortest paths, instead we try to find
                        // new alternative paths that are the least similar to each other
                        newPath.cost = this.pathSimilarity(ksp, newPath);
                        candidates.push(newPath);
                    }
                }

                const newK = candidates.pop();
                ksp.push(newK);
                this.emit('path', newK);
            }
            
            this.emit('done');
            return 'done';
        } else {
            // There are no possible paths
            return null;
        }
    }

    async dijkstra(from, to, NG) {
        // console.log('FROM: ', from);
        // console.log('TO: ', to);

        const pathMap = new Map();
        // All the possible departure NodePorts
        const fromSet = new Set(from.ports);
        // All the possible arrival NodePorts
        const toSet = new Set(to.ports);
        // Set to store visited nodes
        const explored = new Set();
        // Set to avoid adding the same NodePort to the queue more than once 
        const queued = new Set();
        // Priority queue
        const queue = new TinyQueue([], (a, b) => { return a.cost - b.cost });


        // Add all starting NodePorts to the queue
        for (const f of from.ports) {
            queue.push({
                from: f,
                cost: 0,
                lngLat: from.lngLat
            });
        }

        // In this variable we will store the found arrival NodePort
        let dest = null;
        // Step counter to increase the cost of routes with more routes
        let step = 0;

        while (queue.length) {
            step++;
            const here = queue.pop();
            // console.log('HERE: ', here);
            // Arrived at destination
            if (toSet.has(here.from)) {
                dest = here.from;
                break;
            };

            // Kill switch
            if(this.die) break;

            // Add micro node to visited list
            explored.add(here.from);

            // Skip If no there are no outgoing edges from this micro node, it means it is a dead end
            const node = NG.nodes.get(here.from);
            // console.log('HERE\'s node: ', node);
            if (node.edges.size > 0) {
                for (const [i, e] of node.edges.entries()) {
                    const edge = NG.edges.get(e);

                    // Get next hop considering bidirectional edges
                    let next = null;
                    if (edge.bidirectional && edge.to === here.from) {
                        next = { from: edge.from };
                    } else {
                        next = { from: edge.to };
                    }

                    let nextNode = NG.nodes.get(next.from);
                    // console.log('NEXT node: ', nextNode);
                    // If undefined it means it was deliberately removed to find alternative paths, so skip it
                    if (!nextNode) continue;

                    // Is possible this next node port belongs to a tile we haven't fetched so get on it!
                    if(nextNode.edges.size <= 0 || !nextNode.lngLat 
                        || this.hasReverseLinksOnly(nextNode.edges, here.from, NG)) {
                        // console.log('FETCHING TILE: ', next.from);
                        await this.getMissingTile(next.from, nextNode.lngLat === null);
                        nextNode = NG.nodes.get(next.from);
                    }

                    // Skip if previously explored
                    if (explored.has(next.from)) continue;

                    // Calculate the cost of this potential next node port based on its distance to the destination
                    const d = distance(point(nextNode.lngLat), point(to.lngLat));
                    // Penalize next node ports belonging to a different MicroNode.
                    // This is to ensure that all the node ports of the current MicroNode are processed first
                    next.cost = (node.microNode === nextNode.microNode ? d : d + 30) + step;
                    next.lngLat = nextNode.lngLat;

                    // Add to the path if it's a shorter route
                    if (pathMap.has(next.from)) {
                        if (pathMap.get(next.from).cost < here.cost) {
                            pathMap.set(next.from, { from: here.from, edge: e, cost: here.cost });
                        }
                    } else {
                        pathMap.set(next.from, { from: here.from, edge: e, cost: here.cost });
                    }

                    // Add to the queue
                    if (!queued.has(next.from)) {
                        queue.push(next);
                        queued.add(next.from);
                        // console.log('Queued: ', next);
                    }
                }
                // console.log('*************************************')
            }
        }

        if (dest) {
            // Rebuild path
            const path = { nodes: [dest], edges: [] };
            let node = pathMap.get(dest);

            while (!fromSet.has(node.from)) {
                path.nodes.unshift(node.from);
                path.edges.unshift(node.edge);
                node = pathMap.get(node.from);
            }
            path.nodes.unshift(node.from);
            path.edges.unshift(node.edge);

            // console.log('PATH: ', path);
            return path;
        } else {
            // We didn't find a route :(
            return null;
        }
    }

    hasReverseLinksOnly(edges, here, NG) {
        for(const [i, e] of edges.entries()) {
            const edge = NG.edges.get(e);
            if(edge.to !== here && edge.from !== here) {
                return false;
            }
        }

        return true;
    }

    async getMissingTile(np, force) {
        const npt = Utils.queryGraphStore({
            store: this.props.graphStore,
            s: np
        });

        if (npt) {
            const lat = parseFloat(npt[np][WGS84.latitude]);
            const long = parseFloat(npt[np][WGS84.longitude]);
            await this.props.fetchAbstractionTile([long, lat], false, force);
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
            if (p1[i] !== p2[i]) return false;
        }
        return true;
    }

    pathSimilarity(ksp, p2) {
        let sim = 0;

        for (const p1 of ksp) {
            let i = p2.nodes.length;
            while (i--) {
                if (!p1.nodes[i]) break;
                if (p1.nodes[i] === p2.nodes[i]) sim++;
            }
        }

        return sim;
    }

    get queue() {
        return this._queue;
    }
}