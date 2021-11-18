export class NetworkGraph {
    constructor() {
        this._nodes = new Map();
    }

    setNode(node) {
        let n = null;
        if (this.nodes.has(node.id)) {
            n = this.nodes.get(node.id);
        } else {
            n = {
                nextNodes: new Set(),
                mesoElement: null,
                length: null,
                lngLat: null,
                lineNationalId: null
            };
        }

        if (node.lngLat) n.lngLat = node.lngLat;
        if (node.length) n.length = parseFloat(node.length);
        if (node.mesoElement) n.mesoElement = node.mesoElement;
        if (node.nextNode) n.nextNodes.add(node.nextNode);
        if (node.lineNationalId) n.lineNationalId = node.lineNationalId;

        this.nodes.set(node.id, n);
    }

    get nodes() {
        return this._nodes;
    }

    set nodes(n) {
        this._nodes = n;
    }
}