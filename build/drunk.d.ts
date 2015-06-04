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
/**
 * 配置模块
 *
 * @module drunk.config
 * @class config
 */
declare module drunk.config {
    /**
     * 绑定指令的前缀
     *
     * @property prefix
     * @type string
     */
    var prefix: string;
    /**
     * debug模式配置变量
     *
     * @property debug
     * @type boolean
     */
    var debug: boolean;
}
declare module drunk {
    /**
     * 简单缓存类,提供简单的设置获取移除和清空功能
     * @module drunk.cache
     * @class Cache
     */
    class Cache<T> {
        /**
         * 清空所有缓存实例
         * @method cleanup
         * @static
         */
        static cleanup(): void;
        /**
         * 存储中心
         * @property _store
         * @private
         * @type object
         */
        private _store;
        constructor();
        /**
         * 根据key获取缓存的值
         * @method get
         * @param  {string}  key  要获取的字段
         * @return {T}
         */
        get(key: string): T;
        /**
         * 根据key和value设置缓存
         * @method  set
         * @param  {string}  key   要缓存的字段
         * @param  {any}     value 要缓存的值
         */
        set(key: string, value: T): void;
        /**
         * 移除对应字段的缓存
         * @method remove
         * @param  {string}  key  要移除的字段
         */
        remove(key: string): void;
        /**
         * 清空该实例下所有的缓存
         * @method cleanup
         */
        cleanup(): void;
    }
}
/**
 * 工具方法模块
 *
 * @module drunk.util
 * @class util
 * @main
 */
declare module drunk.util {
    /**
     * 获取对象的为一id
     * @method uuid
     * @static
     * @param  {any}     target  设置的对象
     * @return {number}
     */
    function uuid(target: any): number;
    /**
     * 判断是否是对象
     *
     * @static
     * @method isObject
     * @param  {any}        target 判断目标
     * @return {boolean}           返回结果
     */
    function isObject(target: any): boolean;
    /**
     * 拓展对象
     *
     * @static
     * @method extend
     * @param  {object}  destination  目标对象
     * @param  {object}  ...sources   不定长参数，源对象的集合
     * @return {object}               返回输入的目标对象
     */
    function extend(destination: any, ...sources: any[]): any;
    /**
     * 深度拷贝对象
     * @method deepClone
     * @static
     * @param  {any}  target  需要拷贝的对象
     * @return {any}
     */
    function deepClone(target: any): any;
    /**
     * 转换成数组
     *
     * @static
     * @method toArray
     * @param  {array} arrayLike  类似数组的对象
     * @return {array}            转换后的数组
     */
    function toArray(arrayLike: any): any[];
    /**
     * 给数组添加item，确保item不重复
     *
     * @static
     * @method addArrayItem
     * @param  {array}  array  数组
     * @param  {any}    item   值
     */
    function addArrayItem(array: any[], item: any): void;
    /**
     * 移除数组的指定值
     *
     * @static
     * @method removeArrayItem
     * @param  {array}  array  数组
     * @param  {any}    item   值
     */
    function removeArrayItem(array: any[], item: any): void;
    /**
     * 字符串驼峰化
     * @method camelCase
     * @static
     * @param  {string}  str 字符串
     * @return {string}
     */
    function camelCase(str: string): string;
    /**
     * Object.defineProperty的快捷方法，会设置configurable,writable默认为true
     *
     * @static
     * @method defineProperty
     * @param  {any}     target         设置的目标
     * @param  {string}  propertyName   属性
     * @param  {any}     propertyValue  值
     * @param  {boolean} [enumerable]   该属性是否可枚举
     */
    function defineProperty(target: any, propertyName: string, propertyValue: any, enumerable?: boolean): void;
    /**
     * 属性代理,把a对象的某个属性的读写代理到b对象上,返回代理是否成功的结果
     * @method proxy
     * @static
     * @param  {Object}  a         对象a
     * @param  {string}  property  属性名
     * @param  {Object}  b         对象b
     * @return {boolean}           如果已经代理过,则不再代理该属性
     */
    function proxy(a: Object, property: string, b: Object): boolean;
    /**
     * 设置函数在下一帧执行
     *
     * @static
     * @method nextTick
     * @param  {function}  callback  回调函数
     * @param  {any}       [sender]  函数执行时要bind的对象
     * @return {number}              返回定时器的id
     */
    function nextTick(callback: () => void, sender?: any): number;
}
declare module drunk {
    interface IEventListener {
        (...args: any[]): void;
    }
    /**
     * 事件管理类
     *
     * @class Events
     */
    class Events {
        /**
         * 注册事件
         *
         * @method addListener
         * @param  {string}          type       事件类型
         * @param  {IEventListener}   listener   事件回调
         */
        addListener(type: string, listener: IEventListener): void;
        /**
         * 移除指定类型的事件监听
         *
         * @method removeListener
         * @param  {string}         type     事件类型
         * @param  {IEventListener}  listener 事件回调
         */
        removeListener(type: string, listener: IEventListener): void;
        /**
         * 派发指定类型事件
         *
         * @method dispatchEvent
         * @param  {string}  type       事件类型
         * @param  {any[]}   ...args    其他参数
         */
        dispatchEvent(type: string, ...args: any[]): void;
        /**
         * 获取事件实例的指定事件类型的回调技术
         * @method getListenerCount
         * @static
         * @param  {Events} instance  事件类实例
         * @param  {string} type      事件类型
         * @return {number}
         */
        static getListenerCount(object: any, type: string): number;
        /**
         * 移除对象的所有事件回调引用
         * @method cleanup
         * @static
         * @param  {object}  object  指定对象
         */
        static cleanup(object: any): void;
    }
}
/**
 * DOM操作的工具方法模块
 *
 * @module drunk.elementUtil
 * @main
 * @class ElementUtil
 */
