declare namespace drunk {
    interface IThenable<R> {
        then<U>(onFulfillment?: (value: R) => U | IThenable<U>, onRejection?: (error: any) => U | IThenable<U>): IThenable<U>;
    }
    interface IPromiseExecutor<R> {
        (resolve: (value?: R | IThenable<R>) => void, reject: (reason?: any) => void): void;
    }
    class Promise<R> implements IThenable<R> {
        static all<R>(iterable: any[]): Promise<R[]>;
        static race<R>(iterable: any[]): Promise<R>;
        static resolve<R>(value?: R | IThenable<R>): Promise<R>;
        static reject<R>(reason?: R | IThenable<R>): Promise<R>;
        static timeout(delay?: number): Promise<{}>;
        _state: number;
        _value: any;
        _listeners: any[];
        /**
         * @constructor
         */
        constructor(executor: IPromiseExecutor<R>);
        then<U>(onFulfillment?: (value: R) => U | IThenable<U>, onRejection?: (reason: any) => U | IThenable<U>): Promise<U>;
        done<U>(onFulfillment?: (value: R) => U | IThenable<U>, onRejection?: (reason: any) => U | IThenable<U>): void;
        catch<U>(onRejection?: (reason: any) => U | IThenable<U>): Promise<U>;
        cancel(): void;
    }
}
/**
 * 配置模块
 */
declare namespace drunk.config {
    /**
     * 绑定指令的前缀
     */
    var prefix: string;
    /**
     * debug模式配置变量
     */
    var debug: boolean;
    /**
     * 开启渲染优化
     */
    var renderOptimization: boolean;
}
declare namespace drunk {
    /**
     * LRU Cache类
     */
    class Cache<T> {
        /**
         * 缓存节点的hash表
         */
        private _cacheMap;
        /**
         * 缓存头部
         */
        private _head;
        /**
         * 缓存尾部
         */
        private _tail;
        /**
         * 缓存容量
         */
        private _capacity;
        /**
         * 缓存节点计数
         */
        private _count;
        /**
         * @param  capacity  容量值
         */
        constructor(capacity: number);
        /**
         * 根据key获取缓存的值
         * @param key  要获取的字段
         */
        get(key: string): T;
        /**
         * 根据key和value设置缓存
         * @param   key   要缓存的字段
         * @param   value 要缓存的值
         */
        set(key: string, value: T): void;
        /**
         * 把节点放到头部
         * @param  cacheNode  缓存节点
         */
        private _putToHead(cacheNode);
        /**
         * 移除最后一个节点
         * @return 返回移除的节点的key
         */
        private _removeTail();
    }
}
/**
 * 工具方法模块
 */
