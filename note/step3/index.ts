"use strict";

/**
 * Definition
 */
module Binding {
    let prefix: string = "data-";

    /**
     * The binding evalucator
     */
    let bindingExecutor = {
        bind(el: HTMLElement, value: any) {
            if (value == null) {
                value = '';
            }
            el.innerHTML = value;
        },
        class(el: HTMLElement, value: string) {
            el.className = value;
        }
    };

    function isBinding(name): boolean {
        return name.indexOf(prefix) === 0 &&
            'function' === typeof bindingExecutor[name.slice(prefix.length)];
    }

    function create(el: HTMLElement, model: Object, name: string, prop: string, value: any) {
        // dispatcher
        let dispatcher: Dispatcher = getDispatcher(model);

        // create a property changed listener
        function listener(newValue, oldValue) {
            bindingExecutor[name](el, newValue, oldValue);
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

                        console.log(prop, 'changed');

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

        // update the view when first setup
        listener(value, undefined);
    }

    export function parse(el: HTMLElement, model: Object) {
        let attrs = [].slice.call(el.attributes);

        attrs.forEach((attr) => {
            let name: string = attr.name;

            if (!isBinding(name)) {
                return;
            }

            // get binding name
            name = name.slice(prefix.length);

            // find binding property
            let prop: string = attr.value;
        
            // default model value
            let value: any = model[prop];

            // create binding
            create(el, model, name, prop, value);
        });
    }

    var id: number = 0;
    var uniqueKey: string = '__id__';
    var dispatcherCache: { [index: number]: Dispatcher } = {};

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

/**
 * Usage
 */

var myModel = {
    myclass: 'red',
    content: 'This is the default content value'
};

Binding.parse(document.getElementById('test'), myModel);

// toggle class
document.getElementById("btn1").onclick = () => {
    if (myModel.myclass === 'black') {
        myModel.myclass = 'red';
    }
    else {
        myModel.myclass = 'black';
    }
};

// toggle content
document.getElementById("btn2").onclick = () => {
    myModel.content = Math.random() + '';
};