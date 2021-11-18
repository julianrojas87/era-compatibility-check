import { NetworkGraph } from '../algorithm/NetworkGraph.js';
import { PathFinder } from '../algorithm/PathFinder';

self.addEventListener('message', async e => {
    // Initial parameters
    const {
        from, to, K,
        topologyNodes,
        tileCache,
        tilesBaseURI,
        zoom, debug
    } = e.data;

    // Rebuild Network Graph 
    const NG = new NetworkGraph();
    NG.nodes = topologyNodes;

    // Initialize path finder object
    const pathFinder = new PathFinder({
        zoom,
        tileCache,
        tilesBaseURI,
        debug
    });

    pathFinder.on('tile', tile => {
        // Signal main thread to paint the fetched tile on the map
        self.postMessage({ coords: tile.coords });
    });

    // Call Yen's algorithm
    const ksp = await pathFinder.yen({ from, to, K, NG });

    // Send back the found paths and fetched data
    self.postMessage({
        paths: ksp,
        topologyNodes: NG.nodes,
        tileCache
    });
});