declare module drunk.elementUtil {
    /**
     * 根据提供的html字符串创建html元素
     * @static
     * @method create
     * @param  {string}  html  html字符串
     * @return {Node|Node[]}          创建好的html元素
     */
    function create(html: string): Node | Node[];
    /**
     * 在旧的元素节点前插入新的元素节点
     * @static
     * @method insertBefore
     * @param  {Node}  newNode  新的节点
     * @param  {Node}  oldNode  旧的节点
     */
    function insertBefore(newNode: Node, oldNode: Node): void;
    /**
     * 在旧的元素节点后插入新的元素节点
     * @static
     * @method insertAfter
     * @param  {Node}  newNode  新的节点
     * @param  {Node}  oldNode  旧的节点
     */
    function insertAfter(newNode: Node, oldNode: Node): void;
    /**
     * 移除元素节点
     * @static
     * @method remove
     * @param  {Node|Node[]}  target  节点
     */
    function remove(target: Node | Node[]): void;
    /**
     * 新的节点替换旧的节点
     * @static
     * @method replace
     * @param  {Node}  newNode  新的节点
     * @param  {Node}  oldNode  旧的节点
     */
    function replace(newNode: Node | Node[], oldNode: Node): void;
    /**
     * 为节点注册事件监听
     * @static
     * @method addListener
     * @param  {HTMLElement} element  元素
     * @param  {string}      type     事件名
     * @param  {function}    listener 事件处理函数
     */
    function addListener(element: HTMLElement, type: string, listener: (ev: Event) => void): void;
    /**
     * 移除节点的事件监听
     * @static
     * @method removeListener
     * @param  {HTMLElement} element  元素
     * @param  {string}      type     事件名
     * @param  {function}    listener 事件处理函数
     */
    function removeListener(element: HTMLElement, type: string, listener: (ev: Event) => void): void;
    /**
     * 添加样式
     * @static
     * @method addClass
     * @param  {HTMLElement}  element    元素
     * @param  {string}       token      样式名
     */
    function addClass(element: HTMLElement, token: string): void;
    /**
     * 移除样式
     * @static
     * @method removeClass
     * @param  {HTMLElement}  element    元素
     * @param  {string}       token      样式名
     */
    function removeClass(element: HTMLElement, token: string): void;
}
/**
 * @module drunk.util
 * @class util
 */
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
    /**
     * Ajax工具方法
     * @static
     * @method ajax
     * @param  {object}     	options                     配置参数
     * @param  {string}         options.url                 请求的url
     * @param  {string}         [options.type]              请求的类型(GET或POST)
     * @param  {string|object}  [options.data]              要发送的数据
     * @param  {object}         [options.headers]           请求头配置
     * @param  {object}         [options.xhrFields]         withCredentials配置
     * @param  {boolean}        [options.withCredentials]   withCredentials配置
     * @param  {string}         [options.contentType]       请求的content-type
     * @param  {string}         [options.dataType]          接受的数据类型(目前只支持json)
     * @return {Promise}                                    一个promise实例
     */
    function ajax<T>(options: IAjaxOptions): Promise<T>;
}
/**
 * @module drunk.observable
 * @class observable
 */
/**
 * 转换后的可以监控对象
 * 添加了设置和移除字段的两个能发送数据更新的方法。
 *
 * @private
 * @class ObservableObject
 * @for observable
 */
declare module drunk.observable {
    interface ObservableObject {
        [name: string]: any;
        __observer__?: Observer;
        setProperty?(name: string, value: any): void;
        removeProperty?(name: string): void;
    }
    /**
     * 设置对象的属性，并发送更新的消息
     *
     * @static
     * @for observable
     * @method setProperty
     * @param {ObservableObject} data   JSON对象或已经为observable的JSON对象
     * @param {string}           name   字段名
     * @param {any}              value  值
     */
    function setProperty(data: ObservableObject, name: string, value: any): void;
    /**
     * 移除对象属性，并会发送更新的消息
     *
     * @static
     * @for observable
     * @method removeProperty
     * @param {ObservableObject}  data  JSON对象或已经为observable的JSON对象
     * @param {string}            name  字段名
     */
    function removeProperty(data: ObservableObject, name: string): void;
    /**
     * 对象转换成observable后指向的原型对象
     *
     * @property ObservableObjectPrototype
     * @static
     * @for observable
     */
    var ObservableObjectPrototype: ObservableObject;
}
/**
 * @module drunk.observable
 */
