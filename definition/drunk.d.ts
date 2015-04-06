declare module drunk.config {
    var prefix: string; // binding prefix
    var debug: boolean; // debug mode
    var TAG: string; // element flag
}

declare module drunk.util {
    interface AjaxOptions {
        url: string;
        type?: string;
        data?: string | {};
        headers?: {[index: string]: string};
        xhrFields?: { withCredentials: boolean };
        withCredentials?: boolean;
        contentType?: string;
        dataType?: string;
    }
    function isObject(target: any): boolean;
    function camelCase(str: string): string; // 'a-b' or 'a_b' to 'aB'
    function extend(destination: any, ...sources: any[]): any;
    function toArray(arrayLike: any): any[]; // make an array-like to a real array
    function ensureItem(array: any[], item: any): void;
    function removeItem(array: any[], item: any): void;
    function defineProperty(target: any, propertyName: string, propertyValue: any, enumerable?: boolean): void;
    function nextTick(callback: ()=>void, sender?: any): number;  // as soon as possible
    function proxy(target: any, propertyName: string, source: {}): boolean; // return boolean of proxy done or fail
    function ajax(options: AjaxOptions): promise.Promise<string | Object>;
    function getTemplate(templateUrlOrID: string): promise.Promise<string>;
}

declare module drunk.dom {
    function create(html: string): Node;
    function getBindingExpression(elem: HTMLElement, name: string): any; // return null or binding expression
    function addClass(element: HTMLElement, className: string): void;
    function removeClass(element: HTMLElement, className: string): void;
    function insertBefore(newNode: Node, oldNode: Node): void;
    function insertAfter(newNode: Node, oldNode: Node): void;
    function remove(element: Node): void;
    function replace(newNode: Node, oldNode: Node): void;
}

declare module drunk.filter {
    interface ParsedFilter {
        name: string;
        param?: parser.Getter;
    }
    
    interface InternalFilter {
        escape(str: string): string;
        unescape(str: string): string;
        truncate(str: string, length: number, tailStr?: string): string;
        addslashes(str: string): string;
        stripslashes(str: string): string;
        length(input: any): number;
        json(input: {}): string;
        striptags(str: string): string;
        defaultval(input: any, defaultValue: any): any;
        date(time: any, format: string): string;
    }
    
    var Filter: InternalFilter;

    function pipe(filters: ParsedFilter[], value: any, vm: viewmodel.ViewModel, event?: Event, el?: HTMLElement): any;
    function register(name: string, filterMethod: Function): void;

}

declare module drunk.parser {
    interface Getter {
        (viewModel: viewmodel.ViewModel, event?: Event, el?: HTMLElement): any;
        filters?: filter.ParsedFilter[];
    }
    interface Setter {
        (viewModel: viewmodel.ViewModel, value: any): any;
    }
    interface Accessor {
        get: Getter;
        set?: Setter;
    }
    
    function parseGetter(expression: string): Getter;
    function parseSetter(expression: string): Setter;
    function parseInterpolate(expression: string, dontParseToGetter?: boolean): Getter;
    function parseAccessor(expression: string, parseSetter?: boolean): Accessor;
}

declare module drunk.compiler {
    interface BindFunction {
        (viewModel: viewmodel.ViewModel, element: HTMLElement): any;
    }
    
    function compile(node: HTMLElement | DocumentFragment | HTMLCollection, returnRelease?: boolean, isRootElement?: boolean): BindFunction;
}

declare module drunk.binding {
    interface BindingDefinition {
        preParse?: boolean;
        update?: subscriber.Callback;
        init?: () => void;
        release?: () => void;
    }
    interface BindingDescriptor extends BindingDefinition {
        name: string;
        accessor: parser.Accessor;
        expression: string;
    }
    
    class Binding {
        private _actived: boolean;
        private _locked: boolean;
        private _subscriber: subscriber.Subscriber;
        private _update: subscriber.Callback;
        
        viewModel: viewmodel.ViewModel;
        element: HTMLElement;
        preParse: boolean;
        twoWay: boolean;
        deep: boolean;
        
        constructor(viewModel, element, descriptor: BindingDescriptor);
        setValue(value: any, locked?: boolean): void;
        _bind(): void; // bind element to viewmodel
        _unbind(): void; // unbind and release this binding
    }
    
    function register(name: string, update: subscriber.Callback): void;
    function register(name: string, definition: BindingDefinition): void;
}

declare module drunk.notifier {
    class Notifier {
        private _subscribers: subscriber.Subscriber[];
        id: number;
        
        add(subscriber: subscriber.Subscriber): void;
        remove(subscriber: subscriber.Subscriber): void;
        publish(): void;
    }
}

declare module drunk.subscriber {
    interface Callback {
        (newValue: any, oldValue: any): void;
    }
    interface SubscriberOptions {
        viewModel: viewmodel.ViewModel;
        callback: Callback;
        expression: string;
        twoWay?: boolean;
        deep?: boolean;
    }
    class Subscriber {
        private _active: boolean;
        private _notifiers: {[index: string]: notifier.Notifier};
        private _tmpNotifier: { [index: string]: notifier.Notifier };
        private _callbacks: Callback[];
        private _viewModel: viewmodel.ViewModel;
        private _expression: string;
        private _twoWay: boolean;
        private _deep: boolean;
        private _timerId: number;
        
        accessor: parser.Accessor;
        value: any;
        
        constructor(options: SubscriberOptions);

