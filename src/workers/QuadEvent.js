export class QuadEvent extends EventTarget {
    constructor(id) {
        super();
        this._id = id
    }

    get id() {
        return this._id;
    }
}