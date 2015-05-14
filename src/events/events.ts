/// <reference path="../util/util.ts" />

module drunk {
    
    /**
     * @class Events
     */
    export class Events {
        
        protected _events: {[type: string]: EventListener[]} = {};
        
        addListener(type: string, listener: EventListener): void {
            if (!this._events[type]) {
                this._events[type] = [];
            }
            
            util.addArrayItem(this._events[type], listener);
        }
        
        removeListener(type: string, listener: EventListener): void {
            var listeners = this._events[type];
            if (!listeners || listeners.length) {
                return;
            }
            
            util.removeArrayItem(listeners, listener);
        }
        
        dispatchEvent(type: string, ...args: any[]): void {
            var listeners = this._events[type];
            if (!listeners || !listeners.length) {
                return;
            }
            
            listeners.slice().forEach((listener) => {
                listener.apply(this, args);
            });
        }
    }
}