declare namespace drunk.util {
    var global: any;
    /**
     * 获取对象的唯一id
     * @param  target  设置的对象
     */
    function uniqueId(target: any): number;
    /**
     * 判断是否是对象
     * @param   target 判断目标
     */
    function isPlainObjectOrObservableObject(target: any): boolean;
    /**
     * 拓展对象
     * @param  destination  目标对象
     * @param  ...sources   不定长参数，源对象的集合
     * @return              返回输入的目标对象
     */
    function extend(destination: any, ...sources: any[]): any;
    /**
     * 深度拷贝对象
     * @param   target  需要拷贝的对象
     */
    function deepClone(target: any): any;
    /**
     * 转换成数组
     * @param   arrayLike  类似数组的对象
     * @return             转换后的数组
     */
    function toArray(arrayLike: any): any[];
    /**
     * 给数组添加item，确保item不重复
     * @param   array  数组
     * @param   item   值
     */
    function addArrayItem(array: any[], item: any): void;
    /**
     * 移除数组的指定值
     * @param   array  数组
     * @param   item   值
     */
    function removeArrayItem(array: any[], item: any): void;
    /**
     * 字符串驼峰化
     * @param   str 字符串
     */
    function camelCase(str: string): string;
    /**
     * 属性代理,把a对象的某个属性的读写代理到b对象上,返回代理是否成功的结果
     * @param   target    目标对象
     * @param   property  要代理的属性名
     * @param   source    源对象
     * @return            如果已经代理过,则不再代理该属性
     */
    function createProxy(target: any, property: string, source: any): boolean;
    interface IAsyncJob {
        completed: boolean;
        cancel(): void;
    }
    /**
     * 创建一个异步工作
     * @param   work       回调函数
     * @param   context    上下文对象
     * @return             返回一个带有cancel方法的job对象
     */
    function execAsyncWork(work: () => any, context?: any): IAsyncJob;
    var requestAnimationFrame: (callback: FrameRequestCallback) => number;
    var cancelAnimationFrame: (handle: number) => void;
}
declare namespace drunk {
    /**
     * Map类，可把任务类型的对象作为key
     */
    class Map<T> {
        /**
         * 对应Key的数据
         */
        private _values;
        /**
         * 所有的key的列表
         */
        private _keys;
        /**
         * 所有的key生成的uid的列表
         */
        private _uids;
        /**
         * 获取指定key的uid
         */
        private _uidOf(key);
        /**
         * 设值
         * @param   key  键,可为任意类型
         * @param  value 值
         */
        set(key: any, value: T): Map<T>;
        /**
         * 取值
         * @param key  键名
         */
        get(key: any): T;
        /**
         * 是否有对应键的值
         * @param  key 键名
         */
        has(key: any): boolean;
        /**
         * 删除指定键的记录
         * @param   key 键名
         */
        delete(key: any): boolean;
        /**
         * 清除所有的成员
         */
        clear(): void;
        /**
         * 遍历
         * @param   callback  回调
         * @param   context   上下文,回调里的this参数
         */
        forEach(callback: (value: T, key: any, map: Map<T>) => any, context?: any): void;
        /**
         * 获取所有的key
         */
        keys(): any[];
        /**
         * 获取所有的值
         */
        values(): T[];
        /**
         * map的成员个数
         */
        size: number;
    }
}
declare namespace drunk {
    interface IEventListener {
        (...args: any[]): void;
        __isOnce?: boolean;
    }
    /**
     * 事件管理类
     */
    class EventEmitter {
        /**
         * 注册事件
         * @param  type       事件类型
         * @param  listener   事件回调
         */
        $addListener(type: string, listener: IEventListener): this;
        /**
         * 注册事件,$addListener方法的别名
         * @param   type       事件类型
         * @param   listener   事件回调
         */
        $on(type: string, listener: IEventListener): this;
        /**
         * 注册一次性事件
         * @param   type      事件类型
         * @param   listener  事件回调
         */
        $once(type: string, listener: IEventListener): this;
        /**
         * 移除指定类型的事件监听
         * @param   type     事件类型
         * @param   listener 事件回调
         */
        $removeListener(type: string, listener: IEventListener): this;
        /**
         * 移除所有指定类型的事件,或当事件类型未提供时,移除所有该实例上所有的事件
         * @param   type  事件类型，可选
         */
        $removeAllListeners(type?: string): this;
        /**
         * 派发指定类型事件
         * @param   type        事件类型
         * @param   ...args     其他参数
         */
        $emit(type: string, ...args: any[]): this;
        /**
         * 获取指定事件类型的所有listener回调
         * @param   type  事件类型
         */
        $listeners(type: string): IEventListener[];
        /**
         * 获取事件实例的指定事件类型的回调技术
         * @param  emitter  事件类实例
         * @param  type     事件类型
         */
        static listenerCount(emitter: EventEmitter, type: string): number;
        /**
         * 移除对象的所有事件回调引用
         * @param  emitter  事件发射器实例
         */
        static cleanup(emitter: EventEmitter): void;
    }
}
/**
 * 搜索字符串解析模块
 */
declare namespace drunk.querystring {
    /**
     * 解析字符串生成一个键值对表
     * @param  str  搜索字符串
     */
    function parse(str: string): {
        [key: string]: string;
    };
    /**
     * 把一个键值对表转化为搜索字符串
     * @param  obj 键值对表
     */
    function stringify(obj: Object): string;
}
declare namespace drunk.util {
    import Promise = drunk.Promise;
    /**
     * ajax方法参数接口
     */
    interface IAjaxOptions {
        /**
         * 请求的url
         */
        url: string;
        /**
         * 请求的类型(GET|POST|PUT|DELETE等)
         */
        type?: string;
        /**
         * 要发送的数据
         */
        data?: string | {};
        /**
         * 请求头配置
         */
        headers?: {
            [index: string]: string;
        };
        /**
         * withCredentials配置
         */
        xhrFields?: {
            withCredentials: boolean;
        };
        /**
         * withCredentials快捷配置
         */
        withCredentials?: boolean;
        /**
         * 请求的content-type
         */
        contentType?: string;
        /**
         * deprecated,请使用responseType
         */
        dataType?: string;
        /** 相应的数据类型 */
        responseType?: string;
        /**
         * 请求超时时间
         */
        timeout?: number;
        user?: string;
        password?: string;
    }
    /**
     * XMLHTTP request工具方法
     * @param   options  配置参数
     */
    function ajax<T>(options: IAjaxOptions): Promise<T>;
}
/**
 * 转换后的可以监控对象
 * 添加了设置和移除字段的两个能发送数据更新的方法。
 */
