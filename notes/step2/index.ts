"use strict";

module Binding {

    /**
     * Bind element to model
     */
    export function create(el: HTMLElement, model: Object): void {
        // find binding property
        let prop: string = el.getAttribute("data-bind");
        
        // default model value
        let value: any = model[prop];

        // dispatcher
        let dispatcher: Dispatcher = getDispatcher(model);

        // create a property changed listener
        function listener(newValue) {
            el.innerHTML = newValue;
            console.log(prop, "changed");
        }

        dispatcher.addListener(prop, listener);

        let descriptor = Object.getOwnPropertyDescriptor(model, prop);

        // Check if getter/setter exist
        if (!descriptor || (typeof descriptor.set !== 'function' && typeof descriptor.get !== 'function')) {

            // define prop getter setter
            Object.defineProperty(model, prop, {

                set(newValue: any) {
                    if (newValue !== value) {
                        let oldValue = value;

                        value = newValue;

                        // value changed and dispatch message
                        dispatcher.dispatch(prop, newValue, oldValue);
                    }
                },

                get() {
                    return value;
                },

                configurable: true,
                enumerable: true
            });
        }
    }

    var id: number = 0;
    var uniqueKey: string = '__id__';
    var dispatcherCache: {[index: number]: Dispatcher} = {};

    /**
     * @private
     */
    function getDispatcher(model: any): Dispatcher {
        if (model[uniqueKey] == null) {
            id += 1;

            Object.defineProperty(model, uniqueKey, { value: id });

            let dispatcher = new Dispatcher();
            dispatcherCache[id] = dispatcher;
        }

        return dispatcherCache[model[uniqueKey]];
    }

    /**
     * Action listener
     */
    export interface Listener {
        (newValue: any, oldValue: any): void;
    }

    /**
     * Dispatcher for model property changed
     */
    class Dispatcher {
        private listeners: { [index: string]: Listener[] };

        public addListener(name: string, listener: Listener): void {
            if (!this.listeners) {
                this.listeners = {};
            }
            
            if (!this.listeners[name]) {
                this.listeners[name] = [];
            }

            let listeners = this.listeners[name];
            let index: number = listeners.indexOf(listener);

            if (index < 0) {
                listeners.push(listener);
            }
        }

        public removeListener(name: string, listener: Listener): void {
            if (!this.listeners) {
                return;
            }

            let listeners: Listener[] = this.listeners[name];
            let index: number = listeners.indexOf(listener);

            if (index > -1) {
                listeners.splice(index, 1);
            }
        }

        public dispatch(name: string, newValue: any, oldValue: any): void {
            if (!this.listeners || !this.listeners[name] || this.listeners[name].length === 0) {
                return;
            }

            let listeners: Listener[] = this.listeners[name];

            listeners.forEach((listener) => {
                listener(newValue, oldValue);
            });
        }
    }
}

var myModel: any = {};

Binding.create(document.getElementById("div1"), myModel);
Binding.create(document.getElementById("div2"), myModel);

// div#content will be 'a'
myModel.a = 'This is the value of property "a"';