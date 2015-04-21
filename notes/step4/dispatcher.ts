/// <reference path="util.ts" />

module drunk {

    // UniqueId used to make weak reference for a data.
    export var uniqueKey: string = '__-' + Date.now() + '-__';
    var uniqueIdCounter: number = 0;

    // Dispatcher id counter
    var dispatcherId: number = 0;

    // Dispatcher map
    var dispatcherMap: { [id: string]: Dispatcher } = {};

    export class Dispatcher {
        
        // Unique id for a Dispatcher instance
        public id: number = dispatcherId++;

        private listenerCache: { [key: string]: Array<() => void> } = {};

        public addListener(key: string, listener: () => void): void {
            if (!this.listenerCache[key]) {
                this.listenerCache[key] = [];
            }

            addArrayItem(this.listenerCache[key], listener);
        }

        public removeListener(key: string, listener: () => void): void {
            if (!this.listenerCache[key] || this.listenerCache[key].length === 0) {
                return;
            }

            removeArrayItem(this.listenerCache[key], listener);
        }

        public dispatch(key: string): void {
            if (!this.listenerCache[key] || this.listenerCache[key].length === 0) {
                return;
            }

            this.listenerCache[key].forEach((listener) => {
                listener();
            });
        }

        /**
         * Get dispatcher by data
         * @param data
         * @returns {any}
         */
        public static getDispatcher(data: any) {
            if (!Array.isArray(data) && !isObject(data)) {
                return;
            }

            if (!data[uniqueKey]) {
                var id = uniqueIdCounter++;
                var dispatcher = new Dispatcher();

                // Define a unique key for the data
                Object.defineProperty(data, uniqueKey, { value: id });

                dispatcherMap[id] = dispatcher;
                observe(data);
            }

            return dispatcherMap[data[uniqueKey]];
        }
    }
}