declare namespace drunk.observable {
    /**
     * 可监控JSON对象的声明
     */
    interface IObservableObject {
        [name: string]: any;
        __observer__?: Observer;
        $set?(name: string, value: any): void;
        $remove?(name: string): void;
    }
    /**
     * 设置对象的属性，并发送更新的消息
     * @param  data   JSON对象或已经为observable的JSON对象
     * @param  name   字段名
     */
    function $set(data: IObservableObject, name: string, value: any): void;
    /**
     * 移除对象属性，并会发送更新的消息
     * @param  data  JSON对象或已经为observable的JSON对象
     * @param  name  字段名
     */
    function $remove(data: IObservableObject, name: string): void;
    /**
     * 对象转换成observable后指向的原型对象
     */
    var ObservableObjectPrototype: IObservableObject;
}
declare namespace drunk.observable {
    import EventEmitter = drunk.EventEmitter;
    /**
     * 监控对象类，为每个需要监控的对象和数组生成一个实例，用于代理监听事件
     */
    class Observer extends EventEmitter {
        /**
         * 属性改变的回调函数列表
         */
        private _propertyChangedCallbackList;
        /**
         * 添加任意属性改变的回调
         */
        addPropertyChangedCallback(callback: IEventListener): void;
        /**
         * 移除任意属性改变的指定回调
         */
        removePropertyChangedCallback(callback: IEventListener): void;
        /**
         * 发送任意属性改变的通知
         */
        notify(): void;
    }
}
/**
 * observable模块的工具方法，用于创建可观察的数据，数据绑定等
 */
declare namespace drunk.observable {
    /**
     * 根据数据返回对应的Observer 实例，如果该数据已经存在对应的 Observer 实例则直接返回，否则创建一个新的实例
     * @param data 数组或JSON对象
     */
    function create<T>(data: IObservableArray<T> | IObservableObject | any): Observer;
    /**
     * 访问observableObject的字段时会调用的回调
     * @param   observer  返回的当前正在访问的数据的observer对象
     * @param   property  正在访问的数据的字段
     * @param   value     对应字段的数据
     * @param   data      可观察数据
     */
    var onPropertyAccessing: (observer: Observer, property: string, value: any, data: IObservableObject) => void;
    /**
     * 转换对象属性的getter/setter，使其能在数据更新是能接受到事件
     * @param  data  	 JSON对象
     * @param  property  JSON对象上的字段
     */
    function observe(target: IObservableObject, property: string, value: any): void;
    /**
     * 通知数据的指定属性更新
     * @param  data       数据
     * @param  property   要通知的字段名，如果该参数不提供，则派发该该数据更新的通知
     */
    function notify<T>(data: IObservableArray<T> | IObservableObject): void;
}
/**
 * 转换后的可以监控数组
 * 除了有常规数组的所有方法外还添加了几个工具方法，并在某些修改自身的方法调用后对新数据进行处理和
 * 发送数据更新的通知。
 */
declare namespace drunk.observable {
    /**
     * 可监控数组的声明
     */
    interface IObservableArray<T> extends Array<T> {
        __observer__?: Observer;
        $setAt?(index: number, value: any): void;
        $removeAt?<T>(index: number): T;
        $removeItem?(item: any): void;
        $removeAllItem?(item: any): void;
        $removeAll?(): void;
    }
    /**
     * 数组转换成observable后指向的原型对象
     */
    var ObservableArrayPrototype: IObservableArray<any>;
    /**
     * 设置数组指定数组下标的值，并发送数组更新通知
     * @param  array   observableArray类型的数组
     * @param  index   要设置的数组下标
     * @param  value   要设置的值
     */
    function $setAt<T>(array: IObservableArray<T>, index: number, value: T): void;
    /**
     * 根据索引移除数组中的元素，并发送数组更新通知
     * @param  array  observableArray类型的数组
     * @param  index  要移除的下标
     */
    function $removeAt<T>(array: IObservableArray<T>, index: number): T;
    /**
     * 删除数组中出现的一个指定值，并发送数组更新通知
     * @param  array  observableArray类型的数组
     * @param  value  要移除的值
     */
    function $removeItem<T>(array: IObservableArray<T>, value: any): void;
    /**
     * 删除数组中所有的指定值，并发送数组更新通知
     * @param  array  observableArray类型的数组
     * @param  value  要移除的值
     */
    function $removeAllItem<T>(array: IObservableArray<T>, value: any): void;
    /**
     * 删除所有数组元素
     */
    function $removeAll<T>(array: IObservableArray<T>): void;
}
/**
 * 简单的解析器,只是做了字符串替换,然后使用new Function生成函数
 */
declare namespace drunk.Parser {
    interface IGetter {
        (viewModel: ViewModel, ...args: Array<any>): any;
        filters?: Array<Filter.IFilterDef>;
        dynamic?: boolean;
        isInterpolate?: boolean;
    }
    interface ISetter {
        (viewModel: ViewModel, value: any): any;
    }
    /**
     * 解析表达式
     * @param  expression  表达式
     */
    function parse(expression: string): IGetter;
    /**
     * 解析表达式生成getter函数
     * @param   expression      表达式字符串
     * @param   isInterpolate   是否是一哥插值表达式
     * @param   skipFilter      跳过解析filter
     */
    function parseGetter(expression: string, isInterpolate?: boolean, skipFilter?: boolean): IGetter;
    /**
     * 解析表达式生成setter函数
     * @param   expression 表达式字符串
     */
    function parseSetter(expression: string): ISetter;
    /**
     * 解析包含插值绑定的字符串表达式， 类似"a {{interpolate_let}}"， 花括号里的就是插值变量
     * 先判断是否存在花括号， 然后在解析成tokens， 再根据token生成getter函数
     * @param   expression  表达式字符串
     * @param   justTokens  是否只需要返回tokens
     */
    function parseInterpolate(expression: string): IGetter;
    function parseInterpolate(expression: string, justTokens: boolean): any[];
    /**
     * 是否有插值语法
     * @param   str  字符串
     */
    function hasInterpolation(str: string): boolean;
    function getProxyProperties(expression: any): string[];
}
/**
 * 数据过滤器模块
 * @module drunk.Filter
 */