declare module drunk.observable {
    /**
     * 监控对象类，为每个需要监控的对象和数组生成一个实例，用于代理监听事件
     * @class Observer
     * @extends Events
     * @constructor
     */
    class Observer extends Events {
        /**
         * 属性改变的回调函数列表
         * @property _propertyChangedCallbackList
         * @type array
         * @private
         */
        private _propertyChangedCallbackList;
        /**
         * 添加任意属性改变的回调
         * @method addPropertyChangedCallback
         * @param  {function}  callback
         */
        addPropertyChangedCallback(callback: IEventListener): void;
        /**
         * 移除任意属性改变的指定回调
         * @method removePropertyChangedCallback
         * @param  {function}  callback
         */
        removePropertyChangedCallback(callback: IEventListener): void;
        /**
         * 发送任意属性改变的通知
         * @method notify
         */
        notify(): void;
    }
}
/**
 * observable模块的工具方法，用于创建可观察的数据，数据绑定等
 *
 * @module drunk.observable
 * @class observable
 * @main
 */
declare module drunk.observable {
    /**
     * 根据数据返回对应的Observer 实例，如果该数据已经存在对应的 Observer 实例则直接返回，否则创建一个新的实例
     * @static
     * @method create
     * @param {ObservableArray|ObservableObject} data 数组或JSON对象
     * @return {Observer} 返回一个Observer实例
     */
    function create<T>(data: ObservableArray<T> | ObservableObject | any): Observer;
    /**
     * 访问observableObject的字段时会调用的回调
     * @static
     * @property onAccessingProperty
     * @param {Observer}     observer  返回的当前正在访问的数据的observer对象
     * @param {string}       property  正在访问的数据的字段
     * @param {any}             value  对应字段的数据
     * @param {ObservableObject} data  可观察数据
     */
    var onAccessingProperty: (observer: Observer, property: string, value: any, data: ObservableObject) => void;
    /**
     * 转换对象属性的getter/setter，使其能在数据更新是能接受到事件
     * @static
     * @method observe
     * @param {ObservableObject} data  	   JSON对象
     * @param {string}           property  JSON对象上的字段
     */
    function observe(data: ObservableObject, property: string, value: any): void;
    /**
     * 通知数据的指定属性更新
     * @static
     * @method notify
     * @param {ObservableArray|ObservableObject} data       数据
     * @param {string}  	                     [property] 要通知的字段名，如果该参数不提供，则派发该该数据更新的通知
     */
    function notify<T>(data: ObservableArray<T> | ObservableObject): void;
}
/**
 * @module drunk.observable
 * @class observable
 */
/**
 * 转换后的可以监控数组
 * 除了有常规数组的所有方法外还添加了几个工具方法，并在某些修改自身的方法调用后对新数据进行处理和
 * 发送数据更新的通知。
 *
 * @private
 * @class ObservableArray
 * @for observable
 */
