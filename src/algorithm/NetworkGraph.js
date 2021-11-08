import { NAVIGS } from '../utils/NameSpaces.js';

export class NetworkGraph {
    constructor() {
        this._nodes = new Map();
        this._edges = new Map();
    }

    setNode(node) {
        let n = null;
        if (this.nodes.has(node.id)) {
            n = this.nodes.get(node.id);
        } else {
            n = {
                depEdges: new Set(),
                arrEdges: new Set(),
                mesoElement: null,
                length: null,
                lngLat: null
            };
        }

        if (node.lngLat) n.lngLat = node.lngLat;
        if (node.length) n.length = parseFloat(node.length);
        if (node.mesoElement) n.mesoElement = node.mesoElement;
        if (node.depEdge) n.depEdges.add(node.depEdge);
        if (node.arrEdge) n.arrEdges.add(node.arrEdge);

        this.nodes.set(node.id, n);
    }

    setEdge(edge) {
        let e = null;
        if (this.edges.has(edge.id)) {
            e = this.edges.get(edge.id);
        } else {
            e = { from: null, to: null, A: null, B: null, navigability: null };
        }

        if (edge.A) {
            e.A = edge.A;
            if ((!e.from || !e.to) && e.B && e.navigability) {
                this.defineEdgeNavigation(edge.id, e);
            }
        }
        if (edge.B) { 
            e.B = edge.B;
            if ((!e.from || !e.to) && e.A && e.navigability) {
                this.defineEdgeNavigation(edge.id, e);
            }
        }
        if (edge.from) e.from = edge.from;
        if (edge.to) e.to = edge.to;
        if (edge.navigability) {
            e.navigability = edge.navigability;
            if ((!e.from || !e.to) && e.A && e.B) {
                this.defineEdgeNavigation(edge.id, e);
            }
        }

        if (e) this.edges.set(edge.id, e);
    }

    defineEdgeNavigation(id, e) {
        // Set edges direction where possible
        switch (e.navigability) {
            case NAVIGS.AB:
                if (e.A) {
                    // This edge starts from node A, then add it as depEdge for it
                    this.setNode({ id: e.A, depEdge: id });
                    // Set from property 
                    e.from = e.A;
                }
                if (e.B) {
                    // This edge arrives to node B, then add it as arrEdge for it
                    this.setNode({ id: e.B, arrEdge: id });
                    // Set to property 
                    e.to = e.B;
                }
                break;
            case NAVIGS.BA:
                if (e.A) {
                    // This edge arrives to node A, then add it as arrEdge for it
                    this.setNode({ id: e.A, arrEdge: id });
                    // Set to property 
                    e.to = e.A;
                }
                if (e.B) {
                    // This edge starts from node B, then add it as depEdge for it
                    this.setNode({ id: e.B, depEdge: id });
                    // Set from property 
                    e.from = e.B;
                }
                break;
            case NAVIGS.Both:
                if (e.A) {
                    // This edge starts from and arrives to node A, then add it as depEdge for it
                    this.setNode({ id: e.A, depEdge: id, arrEdge: id });
                    // Set from property 
                    e.from = e.A;
                }
                if (e.B) {
                    // This edge starts from and arrives to node B, then add it as depEdge for it
                    this.setNode({ id: e.B, depEdge: id, arrEdge: id });
                    // Set to property 
                    e.to = e.B;
                }
                break;
            case NAVIGS.None:
                // Since this edge is not traversable we can remove it from the NG.
                this.edges.delete(id);
                e = null;
        }
    }

    get nodes() {
        return this._nodes;
    }

    set nodes(n) {
        this._nodes = n;
    }

    get edges() {
        return this._edges;
    }

    set edges(e) {
        this._edges = e;
    }
}