declare namespace drunk.Filter {
    /**
     * Filter声明
     * @param   input       输入
     * @param   ...arggs    其他参数
     */
    interface IFilter {
        (...args: any[]): any;
    }
    interface IFilterDef {
        name: string;
        param?: Parser.IGetter;
    }
    /**
     * 使用提供的filter列表处理数据
     * @param   value       输入
     * @param   filterDefs  filter定义集合
     * @param   viewModel   ViewModel实例
     * @param   ...args     其他参数
     */
    function pipeFor(value: any, filterDefs: any, filterMap: {
        [name: string]: IFilter;
    }, isInterpolate: boolean, ...args: any[]): any;
    /**
     * filter方法表
     */
    var filters: {
        [name: string]: IFilter;
    };
}
declare namespace drunk {
    class Watcher {
        viewModel: ViewModel;
        expression: string;
        isDeepWatch: boolean;
        /**
         * 根据表达式和是否深度监听生成唯一的key,用于储存在关联的viewModel实例的watcher表中
         * @param   expression  表达式
         * @param   isDeepWatch 是否深度监听
         */
        static getNameOfKey(expression: string, isDeepWatch?: boolean): string;
        private _isInterpolate;
        private _actions;
        private _observers;
        private _properties;
        private _tmpObservers;
        private _tmpProperties;
        private _isActived;
        private _throttle;
        private _getter;
        /**
         * 表达式求值的结果
         */
        value: any;
        /**
         * @param   viewModel   ViewModel实例，用于访问数据
         * @param   expression  监听的表达式
         * @param   isDeepWatch 是否深度监听,当对象或数组里的任意一个数据改变都会发送更新消息
         */
        constructor(viewModel: ViewModel, expression: string, isDeepWatch?: boolean);
        /**
         * 添加数据更新回调
         * @param  action  回调函数
         */
        addAction(action: IBindingAction): void;
        /**
         * 移除数据更新回调
         * @param  action 回调函数
         */
        removeAction(action: IBindingAction): void;
        /**
         * 销毁实例和移除所有应用
         */
        dispose(): void;
        /**
         * 数据更新派发，会先做缓冲，防止在同一时刻对此出发更新操作，等下一次系统轮训时再真正执行更新操作
         */
        private _propertyChanged();
        /**
         * 立即获取最新的数据判断并判断是否已经更新，如果已经更新，执行所有的回调
         */
        private _flush();
        /**
         * 执行表达式函数获取最新的数据
         */
        private _getValue();
        /**
         * 设置observable的属性访问回调为当前watcher实例的订阅方法,当访问某个属性是就会对该属性进行订阅
         */
        private _beforeAccess();
        /**
         * 表达式求解完后的收尾工作,取消注册onPropertyAccessed回调,并对比旧的observer表和新的表看有哪些实例已经不需要订阅
         */
        private _accessed();
        /**
         * 订阅属性的更新消息
         * @param  observer 属性的所属观察者
         * @param  property 属性名
         */
        private _subscribePropertyChanged(observer, property);
    }
}
declare namespace drunk {
    /**
     * 绑定声明接口
     */
    interface IBindingDefinition {
        name?: string;
        isDeepWatch?: boolean;
        isTerminal?: boolean;
        isInterpolate?: boolean;
        priority?: number;
        retainAttribute?: boolean;
        expression?: string;
        attribute?: string;
        init?(parentViewModel?: ViewModel, placeholder?: HTMLElement): void;
        update?(newValue: any, oldValue: any): void;
        release?(): void;
    }
    interface IBindingConstructor {
        new (...args: any[]): Binding;
        isDeepWatch?: boolean;
        isTerminal?: boolean;
        priority?: number;
        retainAttribute?: boolean;
    }
    /**
     * 元素与viewModel绑定创建的函数接口
     */
    interface IBindingGenerator {
        (viewModel: ViewModel, element: any, parentViewModel?: ViewModel, placeHolder?: HTMLElement): Function;
    }
    /**
     * 更新函数接口
     */
    interface IBindingAction {
        (newValue: any, oldValue: any): any;
    }
    function binding(name: string): (constructor: IBindingConstructor) => void;
    /**
     * 绑定类
     */
    class Binding {
        viewModel: Component;
        element: any;
        /** 实例 */
        private static instancesById;
        /**
         * 缓存的所有绑定声明的表
         */
        static definitions: {
            [name: string]: IBindingConstructor;
        };
        /**
         * 获取元素的所有绑定实例
         * @param  element  元素节点
         */
        static getByElement(element: Node): Binding[];
        /**
         * 添加引用
         * @param  element  元素节点
         * @param  binding  绑定实例
         */
        static setWeakRef(element: Node, binding: Binding): void;
        /**
         * 移除引用
         * @param   element  元素节点
         * @param   binding  绑定实例
         */
        static removeWeakRef(element: Node, binding: Binding): void;
        /**
         * 根据一个绑定原型对象注册一个binding指令
         * @param   name  指令名
         * @param   def   binding实现的定义对象或绑定的更新函数
         */
        static register<T extends IBindingDefinition>(name: string, definition: T): void;
        static register(name: string, IBindingConstructor: any): void;
        /**
         * 根据绑定名获取绑定的定义
         * @param   name      绑定的名称
         * @return            具有绑定定义信息的对象
         */
        static getByName(name: string): IBindingConstructor;
        /**
         * 获取已经根据优先级排序的终止型绑定的名称列表
         * @return 返回绑定名称列表
         */
        static getTerminalBindings(): string[];
        /**
         * 创建viewModel与模板元素的绑定
         * @param   viewModel  ViewModel实例
         * @param   element    元素
         */
        static create(viewModel: any, element: any, descriptor: IBindingDefinition, parentViewModel?: any, placeholder?: HTMLElement): void;
        /**
         * 设置终止型的绑定，根据提供的优先级对终止型绑定列表进行排序，优先级高的绑定会先于优先级的绑定创建
         * @param   name      绑定的名称
         * @param   priority  绑定的优先级
         */
        private static _setTernimalBinding(name, priority);
        /**
         * binding名称
         */
        name: string;
        /**
         * 是否深度监听表达式
         */
        isDeepWatch: boolean;
        /**
         * 是否是绑定在一个插值表达式
         */
        isInterpolate: boolean;
        /**
         * 绑定的表达式
         */
        expression: string;
        /**
         * 是否已经不可用
         */
        protected _isActived: boolean;
        /**
         * 移除watcher方法
         */
        protected _unwatch: () => void;
        /**
         * 内置的update包装方法
         */
        protected _update: (newValue: any, oldValue: any) => void;
        protected _isDynamic: boolean;
        /**
         * 根据绑定的定义创建一个绑定实例，根据定义进行viewModel与DOM元素绑定的初始化、视图渲染和释放
         * @param  viewModel       ViewModel实例
         * @param  element         绑定元素
         * @param  definition      绑定定义
         */
        constructor(viewModel: Component, element: any, descriptor: IBindingDefinition);
        /**
         * 初始化绑定
         */
        $initialize(ownerViewModel: any, placeholder?: HTMLElement): any;
        /**
         * 移除绑定并销毁
         */
        $dispose(): void;
        /**
         * 设置表达式的值到viewModel上
         * @param  value    要设置的值
         */
        $setValue(value: any): void;
        $execute(): void;
    }
    module Binding {
        /**
         * 优先级(没办法啊，枚举类型不能在类里面定义)
         */
        enum Priority {
            low = -100,
            high = 100,
            normal = 0,
            aboveNormal = 50,
            belowNormal = -50,
        }
    }
}
declare namespace drunk {
    import Filter = drunk.Filter;
    import Watcher = drunk.Watcher;
    import observable = drunk.observable;
    import EventEmitter = drunk.EventEmitter;
    interface IModel extends observable.IObservableObject {
        [key: string]: any;
    }
    /**
     * Decorator for ViewModel#$computed
     */
    function computed(target: ViewModel, property: string, descriptor: PropertyDescriptor): PropertyDescriptor;
    /**
     * ViewModel类， 实现数据与模板元素的绑定
     */
    class ViewModel extends EventEmitter {
        /**
         * 实例是否未被释放
         */
        _isActived: boolean;
        /**
         * 数据对象
         */
        _model: IModel;
        /**
         * 该实例下所有的绑定实例的列表
         */
        _bindings: Binding[];
        /**
         * 该实例下所有的watcher实例表
         */
        _watchers: {
            [expression: string]: Watcher;
        };
        /** 代理的属性 */
        _proxyProps: {
            [property: string]: boolean;
        };
        /**
         * 过滤器方法,包含内置的
         */
        $filter: {
            [name: string]: Filter.IFilter;
        };
        /**
         * 事件处理方法集合
         */
        handlers: {
            [name: string]: (...args: any[]) => any;
        };
        /**
         * @param  model  初始化数据
         */
        constructor(model?: IModel);
        /**
         * 初始化私有属性,并对model里的所有字段进行代理处理
         * @param  model  数据对象
         */
        protected __init(model?: IModel): void;
        /**
         * 代理某个属性到最新的IModel上
         * @param   property  需要代理的属性名
         */
        $proxy(property: string): void;
        /**
         * 执行表达式并返回结果
         * @param   expression      表达式
         * @param   isInterpolate   是否是插值表达式
         */
        $eval(expression: string, isInterpolate?: boolean): any;
        /**
         * 根据表达式设置值
         * @param   expression  表达式
         * @param   value       值
         */
        $setValue(expression: string, value: any): void;
        /**
         * 把model数据转成json并返回
         * @return   json格式的不带getter/setter的model对象
         */
        $getModel(): any;
        /**
         * 监听表达式的里每个数据的变化
         * @param   expression  表达式
         * @return              返回一个取消监听的函数
         */
        $watch(expression: string, action: IBindingAction, isDeepWatch?: boolean, isImmediate?: boolean): () => void;
        $computed(property: string, descriptor: () => any): any;
        $computed(property: string, descriptor: {
            set?: (value: any) => void;
            get?: () => any;
        }): any;
        /**
         * 释放ViewModel实例的所有元素与数据的绑定,解除所有的代理属性,解除所有的视图与数据绑定,移除事件缓存,销毁所有的watcher
         */
        $release(): void;
        /**
         * 获取事件回调,内置方法
         * @param  handlerName  事件回调名称
         * @return              返回事件处理函数
         */
        protected __getHandler(handlerName: string): Function;
        /**
         * 根据getter函数获取数据
         * @param   getter         表达式解析生成的getter函数
         * @param   isInterpolate  是否是插值表达式
         * @param   event          事件对象
         * @param   el             元素对象
         */
        protected __execGetter(getter: any, isInterpolate: any): any;
    }
}
declare namespace drunk {
    import Promise = drunk.Promise;
    interface IActionExecutor {
        (element: HTMLElement, ondone: Function): () => void;
    }
    interface IActionDefinition {
        created: IActionExecutor;
        removed: IActionExecutor;
    }
    interface IActionType {
        created: string;
        removed: string;
    }
    interface IAction {
        cancel?(): void;
        promise?: Promise<any>;
    }
    /**
     * 动画模块
     */
    namespace Action {
        /**
         * action的类型
         */
        const Type: {
            created: string;
            removed: string;
        };
        /**
         * 注册一个js action
         * @method register
         * @param  {string}              name        动画名称
         * @param  {IActionDefinition}   definition  动画定义
         */
        function register<T extends IActionDefinition>(name: string, definition: T): void;
        /**
         * 根据名称获取注册的action实现
         * @param   name  action名称
         */
        function getByName(name: string): IActionDefinition;
        /**
         * 设置当前正在执行的action
         * @param   element 元素节点
         * @param   action  action描述
         */
        function setCurrentAction(element: HTMLElement, action: IAction): void;
        /**
         * 获取元素当前的action对象
         * @param   element  元素节点
         */
        function getCurrentAction(element: HTMLElement): IAction;
        /**
         * 移除当前元素的action引用
         * @param  element
         */
        function removeRef(element: HTMLElement): void;
        /**
         * 执行单个action,优先判断是否存在js定义的action,再判断是否是css动画
         * @param   element    元素对象
         * @param   detail     action的信息,动画名或延迟时间
         * @param   type       action的类型(created或removed)
         */
        function run(element: HTMLElement, detail: string, type: string): IAction;
        /**
         * 确认执行元素的所有action
         */
        function process(target: HTMLElement): Promise<any>;
        function process(target: HTMLElement[]): Promise<any>;
        function triggerAction(target: HTMLElement, type: string): Promise<any>;
    }
    /**
     * action绑定的实现
     */
    class ActionBinding extends Binding implements IBindingDefinition {
        static priority: Binding.Priority;
        private _actionNames;
        private _actionJob;
        private _currType;
        init(): void;
        /**
         * 解析action的定义表达式
         */
        private _parseDefinition(actionType);
        /**
         * 根据类型运行数据的action队列
         */
        private _runActions(type);
        /**
         * 先取消还在运行的action，再运行指定的action
         */
        runActionByType(type: string): void;
        release(): void;
    }
}
/**
 * DOM操作的工具方法模块
 */