        private _update(): void;
        private _getValue(): any;
        private _beforeGet(): void;
        private _afterGet(): void;
        
        subscribe(notifier: notifier.Notifier): void;
        unsubscribe(notifier: notifier.Notifier): void;
        addCallback(callback: Callback): void;
        removeCallback(callback: Callback): void;
        setValue(value: any): void;
        update(): void; // won't update immediate, it would trigger '_update' next tick 
        release(): void;
    }
}

declare module drunk.observer {
    var subscriber: subscriber.Subscriber;
    class Observer {
        private data: any;
        constructor(data: any, isArray: boolean);
        observeArray(data: any[]): void;
        observeObject(data: {[index: string]: any}): void;
        observe(key: string, value: any): void;
    }
    function create(target: any): any;
}

declare module drunk.viewmodel {
    class ViewModel {
        private _id: number;
        private _model: {[index: string]: any};
        private _proxies; // own models of the viewmodel instance
        private _children: ViewModel[];
        private _bindings: binding.Binding;
        private _subscribers: subscriber.Subscriber[];
        private _actived: boolean;
        
        $parent: ViewModel;
        $filter: filter.InternalFilter;
        
        constructor();
        
        private _proxyModel(model: any): void; // proxy all the keys of the model for viewmodel instance
        private _unproxyModel(model: any): void; // unproxy all the keys of the model
        private _getValue(getter: parser.Getter, event?: any, el?: HTMLElement): any;
        private _callHandler(handlerName: string): () => any;
        
        _createBinding(element: HTMLElement, descriptor: binding.BindingDescriptor);
        
        $proxy(model: any): void; // unproxy old model then proxy the new one
        $set(propertyName: string, value?: any): void;
        $eval(expression: string): any;
        $interpolate(expression: string): any;
        $watch(expression: string, callback: subscriber.Callback, deep?: boolean): () => void;
        $on(eventName: string, callback: Function): void;
        $emit(eventName: string, ...args: any[]): void;
        $broadcast(eventName: string, ...args: any[]): void;
        $release(): void;
    }
}

declare module drunk.component {
    interface ComponentOptions {
        element?: HTMLElement;
        template?: string;
        templateUrl?: string;
        watch?: { [index: string]: Function };
        filters?: { [index: string]: Function };
        handlers?: { [index: string]: Function };
    }
    class Component extends viewmodel.ViewModel implements ComponentOptions {
        private _ready: boolean;
        private _bindfn: compiler.BindFunction;
        private _unbindfn: () => void; 

        static extend(options: ComponentOptions): Function;
        
        $: {[index: string]: Component};
        $$: {[index: string]: HTMLElement};
        
        private _mount(element: HTMLElement): void;
        private _unmount(removeElement?: boolean): void;
        
        init(): void;
        ready(callback: ()=>void): void;
        $release(removeElement?: boolean): void;
    }
    
    function register(name: string, ClassExtendedComponent: Function): void;
}

declare module drunk.promise {

    interface Thenable<R> {
        then<U>(onFulfilled?: (value: R) => U | Thenable<U>, onRejected?: (error: any) => U | Thenable<U>): Thenable<U>;
    }
    
    class Promise<R> implements Thenable<R> {
	    /**
	        * If you call resolve in the body of the callback passed to the constructor,
	        * your promise is fulfilled with result object passed to resolve.
	        * If you call reject your promise is rejected with the object passed to resolve.
	        * For consistency and debugging (eg stack traces), obj should be an instanceof Error.
	        * Any errors thrown in the constructor callback will be implicitly passed to reject().
	        */
        constructor(callback: (resolve: (value?: R | Thenable<R>) => void, reject: (error?: any) => void) => void);

	    /**
	        * onFulfilled is called when/if "promise" resolves. onRejected is called when/if "promise" rejects.
	        * Both are optional, if either/both are omitted the next onFulfilled/onRejected in the chain is called.
	        * Both callbacks have a single parameter , the fulfillment value or rejection reason.
	        * "then" returns a new promise equivalent to the value you return from onFulfilled/onRejected after being passed through Promise.resolve.
	        * If an error is thrown in the callback, the returned promise rejects with that error.
	        *
	        * @param onFulfilled called when/if "promise" resolves
	        * @param onRejected called when/if "promise" rejects
	        */
        then<U>(onFulfilled?: (value: R) => U | Thenable<U>, onRejected?: (error: any) => U | Thenable<U>): Promise<U>;

	    /**
	        * Sugar for promise.then(undefined, onRejected)
	        *
	        * @param onRejected called when/if "promise" rejects
	        */
        catch<U>(onRejected?: (error: any) => U | Thenable<U>): Promise<U>;

        static resolve<R>(value?: R | Thenable<R>): Promise<R>;

        /**
	     * Make a promise that rejects to obj. For consistency and debugging (eg stack traces), obj should be an instanceof Error
	     */
        static reject(error: any): Promise<any>;

        /**
	     * Make a promise that fulfills when every item in the array fulfills, and rejects if (and when) any item rejects.
	     * the array passed to all can be a mixture of promise-like objects and other objects.
	     * The fulfillment value is an array (in order) of fulfillment values. The rejection value is the first rejection value.
	     */
        static all<R>(promises: (R | Thenable<R>)[]): Promise<R[]>;

        /**
	     * Make a Promise that fulfills when any item fulfills, and rejects if any item rejects.
	     */
        static race<R>(promises: (R | Thenable<R>)[]): Promise<R>;
    }
}