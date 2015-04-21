/// <reference path="watcher.ts" />

module drunk {
    
    // The key for dispatching object(item added) or array(item added, removed, changed).
    var reservedKey: string = '__*' + Date.now() + '*__';

    /**
     * If the data is object or array, make it observable.
     */
    export function observe(data: any): any {
        var isObj = isObject(data);

        if (!isObj && !Array.isArray(data) && data[uniqueKey]) {
            return data;
        }

        if (isObj) {
            // change the prototype of the data
            data.__proto__ = observableObject;

            // convert all keys
            Object.keys(data).forEach((key) => {
                convert(data, key, data[key]);
            });
        }
        else {
            // change the prototype of the data
            data.__proto__ = observableArray;

            // observe all the items
            data.forEach((item) => {
                observe(item);
            });
        }

        return data;
    }

    /**
     * Convert a data key, redefine it with getter and setter.
     * When a key is accessing, collect the dispatcher for current watcher.
     * When a key is changed, observe the new value, and dispatch the changed event for all watchers.
     */
    function convert(data: Object, key: string, value: any) {
        console.assert(key !== reservedKey, "Don't use", reservedKey, ' as a key in your data, it is reserved');

        var parentDispatcher = Dispatcher.getDispatcher(data);
        var childDispatcher = Dispatcher.getDispatcher(value);

        if (childDispatcher) {
            // If the child dispatcher exist, add a root listener for the parent dispatcher.
            // when items of the value changed, it would dispatch for all the reservedKey listeners.
            childDispatcher.addListener(reservedKey, dispatchListener);
        }

        Object.defineProperty(data, key, {
            enumerable: true,
            configurable: true,

            // When a watcher is getting new value, subscribe to the dispatcher of the key.
            get(): any {
                if (Watcher.currentWatcher) {
                    Watcher.currentWatcher.subscribe(key, parentDispatcher);
                }
                return value;
            },

            set(newValue) {
                if (newValue === value) {
                    return;
                }

                if (childDispatcher) {
                    // The old child dispatcher
                    childDispatcher.removeListener(reservedKey, dispatchListener);
                }

                childDispatcher = Dispatcher.getDispatcher(newValue);

                if (childDispatcher) {
                    // The new child dispatcher
                    childDispatcher.addListener(reservedKey, dispatchListener);
                }

                value = newValue;
                dispatchListener();
            }
        });

        // A listener for dispatching value changed.
        function dispatchListener() {
            parentDispatcher.dispatch(key);
        }
    }

    /**
     * Dispatch the data changed
     */
    function dispatchDataChanged(data: any[] | { [key: string]: any }) {
        var dispatcher = Dispatcher.getDispatcher(data);
        dispatcher.dispatch(reservedKey);
    }

    /**
     * Observable array prototype, Each observed data(array) would be link it's prototype object to this, and then
     * the data would get the '$set' and '$remove' methods, invoke these methods would auto dispatch the changed event.
     */
    var observableArray = Object.create(Array.prototype);
    var wrappedMethods = [
        'push',
        'pop',
        'shift',
        'unshift',
        'splice',
        'reverse',
        'sort'
    ];

    // Wrap the methods which would changed the array struct,
    // when the method was called, dispatch the changed event.
    wrappedMethods.forEach((methodName) => {
        var originalMethod = Array.prototype[methodName];

        // redefine the method again
        Object.defineProperty(observableArray, methodName, {
            value: mutatedMethod
        });

        function mutatedMethod(...args: any[]) {
            var result = originalMethod.apply(this, args);
            var newItems;

            switch (methodName) {
                case "push":
                case "unshift":
                    newItems = args;
                    break;
                case "splice":
                    newItems = args.slice(2);
                    break;
            }

            if (newItems) {
                newItems.forEach((item) => {
                    observe(item);
                });
            }

            dispatchDataChanged(this);
            return result;
        }
    });

    /**
     * observableArray.$set
     * 
     * Set a custom
     */
    function setArrayItemByIndex(index: number, value: any) {
        if (index > this.length) {
            this.length = index + 1;
        }
        return this.splice(index, 1, value)[0];
    }

    /**
     * observableArray.$remove
     * 
     * A shortcut method for observableArray.splice.
     */
    function removeArrayItemByIndex(index: number) {
        console.assert(index > -1, "observableArray.$remove(index): index must greater than -1");
        return this.splice(index, 1);
    }

    Object.defineProperties(observableArray, {
        $set: {
            value: setArrayItemByIndex
        },
        $remove: {
            value: removeArrayItemByIndex
        }
    });

    /**
     * Observable object prototype. Each observed data(object) would be link it's prototype object to this, and then
     * the data would get the '$set' and '$remove' methods, invoke these methods would auto dispatch the changed event.
     */
    var observableObject = {};

    /**
     * observableObject.$set
     * 
     * If the key is converted, just assign with the value,
     * else convert the key and dispatch the data changed.
     */
    function setObjectItemByKey(key: string, value: any) {
        if (this.hasOwnProperty(key) || this[uniqueKey] == null) {
            this[key] = value;
            return;
        }

        convert(this, key, value);
        dispatchDataChanged(this);
    }

    /**
     * observableObject.$remove
     * 
     * If remove a converted key, dispatch the data changed.
     */
    function removeObjectItemByKey(key: string) {
        if (!this.hasOwnProperty(key)) {
            return;
        }

        delete this[key];

        if (this[uniqueKey] == null) {
            return;
        }

        dispatchDataChanged(this);
    }

    Object.defineProperties(observableObject, {
        $set: {
            value: setObjectItemByKey
        },
        $remove: {
            value: removeObjectItemByKey
        }
    });
}