declare module drunk.observable {
    /**
     * 可监控数组的声明
     */
    interface ObservableArray<T> extends Array<T> {
        __observer__?: Observer;
        setAt?(index: number, value: any): void;
        removeAt?<T>(index: number): T;
        removeItem?(value: any): void;
        removeAllItem?(value: any): void;
    }
    /**
     * 数组转换成observable后指向的原型对象
     *
     * @property ObservableArrayPrototype
     * @static
     * @for observable
     */
    var ObservableArrayPrototype: ObservableArray<any>;
    /**
     * 设置数组指定数组下标的值，并发送数组更新通知
     *
     * @static
     * @method setAt
     * @param {array}  array   observableArray类型的数组
     * @param {number} index   要设置的数组下标
     * @param {any}    value   要设置的值
     */
    function setAt<T>(array: ObservableArray<T>, index: number, value: T): void;
    /**
     * 根据索引移除数组中的元素，并发送数组更新通知
     *
     * @static
     * @for observable
     * @method removeAt
     * @param {array}  array  observableArray类型的数组
     * @param {number} index  要移除的下标
     * @returns {any}         返回移除的值
     */
    function removeAt<T>(array: ObservableArray<T>, index: number): T;
    /**
     * 删除数组中出现的一个指定值，并发送数组更新通知
     *
     * @static
     * @for observable
     * @method removeItem
     * @param {array} array  observableArray类型的数组
     * @param {any}   value  要移除的值
     */
    function removeItem<T>(array: ObservableArray<T>, value: any): void;
    /**
     * 删除数组中所有的指定值，并发送数组更新通知
     *
     * @static
     * @for observable
     * @method removeAllItem
     * @param {array} array  observableArray类型的数组
     * @param {any}   value  要移除的值
     */
    function removeAllItem<T>(array: ObservableArray<T>, value: any): void;
}
declare module drunk {
    class Watcher {
        private viewModel;
        private expression;
        private isDeepWatch;
        /**
         * 根据表达式和是否深度监听生成唯一的key,用于储存在关联的viewModel实例的watcher表中
         * @method getNameOfKey
         * @static
         * @param  {string}   expression  表达式
         * @param  {boolean}  isDeepWatch 是否深度监听
         * @return {string}   返回一个生成的key
         */
        static getNameOfKey(expression: string, isDeepWatch?: boolean): string;
        private _isInterpolate;
        private _actions;
        private _observers;
        private _properties;
        private _tmpObservers;
        private _tmpProperties;
        private _timerid;
        private _getter;
        /**
         * 表达式求值的结果
         * @property value
         * @type any
         */
        value: any;
        /**
         * 是否还是个活动的watcher
         * @property _isActived
         * @private
         * @type boolean
         */
        private _isActived;
        /**
         * 每个watcher对应一个表达式,watcher管理着对应这个表达式更新的回调函数.watcher在对表达式进行求值是,访问每个数据的getter,并得到
         * 该数据的observer引用,然后订阅该observer.当某个数据更新时该数据的observer实例会发送通知给所有的watcher,watcher接收到消息后
         * 会调用所有的表达式更新的回调.
         *
         * @class Watcher
         * @constructor
         * @param  {ViewModel} viewModel   ViewModel实例，用于访问数据
         * @param  {string}    expression  监听的表达式
         * @param  {boolean}   isDeepWatch 是否深度监听,当对象或数组里的任意一个数据改变都会发送更新消息
         */
        constructor(viewModel: ViewModel, expression: string, isDeepWatch?: boolean);
        /**
         * 添加数据更新回调
         * @method addAction
         * @param {function} action  回调函数
         */
        addAction(action: IBindingUpdateAction): void;
        /**
         * 移除数据更新回调
         *
         * @method removeAction
         * @param  {function} action 回调函数
         */
        removeAction(action: IBindingUpdateAction): void;
        /**
         * 数据更新派发，会先做缓冲，防止在同一时刻对此出发更新操作，等下一次系统轮训时再真正执行更新操作
         * @method __propertyChanged
         */
        __propertyChanged(): void;
        /**
         * 立即获取最新的数据判断并判断是否已经更新，如果已经更新，执行所有的回调
         * @method __runActions
         * @private
         * @return {Promise} 等待所有回调执行完毕的promise对象
         */
        __runActions(): void;
        /**
         * 释放引用和内存
         * @method dispose
         */
        dispose(): void;
        /**
         * 执行表达式函数获取最新的数据
         * @method __getValue
         * @private
         * @return {any}
         */
        private __getValue();
        /**
         * 设置observable的属性访问回调为当前watcher实例的订阅方法,当访问某个属性是就会对该属性进行订阅
         * @method __beforeGetValue
         * @private
         */
        private __beforeGetValue();
        /**
         * 表达式求解完后的收尾工作,取消注册onPropertyAccessed回调,并对比旧的observer表和新的表看有哪些
         * 实例已经不需要订阅
         * @method __afterGetValue
         * @private
         */
        private __afterGetValue();
        /**
         * 订阅属性的更新消息
         * @method __subscribePropertyChanged
         * @private
         * @param  {Observer} observer 属性的所属观察者
         * @param  {string}   property 属性名
         */
        private _subscribePropertyChanged(observer, property);
    }
}
/**
 * 模板工具模块， 提供编译创建绑定，模板加载的工具方法
 * @module drunk.Template
 * @class Template
 * @main
 */
