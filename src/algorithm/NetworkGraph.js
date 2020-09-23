export class NetworkGraph {
    constructor() {
        this._nodes = new Map();
        this._edges = new Map();
    }

    addNode(node) {
        let n = null;
        if (this.nodes.has(node.id)) {
            n = this.nodes.get(node.id);
        } else {
            n = { edges: new Set(), lngLat: null, microNode: null };
        }

        if (node.edge) n.edges.add(node.edge);
        if (node.lngLat) n.lngLat = node.lngLat;
        if (node.microNode) n.microNode = node.microNode;
        this.nodes.set(node.id, n);
    }

    addEdge(edge) {
        if (this.edges.has(edge.id)) {
            if (edge.from) this.edges.get(edge.id).from = edge.from;
            if (edge.to) this.edges.get(edge.id).to = edge.to;
            // Check if edge has been set as bidirectional
            if (this.edges.get(edge.id).bidirectional && this.edges.get(edge.id).to) {
                this.addNode({
                    id: this.edges.get(edge.id).to,
                    edge: edge.id
                });
            }
        } else {
            if (edge.from) this.edges.set(edge.id, { from: edge.from });
            if (edge.to) this.edges.set(edge.id, { to: edge.to });
        }
    }

    setBidirectional(edge) {
        if (this.edges.has(edge)) {
            this.edges.get(edge).bidirectional = true;
            // Add edge to node if already defined
            if (this.edges.get(edge).to) {
                this.addNode({
                    id: this.edges.get(edge).to,
                    edge: edge
                });
            }
        } else {
            this.edges.set(edge, { bidirectional: true });
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