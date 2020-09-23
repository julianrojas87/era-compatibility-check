import RDFetch from './RDFetch.worker';
import Utils from '../utils/Utils';

export class TileFetcherWorkerPool {
    constructor() {
        this._cpus = window.navigator.hardwareConcurrency;
        this._pool = this.init();
        this._queue = [];
        this._cache = new Set();
    }

    init() {
        let pool = [];
        for (let i = 0; i < this.cpus; i++) {
            pool.push({ instance: new RDFetch(), busy: false });
        }
        return pool;
    }

    runTask(source, z, coords, asXY, force) {
        let x, y = null;
        if (asXY) {
            x = coords[0];
            y = coords[1];
        } else {
            x = Utils.long2Tile(coords[0], z);
            y = Utils.lat2Tile(coords[1], z);
        }

        // Only fetch new tiles
        if (!this.cache.has(`${source}/${z}/${x}/${y}`) || force) {
            // Event handler object that delivers the streamed data
            const eventHandler = new EventTarget();
            // Future reminder that we processed this one
            this.cache.add(`${source}/${z}/${x}/${y}`);
            // Add task to queue
            this.queue.push({ x, y, z, source, eventHandler, force });

            // Find a free worker
            let worker = null;
            for (const [i, w] of this.pool.entries()) {
                if (!w.busy) {
                    w.busy = true;
                    worker = w;
                    break;
                }
            }

            if (worker) {
                // Got a free worker so do your thing!
                this.attendQueue(worker);
            }

            return eventHandler;
        }
    }

    attendQueue(worker) {
        if (this.queue.length > 0) {
            // Get first task in-line
            const task = this.queue.shift();
            const onmessage = msg => {
                if (msg.data === 'done') {
                    // Remove event listener to avoid conflicts 
                    worker.instance.removeEventListener('message', onmessage);
                    // Worker is free now, check if there are other queued tasks
                    worker.busy = false;
                    this.attendQueue(worker);
                    let event = new Event('data');
                    event.data = { done: true };
                    task.eventHandler.dispatchEvent(event);
                } else {
                    let event = new Event('data');
                    event.data = { quad: Utils.rebuildQuad(msg.data) };
                    task.eventHandler.dispatchEvent(event);
                }
            };
            worker.instance.addEventListener('message', onmessage);

            // Kick-off for worker!
            const headers = { 'Accept': 'application/n-quads' };
            if(task.force) {
                headers['Cache-Control'] = 'no-cache';
            };
            worker.instance.postMessage({
                url: `${task.source}/${task.z}/${task.x}/${task.y}`,
                headers: headers
            });
        }
    }

    allWorkersFree() {
        for (const w of this.pool) {
            if (w.busy) {
                return false;
            }
        }
        return true;
    }

    get pool() {
        return this._pool;
    }

    get cpus() {
        return this._cpus;
    }

    get queue() {
        return this._queue;
    }

    get cache() {
        return this._cache;
    }
}