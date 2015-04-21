/// <reference path="dispatcher.ts" />
/// <reference path="util.ts" />

module drunk {

    interface Action {
        (newValue: any, oldValue: any): void;
    }

    interface WatcherOptions {
        deep?: boolean;
        twoway?: boolean;
    }

    /**
     * Data expression watcher
     */
    export class Watcher {

        /**
         * The current watcher, when accessing a property
         * getter, the watcher would be added to the dispatcher of the corresponding model.
         */
        static currentWatcher: Watcher;

        /**
         * The value watcher getting by the expression and the dataContext.
         */
        private value: any;

        /**
         * The buffer timer id, if the next update message is comming, clear the timer and start a new one.
         */
        private timerId: number;

        private dispatcherMap: { [id: number]: Dispatcher } = {};
        private tempDispatcherMap: { [id: number]: Dispatcher } = {};
        private keyMap: { [id: number]: string } = {};

        private deep: boolean;
        private twoway: boolean;
        private getter: Function;
        private setter: Function;

        /**
         * Watcher action list, like view update actions.
         */
        private actionList: Action[] = [];

        /**
         * The watcher actived state.
         */
        public isActived: boolean = true;

        constructor(private expression: string, private dataContext, options: WatcherOptions) {
            this.listener = this.listener.bind(this);

            this.deep = !!options.deep;
            this.twoway = !!options.twoway;
        }

        /**
         * Subscribe a dispatcher by a key of data, this method only would be invoked in the value getter. 
         */
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

        /**
         * Unsubscribe a dispatcher by the dispatcher id.
         */
        private unsubscribe(id: string) {
            this.dispatcherMap[id].removeListener(this.keyMap[id], this.listener);

            this.keyMap[id] = null;
            this.dispatcherMap[id] = null;
        }

        /**
         * Dispatcher would listen the watcher by it's listener, and dispatch the changed to
         * the listener. The listener would create a buffer not to run actions immediate,
         * this is a way for optimizing.
         */
        private listener() {
            clearTimeout(this.timerId);

            this.timerId = setTimeout(() => {
                this.runAction();
            }, 0);
        }

        /**
         * Run all the view update actions or user custom actions.
         */
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
            var newValue: any = this.getter.call(null, this.dataContext);

            if (this.deep) {
                visit(newValue);
            }

            return newValue;
        }

        /**
         * Prepare to get the new value, set the current watcher to this watcher instance,
         * create a temp dispatcher map, the new dispatcher would be added to
         * this map, it used to check which dispatcher is no longer subscribe after the get new value step finish.
         */
        private prepare() {
            this.tempDispatcherMap = {};
            Watcher.currentWatcher = this;
        }

        /**
         * After the get new value step finished, set current watcher to be null, check which dispatcher is no longer
         * subscribe by this watcher, unsubscribe them and set the tempDispatcherMap to the dispatcherMap.
         */
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

    /**
     * Visit each property getter of the data to let the watcher to subscribe all the dispatchers,
     * so when value of sub property changed, it would dispatch to the watcher.
     */
    function visit(data): void {
        if (isObject(data)) {
            Object.keys(data).forEach((key) => {
                visit(data[key]);
            });
        }
        else if (Array.isArray(data)) {
            data.forEach((item) => {
                visit(item);
            });
        }
    }
}