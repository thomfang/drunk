declare module drunk {
    interface IThenable<R> {
        then<U>(onFulfillment?: (value: R) => U | IThenable<U>, onRejection?: (error: any) => U | IThenable<U>): IThenable<U>;
    }
    interface IPromiseExecutor<R> {
        (resolve: (value?: R | IThenable<R>) => void, reject: (reason?: any) => void): void;
    }
    enum PromiseState {
        PENDING = 0,
        RESOLVED = 1,
        REJECTED = 2,
    }
    class Promise<R> implements IThenable<R> {
        static all<R>(iterable: any[]): Promise<R[]>;
        static race<R>(iterable: any[]): Promise<R>;
        static resolve<R>(value?: R | IThenable<R>): Promise<R>;
        static reject<R>(reason?: R | IThenable<R>): Promise<R>;
        _state: PromiseState;
        _value: any;
        _listeners: any[];
        constructor(executor: IPromiseExecutor<R>);
        then<U>(onFulfillment?: (value: R) => U | IThenable<U>, onRejection?: (reason: any) => U | IThenable<U>): Promise<U>;
        catch<U>(onRejection?: (reason: any) => U | IThenable<U>): Promise<U>;
    }
}
declare module drunk.config {
    var prefix: string;
    var debug: boolean;
}
declare module drunk {
    class Cache<T> {
        static cleanup(): void;
        private _store;
        constructor();
        get(key: string): T;
        set(key: string, value: T): void;
        remove(key: string): void;
        cleanup(): void;
    }
}
declare module drunk.util {
    function uuid(target: any): number;
    function isObject(target: any): boolean;
    function extend(destination: any, ...sources: any[]): any;
    function toArray(arrayLike: any): any[];
    function addArrayItem(array: any[], item: any): void;
    function removeArrayItem(array: any[], item: any): void;
    function camelCase(str: string): string;
    function defineProperty(target: any, propertyName: string, propertyValue: any, enumerable?: boolean): void;
    function proxy(a: Object, property: string, b: Object): boolean;
    function nextTick(callback: () => void, sender?: any): number;
}
declare module drunk {
    interface IEventListener {
        (...args: any[]): void;
    }
    class Events {
        addListener(type: string, listener: IEventListener): void;
        removeListener(type: string, listener: IEventListener): void;
        dispatchEvent(type: string, ...args: any[]): void;
        static getListenerCount(object: any, type: string): number;
        static cleanup(object: any): void;
    }
}
declare module drunk.elementUtil {
    function create(html: string): Node | Node[];
    function insertBefore(newNode: Node, oldNode: Node): void;
    function insertAfter(newNode: Node, oldNode: Node): void;
    function remove(target: Node | Node[]): void;
    function replace(newNode: Node | Node[], oldNode: Node): void;
    function addListener(element: HTMLElement, type: string, listener: (ev: Event) => void): void;
    function removeListener(element: HTMLElement, type: string, listener: (ev: Event) => void): void;
    function addClass(element: HTMLElement, token: string): void;
    function removeClass(element: HTMLElement, token: string): void;
}
declare module drunk.util {
    interface IAjaxOptions {
        url: string;
        type?: string;
        data?: string | {};
        headers?: {
            [index: string]: string;
        };
        xhrFields?: {
            withCredentials: boolean;
        };
        withCredentials?: boolean;
        contentType?: string;
        dataType?: string;
    }
    function ajax<T>(options: IAjaxOptions): Promise<T>;
}
declare module drunk.observable {
    interface ObservableObject {
        [name: string]: any;
        __observer__?: Observer;
        setProperty?(name: string, value: any): void;
        removeProperty?(name: string): void;
    }
    function setProperty(data: ObservableObject, name: string, value: any): void;
    function removeProperty(data: ObservableObject, name: string): void;
    var ObservableObjectPrototype: {};
}
declare module drunk.observable {
    class Observer extends Events {
        private _propertyChangedCallbackList;
        addPropertyChangedCallback(callback: IEventListener): void;
        removePropertyChangedCallback(callback: IEventListener): void;
        notify(): void;
    }
}
declare module drunk.observable {
    function create<T>(data: ObservableArray<T> | ObservableObject | any): Observer;
    var onAccessingProperty: (observer: Observer, property: string, value: any, data: ObservableObject) => void;
    function observe(data: ObservableObject, property: string, value: any): void;
    function notify<T>(data: ObservableArray<T> | ObservableObject): void;
}
declare module drunk.observable {
    interface ObservableArray<T> extends Array<T> {
        __observer__?: Observer;
        setAt?(index: number, value: any): void;
        removeAt?<T>(index: number): T;
        removeItem?(value: any): void;
        removeAllItem?(value: any): void;
    }
    var ObservableArrayPrototype: any[];
    function setAt<T>(array: ObservableArray<T>, index: number, value: T): void;
    function removeAt<T>(array: ObservableArray<T>, index: number): T;
    function removeItem<T>(array: ObservableArray<T>, value: any): void;
    function removeAllItem<T>(array: ObservableArray<T>, value: any): void;
}
declare module drunk {
    class Watcher {
        private viewModel;
        private expression;
        private isDeepWatch;
        static getNameOfKey(expression: string, isDeepWatch?: boolean): string;
        private _isInterpolate;
        private _actions;
        private _observers;
        private _properties;
        private _tmpObservers;
        private _tmpProperties;
        private _timerid;
        private _getter;
        value: any;
        private _isActived;
        constructor(viewModel: ViewModel, expression: string, isDeepWatch?: boolean);
        addAction(action: IBindingUpdateAction): void;
        removeAction(action: IBindingUpdateAction): void;
        __propertyChanged(): void;
        __runActions(): void;
        dispose(): void;
        private __getValue();
        private __beforeGetValue();
        private __afterGetValue();
        private _subscribePropertyChanged(observer, property);
    }
}
declare module drunk.Template {
    function compile(node: any): IBindingExecutor;
}
declare module drunk {
    interface IBindingUpdateAction {
        (newValue: any, oldValue: any): any;
    }
    interface IBindingDefinition {
        name?: string;
        isDeepWatch?: boolean;
        isEnding?: boolean;
        priority?: number;
        expression?: string;
        retainAttribute?: boolean;
        init?(): void;
        update?(newValue: any, oldValue: any): void;
        release?(): void;
    }
    interface IBindingExecutor {
        (viewModel: ViewModel, element: any): void;
        isEnding?: boolean;
    }
    class Binding {
        viewModel: ViewModel;
        element: any;
        isDeepWatch: boolean;
        isInterpolate: boolean;
        expression: string;
        init: () => void;
        update: IBindingUpdateAction;
        release: () => void;
        private _isActived;
        private _isLocked;
        private _unwatch;
        private _update;
        constructor(viewModel: ViewModel, element: any, descriptor: any);
        initialize(): void;
        dispose(): void;
        setValue(value: any, isLocked?: boolean): void;
    }
    module Binding {
        function register<T extends IBindingDefinition>(name: string, definition: T): void;
        function getDefinintionByName(name: string): IBindingDefinition;
        function getEndingNames(): string[];
        function create(viewModel: ViewModel, element: any, descriptor: IBindingDefinition): Promise<void>;
    }
}
declare module drunk {
    interface IModel extends observable.ObservableObject {
        [key: string]: any;
    }
    class ViewModel extends Events {
        _isActived: boolean;
        _model: IModel;
        _bindings: Binding[];
        _watchers: {
            [on: string]: Watcher;
        };
        $id: number;
        filter: {
            [name: string]: filter.IFilter;
        };
        handlers: {
            [name: string]: (...args: any[]) => any;
        };
        constructor(model?: IModel);
        protected __init(model?: IModel): void;
        proxy(name: string): void;
        eval(expression: string, isInterpolate?: boolean): any;
        setValue(expression: string, value: any): void;
        getModel(): any;
        watch(expression: string, action: IBindingUpdateAction, isDeepWatch?: boolean, isImmediate?: boolean): () => void;
        dispose(): void;
        __getHandler(handlerName: string): Function;
        __getValueByGetter(getter: any, isInterpolate: any): any;
    }
}
declare module drunk.parser {
    interface IGetter {
        (viewModel: ViewModel, ...args: Array<any>): any;
        filters?: Array<filter.FilterDef>;
        dynamic?: boolean;
        isInterpolate?: boolean;
    }
    interface ISetter {
        (viewModel: ViewModel, value: any): any;
    }
    function parse(expression: string): IGetter;
    function parseGetter(expression: string, skipFilter?: boolean): IGetter;
    function parseSetter(expression: string): ISetter;
    function parseInterpolate(expression: string): IGetter;
    function parseInterpolate(expression: string, justTokens: boolean): any[];
    function hasInterpolation(str: string): boolean;
}
declare module drunk.filter {
    interface IFilter {
        (input: any, ...args: any[]): any;
    }
    interface FilterDef {
        name: string;
        param?: parser.IGetter;
    }
    function applyFilters(value: any, filterDefs: any, filterMap: {
        [name: string]: IFilter;
    }, isInterpolate: boolean, viewModel: ViewModel, ...args: any[]): any;
    var filters: {
        [name: string]: IFilter;
    };
}
declare module drunk.Template {
    function load(urlOrId: string): Promise<string>;
}
declare module drunk {
    interface IComponent {
        name?: string;
        init?: () => void;
        data?: {
            [name: string]: any;
        };
        filters?: {
            [name: string]: filter.IFilter;
        };
        watchers?: {
            [expression: string]: (newValue: any, oldValue: any) => void;
        };
        handlers?: {
            [name: string]: (...args: any[]) => any;
        };
        element?: Node | Node[];
        template?: string;
        templateUrl?: string;
    }
    interface IComponentContructor<T extends IComponent> {
        extend?<T extends IComponent>(name: string | T, members?: T): IComponentContructor<T>;
        (...args: any[]): void;
    }
    class Component extends ViewModel {
        static GET_COMPONENT_CONTEXT: string;
        static SUB_COMPONENT_CREATED: string;
        static SUB_COMPONENT_MOUNTED: string;
        static SUB_COMPONENT_BEFORE_RELEASE: string;
        static SUB_COMPONENT_RELEASED: string;
        static MOUNTED: string;
        private _isMounted;
        name: string;
        element: Node | Node[];
        template: string;
        templateUrl: string;
        data: {
            [name: string]: any;
        };
        filters: {
            [name: string]: filter.IFilter;
        };
        handlers: {
            [name: string]: (...args) => void;
        };
        watchers: {
            [expression: string]: (newValue: any, oldValue: any) => void;
        };
        init: () => void;
        constructor(model?: IModel);
        protected __init(model?: IModel): void;
        processTemplate(templateUrl?: string): Promise<any>;
        mount(element: Node | Node[]): void;
        dispose(): void;
    }
    module Component {
        var defined: {
            [name: string]: IComponentContructor<any>;
        };
        function define<T extends IComponent>(name: string, members: T): void;
        function extend<T extends IComponent>(name: string | T, members?: T): IComponentContructor<T>;
        function register<T>(name: string, componentContructor: IComponentContructor<T>): void;
    }
}