declare module drunk.config {
    var prefix: string; // binding prefix
    var debug: boolean; // debug mode
    var TAG: string; // element flag
}

declare module drunk.util {
    interface AjaxOptions {
        url: string;
        type?: string;
        data?: {[index: string]: any};
        headers?: {[index: string]: string};
        xhrFields?: {withCredentials: boolean};
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
    function nextTick(callback: ()=>void, sender?: any): number;  // return timer ID
    function proxy(target: any, propertyName: string, source: {}): boolean; // return boolean of proxy done or fail
    function ajax(options: AjaxOptions)//: es6-promise;
    function getTemplate(templateUrlOrID: string)//: es6-promise;
}

declare module drunk.dom {
    function create(htmlString: string): HTMLElement;
    function getBindingExpression(elem: HTMLElement, name: string): any; // return null or binding expression
    function addClass(element: HTMLElement, className: string): void;
    function removeClass(element: HTMLElement, className: string): void;
    function insertBefore(newElement: HTMLElement, oldElement: HTMLElement): void;
    function insertAfter(newElement: HTMLElement, oldElement: HTMLElement): void;
    function remove(element: HTMLElement): void;
    function replace(newElement: HTMLElement, oldElement: HTMLElement): void;
}

declare module drunk.filter {
    interface ParsedFilter {
        name: string;
        param: parser.Getter;
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
    
    function formatDate(time: any, format: string): string; // time to be time-number or date string
    function pipe(filters: ParsedFilter[], value: any, vm: viewmodel.ViewModel, event?, el?: HTMLElement): any;
    function register(name: string, filterMethod: Function): void;

}

declare module drunk.parser {
    interface Getter {
        (viewModel: viewmodel.ViewModel, event?: Event, el?: HTMLElement): any
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
    
    function compile(node: HTMLElement, returnRelease?: boolean, isRootElement?: boolean): BindFunction;
    function compile(fragment: DocumentFragment, returnRelease?: boolean, isRootElement?: boolean): BindFunction;
    function compile(nodeList: HTMLCollection, returnRelease?: boolean, isRootElement?: boolean): BindFunction;
}

declare module drunk.binding {
    interface BindingDefinition {
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
    interface InstanceDefinition {
        viewModel: viewmodel.ViewModel;
        callback: Callback;
        expression: string;
        twoWay?: boolean;
        deep?: boolean;
    }
    class Subscriber {
        private _active: boolean;
        private _notifiers: {[index: string]: notifier.Notifier};
        private _tmpNotifier: {[index: string]: notifier.Notifier};
        private _viewModel: viewmodel.ViewModel;
        private _expression: string;
        private _twoWay: boolean;
        private _deep: boolean;
        private _timerId: number;
        
        accessor: parser.Accessor;
        value: any;
        
        constructor(options: InstanceDefinition);
        
        subscribe(notifier: notifier.Notifier): void;
        unsubscribe(notifier: notifier.Notifier): void;
        addCallback(callback: Callback): void;
        removeCallback(callback: Callback): void;
        update(): void;
        action(): void;
        setValue(value: any): void;
        getValue(): any;
        beforeGet(): void;
        afterGet(): void;
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
        observable(key: string, value: any): void;
    }
    function create(target: any): any;
}

declare module drunk.viewmodel {
    class ViewModel {
        private _id: number;
        private _model: {[index: string]: any};
        private _proxies; // the own models of the viewmodel instance
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
        
        _createBinding(element: HTMLElement, bindingDefinition);
        
        $proxy(model: any): void;
        $set(propertyName: string, value?: any): void;
        $eval(expression: string): any;
        $interpolate(expression: string): any;
        $watch(expression: string, callback: subscriber.Callback, deep?: boolean, immediate?: boolean): () => void;
        $on(eventName: string, callback: Function): void;
        $emit(eventName: string, ...args: any[]): void;
        $broadcast(eventName: string, ...args: any[]): void;
        $release(): void;
    }
}

declare module drunk.component {
    class Component extends viewmodel.ViewModel {
        private _ready: boolean;
        private _bindfn: compiler.BindFunction;
        private _unbindfn: () => void; 
        
        $: {[index: string]: Component};
        $$: {[index: string]: HTMLElement};
        element: HTMLElement;
        template: string;
        templateUrl: string;
        watch: {[index: string]: Function};
        filters: {[index: string]: Function};
        handlers: {[index: string]: Function};
        
        private _mount(element: HTMLElement): void;
        private _unmount(removeElement?: boolean): void;
        
        init(): void;
        ready(callback: ()=>void): void;
        $release(removeElement?: boolean): void;
    }
    
    function register(name: string, ClassExtendedComponent: Function): void;
}