declare namespace drunk.dom {
    import Promise = drunk.Promise;
    /**
     * 根据提供的html字符串创建html元素
     * @param   html  html字符串
     * @return        创建好的html元素或元素列表数组
     */
    function create(htmlString: string): Node | Node[];
    /**
     * 设置元素的innerHTML
     * @param   container  元素
     * @param   value      值
     */
    function html(container: HTMLElement, value: string): void;
    /**
     * 创建标记节点，如果开启debug模式，则创建comment节点，发布版本则用textNode
     */
    function createFlagNode(content: string): Node;
    /**
     * 在旧的元素节点前插入新的元素节点
     * @param  newNode  新的节点
     * @param  oldNode  旧的节点
     */
    function before(newNode: any, oldNode: Node): void;
    /**
     * 在旧的元素节点后插入新的元素节点
     * @param  newNode  新的节点
     * @param  oldNode  旧的节点
     */
    function after(newNode: any, oldNode: Node): void;
    /**
     * 移除元素节点
     * @param  target  节点
     */
    function remove(target: any): Promise<any>;
    /**
     * 新的节点替换旧的节点
     * @param  newNode  新的节点
     * @param  oldNode  旧的节点
     */
    function replace(newNode: any, oldNode: Node): void;
    /**
     * 为节点注册事件监听
     * @param  element  元素
     * @param  type     事件名
     * @param  listener 事件处理函数
     */
    function on(element: HTMLElement, type: string, listener: (ev: Event) => void): void;
    /**
     * 移除节点的事件监听
     * @param  element  元素
     * @param  type     事件名
     * @param  listener 事件处理函数
     */
    function off(element: HTMLElement, type: string, listener: (ev: Event) => void): void;
    /**
     * 添加样式
     * @param   element    元素
     * @param   token      样式名
     */
    function addClass(element: HTMLElement, token: string): void;
    /**
     * 移除样式
     * @param  element    元素
     * @param  token      样式名
     */
    function removeClass(element: HTMLElement, token: string): void;
    function addCSSRule(rules: {
        [selector: string]: {
            [property: string]: string;
        };
    }): void;
}
declare namespace drunk.Template {
    type BindingNode = {
        name: string;
        expression: string;
        priority: number;
        attribute?: string;
        isInterpolate?: boolean;
    };
    type BindingDescriptor = {
        bindings?: BindingNode[];
        children?: BindingDescriptor[];
        fragment?: DocumentFragment;
        isTerminal?: boolean;
        isTextNode?: boolean;
    };
    function compile(node: Node | Node[]): (viewModel: ViewModel, node: Node | Node[], owner?: ViewModel, placeholder?: HTMLElement) => () => void;
    function createBindingDescriptor(node: Node): {
        bindings?: {
            name: string;
            expression: string;
            priority: number;
            attribute?: string;
            isInterpolate?: boolean;
        }[];
        children?: BindingDescriptor[];
        fragment?: DocumentFragment;
        isTerminal?: boolean;
        isTextNode?: boolean;
    };
    function createBindingDescriptorList(nodeList: Node[]): {
        bindings?: {
            name: string;
            expression: string;
            priority: number;
            attribute?: string;
            isInterpolate?: boolean;
        }[];
        children?: BindingDescriptor[];
        fragment?: DocumentFragment;
        isTerminal?: boolean;
        isTextNode?: boolean;
    }[];
}
declare namespace drunk.Template {
    import Promise = drunk.Promise;
    /**
     * 加载模板，先尝试从指定ID的标签上查找，找不到再作为url发送ajax请求，
     * 加载到的模板字符串会进行缓存
     * @param    urlOrId  script模板标签的id或模板的url地址
     * @returns           Promise 对象,Promise的返回值为模板字符串
     */
    function load(urlOrId: string, useCache?: boolean): Promise<string>;
}
declare namespace drunk.Template {
    import Promise = drunk.Promise;
    /**
     * 把模块连接渲染为documentFragment,会对样式和脚本进行处理,避免重复加载,如果提供宿主容器元素,则会把
     * 模板渲染到改容器中
     * @param   url               模板连接
     * @param   hostedElement     容器元素
     * @param   useCache          是否使用缓存还是重新加载
     * @return                    返回一个Promise对象
     */
    function renderFragment(url: string, hostedElement?: HTMLElement, useCache?: boolean): Promise<Node>;
}
declare namespace drunk {
    import Promise = drunk.Promise;
    import ViewModel = drunk.ViewModel;
    interface IComponentOptions {
        name?: string;
        init?: () => void;
        data?: {
            [name: string]: any;
        };
        filters?: {
            [name: string]: Filter.IFilter;
        };
        watchers?: {
            [expression: string]: IBindingAction;
        };
        handlers?: {
            [name: string]: Function;
        };
        element?: Node | Node[];
        template?: string;
        templateUrl?: string;
    }
    interface IComponentContructor<T extends IComponentOptions> {
        extend?<T extends IComponentOptions>(name: string | T, members?: T): IComponentContructor<T>;
        (...args: any[]): void;
    }
    /**
     * Decorator for Component.register
     */
    function component(name: string): (constructor: any) => void;
    class Component extends ViewModel {
        /**
         * 组件是否已经挂在到元素上
         */
        protected _isMounted: boolean;
        /**
         * 组件被定义的名字
         */
        name: string;
        /** 作为模板并与数据进行绑定的元素,可以创建一个组件类是指定该属性用于与视图进行绑定 */
        element: Node | Node[];
        /** 组件的模板字符串,如果提供该属性,在未提供element属性的情况下会创建为模板元素 */
        template: string;
        /**
         * 组件的模板路径,可以是页面上某个标签的id,默认先尝试当成标签的id进行查找,找到的话使用该标签的innerHTML作为模板字符串,
         * 未找到则作为一个服务端的链接发送ajax请求获取
         */
        templateUrl: string;
        /** 该组件作用域下的事件处理方法 */
        handlers: {
            [name: string]: (...args) => void;
        };
        /** 监控器描述,key表示表达式,值为监控回调 */
        watchers: {
            [expression: string]: (newValue: any, oldValue: any) => void;
        };
        filters: {
            [name: string]: Filter.IFilter;
        };
        /** 组件的数据,会被初始化到Model中,可以为一个函数,函数可以直接返回值或一个处理值的Promise对象 */
        data: {
            [name: string]: any;
        };
        /**
         * 组件类，继承ViewModel类，实现了模板的准备和数据的绑定
         * @param  model  初始化的数据
         */
        constructor(model?: IModel);
        /**
         * 实例创建时会调用的初始化方法,派生类可覆盖该方法
         */
        init(): void;
        /**
         * 属性初始化
         * @param  model 数据
         */
        protected __init(model?: IModel): void;
        /**
         * 设置数据过滤器
         */
        $setFilters(filters: {
            [name: string]: Filter.IFilter;
        }): void;
        /**
         * 设置初始化数据
         */
        $resolveData(dataDescriptors: {
            [name: string]: any;
        }): Promise<{}>;
        /**
         * 处理模板，并返回模板元素
         */
        $processTemplate(templateUrl?: string): Promise<any>;
        /**
         * 把组件挂载到元素上
         * @param  element         要挂在的节点或节点数组
         * @param  ownerViewModel  父级viewModel实例
         * @param  placeholder     组件占位标签
         */
        $mount<T extends Component>(element: Node | Node[], ownerViewModel?: T, placeholder?: HTMLElement): void;
        /**
         * 释放组件
         */
        $release(): void;
        /**
         * 定义的组件记录
         */
        static constructorsByName: {
            [name: string]: IComponentContructor<any>;
        };
        /** 组件实例 */
        static instancesById: {
            [id: number]: Component;
        };
        /**
         * 组件的事件名称
         */
        static Event: {
            created: string;
            release: string;
            mounted: string;
            templateLoadFailed: string;
        };
        /**
         * 获取挂在在元素上的viewModel实例
         * @param   element 元素
         * @return  Component实例
         */
        static getByElement(element: any): Component;
        /**
         * 设置element与viewModel的引用
         * @param   element    元素
         * @param   component  组件实例
         */
        static setWeakRef<T extends Component>(element: any, component: T): void;
        /**
         * 移除挂载引用
         * @param  element  元素
         */
        static removeWeakRef(element: any): void;
        /**
         * 根据组件名字获取组件构造函数
         * @param  name  组件名
         * @return  组件类的构造函数
         */
        static getConstructorByName(name: string): IComponentContructor<any>;
        /**
         * 自定义一个组件类
         * @param  name     组件名，必然包含'-'在中间
         * @param  members  组件成员
         * @return          组件类的构造函数
         */
        static define<T extends IComponentOptions>(options: T): IComponentContructor<T>;
        static define<T extends IComponentOptions>(name: string, options: T): IComponentContructor<T>;
        /**
         * 当前组件类拓展出一个子组件
         * @param    name       子组件名
         * @param    members    子组件的实现配置项
         * @return              组件类的构造函数
         */
        static extend<T extends IComponentOptions>(options: T): IComponentContructor<T>;
        static extend<T extends IComponentOptions>(name: string, options: T): IComponentContructor<T>;
        /**
         * 把一个继承了drunk.Component的组件类根据组件名字注册到组件系统中
         * @param  name          组件名
         * @param  componentCtor 组件类
         */
        static register(name: string, componentCtor: any): void;
    }
}
declare namespace drunk {
}
declare namespace drunk {
}
declare namespace drunk {
}
declare namespace drunk {
}
declare namespace drunk {
    import Component = drunk.Component;
    interface IItemDataDescriptor {
        key: string | number;
        idx: number;
        val: any;
    }
    /**
     * 用于repeat作用域下的子viewModel
     * @param _parent     父级ViewModel
     * @param ownModel    私有的数据
     */
    class RepeatItem extends Component {
        private _parent;
        _isUsed: boolean;
        _isBinded: boolean;
        _flagNode: Node;
        _element: any;
        protected _models: IModel[];
        constructor(_parent: Component | RepeatItem, ownModel: IModel);
        /**
         * 这里只初始化私有model
         */
        protected __init(ownModel: any): void;
        /**
         * 继承父级viewModel的filter和私有model
         */
        protected __inheritParentMembers(): void;
        /**
         * 代理指定model上的所有属性
         */
        protected __proxyModel(model: IModel): void;
        /**
         * 重写代理方法,顺便也让父级viewModel代理该属性
         */
        $proxy(property: string): void;
        $getModel(): any;
        /**
         * 重写获取事件处理方法,忘父级查找该方法
         */
        protected __getHandler(handlerName: string): (...args: any[]) => any;
        /**
         * 实例释放
         */
        $release(): void;
        /**
         * 把数据转成列表,如果为空则转成空数组
         * @param  target  把对象转成带有item信息的数组
         */
        static toList(target: any): IItemDataDescriptor[];
    }
}
declare namespace drunk {
}
declare namespace drunk {
}
declare namespace drunk {
}
declare namespace drunk {
}
declare namespace drunk {
}
declare namespace drunk {
}