declare module drunk.Template {
    /**
     * 编译模板元素生成绑定方法
     * @param  {any}        node        模板元素
     * @param  {boolean}    isRootNode  是否是根元素
     * @return {function}               绑定元素与viewModel的方法
     */
    function compile(node: any): IBindingExecutor;
}
declare module drunk {
    /**
     * 绑定更新方法接口
     * @interface IBindingUpdateAction
     * @type function
     */
    interface IBindingUpdateAction {
        (newValue: any, oldValue: any): any;
    }
    /**
     * 绑定声明接口
     * @interface IBindingDefinition
     * @type object
     */
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
    /**
     * 绑定构建函数接口
     * @interface IBindingExecutor
     * @type function
     */
    interface IBindingExecutor {
        (viewModel: ViewModel, element: any): void;
        isEnding?: boolean;
    }
    class Binding {
        viewModel: ViewModel;
        element: any;
        /**
         * 是否深度监听表达式
         * @property isDeepWatch
         * @type boolean
         */
        isDeepWatch: boolean;
        /**
         * 是否是绑定在一个插值表达式
         * @property isInterpolate
         * @type boolean
         */
        isInterpolate: boolean;
        /**
         * 绑定的表达式
         * @property expression
         * @type string
         */
        expression: string;
        init: () => void;
        update: IBindingUpdateAction;
        release: () => void;
        private _isActived;
        private _isLocked;
        private _unwatch;
        private _update;
        /**
         * 根据绑定的定义创建一个绑定实例，根据定义进行viewModel与DOM元素绑定的初始化、视图渲染和释放
         * @class Binding
         * @constructor
         * @param  {ViewModel}          viewModel       ViewModel实例
         * @param  {HTMLElement}        element         绑定元素
         * @param  {BindingDefinition}  definition      绑定定义
         * @param  {boolean} [descriptor.isDeepWatch]   是否深度监听
         * @param  {boolean} [descriptor.isTwowayBinding] 是否双向绑定
         */
        constructor(viewModel: ViewModel, element: any, descriptor: any);
        /**
         * 初始化绑定
         * @method initialize
         */
        initialize(): void;
        /**
         * 移除绑定并销毁
         * @method teardown
         */
        dispose(): void;
        /**
         * 设置表达式的值到viewModel上,因为值更新会触发视图更新,会返回来触发当前绑定的update方法,所以为了避免不必要的
         * 性能消耗,这里提供加锁操作,在当前帧内设置锁定状态,发现是锁定的情况就不再调用update方法,下一帧的时候再把锁定状态取消
         * @method setValue
         * @param  {any}     value    要设置的值
         * @param  {boolean} [isLocked] 是否加锁
         */
        setValue(value: any, isLocked?: boolean): void;
    }
    module Binding {
        /**
         * 根据一个绑定原型对象注册一个binding指令
         *
         * @method register
         * @static
         * @param  {string}          name  指令名
         * @param  {function|Object} def   binding实现的定义对象或绑定的更新函数
         */
        function register<T extends IBindingDefinition>(name: string, definition: T): void;
        /**
         * 根据绑定名获取绑定的定义
         *
         * @method getDefinitionByName
         * @static
         * @param  {string}  name      绑定的名称
         * @return {BindingDefinition} 具有绑定定义信息的对象
         */
        function getDefinintionByName(name: string): IBindingDefinition;
        /**
         * 获取已经根据优先级排序的终止型绑定的名称列表
         *
         * @method getEndingNames
         * @static
         * @return {array}  返回绑定名称列表
         */
        function getEndingNames(): string[];
        /**
         * 创建viewModel与模板元素的绑定
         *
         * @method create
         * @static
         * @param  {ViewModel}   viewModel  ViewModel实例
         * @param  {HTMLElement} element    元素
         * @return {Promise}                返回promise对象
         */
        function create(viewModel: ViewModel, element: any, descriptor: IBindingDefinition): Promise<void>;
    }
}
declare module drunk {
    interface IModel extends observable.ObservableObject {
        [key: string]: any;
    }
    /**
     * ViewModel类， 实现数据与模板元素的绑定
     *
     * @class ViewModel
     */
    class ViewModel extends Events {
        /**
         * 实例是否未被释放
         * @property _isActived
         * @type boolean
         */
        _isActived: boolean;
        /**
         * 数据对象
         * @property _model
         * @type object
         * @private
         */
        _model: IModel;
        /**
         * 该实例下所有的绑定实例的列表
         * @property _bindings
         * @type Array<Binding>
         * @private
         */
        _bindings: Binding[];
        /**
         * 该实例下所有的watcher实例表
         * @property _watchers
         * @type {[expression]: Watcher}
         * @private
         */
        _watchers: {
            [on: string]: Watcher;
        };
        /**
         * 过滤器方法,包含内置的
         * @property filter
         * @type Filter
         */
        filter: {
            [name: string]: filter.IFilter;
        };
        /**
         * 事件处理方法集合
         * @property handlers
         * @type object
         */
        handlers: {
            [name: string]: (...args: any[]) => any;
        };
        /**
         * constructor
         * @param  {IModel} [model] 数据
         */
        constructor(model?: IModel);
        /**
         * 初始化私有属性,并对model里的所有字段进行代理处理
         * @method __init
         * @protected
         * @param  {IModel} [model]  数据对象
         */
        protected __init(model?: IModel): void;
        /**
         * 代理某个属性到最新的IModel上
         *
         * @method proxy
         * @param  {string}  name  需要代理的属性名
         */
        proxy(name: string): void;
        /**
         * 执行表达式并返回结果
         *
         * @method eval
         * @param  {string}  expression      表达式
         * @param  {boolean} [isInterpolate] 是否是插值表达式
         * @return {string}                  结果
         */
        eval(expression: string, isInterpolate?: boolean): any;
        /**
         * 根据表达式设置值
         *
         * @method setValue
         * @param  {string}  expression  表达式
         * @param  {any}     value       值
         */
        setValue(expression: string, value: any): void;
        /**
         * 把model数据转成json并返回
         * @method getModel
         * @return {IModel}  反悔json格式的不带getter/setter的model
         */
        getModel(): any;
        /**
         * 监听表达式的里每个数据的变化
         *
         * @method watch
         * @param  {string}  expression  表达式
         * @return {function}            返回一个取消监听的函数
         */
        watch(expression: string, action: IBindingUpdateAction, isDeepWatch?: boolean, isImmediate?: boolean): () => void;
        /**
         * 释放ViewModel实例的所有元素与数据的绑定
         * 解除所有的代理属性
         * 解除所有的视图于数据绑定
         * 移除事件缓存
         * 销毁所有的watcher
         *
         * @method dispose
         */
        dispose(): void;
        /**
         * 获取事件回调,内置方法
         *
         * @method __getHandler
         * @internal
         * @param  {string}  handlerName  时间回调名称
         * @return {ViewModel} 返回事件处理函数
         */
        __getHandler(handlerName: string): Function;
        /**
         * 根据getter函数获取数据
         * @method __getValueByGetter
         * @param  {function}    getter         表达式解析生成的getter函数
         * @param  {boolean}     isInterpolate  是否是插值表达式
         * @param  {Event}       [event]        事件对象
         * @param  {HTMLElement} [el]           元素对象
         * @return {any}
         */
        __getValueByGetter(getter: any, isInterpolate: any): any;
    }
}
/**
 * 简单的解析器,只是做了字符串替换,然后使用new Function生成函数
 * @module drunk.parser
 * @class parser
 */
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
    /**
     * 解析表达式
     *
     * @method parse
     * @static
     * @param  {string}  expression  表达式
     * @return {function}            返回一个方法
     */
    function parse(expression: string): IGetter;
    /**
     * 解析表达式生成getter函数
     *
     * @method parsetGetter
     * @static
     * @param  {string}  expression  表达式字符串
     * @param  {boolean} skipFilter  跳过解析filter
     * @return {function}            getter函数
     */
    function parseGetter(expression: string, skipFilter?: boolean): IGetter;
    /**
     * 解析表达式生成setter函数
     *
     * @method parsetSetter
     * @static
     * @param  {string}  expression 表达式字符串
     * @return {function}           setter函数
     */
    function parseSetter(expression: string): ISetter;
    /**
     * 解析包含插值绑定的字符串表达式， 类似"a {{interpolate_let}}"， 花括号里的就是插值变量
     * 先判断是否存在花括号， 然后在解析成tokens， 再根据token生成getter函数
     *
     * @method parseInterpolate
     * @static
     * @param  {string}  expression  表达式字符串
     * @param  {boolean} justTokens  是否只需要返回tokens
     * @return {array|function}      返回token数组或getter函数
     */
    function parseInterpolate(expression: string): IGetter;
    function parseInterpolate(expression: string, justTokens: boolean): any[];
    /**
     * 是否有插值语法
     *
     * @method hasInterpolation
     * @static
     * @param  {string}  str  字符串
     * @return {boolean}      返回结果
     */
    function hasInterpolation(str: string): boolean;
}
/**
 * 数据过滤器模块
 * @module drunk.filter
 */
