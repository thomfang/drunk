function addArrayItem(array: any[], item: any): void {
    var index: number = array.indexOf(item);
    if (index < 0) {
        array.push(item);
    }
}

function removeArrayItem(array: any[], item: any): void {
    var index: number = array.indexOf(item);
    if (index > -1) {
        array.splice(index, 1);
    }
}

function isObject(unknow: any): boolean {
    return Object.prototype.toString.call(unknow) === '[object Object]';
}

class Dispatcher {

    /**
     * id counter
     * @type {number}
     */
    private static id: number = 0;

    private static uniqueKey: string = '__x__';
    private static uniqueId: number = 0;
    private static dispatcherMap: {[id: string]: Dispatcher} = {};

    /**
     * Get dispatcher by data
     * @param data
     * @returns {any}
     */
    public static getDispatcher(data: any) {
        if (!Array.isArray(data) && !isObject(data)) {
            return;
        }

        if (!data[Dispatcher.uniqueKey]) {
            var id = Dispatcher.uniqueId++;
            var dispatcher = new Dispatcher();

            data[Dispatcher.uniqueKey] = id;
            Dispatcher.dispatcherMap[id] = dispatcher;
        }

        return Dispatcher.dispatcherMap[data[Dispatcher.uniqueKey]];
    }

    /**
     * id of this instance
     * @type {number}
     */
    public id: number = Dispatcher.id++;

    /**
     * listener list cache
     * @type {{}}
     */
    private listenerCache: any = {};

    public addListener(key: string, listener: ()=>void): void {
        if (!this.listenerCache[key]) {
            this.listenerCache[key] = [];
        }

        addArrayItem(this.listenerCache[key], listener);
    }

    public removeListener(key: string, listener: ()=>void): void {
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
}

interface Action {
    (newValue: any, oldValue: any): void;
}

class Watcher {

    /**
     * Then current watcher, when accessing a property
     * getter, the watcher would be added to the dispatcher of the corresponding model.
     */
    static currentWatcher: Watcher;

    private dispatcherMap: {[id: number]: Dispatcher} = {};
    private tempDispatcherMap: {[id: number]: Dispatcher} = {};
    private keyMap: {[id: number]: string} = {};

    private value: any;
    private timerid: number;
    private actionList: Action[] = [];

    public isActived: boolean = true;

    constructor(private expression: string, private dataContext, options) {
        this.listener = this.listener.bind(this);
    }

    public subscribe(key: string, dispatcher: Dispatcher): void {
        var id: number = dispatcher.id;

        if (!this.tempDispatcherMap[id]) {
            this.tempDispatcherMap[id] = dispatcher;

            if (!this.dispatcherMap[id]) {
                dispatcher.addListener(key, this.listener);
                this.keyMap[id] = key;
            }
        }
    }

    public addAction(action: Action) {
        addArrayItem(this.actionList, action);
    }

    public removeAction(action: Action) {
        if (this.actionList.length === 1 && this.actionList[0] === action) {
            this.release();
        }
        else {
            removeArrayItem(this.actionList, action);
        }
    }

    public release() {
        if (!this.isActived) {
            return;
        }

        Object.keys(this.dispatcherMap).forEach((id) => {
            this.unsubscribe(id);
        });

        this.actionList.length = 0;
        this.isActived = false;
        this.dataContext = null;
        this.expression = null;
    }

    private unsubscribe(id: string) {
        this.dispatcherMap[id].removeListener(this.keyMap[id], this.listener);

        this.keyMap[id] = null;
        this.dispatcherMap[id] = null;
    }

    private listener() {
        clearTimeout(this.timerid);

        this.timerid = setTimeout(() => {
            this.runAction();
        }, 0);
    }

    private runAction() {
        this.prepare();

        var oldValue: any = this.value;
        var newValue: any = this.getValue();

        this.actionList.forEach((action) => {
            action(newValue, oldValue);
        });

        this.finish();
    }

    private getValue(): any {

    }

    private prepare() {
        this.tempDispatcherMap = {};
        Watcher.currentWatcher = this;
    }

    private finish() {
        Watcher.currentWatcher = null;

        Object.keys(this.dispatcherMap).forEach((id) => {
            if (!this.tempDispatcherMap[id]) {
                this.unsubscribe(id);
            }
        });

        this.dispatcherMap = this.tempDispatcherMap;
        this.tempDispatcherMap = null;
    }
}

function observe(data: any) {
    if (Array.isArray(data)) {

    }
    else if (isObject(data)) {

    }
}

function convert(data: Object, key: string, value: any) {
    var parentDispatcher = Dispatcher.getDispatcher(data);
    var childDispatcher = Dispatcher.getDispatcher(value);

    if (childDispatcher) {
        childDispatcher.addListener('*', dispatchListener);
    }

    Object.defineProperty(data, key, {
        enumerable: true,
        configurable: true,

        get(): any {
            if (Watcher.currentWatcher) {
                Watcher.currentWatcher.subscribe(key, parentDispatcher);
            }
            return value;
        },

        set(newValue) {
            if (newValue !== value) {
                if (childDispatcher) {
                    // The old child dispatcher
                    childDispatcher.removeListener('*', dispatchListener);
                }

                childDispatcher = Dispatcher.getDispatcher(newValue);

                if (childDispatcher) {
                    // The new child dispatcher
                    childDispatcher.addListener('*', dispatchListener);
                }

                value = newValue;

                dispatchListener();
            }
        }
    });

    function dispatchListener() {
        parentDispatcher.dispatch(key);
    }
}