declare module drunk.filter {
    /**
     * Filter声明
     * @class Filter
     * @constructor
     * @param  {any}  input         输入
     * @param  {any[]} [...arggs]   其他参数
     * @return {any}                返回值
     */
    interface IFilter {
        (input: any, ...args: any[]): any;
    }
    interface FilterDef {
        name: string;
        param?: parser.IGetter;
    }
    /**
     * 使用提供的filter列表处理数据
     *
     * @method applyFilters
     * @static
     * @param  {any}            value       输入
     * @param  {FilterDef[]}    filterDefs  filter定义集合
     * @param  {ViewModel}      viewModel   ViewModel实例
     * @param  {any[]}          ...args     其他参数
     * @return {any}                        过滤后得到的值
     */
    function applyFilters(value: any, filterDefs: any, filterMap: {
        [name: string]: IFilter;
    }, isInterpolate: boolean, ...args: any[]): any;
    var filters: {
        [name: string]: IFilter;
    };
}
/**
 * @module drunk.Template
 * @class Template
 */
declare module drunk.Template {
    /**
     * 加载模板，先尝试从script标签上查找，找不到再发送ajax请求，
     * 加载到的模板字符串会进行缓存
     * @static
     * @method loadTemplate
     * @param   {string}  urlOrId  script模板标签的id或模板的url地址
     * @returns {Promise}           一个 promise 对象promise的返回值为模板字符串
     */
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
        /**
         * 获取组件所属的上级的viewModel和组件标签(组件标签类似于:<my-view></my-view>)
         * @event GET_COMPONENT_CONTEXT
         * @param {string}  eventName  需要响应的事件名
         */
        static GET_COMPONENT_CONTEXT: string;
        /**
         * 子组件被创建时触发的事件
         * @event SUB_COMPONENT_CREATED
         * @param  {Component}  component 触发的回调中得到的组件实例参数
         */
        static SUB_COMPONENT_CREATED: string;
        /**
         * 子组件的与视图挂载并创建绑定之后触发的事件
         * @event SUB_COMPONENT_MOUNTED
         * @param  {Component}  component 触发的回调中得到的组件实例参数
         */
        static SUB_COMPONENT_MOUNTED: string;
        /**
         * 子组件即将被销毁触发的事件
         * @event SUB_COMPONENT_BEFORE_RELEASE
         * @param  {Component}  component 触发的回调中得到的组件实例参数
         */
        static SUB_COMPONENT_BEFORE_RELEASE: string;
        /**
         * 子组件已经释放完毕触发的事件
         * @event SUB_COMPONENT_RELEASED
         * @param  {Component}  component 触发的回调中得到的组件实例参数
         */
        static SUB_COMPONENT_RELEASED: string;
        /**
         * 当前实例挂载到dom上时
         * @event MOUNTED
         */
        static MOUNTED: string;
        /**
         * 组件是否已经挂在到元素上
         * @property _isMounted
         * @private
         * @type boolean
         */
        private _isMounted;
        /**
         * 组件被定义的名字
         * @property name
         * @type string
         */
        name: string;
        /**
         * 作为模板并与数据进行绑定的元素,可以创建一个组件类是指定该属性用于与视图进行绑定
         * @property element
         * @type HTMLElement
         */
        element: Node | Node[];
        /**
         * 组件的模板字符串,如果提供该属性,在未提供element属性的情况下会创建为模板元素
         * @property template
         * @type string
         */
        template: string;
        /**
         * 组件的模板路径,可以是页面上某个标签的id,默认先尝试当成标签的id进行查找,找到的话使用该标签的innerHTML作为模板字符串,
         * 未找到则作为一个服务端的链接发送ajax请求获取
         * @property templateUrl
         * @type string
         */
        templateUrl: string;
        /**
         * 组件的数据,会被初始化到Model中,可以为一个函数,函数可以直接返回值或一个处理值的Promise对象
         * @property data
         * @type {[name: string]: any}
         */
        data: {
            [name: string]: any;
        };
        /**
         * 该组件作用域下的数据过滤器表
         * @property filters
         * @type {[name]: Filter}
         */
        filters: {
            [name: string]: filter.IFilter;
        };
        /**
         * 该组件作用域下的事件处理方法
         * @property handlers
         * @type {[name]: Function}
         */
        handlers: {
            [name: string]: (...args) => void;
        };
        /**
         * 监控器描述,key表示表达式,值为监控回调
         * @property watchers
         * @type object
         */
        watchers: {
            [expression: string]: (newValue: any, oldValue: any) => void;
        };
        /**
         * 实例创建时会调用的初始化方法
         * @property init
         * @type function
         */
        init: () => void;
        /**
         * 组件类，继承ViewModel类，实现了模板的准备和数据的绑定
         *
         * @class Component
         * @constructor
         */
        constructor(model?: IModel);
        protected __init(model?: IModel): void;
        /**
         * 处理模板，并返回模板元素
         *
         * @method processTemplate
         * @return {Promise}
         */
        processTemplate(templateUrl?: string): Promise<any>;
        /**
         * 把组件挂载到元素上
         * @method mount
         */
        mount(element: Node | Node[]): void;
        /**
         * 释放组件
         * @method dispose
         */
        dispose(): void;
    }
    module Component {
        var defined: {
            [name: string]: IComponentContructor<any>;
        };
        /**
         * 自定义一个组件类
         * @method define
         * @static
         * @param  {string}
         */
        function define<T extends IComponent>(name: string, members: T): void;
        /**
         * 当前组件类拓展出一个子组件
         * @method extend
         * @static
         * @param  {string}      name       子组件名
         * @param  {IComponent}  members    子组件的成员
         * @return {IComponentContructor}
         */
        function extend<T extends IComponent>(name: string | T, members?: T): IComponentContructor<T>;
        /**
         * 把一个继承了drunk.Component的组件类根据组件名字注册到组件系统中
         * @method reigster
         * @static
         * @param  {string}   name          组件名
         * @param  {function} componentCtor 组件类
         */
        function register<T>(name: string, componentCtor: IComponentContructor<T>): void;
    }
}
/**
 * 事件绑定,语法:
 *     * 单个事件
 *              'eventType: expression'  如 'click: visible = !visible'
 *              'eventType: callback()'  如 'click: onclick()'
 *     * 多个事件,使用分号隔开
 *              'eventType: expression; eventType2: callback()' 如  'mousedown: visible = true; mouseup: visible = false'
 *     * 一个事件里多个表达式,使用逗号隔开
 *              'eventType: expression1, callback()' 如 'click: visible = true, onclick()'
 * @class drunk-on
 * @constructor
 * @show
 * @example
         <html>
            <style>
                .over {color: red;}
            </style>
            <section>
                <p drunk-bind="num"></p>
                <!-- 单个事件 -->
                <button drunk-on="click:add()">点我加1</button>
                <!-- 多个事件 -->
                <button
                    drunk-class="{over: isOver}"
                    drunk-on="mouseover: isOver = true; mouseout: mouseleave()">
                    鼠标移动到我身上
                </button>
            </section>
        </html>
        
        <script>
            var myView = new drunk.Component();
            
            myView.add = function () {
                ++this.num;
            };
            myView.mouseleave = function () {
                this.isOver = false;
            };
            
            myView.num = 0;
            myView.mount(document.querySelector("section"));
        </script>
 */
declare module drunk {
}
/**
 * 元素属性绑定,可以设置元素的attribute类型
 * @class drunk-attr
 * @constructor
 * @show
 * @example
 *       <html>
 *       <div drunk-attr="{style: customStyle}"></div>
 *       </html>
 *       <script>
 *       var myView = new drunk.Component();
 *       myView.mount(document.body);
 *       myView.customStyle = "background:red;width:200px;height:100px;";
 *       </script>
 */
declare module drunk {
}
/**
 * 数据单向绑定,根据标签替换其innerHTML|innerText|value等
 * @class drunk-bind
 * @constructor
 * @show
 * @example
        <html>
            <section>
                <p>
                    输入绑定的内容:<input type="text" drunk-model="text" />
                </p>
                <p>
                    绑定在span标签上:<span drunk-bind="text"></span>
                </p>
                <p>
                    绑定在textarea标签上:<textarea drunk-bind="text"></textarea>
                </p>
            </section>
        </html>
        
        <script>
            new drunk.Component().mount(document.querySelector("section"));
        </script>
 */
declare module drunk {
}
/**
 * 元素样式类名绑定
 * @class drunk-class
 * @constructor
 * @show
 * @example
 *       <html>
 *       <style>
 *          .strike {
 *              text-decoration: line-through;
 *           }
 *           .bold {
 *               font-weight: bold;
 *           }
 *           .red {
 *               color: red;
 *           }
 *           .orange {
 *              color: orange;
 *           }
 *       </style>
 *        <section>
 *          <p drunk-class="{strike: deleted, bold: important, red: error}">Map 形式的语法示例</p>
 *          <label>
 *             <input type="checkbox" drunk-model="deleted">
 *             deleted (使用 "strike" 样式)
 *          </label><br>
 *          <label>
 *             <input type="checkbox" drunk-model="important">
 *              important (使用 "bold" 样式)
 *           </label><br>
 *           <label>
 *              <input type="checkbox" drunk-model="error">
 *              error (使用 "red" 样式)
 *           </label>
 *           <hr>
 *           <p drunk-class="style">字符串语法示例</p>
 *           <input type="text" drunk-model="style"
 *                  placeholder="输入: bold strike red" aria-label="输入: bold strike red">
 *           <hr>
 *           <p drunk-class="[style1, style2, style3]">使用数组语法示例</p>
 *           <input drunk-model="style1"
 *                  placeholder="输入: bold, strike or red" aria-label="输入: bold, strike or red"><br>
 *           <input drunk-model="style2"
 *                  placeholder="输入: bold, strike or red" aria-label="输入: bold, strike or red 2"><br>
 *           <input drunk-model="style3"
 *                  placeholder="输入: bold, strike or red" aria-label="输入: bold, strike or red 3"><br>
 *           <hr>
 *        </section>
 *       </html>
 *       <script>
 *       new drunk.Component().mount(document.querySelector("section"));
 *       </script>
 */
declare module drunk {
}
declare module drunk {
}
/**
 * 条件表达式绑定,如果表达式的返回值为false则会把元素从elementUtil树中移除,为true则会添加到elementUtil树中
 * @class drunk-if
 * @constructor
 * @show
 * @example
        <html>
            <section>
                设置a的值: <input type="text" drunk-model="a" />
                <p drunk-if="a < 10">如果a小于10显示该标签</p>
            </section>
        </html>
        
        <script>
            var myView = new drunk.Component();
            myView.mount(document.querySelector("section"));
            myView.a = 0;
        </script>
 */
declare module drunk {
}
/**
 * 引入指定url的html字符串模板
 * @class drunk-include
 * @constructor
 * @show
 * @example
        <html>
            <section>
                <p>以下是标签中的模板</p>
                <div drunk-include="'tpl'"></div>
            </section>
            <div id="tpl" type="text/template" style="display:none">
                <div>这里是script 标签的模板</div>
            </div>
        </html>
        
        <script>
            new drunk.Component().mount(document.querySelector("section"));
        </script>
 */
declare module drunk {
}
/**
 * 数据双向绑定,只作用于输入控件,支持的控件有:
 *      * input (text|tel|number|checkbox|radio等)
 *      * textarea
 *      * select
 * @class drunk-model
 * @constructor
 * @show
 * @example
        <html>
            <section>
                <label for="exampleInput">选择一个日期:</label>
                <input type="date" id="exampleInput" name="input" drunk-model="time" placeholder="yyyy-MM-dd"
                min="2015-05-01" max="2015-12-31" />
                <p>选中的日期:<span drunk-bind="time|date:'YYYY-MM-DD'"></span></p>
            </section>
        </html>
        
        <script>
            var myView = new drunk.Component();
            myView.mount(document.querySelector("section"));
            myView.time = Date.now();
        </script>
 */
declare module drunk {
}
declare module drunk {
    /**
     * 用于repeat作用域下的子viewModel
     * @class RepeatItem
     * @constructor
     * @param {Component}   parent      父级ViewModel
     * @param {object}      ownModel    私有的数据
     * @param {HTMLElement} element     元素对象
     */
    class RepeatItem extends Component {
        parent: Component | RepeatItem;
        element: any;
        _isCollection: boolean;
        _isChecked: boolean;
        protected _models: IModel[];
        constructor(parent: Component | RepeatItem, ownModel: any, element: any);
        protected __init(ownModel: any): void;
        proxy(property: string): void;
        __getHandler(name: string): (...args: any[]) => any;
        private __proxyModel(model);
    }
}
/**
 * 切换元素显示隐藏,和drunk-if的效果相似,只是在具有多个绑定的情况下if的性能更好,反之是show的性能更好
 * @class drunk-show
 * @constructor
 * @show
 * @example
 *      <html>
 *          <section>
 *               <p drunk-show="currtab === 'a'">A</p>
 *               <p drunk-show="currtab === 'b'">B</p>
 *               <p drunk-show="currtab === 'c'">C</p>
 *
 *               <p>选中显示某个元素</p>
 *               <select drunk-model="currtab">
 *                  <option value="a">A</option>
 *                  <option value="b">B</option>
 *                  <option value="c">C</option>
 *               </select>
 *          </section>
 *      </html>
 *      <script>
 *       var myView = new drunk.Component();
 *       myView.mount(document.querySelector("section"));
 *      </script>
 */
declare module drunk {
}
declare module drunk {
}