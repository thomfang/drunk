var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var drunk;
(function (drunk) {
    var PromiseState;
    (function (PromiseState) {
        PromiseState[PromiseState["PENDING"] = 0] = "PENDING";
        PromiseState[PromiseState["RESOLVED"] = 1] = "RESOLVED";
        PromiseState[PromiseState["REJECTED"] = 2] = "REJECTED";
    })(PromiseState || (PromiseState = {}));
    function noop() { }
    function init(promise, executor) {
        function resolve(value) {
            resolvePromise(promise, value);
        }
        function reject(reason) {
            rejectPromise(promise, reason);
        }
        try {
            executor(resolve, reject);
        }
        catch (e) {
            rejectPromise(promise, e);
        }
    }
    function resolvePromise(promise, value) {
        // 已经处理过就不管了
        if (promise._state !== PromiseState.PENDING) {
            return;
        }
        if (promise === value) {
            publish(promise, new TypeError('Chaining cycle detected for promise #<Promise>'), PromiseState.REJECTED);
        }
        else if (isThenable(value)) {
            handleThenable(value, promise);
        }
        else {
            publish(promise, value, PromiseState.RESOLVED);
        }
    }
    function rejectPromise(promise, reason) {
        if (promise._state !== PromiseState.PENDING) {
            return;
        }
        if (promise === reason) {
            reason = new TypeError('Chaining cycle detected for promise #<Promise>');
        }
        publish(promise, reason, PromiseState.REJECTED);
    }
    // 够不够严谨?
    function isThenable(target) {
        return target && typeof target.then === 'function';
    }
    function handleThenable(thenable, promise) {
        var toResolve = function (value) {
            resolvePromise(promise, value);
        };
        var toReject = function (reason) {
            rejectPromise(promise, reason);
        };
        // 如果是自己实现的 Promise 类实例，直接publish 不同放进下一帧了
        if (thenable instanceof Promise) {
            if (thenable._state === PromiseState.PENDING) {
                subscribe(thenable, promise, toResolve, toReject);
            }
            else if (thenable._state === PromiseState.RESOLVED) {
                publish(promise, thenable._value, PromiseState.RESOLVED);
            }
            else {
                publish(promise, thenable._value, PromiseState.REJECTED);
            }
        }
        else {
            thenable.then(toResolve, toReject);
        }
    }
    function publish(promise, value, state) {
        promise._state = state;
        promise._value = value;
        asap(function () {
            var listeners = promise._listeners;
            var total = listeners.length;
            if (!total) {
                return;
            }
            for (var i = 0; i < total; i += 3) {
                invokeCallback(state, listeners[i], listeners[i + state], value);
            }
            listeners.length = 0;
        });
    }
    function asap(callback) {
        // setTimeout(callback, 0);
        callback();
    }
    function invokeCallback(state, promise, callback, value) {
        var hasCallback = typeof callback === 'function';
        var done = false;
        var fail = false;
        if (!promise) {
            if (hasCallback) {
                try {
                    callback.call(undefined, value);
                }
                catch (e) {
                    setTimeout(function () { throw e; }, 0);
                }
            }
            return;
        }
        // 已经被处理过的就不管了
        if (promise._state !== PromiseState.PENDING) {
            return;
        }
        if (hasCallback) {
            try {
                value = callback.call(undefined, value);
                done = true;
            }
            catch (e) {
                value = e;
                fail = true;
            }
        }
        // 处理成功
        if (hasCallback && done) {
            resolvePromise(promise, value);
        }
        else if (fail) {
            rejectPromise(promise, value);
        }
        else if (state === PromiseState.RESOLVED) {
            publish(promise, value, state);
        }
        else {
            rejectPromise(promise, value);
        }
    }
    // 三个 item 为一个 子promise的订阅
    // 每段的第一个 item 为子 promise 实例
    // 第二个 item 为fulfillment 回调
    // 第三个 item 为 rejection 回调
    function subscribe(promise, subPromise, onFulfillment, onRejection) {
        var arr = promise._listeners;
        var len = arr.length;
        arr[len + PromiseState.PENDING] = subPromise;
        arr[len + PromiseState.RESOLVED] = onFulfillment;
        arr[len + PromiseState.REJECTED] = onRejection;
    }
    var Promise = (function () {
        /**
         * @constructor
         */
        function Promise(executor) {
            this._state = PromiseState.PENDING;
            this._listeners = [];
            if (typeof executor !== 'function') {
                throw new TypeError("Promise constructor takes a function argument");
            }
            if (!(this instanceof Promise)) {
                throw new TypeError("Promise instance must be created by 'new' operator");
            }
            init(this, executor);
        }
        Promise.all = function (iterable) {
            return new Promise(function (resolve, reject) {
                var total = iterable.length;
                var count = 0;
                var rejected = false;
                var result = [];
                var check = function (i, value) {
                    result[i] = value;
                    if (++count === total) {
                        resolve(result);
                        result = null;
                    }
                };
                if (!total) {
                    return resolve(result);
                }
                iterable.forEach(function (thenable, i) {
                    if (!isThenable(thenable)) {
                        return check(i, thenable);
                    }
                    thenable.then(function (value) {
                        if (!rejected) {
                            check(i, value);
                        }
                    }, function (reason) {
                        if (!rejected) {
                            rejected = true;
                            result = null;
                            reject(reason);
                        }
                    });
                });
                iterable = null;
            });
        };
        Promise.race = function (iterable) {
            return new Promise(function (resolve, reject) {
                var total = iterable.length;
                var ended = false;
                var check = function (value, rejected) {
                    if (rejected) {
                        reject(value);
                    }
                    else {
                        resolve(value);
                    }
                    ended = true;
                };
                for (var i = 0, thenable = void 0; i < total; i++) {
                    thenable = iterable[i];
                    if (!isThenable(thenable)) {
                        resolve(thenable);
                        break;
                    }
                    if ((thenable instanceof Promise) && thenable._state !== PromiseState.PENDING) {
                        check(thenable._value, thenable._state === PromiseState.REJECTED);
                        break;
                    }
                    else {
                        thenable.then(function (value) { return check(value); }, function (reason) { return check(reason, true); });
                    }
                }
                iterable = null;
            });
        };
        Promise.resolve = function (value) {
            var promise = new Promise(noop);
            if (!isThenable(value)) {
                promise._state = PromiseState.RESOLVED;
                promise._value = value;
            }
            else {
                resolvePromise(promise, value);
            }
            return promise;
        };
        Promise.reject = function (reason) {
            var promise = new Promise(noop);
            if (!isThenable(reason)) {
                promise._state = PromiseState.REJECTED;
                promise._value = reason;
            }
            else {
                resolvePromise(promise, reason);
            }
            return promise;
        };
        Promise.timeout = function (delay) {
            if (delay === void 0) { delay = 0; }
            return new Promise(function (resolve) {
                setTimeout(resolve, delay);
            });
        };
        Promise.prototype.then = function (onFulfillment, onRejection) {
            var state = this._state;
            var value = this._value;
            if (state === PromiseState.RESOLVED && !onFulfillment) {
                return Promise.resolve(value);
            }
            if (state === PromiseState.REJECTED && !onRejection) {
                return Promise.reject(value);
            }
            var promise = new Promise(noop);
            if (state) {
                var callback_1 = arguments[state - 1];
                asap(function () {
                    invokeCallback(state, promise, callback_1, value);
                });
            }
            else {
                subscribe(this, promise, onFulfillment, onRejection);
            }
            return promise;
        };
        Promise.prototype.done = function (onFulfillment, onRejection) {
            var state = this._state;
            var value = this._value;
            if (state) {
                var callback_2 = arguments[state - 1];
                asap(function () {
                    invokeCallback(state, null, callback_2, value);
                });
            }
            else {
                subscribe(this, null, onFulfillment, onRejection);
            }
        };
        Promise.prototype.catch = function (onRejection) {
            return this.then(null, onRejection);
        };
        Promise.prototype.cancel = function () {
            if (this._state) {
                return;
            }
            rejectPromise(this, new Error('Canceled'));
        };
        return Promise;
    }());
    drunk.Promise = Promise;
})(drunk || (drunk = {}));
/**
 * 配置模块
 */
var drunk;
(function (drunk) {
    var config;
    (function (config) {
        /**
         * 绑定指令的前缀
         */
        config.prefix = "drunk-";
        /**
         * debug模式配置变量
         */
        config.debug = false;
        /**
         * 开启渲染优化
         */
        config.renderOptimization = true;
    })(config = drunk.config || (drunk.config = {}));
})(drunk || (drunk = {}));
var drunk;
(function (drunk) {
    /**
     * LRU Cache类
     */
    var Cache = (function () {
        /**
         * @param  capacity  容量值
         */
        function Cache(capacity) {
            /**
             * 缓存节点的hash表
             */
            this._cacheMap = {};
            /**
             * 缓存头部
             */
            this._head = null;
            /**
             * 缓存尾部
             */
            this._tail = null;
            /**
             * 缓存节点计数
             */
            this._count = 0;
            if (capacity < 1) {
                throw new Error("\u7F13\u5B58\u5BB9\u91CF\u5FC5\u987B\u5927\u4E8E0");
            }
            this._capacity = capacity;
        }
        /**
         * 根据key获取缓存的值
         * @param key  要获取的字段
         */
        Cache.prototype.get = function (key) {
            var cacheNode = this._cacheMap[key];
            if (!cacheNode) {
                return;
            }
            this._putToHead(cacheNode);
            return cacheNode.value;
        };
        /**
         * 根据key和value设置缓存
         * @param   key   要缓存的字段
         * @param   value 要缓存的值
         */
        Cache.prototype.set = function (key, value) {
            var cacheNode = this._cacheMap[key];
            if (cacheNode) {
                cacheNode.value = value;
            }
            else {
                cacheNode = this._cacheMap[key] = {
                    prev: null,
                    next: null,
                    key: key,
                    value: value
                };
                if (this._count < this._capacity) {
                    this._putToHead(cacheNode);
                    this._count += 1;
                }
                else {
                    this._putToHead(cacheNode);
                    this._removeTail();
                }
            }
        };
        /**
         * 把节点放到头部
         * @param  cacheNode  缓存节点
         */
        Cache.prototype._putToHead = function (cacheNode) {
            if (cacheNode === this._head) {
                return;
            }
            if (cacheNode.prev != null) {
                cacheNode.prev.next = cacheNode.next;
            }
            if (cacheNode.next != null) {
                cacheNode.next.prev = cacheNode.prev;
            }
            if (this._tail === cacheNode) {
                this._tail = cacheNode.prev;
            }
            cacheNode.prev = null;
            cacheNode.next = this._head;
            if (this._head) {
                this._head.prev = cacheNode;
            }
            else {
                this._tail = cacheNode;
            }
            this._head = cacheNode;
        };
        /**
         * 移除最后一个节点
         * @return 返回移除的节点的key
         */
        Cache.prototype._removeTail = function () {
            var tail = this._tail;
            this._tail = tail.prev;
            tail.prev.next = tail.next;
            tail.prev = null;
            tail.next = null;
            delete this._cacheMap[tail.key];
        };
        return Cache;
    }());
    drunk.Cache = Cache;
})(drunk || (drunk = {}));
/**
 * 工具方法模块
 */
var drunk;
(function (drunk) {
    var util;
    (function (util) {
        util.global = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
        var uniqueSymbol = typeof util.global.Symbol !== 'undefined' ? util.global.Symbol('__DRUNK_UID__') : '__DRUNK_UID__';
        var uidCounter = 0;
        /**
         * 获取对象的唯一id
         * @param  target  设置的对象
         */
        function uniqueId(target) {
            if (typeof target[uniqueSymbol] === 'undefined') {
                Object.defineProperty(target, uniqueSymbol, {
                    value: uidCounter++
                });
            }
            return target[uniqueSymbol];
        }
        util.uniqueId = uniqueId;
        /**
         * 判断是否是对象
         * @param   target 判断目标
         */
        function isPlainObjectOrObservableObject(target) {
            if (!target || typeof target !== 'object') {
                return false;
            }
            var proto = Object.getPrototypeOf(target);
            return Object.prototype.toString.call(target) === '[object Object]' && (proto === Object.prototype || proto === drunk.observable.ObservableObjectPrototype);
        }
        util.isPlainObjectOrObservableObject = isPlainObjectOrObservableObject;
        /**
         * 拓展对象
         * @param  destination  目标对象
         * @param  ...sources   不定长参数，源对象的集合
         * @return              返回输入的目标对象
         */
        function extend(destination) {
            var sources = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                sources[_i - 1] = arguments[_i];
            }
            sources.forEach(function (src) {
                if (src) {
                    Object.keys(src).forEach(function (key) {
                        destination[key] = src[key];
                    });
                }
            });
            return destination;
        }
        util.extend = extend;
        /**
         * 深度拷贝对象
         * @param   target  需要拷贝的对象
         */
        function deepClone(target) {
            if (Array.isArray(target)) {
                return target.map(function (item) {
                    return deepClone(item);
                });
            }
            if (isPlainObjectOrObservableObject(target)) {
                var ret = {};
                Object.keys(target).forEach(function (name) {
                    ret[name] = deepClone(target[name]);
                });
                return ret;
            }
            return target;
        }
        util.deepClone = deepClone;
        /**
         * 转换成数组
         * @param   arrayLike  类似数组的对象
         * @return             转换后的数组
         */
        function toArray(arrayLike) {
            return Array.prototype.slice.call(arrayLike);
        }
        util.toArray = toArray;
        /**
         * 给数组添加item，确保item不重复
         * @param   array  数组
         * @param   item   值
         */
        function addArrayItem(array, item) {
            if (array.indexOf(item) < 0) {
                array.push(item);
            }
        }
        util.addArrayItem = addArrayItem;
        /**
         * 移除数组的指定值
         * @param   array  数组
         * @param   item   值
         */
        function removeArrayItem(array, item) {
            var index = array.indexOf(item);
            if (index > -1) {
                array.splice(index, 1);
            }
        }
        util.removeArrayItem = removeArrayItem;
        /**
         * 字符串驼峰化
         * @param   str 字符串
         */
        function camelCase(str) {
            return str.replace(/[-_](\w)/g, function ($0, $1) { return $1.toUpperCase(); });
        }
        util.camelCase = camelCase;
        function hasProxy(target, property) {
            var des = Object.getOwnPropertyDescriptor(target, property);
            if (des && ((typeof des.get === 'function' && des.get === des.set) || !des.configurable)) {
                return true;
            }
            var proto = target.__proto__;
            while (proto) {
                des = Object.getOwnPropertyDescriptor(proto, property);
                if (des && ((typeof des.get === 'function' && des.get === des.set) || !des.configurable)) {
                    Object.defineProperty(target, property, des);
                    return true;
                }
                proto = proto.__proto__;
            }
            return false;
        }
        /**
         * 属性代理,把a对象的某个属性的读写代理到b对象上,返回代理是否成功的结果
         * @param   target    目标对象
         * @param   property  要代理的属性名
         * @param   source    源对象
         * @return            如果已经代理过,则不再代理该属性
         */
        function createProxy(target, property, source) {
            if (hasProxy(target, property)) {
                return false;
            }
            function proxyGetterSetter() {
                if (arguments.length === 0) {
                    return source[property];
                }
                source[property] = arguments[0];
            }
            Object.defineProperty(target, property, {
                enumerable: true,
                configurable: true,
                set: proxyGetterSetter,
                get: proxyGetterSetter
            });
            return true;
        }
        util.createProxy = createProxy;
        /**
         * 创建一个异步工作
         * @param   work       回调函数
         * @param   context    上下文对象
         * @return             返回一个带有cancel方法的job对象
         */
        function execAsyncWork(work, context) {
            var timerId;
            var job = {
                completed: false,
                cancel: function () {
                    if (!job.completed) {
                        clearTimeout(timerId);
                    }
                    context = work = null;
                }
            };
            timerId = setTimeout(function () {
                work.call(context);
                job.completed = true;
                context = work = null;
            }, 0);
            return job;
        }
        util.execAsyncWork = execAsyncWork;
        var handleCounter = 1;
        var requestAnimationCallbackMap = {};
        var requestAnimationWorker;
        util.requestAnimationFrame = util.global.requestAnimationFrame && util.global.requestAnimationFrame.bind(util.global) || function (callback) {
            var handle = handleCounter++;
            requestAnimationCallbackMap[handle] = callback;
            requestAnimationWorker = requestAnimationWorker || util.global.setTimeout(function () {
                var handlers = requestAnimationCallbackMap;
                var now = Date.now();
                requestAnimationCallbackMap = {};
                requestAnimationWorker = null;
                Object.keys(handlers).forEach(function (id) { return handlers[id](now); });
            }, 16);
            return handle;
        };
        util.cancelAnimationFrame = util.global.cancelAnimationFrame && util.global.cancelAnimationFrame.bind(util.global) || function (handle) {
            delete requestAnimationCallbackMap[handle];
        };
    })(util = drunk.util || (drunk.util = {}));
})(drunk || (drunk = {}));
/// <reference path="../util/util.ts" />
var drunk;
(function (drunk) {
    var util = drunk.util;
    var UID_OF_NAN = util.uniqueId({});
    var UID_OF_NULL = util.uniqueId({});
    var UID_OF_TRUE = util.uniqueId({});
    var UID_OF_FALSE = util.uniqueId({});
    var UID_OF_UNDEFINED = util.uniqueId({});
    /**
     * Map类，可把任务类型的对象作为key
     */
    var Map = (function () {
        function Map() {
            /**
             * 对应Key的数据
             */
            this._values = {};
            /**
             * 所有的key的列表
             */
            this._keys = [];
            /**
             * 所有的key生成的uid的列表
             */
            this._uids = [];
        }
        /**
         * 获取指定key的uid
         */
        Map.prototype._uidOf = function (key) {
            if (key === null) {
                return UID_OF_NULL;
            }
            if (key === undefined) {
                return UID_OF_UNDEFINED;
            }
            if (key === true) {
                return UID_OF_TRUE;
            }
            if (key === false) {
                return UID_OF_FALSE;
            }
            var type = typeof key;
            if (type === 'object') {
                return util.uniqueId(key);
            }
            if (type === 'string') {
                return ('"' + key + '"');
            }
            if (isNaN(key)) {
                return UID_OF_NAN;
            }
            if (type === 'number') {
                return ('-' + key + '-');
            }
            throw new Error("\u4E0D\u652F\u6301\u7684\u6570\u636E\u7C7B\u578B: " + type);
        };
        /**
         * 设值
         * @param   key  键,可为任意类型
         * @param  value 值
         */
        Map.prototype.set = function (key, value) {
            var uid = this._uidOf(key);
            if (this._uids.indexOf(uid) < 0) {
                this._uids.push(uid);
                this._keys.push(key);
            }
            this._values[uid] = value;
            return this;
        };
        /**
         * 取值
         * @param key  键名
         */
        Map.prototype.get = function (key) {
            var uid = this._uidOf(key);
            return this._values[uid];
        };
        /**
         * 是否有对应键的值
         * @param  key 键名
         */
        Map.prototype.has = function (key) {
            var uid = this._uidOf(key);
            return this._uids.indexOf(uid) > -1;
        };
        /**
         * 删除指定键的记录
         * @param   key 键名
         */
        Map.prototype.delete = function (key) {
            var uid = this._uidOf(key);
            var index = this._uids.indexOf(uid);
            if (index > -1) {
                this._uids.splice(index, 1);
                this._keys.splice(index, 1);
                delete this._values[uid];
                return true;
            }
            return false;
        };
        /**
         * 清除所有的成员
         */
        Map.prototype.clear = function () {
            this._keys = [];
            this._uids = [];
            this._values = {};
        };
        /**
         * 遍历
         * @param   callback  回调
         * @param   context   上下文,回调里的this参数
         */
        Map.prototype.forEach = function (callback, context) {
            var _this = this;
            var uids = this._uids.slice();
            this.keys().forEach(function (key, index) {
                var uid = uids[index];
                callback.call(context, _this._values[uid], key, _this);
            });
        };
        /**
         * 获取所有的key
         */
        Map.prototype.keys = function () {
            return this._keys.slice();
        };
        /**
         * 获取所有的值
         */
        Map.prototype.values = function () {
            var _this = this;
            return this._uids.map(function (uid) { return _this._values[uid]; });
        };
        Object.defineProperty(Map.prototype, "size", {
            /**
             * map的成员个数
             */
            get: function () {
                return this._keys.length;
            },
            enumerable: true,
            configurable: true
        });
        return Map;
    }());
    drunk.Map = Map;
})(drunk || (drunk = {}));
/// <reference path="../util/util.ts" />
var drunk;
(function (drunk) {
    var util = drunk.util;
    var eventCache = {};
    var prefixKey = 'DRUNK-ONCE-EVENT-';
    function getCache(emitter) {
        var id = util.uniqueId(emitter);
        if (!eventCache[id]) {
            eventCache[id] = {};
        }
        return eventCache[id];
    }
    /**
     * 事件管理类
     */
    var EventEmitter = (function () {
        function EventEmitter() {
        }
        /**
         * 注册事件
         * @param  type       事件类型
         * @param  listener   事件回调
         */
        EventEmitter.prototype.$addListener = function (type, listener) {
            var cache = getCache(this);
            if (!cache[type]) {
                cache[type] = [];
            }
            util.addArrayItem(cache[type], listener);
            return this;
        };
        /**
         * 注册事件,$addListener方法的别名
         * @param   type       事件类型
         * @param   listener   事件回调
         */
        EventEmitter.prototype.$on = function (type, listener) {
            return this.$addListener(type, listener);
        };
        /**
         * 注册一次性事件
         * @param   type      事件类型
         * @param   listener  事件回调
         */
        EventEmitter.prototype.$once = function (type, listener) {
            listener[prefixKey + util.uniqueId(this)] = true;
            this.$addListener(type, listener);
            return this;
        };
        /**
         * 移除指定类型的事件监听
         * @param   type     事件类型
         * @param   listener 事件回调
         */
        EventEmitter.prototype.$removeListener = function (type, listener) {
            var cache = getCache(this);
            var listeners = cache[type];
            if (!listeners || !listeners.length) {
                return;
            }
            util.removeArrayItem(listeners, listener);
            return this;
        };
        /**
         * 移除所有指定类型的事件,或当事件类型未提供时,移除所有该实例上所有的事件
         * @param   type  事件类型，可选
         */
        EventEmitter.prototype.$removeAllListeners = function (type) {
            if (!type) {
                EventEmitter.cleanup(this);
            }
            else {
                getCache(this)[type] = null;
            }
            return this;
        };
        /**
         * 派发指定类型事件
         * @param   type        事件类型
         * @param   ...args     其他参数
         */
        EventEmitter.prototype.$emit = function (type) {
            var _this = this;
            var args = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                args[_i - 1] = arguments[_i];
            }
            var cache = getCache(this);
            var listeners = cache[type];
            var onceKey = prefixKey + util.uniqueId(this);
            if (!listeners || !listeners.length) {
                return;
            }
            listeners.slice().forEach(function (listener) {
                listener.apply(_this, args);
                if (listener[onceKey]) {
                    util.removeArrayItem(listeners, listener);
                    delete listener[onceKey];
                }
            });
            return this;
        };
        /**
         * 获取指定事件类型的所有listener回调
         * @param   type  事件类型
         */
        EventEmitter.prototype.$listeners = function (type) {
            var listeners = getCache(this)[type];
            return listeners ? listeners.slice() : [];
        };
        /**
         * 获取事件实例的指定事件类型的回调技术
         * @param  emitter  事件类实例
         * @param  type     事件类型
         */
        EventEmitter.listenerCount = function (emitter, type) {
            var cache = getCache(emitter);
            if (!cache[type]) {
                return 0;
            }
            return cache[type].length;
        };
        /**
         * 移除对象的所有事件回调引用
         * @param  emitter  事件发射器实例
         */
        EventEmitter.cleanup = function (emitter) {
            var id = util.uniqueId(emitter);
            eventCache[id] = null;
        };
        return EventEmitter;
    }());
    drunk.EventEmitter = EventEmitter;
})(drunk || (drunk = {}));
/// <reference path="./util.ts" />
/**
 * 搜索字符串解析模块
 */
var drunk;
(function (drunk) {
    var querystring;
    (function (querystring) {
        /**
         * 解析字符串生成一个键值对表
         * @param  str  搜索字符串
         */
        function parse(str) {
            str = decodeURIComponent(str);
            var ret = {};
            str.split('&').forEach(function (pair) {
                var arr = pair.split('=');
                ret[arr[0]] = arr[1];
            });
            return ret;
        }
        querystring.parse = parse;
        /**
         * 把一个键值对表转化为搜索字符串
         * @param  obj 键值对表
         */
        function stringify(obj) {
            return Object.keys(obj).map(function (key) { return key + '=' + encodeURIComponent(obj[key]); }).join('&');
        }
        querystring.stringify = stringify;
    })(querystring = drunk.querystring || (drunk.querystring = {}));
})(drunk || (drunk = {}));
/// <reference path="./util.ts" />
/// <reference path="./querystring.ts" />
/// <reference path="../promise/promise.ts" />
var drunk;
(function (drunk) {
    var util;
    (function (util) {
        var Promise = drunk.Promise;
        var querystring = drunk.querystring;
        // const FORM_DATA_CONTENT_TYPE = 'application/x-www-form-urlencoded; charset=UTF-8';
        var schemeRegex = /^(\w+)\:\/\//;
        /**
         * XMLHTTP request工具方法
         * @param   options  配置参数
         */
        function ajax(options) {
            var xhr = new XMLHttpRequest();
            if (typeof options.url !== 'string' || !options.url) {
                throw new Error("ajax(options):options.url\u672A\u63D0\u4F9B\u6216\u4E0D\u5408\u6CD5");
            }
            return new Promise(function (resolve, reject) {
                var url = options.url;
                var type = (options.type || 'GET').toUpperCase();
                var headers = options.headers || {};
                var data = options.data;
                var contentType = options.contentType; // || FORM_DATA_CONTENT_TYPE;
                var isLocalRequest = false;
                var schemeMatch = schemeRegex.exec(options.url.toLowerCase());
                if (schemeMatch) {
                    if (schemeMatch[1] === 'file') {
                        isLocalRequest = true;
                    }
                }
                else if (location.protocol === 'file:') {
                    isLocalRequest = true;
                }
                if (Object.prototype.toString.call(data) === '[object Object]') {
                    if (contentType && contentType.match(/json/i)) {
                        data = JSON.stringify(data);
                    }
                    else {
                        data = querystring.stringify(data);
                        if (type === 'GET') {
                            url += (url.indexOf('?') === -1 ? '?' : '&') + data;
                            data = null;
                        }
                    }
                }
                xhr.onload = function () {
                    if (xhr.readyState === 4) {
                        if ((xhr.status >= 200 && xhr.status < 300) || (isLocalRequest && xhr.status === 0)) {
                            var result = (options.responseType || options.dataType) == 'json' ? JSON.parse(xhr.responseText) : xhr.response;
                            resolve(result);
                        }
                        else {
                            var contentType_1 = xhr.getResponseHeader('Content-Type');
                            reject({
                                res: contentType_1.match(/json/i) ? JSON.parse(xhr.responseText) : xhr.responseText,
                                xhr: xhr
                            });
                        }
                        xhr = null;
                    }
                };
                xhr.open(type, url, true, options.user, options.password);
                if (options.withCredentials || (options.xhrFields && options.xhrFields.withCredentials)) {
                    xhr.withCredentials = true;
                }
                if (typeof options.timeout === 'number' && options.timeout > 0) {
                    xhr.timeout = options.timeout;
                    xhr.ontimeout = function () {
                        if (xhr) {
                            xhr.abort();
                            reject(xhr);
                            xhr = null;
                        }
                    };
                }
                if (contentType) {
                    xhr.setRequestHeader("Content-Type", contentType);
                }
                Object.keys(headers).forEach(function (name) {
                    xhr.setRequestHeader(name, headers[name]);
                });
                xhr.send(data);
            });
        }
        util.ajax = ajax;
    })(util = drunk.util || (drunk.util = {}));
})(drunk || (drunk = {}));
/// <reference path="./observable.ts" />
/**
 * 转换后的可以监控对象
 * 添加了设置和移除字段的两个能发送数据更新的方法。
 */
var drunk;
(function (drunk) {
    var observable;
    (function (observable) {
        /**
         * 设置对象的属性，并发送更新的消息
         * @param  data   JSON对象或已经为observable的JSON对象
         * @param  name   字段名
         */
        function $set(data, name, value) {
            var descriptor = Object.getOwnPropertyDescriptor(data, name);
            if (!descriptor || (!descriptor.get && !descriptor.set)) {
                var oldValue = data[name];
                observable.observe(data, name, value);
                if (oldValue !== value) {
                    observable.notify(data);
                }
            }
            else {
                data[name] = value;
            }
        }
        observable.$set = $set;
        /**
         * 移除对象属性，并会发送更新的消息
         * @param  data  JSON对象或已经为observable的JSON对象
         * @param  name  字段名
         */
        function $remove(data, name) {
            if (!data.hasOwnProperty(name)) {
                return;
            }
            delete data[name];
            observable.notify(data);
        }
        observable.$remove = $remove;
        /**
         * 对象转换成observable后指向的原型对象
         */
        observable.ObservableObjectPrototype = {};
        Object.defineProperties(observable.ObservableObjectPrototype, {
            /**
             * 设置对象的指定字段的值
             * @param   name  字段名
             * @param   value 值
             */
            $set: {
                value: function setObservableObjectProperty(name, value) {
                    $set(this, name, value);
                }
            },
            /**
             * 删除对象的指定字段的值
             * @param   name  字段名
             */
            $remove: {
                value: function removeObservableObjectProperty(name) {
                    $remove(this, name);
                }
            }
        });
    })(observable = drunk.observable || (drunk.observable = {}));
})(drunk || (drunk = {}));
/// <reference path="../util/util.ts" />
/// <reference path="./observableArray.ts" />
/// <reference path="./observableObject.ts" />
/// <reference path="../events/eventemitter.ts" />
var drunk;
(function (drunk) {
    var observable;
    (function (observable) {
        var util = drunk.util;
        var EventEmitter = drunk.EventEmitter;
        /**
         * 监控对象类，为每个需要监控的对象和数组生成一个实例，用于代理监听事件
         */
        var Observer = (function (_super) {
            __extends(Observer, _super);
            function Observer() {
                _super.apply(this, arguments);
            }
            /**
             * 添加任意属性改变的回调
             */
            Observer.prototype.addPropertyChangedCallback = function (callback) {
                if (!this._propertyChangedCallbackList) {
                    this._propertyChangedCallbackList = [];
                }
                util.addArrayItem(this._propertyChangedCallbackList, callback);
            };
            /**
             * 移除任意属性改变的指定回调
             */
            Observer.prototype.removePropertyChangedCallback = function (callback) {
                if (!this._propertyChangedCallbackList) {
                    return;
                }
                util.removeArrayItem(this._propertyChangedCallbackList, callback);
                if (this._propertyChangedCallbackList.length === 0) {
                    this._propertyChangedCallbackList = null;
                }
            };
            /**
             * 发送任意属性改变的通知
             */
            Observer.prototype.notify = function () {
                if (!this._propertyChangedCallbackList) {
                    return;
                }
                this._propertyChangedCallbackList.slice().forEach(function (callback) { return callback(); });
            };
            return Observer;
        }(EventEmitter));
        observable.Observer = Observer;
    })(observable = drunk.observable || (drunk.observable = {}));
})(drunk || (drunk = {}));
/// <reference path="../util/util.ts" />
/// <reference path="./observableArray.ts" />
/// <reference path="./observableObject.ts" />
/// <reference path="./observer.ts" />
/// <reference path="../events/eventemitter.ts" />
/**
 * observable模块的工具方法，用于创建可观察的数据，数据绑定等
 */
var drunk;
(function (drunk) {
    var observable;
    (function (observable) {
        var util = drunk.util;
        /**
         * 根据数据返回对应的Observer 实例，如果该数据已经存在对应的 Observer 实例则直接返回，否则创建一个新的实例
         * @param data 数组或JSON对象
         */
        function create(data) {
            var isObject = util.isPlainObjectOrObservableObject(data);
            if (!isObject && !Array.isArray(data)) {
                return;
            }
            var ob;
            if (typeof data.__observer__ === 'undefined') {
                // 如果从未创建过observer实例
                ob = new observable.Observer();
                Object.defineProperties(data, {
                    __observer__: {
                        value: ob,
                        writable: true,
                        configurable: true
                    }
                });
                if (isObject) {
                    // 替换原型链
                    data.__proto__ = observable.ObservableObjectPrototype;
                    // 转换每个字段的getter seterr
                    Object.keys(data).forEach(function (property) {
                        observe(data, property, data[property]);
                    });
                }
                else {
                    // 替换原型链
                    data.__proto__ = observable.ObservableArrayPrototype;
                    // 为每一个item创建Observer实例
                    data.forEach(function (item) {
                        create(item);
                    });
                }
            }
            else {
                ob = data.__observer__;
            }
            return ob;
        }
        observable.create = create;
        /**
         * 转换对象属性的getter/setter，使其能在数据更新是能接受到事件
         * @param  data  	 JSON对象
         * @param  property  JSON对象上的字段
         */
        function observe(target, property, value) {
            var descriptor = Object.getOwnPropertyDescriptor(target, property);
            if (descriptor && typeof descriptor.get === 'function' && descriptor.get === descriptor.set) {
                // 如果已经绑定过了， 则不再绑定
                return;
            }
            var targetObserver = create(target);
            var valueObserver = create(value);
            Object.defineProperty(target, property, {
                enumerable: true,
                configurable: true,
                get: propertyGetterSetter,
                set: propertyGetterSetter
            });
            if (valueObserver) {
                valueObserver.addPropertyChangedCallback(propertyChanged);
            }
            // 属性的getter和setter，聚合在一个函数换取空间？
            function propertyGetterSetter() {
                if (arguments.length === 0) {
                    // 如果没有传入任何参数，则为访问，返回值
                    if (observable.onPropertyAccessing) {
                        // 调用存在的onPropertyAcess方法
                        observable.onPropertyAccessing(targetObserver, property, value, target);
                    }
                    return value;
                }
                var newValue = arguments[0];
                // 有传入参数，则是赋值操作
                if (!isNotEqual(newValue, value)) {
                    // 如果值相同，不做任何处理
                    return;
                }
                if (valueObserver) {
                    valueObserver.removePropertyChangedCallback(propertyChanged);
                }
                value = newValue;
                valueObserver = create(newValue);
                if (valueObserver) {
                    valueObserver.addPropertyChangedCallback(propertyChanged);
                }
                propertyChanged();
            }
            // 假设value是一个数组，当数组添加了一个新的item时，
            // 告知data的observer实例派发property改变的通知
            function propertyChanged() {
                targetObserver.$emit(property);
            }
        }
        observable.observe = observe;
        /**
         * 通知数据的指定属性更新
         * @param  data       数据
         * @param  property   要通知的字段名，如果该参数不提供，则派发该该数据更新的通知
         */
        function notify(data) {
            var observer = data.__observer__;
            if (observer) {
                observer.notify();
            }
        }
        observable.notify = notify;
        // 判断两个值是否不同
        function isNotEqual(a, b) {
            return a !== b || (typeof a === 'object' && a);
        }
    })(observable = drunk.observable || (drunk.observable = {}));
})(drunk || (drunk = {}));
/// <reference path="../util/util.ts" />
/// <reference path="./observable.ts" />
/**
 * 转换后的可以监控数组
 * 除了有常规数组的所有方法外还添加了几个工具方法，并在某些修改自身的方法调用后对新数据进行处理和
 * 发送数据更新的通知。
 */
var drunk;
(function (drunk) {
    var observable;
    (function (observable) {
        var util = drunk.util;
        /**
         * 数组转换成observable后指向的原型对象
         */
        observable.ObservableArrayPrototype = Object.create(Array.prototype);
        /**
         * 设置数组指定数组下标的值，并发送数组更新通知
         * @param  array   observableArray类型的数组
         * @param  index   要设置的数组下标
         * @param  value   要设置的值
         */
        function $setAt(array, index, value) {
            if (index > array.length) {
                array.length = index + 1;
            }
            array.splice(index, 1, value);
        }
        observable.$setAt = $setAt;
        /**
         * 根据索引移除数组中的元素，并发送数组更新通知
         * @param  array  observableArray类型的数组
         * @param  index  要移除的下标
         */
        function $removeAt(array, index) {
            var result;
            if (index > -1 && index < array.length) {
                result = Array.prototype.splice.call(array, index, 1)[0];
                observable.notify(array);
            }
            return result;
        }
        observable.$removeAt = $removeAt;
        /**
         * 删除数组中出现的一个指定值，并发送数组更新通知
         * @param  array  observableArray类型的数组
         * @param  value  要移除的值
         */
        function $removeItem(array, value) {
            util.removeArrayItem(array, value);
        }
        observable.$removeItem = $removeItem;
        /**
         * 删除数组中所有的指定值，并发送数组更新通知
         * @param  array  observableArray类型的数组
         * @param  value  要移除的值
         */
        function $removeAllItem(array, value) {
            var indexes = [];
            var step = 0;
            array.forEach(function (item, index) {
                if (value === item) {
                    indexes.push(index - step++);
                }
            });
            if (indexes.length) {
                indexes.forEach(function (index) {
                    array.splice(index, 1);
                });
                observable.notify(array);
            }
        }
        observable.$removeAllItem = $removeAllItem;
        /**
         * 删除所有数组元素
         */
        function $removeAll(array) {
            if (array.length) {
                array.length = 0;
                observable.notify(array);
            }
        }
        observable.$removeAll = $removeAll;
        Object.defineProperties(observable.ObservableArrayPrototype, {
            /**
             * 根据下标设置数组的值，并发送数据更新的通知
             * @param   index  数组下标
             * @param   value  要设置的值
             */
            $setAt: {
                value: function setObservableArrayItem(index, value) {
                    $setAt(this, index, value);
                }
            },
            /**
             * 根据下标移除数组的值，并发送数据更新的通知
             * @param   index  数组下标
             */
            $removeAt: {
                value: function removeObservalbeArrayByIndex(index) {
                    return $removeAt(this, index);
                }
            },
            /**
             * 移除指定的值，并发送数据更新的通知
             * @param  value  指定值
             */
            $removeItem: {
                value: function removeObservableArrayItem(value) {
                    return $removeItem(this, value);
                }
            },
            /**
             * 移除数组中所有指定的值，并发送数据更新的通知
             * @param  value  指定值
             */
            $removeAllItem: {
                value: function removeAllObservableArrayItem(value) {
                    return $removeAllItem(this, value);
                }
            },
            /**
             * 删除所有数组元素
             * @method removeAll
             */
            $removeAll: {
                value: function () {
                    return $removeAll(this);
                }
            },
            pop: {
                value: function pop() {
                    var result = Array.prototype.pop.call(this);
                    observable.notify(this);
                    return result;
                }
            },
            shift: {
                value: function shift() {
                    var result = Array.prototype.shift.call(this);
                    observable.notify(this);
                    return result;
                }
            },
            push: {
                value: function push() {
                    var args = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        args[_i - 0] = arguments[_i];
                    }
                    var result = Array.prototype.push.apply(this, args);
                    args.forEach(observable.create);
                    observable.notify(this);
                    return result;
                }
            },
            unshift: {
                value: function unshift() {
                    var args = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        args[_i - 0] = arguments[_i];
                    }
                    var result = Array.prototype.unshift.apply(this, args);
                    args.forEach(observable.create);
                    observable.notify(this);
                    return result;
                }
            },
            splice: {
                value: function splice() {
                    var args = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        args[_i - 0] = arguments[_i];
                    }
                    var result = Array.prototype.splice.apply(this, args);
                    args.slice(2).forEach(observable.create);
                    observable.notify(this);
                    return result;
                }
            },
            sort: {
                value: function sort(callback) {
                    var result = Array.prototype.sort.call(this, callback);
                    observable.notify(this);
                    return result;
                }
            },
            reverse: {
                value: function reverse() {
                    var result = Array.prototype.reverse.call(this);
                    observable.notify(this);
                    return result;
                }
            }
        });
    })(observable = drunk.observable || (drunk.observable = {}));
})(drunk || (drunk = {}));
/// <reference path="../filter/filter.ts" />
/// <reference path="../cache/cache.ts" />
/**
 * 简单的解析器,只是做了字符串替换,然后使用new Function生成函数
 */
var drunk;
(function (drunk) {
    var Parser;
    (function (Parser) {
        var Cache = drunk.Cache;
        var globalName = "$global";
        var eventName = "$event";
        var elementName = "$el";
        var valueName = "__value";
        var contextName = "this";
        var proxyOperation = contextName + ".$proxy";
        var getHandlerOperation = contextName + ".__getHandler";
        // 保留关键字
        var reserved = [
            'break', 'case', 'catch', 'continue', 'debugger', 'default', 'delete', 'do',
            'else', 'finally', 'for', 'function', 'if', 'in', 'instanceof', 'new', 'return',
            'switch', 'this', 'throw', 'try', 'typeof', 'var', 'void', 'while',
            'class', 'null', 'undefined', 'true', 'false', 'with', eventName, elementName, globalName,
            'let', 'abstract', 'import', 'yield', 'arguments'
        ];
        var tokenCache = new Cache(200);
        var getterCache = new Cache(200);
        var setterCache = new Cache(200);
        var filterCache = new Cache(200);
        var expressionCache = new Cache(200);
        var identifierCache = new Cache(200);
        var interpolateGetterCache = new Cache(200);
        var reIdentifier = /("|').*?\1|[a-zA-Z$_][a-z0-9A-Z$_]*/g;
        var reFilter = /("|').*?\1|\|\||\|\s*([a-zA-Z$_][a-z0-9A-Z$_]*)(:[^|]*)?/g;
        var reInterpolate = /\{\{((.|\n)+?)\}\}/g;
        var reBrackets = /^\([^)]*\)/;
        var reObjectKey = /[{,]\s*$/;
        var reColon = /^\s*:/;
        var reAnychar = /\S+/;
        var reThisProperties = /\bthis\.([_$[A-Za-z0-9]+)|\bthis\[\s*("|')(.+?)\2\s*\]/g;
        /**
         *  解析filter定义
         */
        function parseFilterDef(str, skipSetter) {
            if (skipSetter === void 0) { skipSetter = false; }
            if (!filterCache.get(str)) {
                var def_1 = [];
                var idx_1;
                str.replace(reFilter, function ($0, quote, name, args, i) {
                    if (!name) {
                        return $0;
                    }
                    if (idx_1 == null) {
                        // 记录filter开始的位置， 因为filter只能是连续的出现一直到表达式结尾
                        idx_1 = i;
                    }
                    var param;
                    if (args) {
                        param = parseGetter('[' + args.slice(1) + ']', false, true);
                    }
                    def_1.push({ name: name, param: param });
                });
                if (!def_1.length) {
                    return;
                }
                filterCache.set(str, {
                    input: str.slice(0, idx_1).trim(),
                    filters: def_1
                });
            }
            return filterCache.get(str);
        }
        /**
         *  断言非空字符串
         */
        function assertNotEmptyString(target, message) {
            if (!(typeof target === 'string' && reAnychar.test(target))) {
                throw new Error(message + ": \u8868\u8FBE\u5F0F\u4E0D\u80FD\u4E3A\u7A7A");
            }
        }
        /**
         *  是否是对象的key
         */
        function isObjectKey(str) {
            return str.match(reObjectKey) != null;
        }
        /**
         *  前一个字符是否是冒号
         */
        function isColon(str) {
            return str.match(reColon) != null;
        }
        /**
         *  是否是一个方法调用
         */
        function isCallFunction(str) {
            return str.match(reBrackets) != null;
        }
        /**
         *  解析所有的标记并对表达式进行格式化
         */
        function parseIdentifier(str) {
            var cache = identifierCache.get(str);
            if (!cache) {
                var index_1 = 0;
                var proxies_1 = [];
                var identifiers_1 = [];
                var formated = str.replace(reIdentifier, function (x, p, i) {
                    if (p === '"' || p === "'" || str[i - 1] === '.') {
                        // 如果是字符串: "aaa"
                        // 或对象的属性: .aaa
                        index_1 = i + x.length;
                        return x;
                    }
                    var prefix = str.slice(index_1, i); // 前一个字符
                    var suffix = str.slice(i + x.length); // 后一个字符
                    index_1 = i + x.length;
                    if (isColon(suffix) && isObjectKey(prefix)) {
                        // 如果前一个字符是冒号，再判断是否是对象的Key
                        return x;
                    }
                    if (reserved.indexOf(x) > -1) {
                        // 如果是保留关键字直接返回原字符串
                        return x;
                    }
                    if (isCallFunction(suffix)) {
                        // 如果后面有连续的字符是一对括号则为方法调用
                        // method(a) 会转成 __context.getHandler("method")(a)
                        return getHandlerOperation + ' && ' + getHandlerOperation + '("' + x + '")';
                    }
                    if (identifiers_1.indexOf(x) < 0) {
                        // 标记未添加到列表中是
                        proxies_1.push('  ' + proxyOperation + '("' + x + '")');
                        identifiers_1.push(x);
                    }
                    // 否则为属性访问， 直接加上下文
                    // a 转成  __context.a
                    return contextName + '.' + x;
                });
                cache = {
                    proxies: identifiers_1.length ? ('if (' + proxyOperation + ') {\n' + proxies_1.join(';\n') + ';\n}\n') : '',
                    formated: formated,
                    identifiers: identifiers_1
                };
                identifierCache.set(str, cache);
            }
            return cache;
        }
        /**
         *  创建函数
         */
        function createFunction(expression) {
            var args = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                args[_i - 1] = arguments[_i];
            }
            try {
                return Function.apply(Function, args);
            }
            catch (err) {
                console.error("\"" + expression + "\"\u89E3\u6790\u5931\u8D25,\u5C1D\u8BD5\u89E3\u6790\u540E\u7684\u7ED3\u679C\u4E3A\n", args[args.length - 1]);
                throw err;
            }
        }
        /**
         * 解析表达式
         * @param  expression  表达式
         */
        function parse(expression) {
            assertNotEmptyString(expression, "[Parser.parse]\u89E3\u6790\u8868\u8FBE\u5F0F\u5931\u8D25");
            var fn = expressionCache.get(expression);
            if (!fn) {
                var detail = parseIdentifier(expression);
                var fnBody = detail.proxies + "return (" + detail.formated + ");";
                fn = createFunction(expression, eventName, elementName, globalName, fnBody);
                expressionCache.set(expression, fn);
            }
            return fn;
        }
        Parser.parse = parse;
        /**
         * 解析表达式生成getter函数
         * @param   expression      表达式字符串
         * @param   isInterpolate   是否是一哥插值表达式
         * @param   skipFilter      跳过解析filter
         */
        function parseGetter(expression, isInterpolate, skipFilter) {
            assertNotEmptyString(expression, "[Parser.parseGetter]\u521B\u5EFAgetter\u5931\u8D25");
            if (isInterpolate) {
                return parseInterpolate(expression);
            }
            var getter = getterCache.get(expression);
            if (!getter) {
                var input = expression;
                var filter = void 0;
                if (!skipFilter && (filter = parseFilterDef(expression))) {
                    input = filter.input;
                }
                var detail = parseIdentifier(input);
                var fnBody = detail.proxies + "try{return (" + detail.formated + ");}catch(e){}";
                getter = createFunction(expression, eventName, elementName, globalName, fnBody);
                getter.dynamic = !!detail.identifiers.length;
                getter.filters = filter ? filter.filters : null;
                getterCache.set(expression, getter);
            }
            return getter;
        }
        Parser.parseGetter = parseGetter;
        /**
         * 解析表达式生成setter函数
         * @param   expression 表达式字符串
         */
        function parseSetter(expression) {
            assertNotEmptyString(expression, "[Parser.parseSetter]\u521B\u5EFAsetter\u5931\u8D25");
            var setter = setterCache.get(expression);
            if (!setter) {
                var detail = parseIdentifier(expression);
                var fnBody = detail.proxies + "return (" + detail.formated + " = " + valueName + ");";
                setter = createFunction(expression, valueName, fnBody);
                setterCache.set(expression, setter);
            }
            return setter;
        }
        Parser.parseSetter = parseSetter;
        function parseInterpolate(expression, justTokens) {
            console.assert(hasInterpolation(expression), "[Parser.parseInterpolate]\u975E\u6CD5\u8868\u8FBE\u5F0F", expression);
            var tokens = tokenCache.get(expression);
            if (!tokens) {
                tokens = [];
                var index_2 = 0;
                var length_1 = expression.length;
                expression.replace(reInterpolate, function ($0, exp, $2, i) {
                    if (i > index_2) {
                        tokens.push(expression.slice(index_2, i));
                    }
                    tokens.push({
                        expression: exp.trim()
                    });
                    index_2 = i + $0.length;
                    return $0;
                });
                if (index_2 < length_1 && index_2 !== 0) {
                    tokens.push(expression.slice(index_2));
                }
                tokenCache.set(expression, tokens);
            }
            if (!tokens.length) {
                return;
            }
            return justTokens ? tokens : tokensToGetter(tokens, expression);
        }
        Parser.parseInterpolate = parseInterpolate;
        /**
         * 是否有插值语法
         * @param   str  字符串
         */
        function hasInterpolation(str) {
            return typeof str === 'string' && str.match(reAnychar) !== null && str.match(reInterpolate) !== null;
        }
        Parser.hasInterpolation = hasInterpolation;
        // 根据token生成getter函数
        function tokensToGetter(tokens, expression) {
            var getter = interpolateGetterCache.get(expression);
            if (!getter) {
                var dynamic_1 = false;
                var filters_1 = [];
                tokens = tokens.map(function (item, i) {
                    if (typeof item === 'string') {
                        filters_1[i] = null;
                        return item;
                    }
                    if (item && item.expression != null) {
                        getter = parseGetter(item.expression);
                        filters_1[i] = getter.filters;
                        if (!getter.dynamic) {
                            return getter.call(null);
                        }
                        dynamic_1 = true;
                        return getter;
                    }
                    console.error("\u975E\u6CD5\u7684token:\n", item);
                });
                getter = function () {
                    var _this = this;
                    return tokens.map(function (item) {
                        if (typeof item === 'string') {
                            return item;
                        }
                        return item.call(_this);
                    });
                };
                getter.dynamic = dynamic_1;
                getter.filters = filters_1;
                getter.isInterpolate = true;
                interpolateGetterCache.set(expression, getter);
            }
            return getter;
        }
        function getProxyProperties(expression) {
            var properties = [];
            expression.toString().replace(reThisProperties, function ($0, $1, $2, $3) {
                if ($1) {
                    properties.push($1);
                }
                else if ($3) {
                    properties.push($3);
                }
                return $0;
            });
            return properties;
        }
        Parser.getProxyProperties = getProxyProperties;
    })(Parser = drunk.Parser || (drunk.Parser = {}));
})(drunk || (drunk = {}));
/// <reference path="../parser/parser.ts" />
/**
 * 数据过滤器模块
 * @module drunk.Filter
 */
var drunk;
(function (drunk) {
    var Filter;
    (function (Filter) {
        /**
         * 使用提供的filter列表处理数据
         * @param   value       输入
         * @param   filterDefs  filter定义集合
         * @param   viewModel   ViewModel实例
         * @param   ...args     其他参数
         */
        function pipeFor(value, filterDefs, filterMap, isInterpolate) {
            var args = [];
            for (var _i = 4; _i < arguments.length; _i++) {
                args[_i - 4] = arguments[_i];
            }
            if (!filterDefs) {
                return isInterpolate ? getInterpolateValue(value) : value;
            }
            if (isInterpolate) {
                // 如果是插值表达式,插值表达式的每个token对应自己的filter,需要一个个进行处理,
                // 如果某个token没有filter说明那个token只是普通的字符串,直接返回
                value = value.map(function (item, i) {
                    if (!filterDefs[i]) {
                        return item;
                    }
                    return Filter.pipeFor.apply(Filter, [item, filterDefs[i], filterMap, false].concat(args));
                });
                // 对所有token求值得到的结果做处理,如果是undefined或null类型直接转成空字符串,避免页面显示出undefined或null
                return getInterpolateValue(value);
            }
            var name;
            var param;
            var method;
            var viewModel = args[0];
            args = args.slice(1);
            // 应用于所有的filter
            filterDefs.forEach(function (def) {
                name = def.name;
                method = filterMap[name];
                if (typeof method !== 'function') {
                    throw new Error("\u672A\u627E\u5230filter\u7684\u5B9A\u4E49: " + name);
                }
                param = def.param ? def.param.apply(viewModel, args) : [];
                value = method.apply(void 0, [value].concat(param));
            });
            return value;
        }
        Filter.pipeFor = pipeFor;
        /**
         * 判断插值表达式的值个数,如果只有一个,则返回该值,如果有多个,则返回所有值的字符串相加
         */
        function getInterpolateValue(values) {
            if (values.length === 1) {
                return values[0];
            }
            return values.map(function (item) {
                if (item == null) {
                    return '';
                }
                return typeof item === 'object' ? JSON.stringify(item) : item;
            }).join('');
        }
        var reg = {
            escape: /[<>& "']/gm,
            unescape: /&.+?;/g,
            striptags: /(<([^>]+)>)/ig,
            format: /(yy|M|d|h|m|s)(\1)*/g
        };
        var escapeChars = {
            '&': "&amp;",
            ' ': "&nbsp;",
            '"': "&quot;",
            "'": "&#x27;",
            "<": "&lt;",
            ">": "&gt;"
        };
        var unescapeChars = {
            '&amp;': "&",
            "&nbsp;": " ",
            "&quot;": '"',
            "&#x27;": "'",
            "&lt;": "<",
            "&gt;": ">"
        };
        /**
         * filter方法表
         */
        Filter.filters = {
            /**
             * 对输入的字符串进行编码
             * @param  input  输入
             */
            escape: function (input) {
                return input.replace(reg.escape, function (x) {
                    return escapeChars[x];
                });
            },
            /**
             * 对输入的字符串进行解码
             * @param  input  输入
             */
            unescape: function (input) {
                return input.replace(reg.unescape, function (a) {
                    return unescapeChars[a];
                });
            },
            /**
             * 对输入的字符串进行截断
             * @param   input  输入
             * @param   length 保留的最大长度
             * @param   tail   结尾的字符串,默认为'...'
             */
            truncate: function (input, length, tail) {
                if (input.length <= length) {
                    return input;
                }
                return input.slice(0, length) + (tail != null ? tail : "...");
            },
            /**
             * 为特殊字符添加斜杠
             * @param  input  输入
             */
            addslashes: function (input) {
                return input.replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
            },
            /**
             * 移除特殊字符的斜杠
             * @param  input  输入
             */
            stripslashes: function (input) {
                return input.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\0/g, '\0').replace(/\\\\/g, '\\');
            },
            /**
             * 计算输入的长度，支持字符串、数组和对象
             * @param  input 输入
             */
            size: function (input) {
                if (input == null) {
                    return 0;
                }
                if (input.length != null) {
                    return input.length;
                }
                if (typeof input === 'object') {
                    var length_2 = 0;
                    for (var k in input) {
                        if (input.hasOwnProperty(k)) {
                            length_2 += 1;
                        }
                    }
                    return length_2;
                }
            },
            /**
             * JSON.stringify的别名
             * @param   input     输入
             * @param   ident     缩进
             */
            json: function (input, ident) {
                return JSON.stringify(input, null, ident || 4);
            },
            /**
             * 移除所有tag标签字符串,比如"<div>123</div>" => "123"
             * @param   input  输入
             */
            striptags: function (input) {
                return input.replace(reg.striptags, "");
            },
            /**
             * 当输入为undefined或null是返回默认值
             * @param  input        输入
             * @param  defaultValue 默认值
             */
            default: function (input, defaltValue) {
                return input == null ? defaltValue : input;
            },
            /**
             * 根据输入的时间戳返回指定格式的日期字符串
             * @param   input  时间戳
             * @param   format 要返回的时间格式
             */
            date: function (input, format) {
                return formatDate(input, format);
            },
            /**
             * 在控制台上打印输入
             * @param  input  输入
             */
            log: function (input) {
                console.log("[Filter.log]: ", input);
                return input;
            }
        };
        function formatDate(time, format) {
            if (!time) {
                return '';
            }
            if (typeof time === 'string') {
                time = time.replace(/-/g, "/");
            }
            var t = new Date(time);
            var y = String(t.getFullYear());
            var M = t.getMonth() + 1;
            var d = t.getDate();
            var H = t.getHours();
            var m = t.getMinutes();
            var s = t.getSeconds();
            return format.replace(reg.format, function (x) {
                switch (x) {
                    case "yyyy":
                        return y;
                    case "yy":
                        return y.slice(2);
                    case "MM":
                        return padded(M);
                    case "M":
                        return M;
                    case "dd":
                        return padded(d);
                    case "d":
                        return d;
                    case "h":
                        return H;
                    case "hh":
                        return padded(H);
                    case "mm":
                        return padded(m);
                    case "m":
                        return m;
                    case "s":
                        return s;
                    case "ss":
                        return padded(s);
                }
            });
        }
        function padded(n) {
            return n < 10 ? '0' + n : n;
        }
    })(Filter = drunk.Filter || (drunk.Filter = {}));
})(drunk || (drunk = {}));
/// <reference path="../util/util.ts" />
/// <reference path="../config/config.ts" />
/// <reference path="../parser/parser.ts" />
/// <reference path="../observable/observable.ts" />
var drunk;
(function (drunk) {
    var util = drunk.util;
    var config = drunk.config;
    var Parser = drunk.Parser;
    var observable = drunk.observable;
    var Watcher = (function () {
        /**
         * @param   viewModel   ViewModel实例，用于访问数据
         * @param   expression  监听的表达式
         * @param   isDeepWatch 是否深度监听,当对象或数组里的任意一个数据改变都会发送更新消息
         */
        function Watcher(viewModel, expression, isDeepWatch) {
            this.viewModel = viewModel;
            this.expression = expression;
            this.isDeepWatch = isDeepWatch;
            this._actions = [];
            this._observers = {};
            this._properties = {};
            this._isActived = true;
            this._isInterpolate = Parser.hasInterpolation(expression);
            this._getter = this._isInterpolate ? Parser.parseInterpolate(expression) : Parser.parseGetter(expression);
            if (!this._getter.dynamic) {
                throw new Error("\u4E0D\u80FDwatch\u4E0D\u5305\u542B\u4EFB\u4F55\u53D8\u91CF\u7684\u8868\u8FBE\u5F0F: \"" + expression + "\"");
            }
            this._propertyChanged = this._propertyChanged.bind(this);
            this.value = this._getValue();
        }
        /**
         * 根据表达式和是否深度监听生成唯一的key,用于储存在关联的viewModel实例的watcher表中
         * @param   expression  表达式
         * @param   isDeepWatch 是否深度监听
         */
        Watcher.getNameOfKey = function (expression, isDeepWatch) {
            return !!isDeepWatch ? expression + '<deep>' : expression;
        };
        /**
         * 添加数据更新回调
         * @param  action  回调函数
         */
        Watcher.prototype.addAction = function (action) {
            if (!this._isActived) {
                return;
            }
            util.addArrayItem(this._actions, action);
        };
        /**
         * 移除数据更新回调
         * @param  action 回调函数
         */
        Watcher.prototype.removeAction = function (action) {
            if (!this._isActived) {
                return;
            }
            util.removeArrayItem(this._actions, action);
            if (!this._actions.length) {
                this.dispose();
            }
        };
        /**
         * 销毁实例和移除所有应用
         */
        Watcher.prototype.dispose = function () {
            var _this = this;
            if (!this._isActived) {
                return;
            }
            Object.keys(this._observers).forEach(function (id) {
                Object.keys(_this._properties[id]).forEach(function (property) {
                    _this._observers[id].$removeListener(property, _this._propertyChanged);
                });
            });
            if (this._throttle) {
                util.cancelAnimationFrame(this._throttle);
            }
            var key = Watcher.getNameOfKey(this.expression, this.isDeepWatch);
            this.viewModel._watchers[key] = this._propertyChanged = this.value = this.viewModel = this.expression = this._getter = null;
            this._actions = this._observers = this._properties = this._tmpProperties = this._tmpObservers = null;
            this._isActived = false;
        };
        /**
         * 数据更新派发，会先做缓冲，防止在同一时刻对此出发更新操作，等下一次系统轮训时再真正执行更新操作
         */
        Watcher.prototype._propertyChanged = function () {
            var _this = this;
            if (!config.renderOptimization) {
                if (this._throttle) {
                    util.cancelAnimationFrame(this._throttle);
                }
                this._flush();
            }
            else if (!this._throttle) {
                this._throttle = util.requestAnimationFrame(function () { return _this._flush(); });
            }
        };
        /**
         * 立即获取最新的数据判断并判断是否已经更新，如果已经更新，执行所有的回调
         */
        Watcher.prototype._flush = function () {
            var _this = this;
            if (!this._isActived) {
                return;
            }
            this._throttle = null;
            var oldValue = this.value;
            var newValue = this._getValue();
            if ((typeof newValue === 'object' && newValue != null) || newValue !== oldValue) {
                this.value = newValue;
                this._actions.slice().forEach(function (action) {
                    if (_this._isActived) {
                        action(newValue, oldValue);
                    }
                });
            }
        };
        /**
         * 执行表达式函数获取最新的数据
         */
        Watcher.prototype._getValue = function () {
            this._beforeAccess();
            var newValue = this._getter.call(this.viewModel);
            if (this.isDeepWatch) {
                visit(newValue);
            }
            if (this._getter.filters) {
                // 派发到各个filter中处理
                newValue = drunk.Filter.pipeFor(newValue, this._getter.filters, this.viewModel.$filter, this._isInterpolate, this.viewModel);
            }
            this._accessed();
            return newValue;
        };
        /**
         * 设置observable的属性访问回调为当前watcher实例的订阅方法,当访问某个属性是就会对该属性进行订阅
         */
        Watcher.prototype._beforeAccess = function () {
            this._tmpObservers = {};
            this._tmpProperties = {};
            observable.onPropertyAccessing = this._subscribePropertyChanged.bind(this);
        };
        /**
         * 表达式求解完后的收尾工作,取消注册onPropertyAccessed回调,并对比旧的observer表和新的表看有哪些实例已经不需要订阅
         */
        Watcher.prototype._accessed = function () {
            // 清楚属性访问回调
            observable.onPropertyAccessing = null;
            var _a = this, _observers = _a._observers, _properties = _a._properties, _tmpObservers = _a._tmpObservers, _tmpProperties = _a._tmpProperties, _propertyChanged = _a._propertyChanged;
            Object.keys(_observers).forEach(function (id) {
                var observer = _observers[id];
                if (!_tmpObservers[id]) {
                    // 如果没有再订阅该observer,取消订阅所有的属性
                    Object.keys(_properties[id]).forEach(function (property) {
                        observer.$removeListener(property, _propertyChanged);
                    });
                }
                else {
                    Object.keys(_properties[id]).forEach(function (property) {
                        if (!_tmpProperties[id][property]) {
                            // 如果没有再订阅该属性,取消订阅该属性
                            observer.$removeListener(property, _propertyChanged);
                        }
                    });
                }
            });
            // 换成最新的
            this._observers = _tmpObservers;
            this._properties = _tmpProperties;
        };
        /**
         * 订阅属性的更新消息
         * @param  observer 属性的所属观察者
         * @param  property 属性名
         */
        Watcher.prototype._subscribePropertyChanged = function (observer, property) {
            var _a = this, _observers = _a._observers, _properties = _a._properties, _tmpObservers = _a._tmpObservers, _tmpProperties = _a._tmpProperties, _propertyChanged = _a._propertyChanged;
            var id = util.uniqueId(observer);
            if (!_tmpObservers[id]) {
                // 添加到临时订阅observer表
                // 添加到临时订阅属性列表
                _tmpObservers[id] = observer;
                _tmpProperties[id] = (_b = {}, _b[property] = true, _b);
                if (!_observers[id]) {
                    // 如果旧的订阅表也没有,则添加到旧表,并在判断
                    _observers[id] = observer;
                    _properties[id] = (_c = {}, _c[property] = true, _c);
                    observer.$addListener(property, _propertyChanged);
                }
                else if (!_properties[id][property]) {
                    // 如果没有订阅过该属性
                    _properties[id][property] = true;
                    observer.$addListener(property, _propertyChanged);
                }
            }
            else if (!_tmpProperties[id][property]) {
                _tmpProperties[id][property] = true;
                if (!_properties[id][property]) {
                    observer.$addListener(property, _propertyChanged);
                    _properties[id][property] = true;
                }
            }
            var _b, _c;
        };
        return Watcher;
    }());
    drunk.Watcher = Watcher;
    // 遍历访问所有的属性以订阅所有的数据
    function visit(target) {
        if (util.isPlainObjectOrObservableObject(target)) {
            Object.keys(target).forEach(function (key) {
                visit(target[key]);
            });
        }
        else if (Array.isArray(target)) {
            target.forEach(function (item) {
                visit(item);
            });
        }
    }
})(drunk || (drunk = {}));
/// <reference path="../util/util.ts" />
/// <reference path="../viewmodel/viewmodel.ts" />
var drunk;
(function (drunk) {
    var util = drunk.util;
    var refKey = 'DRUNK-BINDING-ID-LIST';
    /** 终止型绑定信息列表,每个绑定信息包含了name(名字)和priority(优先级)信息 */
    var terminalBindingDescriptors = [];
    /** 终止型绑定的名称 */
    var terminalBindings = [];
    function binding(name) {
        return function (constructor) {
            Binding.register(name, constructor);
        };
    }
    drunk.binding = binding;
    /**
     * 绑定类
     */
    var Binding = (function () {
        /**
         * 根据绑定的定义创建一个绑定实例，根据定义进行viewModel与DOM元素绑定的初始化、视图渲染和释放
         * @param  viewModel       ViewModel实例
         * @param  element         绑定元素
         * @param  definition      绑定定义
         */
        function Binding(viewModel, element, descriptor) {
            this.viewModel = viewModel;
            this.element = element;
            /**
             * 是否已经不可用
             */
            this._isActived = true;
            Binding.instancesById[util.uniqueId(this)] = this;
            util.extend(this, descriptor);
        }
        /**
         * 获取元素的所有绑定实例
         * @param  element  元素节点
         */
        Binding.getByElement = function (element) {
            if (!element[refKey]) {
                return [];
            }
            return element[refKey].map(function (id) { return Binding.instancesById[id]; });
        };
        /**
         * 添加引用
         * @param  element  元素节点
         * @param  binding  绑定实例
         */
        Binding.setWeakRef = function (element, binding) {
            if (!element[refKey]) {
                element[refKey] = [];
            }
            util.addArrayItem(element[refKey], util.uniqueId(binding));
        };
        /**
         * 移除引用
         * @param   element  元素节点
         * @param   binding  绑定实例
         */
        Binding.removeWeakRef = function (element, binding) {
            if (element[refKey]) {
                util.removeArrayItem(element[refKey], util.uniqueId(binding));
            }
        };
        Binding.register = function (name, definition) {
            definition.priority = definition.priority || Binding.Priority.normal;
            if (definition.isTerminal) {
                Binding._setTernimalBinding(name, definition.priority);
            }
            if (Object.prototype.toString.call(definition) === '[object Object]') {
                var ctor = function () {
                    var args = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        args[_i - 0] = arguments[_i];
                    }
                    Binding.apply(this, args);
                };
                ctor.isTerminal = definition.isTerminal;
                ctor.priority = definition.priority;
                ctor.retainAttribute = definition.retainAttribute;
                ctor.isDeepWatch = definition.isDeepWatch;
                util.extend(ctor.prototype, Binding.prototype, definition);
                definition = ctor;
            }
            if (Binding.definitions[name]) {
                console.warn(name, "\u7ED1\u5B9A\u539F\u5DF2\u5B9A\u4E49\u4E3A: ", Binding.definitions[name]);
                console.warn("\u66FF\u6362\u4E3A: ", definition);
            }
            Binding.definitions[name] = definition;
        };
        /**
         * 根据绑定名获取绑定的定义
         * @param   name      绑定的名称
         * @return            具有绑定定义信息的对象
         */
        Binding.getByName = function (name) {
            return Binding.definitions[name];
        };
        /**
         * 获取已经根据优先级排序的终止型绑定的名称列表
         * @return 返回绑定名称列表
         */
        Binding.getTerminalBindings = function () {
            return terminalBindings.slice();
        };
        /**
         * 创建viewModel与模板元素的绑定
         * @param   viewModel  ViewModel实例
         * @param   element    元素
         */
        Binding.create = function (viewModel, element, descriptor, parentViewModel, placeholder) {
            var Ctor = Binding.definitions[descriptor.name];
            if (!Ctor.retainAttribute && element.removeAttribute) {
                element.removeAttribute(drunk.config.prefix + descriptor.name);
            }
            var binding = new Ctor(viewModel, element, descriptor);
            util.addArrayItem(viewModel._bindings, binding);
            Binding.setWeakRef(element, binding);
            drunk.Component.setWeakRef(element, viewModel);
            binding.$initialize(parentViewModel, placeholder);
        };
        /**
         * 设置终止型的绑定，根据提供的优先级对终止型绑定列表进行排序，优先级高的绑定会先于优先级的绑定创建
         * @param   name      绑定的名称
         * @param   priority  绑定的优先级
         */
        Binding._setTernimalBinding = function (name, priority) {
            // 检测是否已经存在该binding
            // 如果存在则更新该binding的优先级
            for (var i = 0, item = void 0; item = terminalBindingDescriptors[i]; i++) {
                if (item.name === name) {
                    item.priority = priority;
                    break;
                }
            }
            // 添加到列表中
            // 重新根据优先级排序
            // 更新terminal bindings列表
            terminalBindingDescriptors.push({ name: name, priority: priority });
            terminalBindingDescriptors.sort(function (a, b) { return b.priority - a.priority; });
            terminalBindings = terminalBindingDescriptors.map(function (item) { return item.name; });
        };
        /**
         * 初始化绑定
         */
        Binding.prototype.$initialize = function (ownerViewModel, placeholder) {
            var _this = this;
            if (typeof this["init"] === 'function') {
                this["init"](ownerViewModel, placeholder);
            }
            this._isActived = true;
            if (typeof this["update"] !== 'function') {
                return;
            }
            var expression = this.expression;
            var isInterpolate = this.isInterpolate;
            var viewModel = this.viewModel;
            var getter = drunk.Parser.parseGetter(expression, isInterpolate);
            if (!getter.dynamic) {
                // 如果只是一个静态表达式直接取值更新
                return this["update"](viewModel.$eval(expression, isInterpolate), undefined);
            }
            this._update = function (newValue, oldValue) {
                if (!_this._isActived) {
                    return;
                }
                _this["update"](newValue, oldValue);
            };
            this._unwatch = viewModel.$watch(expression, this._update, this.isDeepWatch, false);
            this._isDynamic = true;
        };
        /**
         * 移除绑定并销毁
         */
        Binding.prototype.$dispose = function () {
            if (!this._isActived) {
                return;
            }
            if (typeof this["release"] === "function") {
                this["release"]();
            }
            if (this._unwatch) {
                this._unwatch();
            }
            Binding.removeWeakRef(this.element, this);
            delete Binding.instancesById[util.uniqueId(this)];
            this._unwatch = this._update = this.element = this.expression = this.viewModel = null;
            this._isActived = false;
        };
        /**
         * 设置表达式的值到viewModel上
         * @param  value    要设置的值
         */
        Binding.prototype.$setValue = function (value) {
            this.viewModel.$setValue(this.expression, value);
        };
        Binding.prototype.$execute = function () {
            if (!this._isDynamic) {
                return;
            }
            var key = drunk.Watcher.getNameOfKey(this.expression, this.isDeepWatch);
            var watcher = this.viewModel._watchers[key];
            if (watcher) {
                this._update(watcher.value, undefined);
            }
        };
        /** 实例 */
        Binding.instancesById = {};
        /**
         * 缓存的所有绑定声明的表
         */
        Binding.definitions = {};
        return Binding;
    }());
    drunk.Binding = Binding;
    var Binding;
    (function (Binding) {
        /**
         * 优先级(没办法啊，枚举类型不能在类里面定义)
         */
        (function (Priority) {
            Priority[Priority["low"] = -100] = "low";
            Priority[Priority["high"] = 100] = "high";
            Priority[Priority["normal"] = 0] = "normal";
            Priority[Priority["aboveNormal"] = 50] = "aboveNormal";
            Priority[Priority["belowNormal"] = -50] = "belowNormal";
        })(Binding.Priority || (Binding.Priority = {}));
        var Priority = Binding.Priority;
    })(Binding = drunk.Binding || (drunk.Binding = {}));
})(drunk || (drunk = {}));
/// <reference path="../util/util.ts" />
/// <reference path="../parser/parser.ts" />
/// <reference path="../watcher/watcher.ts" />
/// <reference path="../binding/binding.ts" />
/// <reference path="../filter/filter.ts" />
/// <reference path="../events/eventemitter.ts" />
var drunk;
(function (drunk) {
    var util = drunk.util;
    var Parser = drunk.Parser;
    var Filter = drunk.Filter;
    var Watcher = drunk.Watcher;
    var observable = drunk.observable;
    var EventEmitter = drunk.EventEmitter;
    var global = util.global;
    /**
     * Decorator for ViewModel#$computed
     */
    function computed(target, property, descriptor) {
        var getter;
        var setter;
        var proxies;
        if (descriptor.get) {
            getter = descriptor.get;
            proxies = Parser.getProxyProperties(descriptor.get);
        }
        if (descriptor.set) {
            setter = descriptor.set;
        }
        function computedGetterSetter() {
            var _this = this;
            if (!arguments.length) {
                if (getter) {
                    if (proxies) {
                        proxies.forEach(function (prop) { return _this.$proxy(prop); });
                    }
                    try {
                        return getter.call(this);
                    }
                    catch (e) { }
                }
            }
            else if (setter) {
                try {
                    setter.call(this, arguments[0]);
                }
                catch (e) { }
            }
        }
        descriptor.get = computedGetterSetter;
        descriptor.set = computedGetterSetter;
        descriptor.enumerable = true;
        descriptor.configurable = true;
        return descriptor;
    }
    drunk.computed = computed;
    /**
     * ViewModel类， 实现数据与模板元素的绑定
     */
    var ViewModel = (function (_super) {
        __extends(ViewModel, _super);
        /**
         * @param  model  初始化数据
         */
        function ViewModel(model) {
            _super.call(this);
            this.__init(model);
        }
        /**
         * 初始化私有属性,并对model里的所有字段进行代理处理
         * @param  model  数据对象
         */
        ViewModel.prototype.__init = function (model) {
            var _this = this;
            model = model || {};
            observable.create(model);
            Object.defineProperties(this, {
                $filter: {
                    value: Object.create(Filter.filters),
                    configurable: true,
                    writable: true
                },
                _model: {
                    value: model,
                    configurable: true,
                    writable: true
                },
                _bindings: {
                    value: [],
                    configurable: true,
                    writable: true
                },
                _watchers: {
                    value: {},
                    configurable: true,
                    writable: true
                },
                _proxyProps: {
                    value: {},
                    configurable: true,
                    writable: true
                },
                _isActived: {
                    value: true,
                    configurable: true,
                    writable: true
                }
            });
            Object.keys(model).forEach(function (property) {
                _this.$proxy(property);
            });
        };
        /**
         * 代理某个属性到最新的IModel上
         * @param   property  需要代理的属性名
         */
        ViewModel.prototype.$proxy = function (property) {
            if (this._proxyProps[property]) {
                return;
            }
            var value = this[property];
            if (value === undefined) {
                value = this._model[property];
            }
            if (util.createProxy(this, property, this._model)) {
                this._model.$set(property, value);
            }
            this._proxyProps[property] = true;
        };
        /**
         * 执行表达式并返回结果
         * @param   expression      表达式
         * @param   isInterpolate   是否是插值表达式
         */
        ViewModel.prototype.$eval = function (expression, isInterpolate) {
            var getter;
            if (isInterpolate) {
                if (!Parser.hasInterpolation(expression)) {
                    return expression;
                }
                getter = Parser.parseInterpolate(expression);
            }
            else {
                getter = Parser.parseGetter(expression);
            }
            return this.__execGetter(getter, isInterpolate);
        };
        /**
         * 根据表达式设置值
         * @param   expression  表达式
         * @param   value       值
         */
        ViewModel.prototype.$setValue = function (expression, value) {
            var setter = Parser.parseSetter(expression);
            setter.call(this, value);
        };
        /**
         * 把model数据转成json并返回
         * @return   json格式的不带getter/setter的model对象
         */
        ViewModel.prototype.$getModel = function () {
            var _this = this;
            var model = {};
            Object.keys(this._proxyProps).forEach(function (prop) { return model[prop] = _this._model[prop]; });
            return util.extend(model, util.deepClone(this._model));
        };
        /**
         * 监听表达式的里每个数据的变化
         * @param   expression  表达式
         * @return              返回一个取消监听的函数
         */
        ViewModel.prototype.$watch = function (expression, action, isDeepWatch, isImmediate) {
            var _this = this;
            var key = Watcher.getNameOfKey(expression, isDeepWatch);
            var watcher;
            watcher = this._watchers[key];
            if (!watcher) {
                watcher = this._watchers[key] = new Watcher(this, expression, isDeepWatch);
            }
            var wrappedAction = function (newValue, oldValue) {
                action.call(_this, newValue, oldValue);
            };
            watcher.addAction(wrappedAction);
            if (isImmediate) {
                wrappedAction(watcher.value, undefined);
            }
            return function () {
                watcher.removeAction(wrappedAction);
            };
        };
        ViewModel.prototype.$computed = function (property, descriptor) {
            var observer = observable.create(this._model);
            if (typeof descriptor === 'function') {
                descriptor = {
                    get: descriptor
                };
            }
            descriptor = computed(this, property, descriptor);
            Object.defineProperty(this, property, descriptor);
            this._proxyProps[property] = true;
            observer.$emit(property);
        };
        /**
         * 释放ViewModel实例的所有元素与数据的绑定,解除所有的代理属性,解除所有的视图与数据绑定,移除事件缓存,销毁所有的watcher
         */
        ViewModel.prototype.$release = function () {
            var _this = this;
            if (!this._isActived) {
                return;
            }
            Object.keys(this._proxyProps).forEach(function (property) {
                delete _this[property];
            });
            Object.keys(this._watchers).forEach(function (key) {
                if (_this._watchers[key]) {
                    _this._watchers[key].dispose();
                }
            });
            this._bindings.slice().forEach(function (binding) {
                binding.$dispose();
            });
            EventEmitter.cleanup(this);
            this._model = this._bindings = this._watchers = this._proxyProps = this.$filter = null;
            this._isActived = false;
        };
        /**
         * 获取事件回调,内置方法
         * @param  handlerName  事件回调名称
         * @return              返回事件处理函数
         */
        ViewModel.prototype.__getHandler = function (handlerName) {
            var handler = this[handlerName];
            var context = this;
            if (!handler) {
                if (typeof global[handlerName] === 'function') {
                    handler = global[handlerName];
                    context = global;
                }
                else {
                    throw new Error(handlerName + ": 没有找到该事件处理方法");
                }
            }
            return function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i - 0] = arguments[_i];
                }
                handler.apply(context, args);
            };
        };
        /**
         * 根据getter函数获取数据
         * @param   getter         表达式解析生成的getter函数
         * @param   isInterpolate  是否是插值表达式
         * @param   event          事件对象
         * @param   el             元素对象
         */
        ViewModel.prototype.__execGetter = function (getter, isInterpolate) {
            var value = getter.call(this, null, null, util.global);
            return Filter.pipeFor.apply(null, [value, getter.filters, this.$filter, isInterpolate, this]);
        };
        return ViewModel;
    }(EventEmitter));
    drunk.ViewModel = ViewModel;
})(drunk || (drunk = {}));
/// <reference path="../binding.ts" />
/// <reference path="../../config/config.ts" />
/// <reference path="../../promise/promise.ts" />
var drunk;
(function (drunk) {
    var util = drunk.util;
    var config = drunk.config;
    var Promise = drunk.Promise;
    var weakRefKey = 'drunk:action:binding';
    /**
     * 动画模块
     */
    var Action;
    (function (Action) {
        /**
         * action的类型
         */
        Action.Type = {
            created: 'created',
            removed: 'removed'
        };
        /**
         * js动画定义
         */
        var definitionMap = {};
        /**
         * 动画状态
         */
        var actionMap = {};
        var propertiesMap = {};
        var propertyPrefix = null;
        var transitionEndEvent = null;
        var animationEndEvent = null;
        function getPropertyName(property) {
            if (propertiesMap[property]) {
                return propertiesMap[property];
            }
            if (propertyPrefix === null) {
                var style = document.body.style;
                if ('webkitAnimationDuration' in style) {
                    propertyPrefix = 'webkit';
                    transitionEndEvent = 'webkitTransitionEnd';
                    animationEndEvent = 'webkitAnimationEnd';
                }
                else if ('mozAnimationDuration' in style) {
                    propertyPrefix = 'moz';
                }
                else if ('msAnimationDuration' in style) {
                    propertyPrefix = 'ms';
                }
                else {
                    propertyPrefix = '';
                }
                if (!transitionEndEvent && !animationEndEvent) {
                    // 只有webkit的浏览器是用特定的事件,其他的浏览器统一用一下两个事件
                    transitionEndEvent = 'transitionend';
                    animationEndEvent = 'animationend';
                }
            }
            var value = property;
            if (propertyPrefix) {
                value = propertyPrefix + (property.charAt(0).toUpperCase() + property.slice(1));
            }
            propertiesMap[property] = value;
            return value;
        }
        /**
         * 注册一个js action
         * @method register
         * @param  {string}              name        动画名称
         * @param  {IActionDefinition}   definition  动画定义
         */
        function register(name, definition) {
            if (definitionMap[name] != null) {
                console.warn(name, "action的定义已经被覆盖为", definition);
            }
            definitionMap[name] = definition;
        }
        Action.register = register;
        /**
         * 根据名称获取注册的action实现
         * @param   name  action名称
         */
        function getByName(name) {
            return definitionMap[name];
        }
        Action.getByName = getByName;
        /**
         * 设置当前正在执行的action
         * @param   element 元素节点
         * @param   action  action描述
         */
        function setCurrentAction(element, action) {
            var id = util.uniqueId(element);
            actionMap[id] = action;
        }
        Action.setCurrentAction = setCurrentAction;
        /**
         * 获取元素当前的action对象
         * @param   element  元素节点
         */
        function getCurrentAction(element) {
            var id = util.uniqueId(element);
            return actionMap[id];
        }
        Action.getCurrentAction = getCurrentAction;
        /**
         * 移除当前元素的action引用
         * @param  element
         */
        function removeRef(element) {
            var id = util.uniqueId(element);
            actionMap[id] = null;
        }
        Action.removeRef = removeRef;
        /**
         * 执行单个action,优先判断是否存在js定义的action,再判断是否是css动画
         * @param   element    元素对象
         * @param   detail     action的信息,动画名或延迟时间
         * @param   type       action的类型(created或removed)
         */
        function run(element, detail, type) {
            if (isNumber(detail)) {
                // 如果是一个数字,则为延时等待操作
                return wait(detail * 1000);
            }
            if (definitionMap[detail]) {
                // 如果有通过js注册的action,优先执行
                return runJavascriptAction(element, detail, type);
            }
            return runMaybeCSSAnimation(element, detail, type);
        }
        Action.run = run;
        function process(target) {
            var elements;
            if (!Array.isArray(target)) {
                elements = [target];
            }
            else {
                elements = target;
            }
            return Promise.all(elements.map(function (el) {
                var action = getCurrentAction(el);
                return action && action.promise;
            }));
        }
        Action.process = process;
        function triggerAction(target, type) {
            var action = target[weakRefKey];
            if (action) {
                action.runActionByType(type);
                return process(target);
            }
            return Promise.resolve();
        }
        Action.triggerAction = triggerAction;
        function wait(time) {
            var action = {};
            action.promise = new Promise(function (resolve, reject) {
                var timerid;
                action.cancel = function () {
                    clearTimeout(timerid);
                    action.cancel = null;
                    action.promise = null;
                    reject();
                };
                timerid = setTimeout(resolve, time);
            });
            return action;
        }
        function runJavascriptAction(element, detail, type) {
            var definition = definitionMap[detail];
            var action = {};
            var executor = definition[type];
            action.promise = new Promise(function (resolve, reject) {
                var cancel = executor(element, function () {
                    resolve();
                });
                console.assert(typeof cancel === 'function', "drunk.Action: " + detail + "\u7684" + type + "\u72B6\u6001\u672A\u63D0\u4F9Bcancel\u56DE\u8C03\u51FD\u6570");
                action.cancel = function () {
                    action.cancel = null;
                    action.promise = null;
                    cancel();
                    reject();
                };
            });
            return action;
        }
        function runMaybeCSSAnimation(element, detail, type) {
            detail = detail ? detail + '-' : config.prefix;
            var action = {};
            var className = detail + type;
            // 如果transitionDuration或animationDuration都不为0s的话说明已经设置了该属性
            // 必须先在这里取一次transitionDuration的值,动画才会生效
            var style = getComputedStyle(element, null);
            var transitionDuration = style[getPropertyName('transitionDuration')];
            var transitionExist = transitionDuration !== '0s';
            var transitionTimerid;
            action.promise = new Promise(function (resolve, reject) {
                // 给样式赋值后,取animationDuration的值,判断有没有设置animation动画
                element.classList.add(className);
                var animationExist = style[getPropertyName('animationDuration')] !== '0s';
                if (!transitionExist && !animationExist) {
                    // 如果没有设置动画,移除样式后resolve状态
                    element.classList.remove(className);
                    return resolve();
                }
                element.style[getPropertyName('animationFillMode')] = 'both';
                function onTransitionEnd() {
                    clearTimeout(transitionTimerid);
                    element.removeEventListener(animationEndEvent, onAnimationEnd, false);
                    element.removeEventListener(transitionEndEvent, onTransitionEnd, false);
                    if (type === Action.Type.removed) {
                        element.classList.remove(detail + Action.Type.created, className);
                    }
                    resolve();
                }
                function onAnimationEnd() {
                    // element.classList.remove(className);
                    element.removeEventListener(transitionEndEvent, onTransitionEnd, false);
                    element.removeEventListener(animationEndEvent, onAnimationEnd, false);
                    resolve();
                }
                element.addEventListener(animationEndEvent, onAnimationEnd, false);
                element.addEventListener(transitionEndEvent, onTransitionEnd, false);
                if (transitionExist) {
                    // 加一个定时器,避免当前属性与transitionend状态下属性的值没有变化时不会触发transitionend事件,
                    // 这里要设置一个定时器保证该事件的触发
                    transitionTimerid = setTimeout(onTransitionEnd, parseFloat(transitionDuration) * 1000);
                }
                action.cancel = function () {
                    clearTimeout(transitionTimerid);
                    element.removeEventListener(transitionEndEvent, onTransitionEnd, false);
                    element.removeEventListener(animationEndEvent, onAnimationEnd, false);
                    element.classList.remove(className);
                    action.cancel = null;
                    action.promise = null;
                    reject();
                };
            });
            return action;
        }
    })(Action = drunk.Action || (drunk.Action = {}));
    /**
     * action绑定的实现
     */
    var ActionBinding = (function (_super) {
        __extends(ActionBinding, _super);
        function ActionBinding() {
            _super.apply(this, arguments);
        }
        ActionBinding.prototype.init = function () {
            var _this = this;
            this.element[weakRefKey] = this;
            this._actionJob = util.execAsyncWork(function () {
                _this._actionJob = null;
                if (document.body && document.body.contains(_this.element)) {
                    _this.runActionByType(Action.Type.created);
                }
            });
        };
        /**
         * 解析action的定义表达式
         */
        ActionBinding.prototype._parseDefinition = function (actionType) {
            if (!this.expression) {
                this._actionNames = [];
            }
            else {
                var str = this.viewModel.$eval(this.expression, true);
                this._actionNames = str.split(/\s+/);
                if (actionType === Action.Type.removed) {
                    this._actionNames.reverse();
                }
            }
            var actions = this._actionNames;
            while (isNumber(actions[actions.length - 1])) {
                actions.pop();
            }
        };
        /**
         * 根据类型运行数据的action队列
         */
        ActionBinding.prototype._runActions = function (type) {
            var element = this.element;
            if (this._actionNames.length < 2) {
                var action = Action.run(element, this._actionNames[0], type);
                action.promise.then(function () {
                    Action.removeRef(element);
                });
                return Action.setCurrentAction(element, action);
            }
            var actionQueue = {};
            var actions = this._actionNames;
            actionQueue.promise = new Promise(function (resolve, reject) {
                var index = 0;
                var runAction = function () {
                    var detail = actions[index++];
                    if (typeof detail === 'undefined') {
                        actionQueue.cancel = null;
                        actionQueue.promise = null;
                        Action.removeRef(element);
                        return resolve();
                    }
                    var currentAction = Action.run(element, detail, type);
                    currentAction.promise.then(runAction);
                    actionQueue.cancel = function () {
                        currentAction.cancel();
                        actionQueue.cancel = null;
                        actionQueue.promise = null;
                        reject();
                    };
                };
                runAction();
            });
            Action.setCurrentAction(element, actionQueue);
        };
        /**
         * 先取消还在运行的action，再运行指定的action
         */
        ActionBinding.prototype.runActionByType = function (type) {
            if (type === this._currType) {
                return;
            }
            if (this._actionJob) {
                this._actionJob.cancel();
                this._actionJob = null;
            }
            var currentAction = Action.getCurrentAction(this.element);
            if (currentAction && currentAction.cancel) {
                currentAction.cancel();
            }
            this._parseDefinition(type);
            this._runActions(type);
        };
        ActionBinding.prototype.release = function () {
            if (this._actionJob) {
                this._actionJob.cancel();
            }
            this.runActionByType(Action.Type.removed);
            this.element[weakRefKey] = null;
            this._actionNames = null;
            this._actionJob = null;
        };
        ActionBinding.priority = drunk.Binding.Priority.aboveNormal;
        ActionBinding = __decorate([
            drunk.binding("action")
        ], ActionBinding);
        return ActionBinding;
    }(drunk.Binding));
    drunk.ActionBinding = ActionBinding;
    function isNumber(value) {
        return !isNaN(parseFloat(value));
    }
})(drunk || (drunk = {}));
/// <reference path="../promise/promise.ts" />
/// <reference path="./util.ts" />
/// <reference path="../binding/bindings/action.ts" />
/**
 * DOM操作的工具方法模块
 */
var drunk;
(function (drunk) {
    var dom;
    (function (dom) {
        var config = drunk.config;
        var Promise = drunk.Promise;
        /**
         * 根据提供的html字符串创建html元素
         * @param   html  html字符串
         * @return        创建好的html元素或元素列表数组
         */
        function create(htmlString) {
            var div = document.createElement("div");
            var str = htmlString.trim();
            console.assert(str.length > 0, "HTML\u4E0D\u80FD\u4E3A\u7A7A");
            html(div, str);
            return div.childNodes.length === 1 ? div.firstChild : drunk.util.toArray(div.childNodes);
        }
        dom.create = create;
        /**
         * 设置元素的innerHTML
         * @param   container  元素
         * @param   value      值
         */
        function html(container, value) {
            if (typeof MSApp !== 'undefined' && MSApp['execUnsafeLocalFunction']) {
                MSApp['execUnsafeLocalFunction'](function () {
                    container.innerHTML = value;
                });
            }
            else {
                container.innerHTML = value;
            }
        }
        dom.html = html;
        /**
         * 创建标记节点，如果开启debug模式，则创建comment节点，发布版本则用textNode
         */
        function createFlagNode(content) {
            var node = config.debug ? document.createComment(content) : document.createTextNode(' ');
            node['flag'] = content;
            return node;
        }
        dom.createFlagNode = createFlagNode;
        /**
         * 在旧的元素节点前插入新的元素节点
         * @param  newNode  新的节点
         * @param  oldNode  旧的节点
         */
        function before(newNode, oldNode) {
            var parent = oldNode.parentNode;
            if (!parent) {
                return;
            }
            if (Array.isArray(newNode)) {
                newNode.forEach(function (node) { return parent.insertBefore(node, oldNode); });
            }
            else {
                parent.insertBefore(newNode, oldNode);
            }
        }
        dom.before = before;
        /**
         * 在旧的元素节点后插入新的元素节点
         * @param  newNode  新的节点
         * @param  oldNode  旧的节点
         */
        function after(newNode, oldNode) {
            if (!oldNode.parentNode) {
                return;
            }
            if (!Array.isArray(newNode)) {
                newNode = [newNode];
            }
            if (oldNode.nextSibling) {
                before(newNode, oldNode.nextSibling);
            }
            else {
                var parent_1 = oldNode.parentNode;
                newNode.forEach(function (node) {
                    parent_1.appendChild(node);
                });
            }
        }
        dom.after = after;
        /**
         * 移除元素节点
         * @param  target  节点
         */
        function remove(target) {
            if (Array.isArray(target)) {
                return Promise.all(target.map(function (node) { return removeAfterActionEnd(node); }));
            }
            return Promise.resolve(removeAfterActionEnd(target));
        }
        dom.remove = remove;
        function removeAfterActionEnd(node) {
            if (node.parentNode) {
                var currentAction = drunk.Action.getCurrentAction(node);
                if (currentAction && currentAction.promise) {
                    return currentAction.promise.then(function () {
                        node.parentNode.removeChild(node);
                    });
                }
                else {
                    node.parentNode.removeChild(node);
                }
            }
        }
        /**
         * 新的节点替换旧的节点
         * @param  newNode  新的节点
         * @param  oldNode  旧的节点
         */
        function replace(newNode, oldNode) {
            if (!oldNode.parentNode) {
                return;
            }
            if (!Array.isArray(newNode)) {
                newNode = [newNode];
            }
            var parent = oldNode.parentNode;
            newNode.forEach(function (node) {
                parent.insertBefore(node, oldNode);
            });
            parent.removeChild(oldNode);
        }
        dom.replace = replace;
        /**
         * 为节点注册事件监听
         * @param  element  元素
         * @param  type     事件名
         * @param  listener 事件处理函数
         */
        function on(element, type, listener) {
            element.addEventListener(type, listener, false);
        }
        dom.on = on;
        /**
         * 移除节点的事件监听
         * @param  element  元素
         * @param  type     事件名
         * @param  listener 事件处理函数
         */
        function off(element, type, listener) {
            element.removeEventListener(type, listener, false);
        }
        dom.off = off;
        /**
         * 添加样式
         * @param   element    元素
         * @param   token      样式名
         */
        function addClass(element, token) {
            var list = token.trim().split(/\s+/);
            element.classList.add.apply(element.classList, list);
        }
        dom.addClass = addClass;
        /**
         * 移除样式
         * @param  element    元素
         * @param  token      样式名
         */
        function removeClass(element, token) {
            var list = token.trim().split(/\s+/);
            element.classList.remove.apply(element.classList, list);
        }
        dom.removeClass = removeClass;
        var styleSheet;
        function addCSSRule(rules) {
            if (!styleSheet) {
                var styleElement = document.createElement('style');
                document.head.appendChild(styleElement);
                styleSheet = styleElement.sheet;
            }
            Object.keys(rules).forEach(function (selector) {
                var rule = rules[selector];
                var content = Object.keys(rule).map(function (property) { return (property + ":" + rule[property]); }).join(';');
                styleSheet.insertRule(selector + " {" + content + "}", styleSheet.cssRules.length);
            });
        }
        dom.addCSSRule = addCSSRule;
    })(dom = drunk.dom || (drunk.dom = {}));
})(drunk || (drunk = {}));
/// <reference path="../viewmodel/viewModel.ts" />
/// <reference path="../util/xhr.ts" />
/// <reference path="../util/dom.ts" />
/// <reference path="../config/config.ts" />
/// <reference path="../parser/parser.ts" />
var drunk;
(function (drunk) {
    var Template;
    (function (Template) {
        var dom = drunk.dom;
        var util = drunk.util;
        var config = drunk.config;
        var Parser = drunk.Parser;
        var Binding = drunk.Binding;
        var noop = function () { };
        function compile(node) {
            var isArray = Array.isArray(node);
            var bindingDesc;
            if (isArray) {
                bindingDesc = createBindingDescriptorList(node);
            }
            else {
                bindingDesc = createBindingDescriptor(node);
            }
            return function (viewModel, node, owner, placeholder) {
                if (!bindingDesc) {
                    return noop;
                }
                var allBindings = viewModel._bindings;
                var beginOffset = allBindings.length;
                var newBindings;
                if (isArray) {
                    bindNodeList(viewModel, node, bindingDesc, owner, placeholder);
                }
                else if (bindingDesc) {
                    bindNode(viewModel, node, bindingDesc, owner, placeholder);
                }
                newBindings = viewModel._bindings.slice(beginOffset);
                newBindings.forEach(function (binding) { return binding.$execute(); });
                return function () {
                    newBindings.forEach(function (binding) { return binding.$dispose(); });
                    beginOffset = allBindings.indexOf(newBindings[0]);
                    allBindings.splice(beginOffset, newBindings.length);
                };
            };
        }
        Template.compile = compile;
        function createBindingDescriptor(node) {
            var nodeType = node.nodeType;
            var bindingDesc;
            if (nodeType === 1) {
                bindingDesc = createElementBindingDescriptor(node);
            }
            else if (nodeType === 3) {
                bindingDesc = createTextBindingDescriptor(node);
            }
            if (!(bindingDesc && bindingDesc.isTerminal) && isNeedCompileChildNodes(node)) {
                var children = createBindingDescriptorList(util.toArray(node.childNodes));
                if (children) {
                    bindingDesc = bindingDesc || {};
                    bindingDesc.children = children;
                }
            }
            return bindingDesc;
        }
        Template.createBindingDescriptor = createBindingDescriptor;
        function createBindingDescriptorList(nodeList) {
            var hasDescriptor = false;
            var descriptorList = nodeList.map(function (node) {
                var bindingDesc = createBindingDescriptor(node);
                if (bindingDesc != null) {
                    hasDescriptor = true;
                }
                return bindingDesc;
            });
            return hasDescriptor ? descriptorList : undefined;
        }
        Template.createBindingDescriptorList = createBindingDescriptorList;
        function createElementBindingDescriptor(element) {
            if (element.tagName.toLowerCase().indexOf('-') > 0) {
                element.setAttribute(config.prefix + 'component', element.tagName.toLowerCase());
            }
            return createTerminalBindingDescriptor(element) || createNormalBindingDescriptor(element);
        }
        function createTextBindingDescriptor(node) {
            var content = node.textContent;
            if (!Parser.hasInterpolation(content)) {
                return;
            }
            var tokens = Parser.parseInterpolate(content, true);
            var fragment = document.createDocumentFragment();
            var bindings = [];
            tokens.forEach(function (token, i) {
                if (typeof token === 'string') {
                    fragment.appendChild(document.createTextNode(token));
                }
                else {
                    fragment.appendChild(document.createTextNode(' '));
                    bindings[i] = {
                        name: "bind",
                        priority: Binding.getByName('bind').priority,
                        expression: token.expression
                    };
                }
            });
            return { bindings: bindings, fragment: fragment, isTextNode: true };
        }
        function createTerminalBindingDescriptor(element) {
            var terminalBindings = Binding.getTerminalBindings();
            for (var i = 0, name_1; name_1 = terminalBindings[i]; i++) {
                var attrValue = element.getAttribute(config.prefix + name_1);
                if (attrValue != null) {
                    return {
                        bindings: [{
                                name: name_1,
                                expression: attrValue,
                                priority: Binding.getByName(name_1).priority
                            }],
                        isTerminal: true,
                        execute: bindElement
                    };
                }
            }
        }
        function createNormalBindingDescriptor(element) {
            var bindingNodes;
            var shouldTerminate;
            if (element.hasAttributes()) {
                util.toArray(element.attributes).forEach(function (attr) {
                    var name = attr.name;
                    var value = attr.value;
                    var index = name.indexOf(config.prefix);
                    var bindingNode;
                    if (index > -1 && index < name.length - 1) {
                        name = name.slice(index + config.prefix.length);
                        var bind = Binding.getByName(name);
                        if (!bind) {
                            throw new Error((config.prefix + name) + ": \u672A\u5B9A\u4E49");
                        }
                        if (name === 'include') {
                            shouldTerminate = true;
                        }
                        bindingNode = {
                            name: name,
                            expression: value,
                            priority: bind.priority
                        };
                    }
                    else if (Parser.hasInterpolation(value)) {
                        bindingNode = {
                            name: 'attr',
                            attribute: name,
                            expression: value,
                            priority: Binding.getByName('attr').priority,
                            isInterpolate: true
                        };
                    }
                    if (bindingNode) {
                        if (!bindingNodes) {
                            bindingNodes = [];
                        }
                        bindingNodes.push(bindingNode);
                    }
                });
                if (bindingNodes) {
                    bindingNodes.sort(function (a, b) { return b.priority - a.priority; });
                    return { bindings: bindingNodes, isTerminal: shouldTerminate };
                }
            }
        }
        function bindNode(viewModel, node, desc, owner, placeholder) {
            if (desc.bindings) {
                if (desc.isTextNode) {
                    bindTextNode(viewModel, node, desc);
                }
                else {
                    bindElement(viewModel, node, desc, owner, placeholder);
                }
            }
            if (desc.children) {
                bindNodeList(viewModel, util.toArray(node.childNodes), desc.children, owner, placeholder);
            }
        }
        function bindNodeList(viewModel, nodeList, descList, owner, placeholder) {
            descList.forEach(function (desc, i) {
                if (desc) {
                    bindNode(viewModel, nodeList[i], desc, owner, placeholder);
                }
            });
        }
        function bindElement(viewModel, element, desc, owner, placeholder) {
            desc.bindings.forEach(function (descriptor) {
                Binding.create(viewModel, element, descriptor, owner, placeholder);
            });
        }
        function bindTextNode(viewModel, node, desc) {
            var fragment = desc.fragment.cloneNode(true);
            util.toArray(fragment.childNodes).forEach(function (node, i) {
                if (desc.bindings[i]) {
                    Binding.create(viewModel, node, desc.bindings[i]);
                }
            });
            dom.replace(fragment, node);
        }
        function isNeedCompileChildNodes(node) {
            return node.tagName && node.tagName.toLowerCase() !== 'script' && node.childNodes.length > 0;
        }
    })(Template = drunk.Template || (drunk.Template = {}));
})(drunk || (drunk = {}));
/// <reference path="../promise/promise.ts" />
/// <reference path="../util/xhr.ts" />
/// <reference path="../cache/cache.ts" />
var drunk;
(function (drunk) {
    var Template;
    (function (Template) {
        var Cache = drunk.Cache;
        var Promise = drunk.Promise;
        var cacheStore = new Cache(50);
        /**
         * 加载模板，先尝试从指定ID的标签上查找，找不到再作为url发送ajax请求，
         * 加载到的模板字符串会进行缓存
         * @param    urlOrId  script模板标签的id或模板的url地址
         * @returns           Promise 对象,Promise的返回值为模板字符串
         */
        function load(urlOrId, useCache) {
            if (useCache === void 0) { useCache = true; }
            var template = cacheStore.get(urlOrId);
            if (template != null && useCache) {
                return Promise.resolve(template);
            }
            var node = document.getElementById(urlOrId);
            if (node && node.innerHTML) {
                template = node.innerHTML;
                cacheStore.set(urlOrId, template);
                return Promise.resolve(template);
            }
            var promise = drunk.util.ajax({ url: urlOrId });
            promise.done(function (result) {
                cacheStore.set(urlOrId, result);
            });
            cacheStore.set(urlOrId, promise);
            return promise;
        }
        Template.load = load;
    })(Template = drunk.Template || (drunk.Template = {}));
})(drunk || (drunk = {}));
/// <reference path="./loader.ts" />
/// <reference path="../util/dom.ts" />
/// <reference path="../cache/cache.ts" />
/// <reference path="../promise/promise.ts" />
var drunk;
(function (drunk) {
    var Template;
    (function (Template) {
        var dom = drunk.dom;
        var util = drunk.util;
        var Cache = drunk.Cache;
        var Promise = drunk.Promise;
        var fragCache = new Cache(50);
        var styleRecord = {};
        var linkRecord = {};
        var scriptRecord = {};
        var scopedClassRecord = {};
        var scopedClassCounter = 0;
        var scopedClassNamePrefix = 'drunk-scoped-';
        var initialized = false;
        var cachedDocument;
        /**
         * 把模块连接渲染为documentFragment,会对样式和脚本进行处理,避免重复加载,如果提供宿主容器元素,则会把
         * 模板渲染到改容器中
         * @param   url               模板连接
         * @param   hostedElement     容器元素
         * @param   useCache          是否使用缓存还是重新加载
         * @return                    返回一个Promise对象
         */
        function renderFragment(url, hostedElement, useCache) {
            var fragmentId = url;
            var fragmentPromise = fragCache.get(fragmentId);
            if (!useCache || !fragmentPromise) {
                fragmentPromise = populateDocument(url);
                fragCache.set(fragmentId, fragmentPromise);
            }
            return fragmentPromise.then(function (fragment) {
                var newFragment = fragment.cloneNode(true);
                if (hostedElement) {
                    hostedElement.appendChild(newFragment);
                    return hostedElement;
                }
                return newFragment;
            });
        }
        Template.renderFragment = renderFragment;
        /**
         * 创建一个htmlDocument并加载模板
         */
        function populateDocument(url) {
            initialize();
            var htmlDoc = document.implementation.createHTMLDocument("frag");
            var base = htmlDoc.createElement("base");
            var anchor = htmlDoc.createElement("a");
            htmlDoc.head.appendChild(base);
            htmlDoc.body.appendChild(anchor);
            base.href = document.location.href;
            anchor.setAttribute("href", url);
            base.href = anchor.href;
            return Template.load(url, false).then(function (template) {
                dom.html(htmlDoc.documentElement, template);
                htmlDoc.head.appendChild(base);
                return processDocument(htmlDoc, base.href);
            });
        }
        /**
         * 处理模板的资源
         */
        function processDocument(htmlDoc, url) {
            var body = htmlDoc.body;
            var lastNonInlineScriptPromise = Promise.resolve();
            var scopedClassList = [];
            var promiseList = [];
            util.toArray(htmlDoc.querySelectorAll('link[type="text/css"], link[rel="stylesheet"]')).forEach(function (e) { return addLink(e, scopedClassList); });
            util.toArray(htmlDoc.getElementsByTagName('style')).forEach(function (styleTag, index) { return addStyle(styleTag, url, index, scopedClassList); });
            util.toArray(htmlDoc.getElementsByTagName('script')).forEach(function (scriptTag, index) {
                var result = addScript(scriptTag, url, index, lastNonInlineScriptPromise);
                if (result) {
                    if (!result.inline) {
                        lastNonInlineScriptPromise = result.promise;
                    }
                    promiseList.push(result.promise);
                }
            });
            util.toArray(htmlDoc.getElementsByTagName('img')).forEach(function (img) { return img.src = img.src; });
            util.toArray(htmlDoc.getElementsByTagName('a')).forEach(function (a) {
                // href为#开头的不用去更新属性
                if (a.href !== '') {
                    var href = a.getAttribute('href');
                    if (href && href[0] !== '#') {
                        a.href = href;
                    }
                }
            });
            return Promise.all(promiseList).then(function () {
                var fragment = document.createDocumentFragment();
                var imported = document.importNode(body, true);
                while (imported.childNodes.length > 0) {
                    var node = imported.firstChild;
                    fragment.appendChild(node);
                    addScopedClassList(node, scopedClassList);
                }
                return fragment;
            });
        }
        /**
         * 为节点添加作用域样式
         */
        function addScopedClassList(node, classList) {
            if (!node.classList || !classList.length) {
                return;
            }
            classList.forEach(function (className) { return node.classList.add(className); });
            if (node.hasChildNodes()) {
                util.toArray(node.childNodes).forEach(function (child) { return addScopedClassList(child, classList); });
            }
        }
        /**
         * 添加外链样式
         */
        function addLink(link, scopedClassList) {
            var href = link.href;
            var tagUid = href;
            var scoped = link.hasAttribute('scoped');
            var scopedClassName;
            if (scoped) {
                tagUid += '<scoped>';
                scopedClassName = scopedClassRecord[tagUid] || (scopedClassRecord[tagUid] = scopedClassNamePrefix + scopedClassCounter++);
                util.addArrayItem(scopedClassList, scopedClassName);
            }
            if (!linkRecord[tagUid]) {
                linkRecord[tagUid] = true;
                if (scoped) {
                    loadCssAndCreateStyle(href).done(function (styleElement) {
                        var style = generateScopedStyle(styleElement.sheet['cssRules'], scopedClassName);
                        style.setAttribute('drunk:link:href', href);
                        document.head.appendChild(style);
                        styleElement.parentNode.removeChild(styleElement);
                    }, function (err) {
                        console.error(href, "\u6837\u5F0F\u52A0\u8F7D\u5931\u8D25:\n", err);
                    });
                }
                else {
                    var newLink = link.cloneNode(false);
                    newLink.setAttribute('rel', 'stylesheet');
                    newLink.setAttribute('type', 'text/css');
                    newLink.href = href;
                    document.head.appendChild(newLink);
                }
            }
            link.parentNode.removeChild(link);
        }
        /**
         * 添加内链样式
         */
        function addStyle(styleElement, fragmentHref, position, scopedClassList) {
            var tagUid = fragmentHref + ' style[' + position + ']';
            var scoped = styleElement.hasAttribute('scoped');
            var scopedClassName;
            if (scoped) {
                tagUid += '<scoped>';
                scopedClassName = scopedClassRecord[tagUid] || (scopedClassRecord[tagUid] = scopedClassNamePrefix + scopedClassCounter++);
                util.addArrayItem(scopedClassList, scopedClassName);
            }
            if (!styleRecord[tagUid]) {
                styleRecord[tagUid] = true;
                var newStyle = void 0;
                if (scoped) {
                    newStyle = generateScopedStyle(styleElement.sheet['cssRules'], scopedClassName);
                }
                else {
                    newStyle = styleElement.cloneNode(true);
                }
                newStyle.setAttribute('drunk:style:uid', tagUid);
                document.head.appendChild(newStyle);
            }
            styleElement.parentNode.removeChild(styleElement);
        }
        /**
         * 修改样式的作用域
         */
        function generateScopedStyle(cssRules, scopedClassName) {
            var style = document.createElement('style');
            var rules = [];
            util.toArray(cssRules).forEach(function (rule) {
                rules.push(rule.cssText.replace(rule.selectorText, '.' + scopedClassName + rule.selectorText));
            });
            // console.log((rules.join('\n')));
            style.textContent = rules.join('\n');
            style.setAttribute('drunk:scoped:style', '');
            return style;
        }
        /**
         * 添加脚本
         */
        function addScript(tag, fragmentHref, position, lastNonInlineScriptPromise) {
            var tagUid = tag.src;
            var inline = !tagUid;
            if (inline) {
                tagUid = fragmentHref + ' script[' + position + ']';
            }
            tag.parentNode.removeChild(tag);
            if (!scriptRecord[tagUid]) {
                var newScript_1 = document.createElement('script');
                var promise = void 0;
                scriptRecord[tagUid] = true;
                newScript_1.setAttribute('type', tag.type || 'text/javascript');
                newScript_1.setAttribute('async', 'false');
                if (tag.id) {
                    newScript_1.setAttribute('id', tag.id);
                }
                if (inline) {
                    var text_1 = tag.text;
                    promise = lastNonInlineScriptPromise.then(function () {
                        newScript_1.text = text_1;
                    }).catch(function (e) {
                        // console.warn('脚本加载错误:', e);
                    });
                    newScript_1.setAttribute('drunk:script:uid', tagUid);
                }
                else {
                    promise = new Promise(function (resolve) {
                        newScript_1.onload = newScript_1.onerror = function () {
                            resolve();
                        };
                        newScript_1.setAttribute('src', tag.src);
                    });
                }
                document.head.appendChild(newScript_1);
                return {
                    promise: promise,
                    inline: inline
                };
            }
        }
        /**
         * 标记已经存在于页面上的脚本和样式
         */
        function initialize() {
            if (initialized) {
                return;
            }
            util.toArray(document.getElementsByTagName('script')).forEach(function (e) {
                scriptRecord[e.src] = true;
            });
            util.toArray(document.querySelectorAll('link[rel="stylesheet"], link[type="text/css"]')).forEach(function (e) {
                linkRecord[e.href] = true;
            });
            cachedDocument = document.implementation.createHTMLDocument("cached document");
            initialized = true;
        }
        /**
         * 加载css文件并创建style标签
         */
        function loadCssAndCreateStyle(href) {
            return Template.load(href).then(function (cssContent) {
                var style = document.createElement('style');
                style.textContent = cssContent;
                cachedDocument.head.appendChild(style);
                return style;
            });
        }
    })(Template = drunk.Template || (drunk.Template = {}));
})(drunk || (drunk = {}));
/// <reference path="../viewmodel/viewmodel.ts" />
/// <reference path="../template/loader.ts" />
/// <reference path="../template/compiler.ts" />
/// <reference path="../config/config.ts" />
/// <reference path="../util/dom.ts" />
/// <reference path="../util/util.ts" />
var drunk;
(function (drunk) {
    var dom = drunk.dom;
    var util = drunk.util;
    var config = drunk.config;
    var Promise = drunk.Promise;
    var Template = drunk.Template;
    var ViewModel = drunk.ViewModel;
    var weakRefKey = 'DRUNK-COMPONENT-ID';
    var record = {};
    /**
     * Decorator for Component.register
     */
    function component(name) {
        return function (constructor) {
            Component.register(name, constructor);
        };
    }
    drunk.component = component;
    var Component = (function (_super) {
        __extends(Component, _super);
        /**
         * 组件类，继承ViewModel类，实现了模板的准备和数据的绑定
         * @param  model  初始化的数据
         */
        function Component(model) {
            _super.call(this, model);
            Component.instancesById[util.uniqueId(this)] = this;
        }
        Object.defineProperty(Component.prototype, "filters", {
            set: function (filters) {
                this.$setFilters(filters);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Component.prototype, "data", {
            /** 组件的数据,会被初始化到Model中,可以为一个函数,函数可以直接返回值或一个处理值的Promise对象 */
            set: function (dataDescriptors) {
                this.$resolveData(dataDescriptors);
            },
            enumerable: true,
            configurable: true
        });
        /**
         * 实例创建时会调用的初始化方法,派生类可覆盖该方法
         */
        Component.prototype.init = function () {
        };
        /**
         * 属性初始化
         * @param  model 数据
         */
        Component.prototype.__init = function (model) {
            _super.prototype.__init.call(this, model);
            Object.defineProperties(this, {
                _isMounted: {
                    value: false,
                    writable: true,
                    configurable: true
                }
            });
            this.init();
        };
        /**
         * 设置数据过滤器
         */
        Component.prototype.$setFilters = function (filters) {
            if (this.$filter) {
                util.extend(this.$filter, filters);
            }
            else {
                console.warn("Component#$setFilters\uFF1A \u7EC4\u4EF6\u672A\u521D\u59CB\u5316");
            }
        };
        /**
         * 设置初始化数据
         */
        Component.prototype.$resolveData = function (dataDescriptors) {
            var _this = this;
            if (!dataDescriptors) {
                return Promise.resolve();
            }
            return Promise.all(Object.keys(dataDescriptors).map(function (property) {
                // 代理该数据字段
                _this.$proxy(property);
                var value = dataDescriptors[property];
                if (typeof value === 'function') {
                    // 如果是一个函数,直接调用该函数
                    value = value.call(_this);
                }
                return Promise.resolve(value).then(function (result) { return _this[property] = result; }, function (reason) { return console.warn("Component\u6570\u636E[\"" + property + "\"]\u521D\u59CB\u5316\u5931\u8D25:", reason); });
            }));
        };
        /**
         * 处理模板，并返回模板元素
         */
        Component.prototype.$processTemplate = function (templateUrl) {
            var _this = this;
            var onFailed = function (reason) {
                _this.$emit(Component.Event.templateLoadFailed, _this);
                console.warn("\u6A21\u677F\u52A0\u8F7D\u5931\u8D25: " + templateUrl, reason);
            };
            if (typeof templateUrl === 'string') {
                return Template.renderFragment(templateUrl, null, true).then(function (fragment) { return util.toArray(fragment.childNodes); }).catch(onFailed);
            }
            if (this.element) {
                return Promise.resolve(this.element);
            }
            if (typeof this.template === 'string') {
                return Promise.resolve(dom.create(this.template));
            }
            templateUrl = this.templateUrl;
            if (typeof templateUrl === 'string') {
                return Template.renderFragment(templateUrl, null, true).then(function (fragment) { return util.toArray(fragment.childNodes); }).catch(onFailed);
            }
            throw new Error((this.name || this.constructor.name) + "\u7EC4\u4EF6\u7684\u6A21\u677F\u672A\u6307\u5B9A");
        };
        /**
         * 把组件挂载到元素上
         * @param  element         要挂在的节点或节点数组
         * @param  ownerViewModel  父级viewModel实例
         * @param  placeholder     组件占位标签
         */
        Component.prototype.$mount = function (element, ownerViewModel, placeholder) {
            var _this = this;
            console.assert(!this._isMounted, "\u91CD\u590D\u6302\u8F7D,\u8BE5\u7EC4\u4EF6\u5DF2\u6302\u8F7D\u5230:", this.element);
            if (Component.getByElement(element)) {
                return console.error("$mount(element): \u5C1D\u8BD5\u6302\u8F7D\u5230\u4E00\u4E2A\u5DF2\u7ECF\u6302\u8F7D\u8FC7\u7EC4\u4EF6\u5B9E\u4F8B\u7684\u5143\u7D20\u8282\u70B9", element);
            }
            Template.compile(element)(this, element, ownerViewModel, placeholder);
            this.element = element;
            this._isMounted = true;
            var nodeList = Array.isArray(element) ? element : [element];
            nodeList.forEach(function (node) { return Component.setWeakRef(node, _this); });
            this.$emit(Component.Event.mounted);
        };
        /**
         * 释放组件
         */
        Component.prototype.$release = function () {
            if (!this._isActived) {
                return;
            }
            this.$emit(Component.Event.release, this);
            _super.prototype.$release.call(this);
            if (this._isMounted) {
                this._isMounted = false;
                var nodeList = Array.isArray(this.element) ? this.element : [this.element];
                nodeList.forEach(function (node) { return Component.removeWeakRef(node); });
                dom.remove(this.element);
            }
            Component.instancesById[util.uniqueId(this)] = this.element = null;
        };
        /**
         * 获取挂在在元素上的viewModel实例
         * @param   element 元素
         * @return  Component实例
         */
        Component.getByElement = function (element) {
            return element && Component.instancesById[element[weakRefKey]];
        };
        /**
         * 设置element与viewModel的引用
         * @param   element    元素
         * @param   component  组件实例
         */
        Component.setWeakRef = function (element, component) {
            element[weakRefKey] = util.uniqueId(component);
        };
        /**
         * 移除挂载引用
         * @param  element  元素
         */
        Component.removeWeakRef = function (element) {
            delete element[weakRefKey];
        };
        /**
         * 根据组件名字获取组件构造函数
         * @param  name  组件名
         * @return  组件类的构造函数
         */
        Component.getConstructorByName = function (name) {
            return Component.constructorsByName[name];
        };
        Component.define = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i - 0] = arguments[_i];
            }
            var options;
            if (args.length === 2) {
                options = args[1];
                options.name = args[0];
            }
            else {
                options = args[0];
            }
            return Component.extend(options);
        };
        Component.extend = function (name, options) {
            if (arguments.length === 1 && Object.prototype.toString.call(name) === '[object Object]') {
                options = arguments[0];
                name = options.name;
            }
            // else {
            //     members.name = arguments[0];
            // }
            var superClass = this;
            var prototype = Object.create(superClass.prototype);
            var watchers;
            var handlers;
            var filters;
            var computeds;
            var data;
            Object.keys(options).forEach(function (key) {
                if (key === "watchers") {
                    watchers = options[key];
                }
                else if (key === "filters") {
                    filters = options[key];
                }
                else if (key === 'computeds') {
                    computeds = options[key];
                }
                else if (key === 'data') {
                    data = options[key];
                }
                else if (key === 'handlers') {
                    handlers = options[key];
                }
                else {
                    prototype[key] = options[key];
                }
            });
            var component = function () {
                var _this = this;
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i - 0] = arguments[_i];
                }
                superClass.apply(this, args);
                if (filters) {
                    this.$setFilters(filters);
                }
                if (handlers) {
                    util.extend(this, handlers);
                }
                if (computeds) {
                    Object.keys(computeds).forEach(function (property) { return _this.$computed(property, computeds[property]); });
                }
                if (watchers) {
                    Object.keys(watchers).forEach(function (expression) { return _this.$watch(expression, watchers[expression]); });
                }
                if (data) {
                    this.$resolveData(data);
                }
            };
            component.prototype = prototype;
            prototype.constructor = component;
            if (name) {
                Component.register(name, component);
            }
            else {
                component.extend = Component.extend;
            }
            return component;
        };
        /**
         * 把一个继承了drunk.Component的组件类根据组件名字注册到组件系统中
         * @param  name          组件名
         * @param  componentCtor 组件类
         */
        Component.register = function (name, componentCtor) {
            console.assert(name.indexOf('-') > -1, "\u975E\u6CD5\u7EC4\u4EF6\u540D\"" + name + "\", \u7EC4\u4EF6\u540D\u5FC5\u987B\u5728\u4E2D\u95F4\u5E26\"-\"\u5B57\u7B26,\u5982\"custom-view\"");
            if (Component.constructorsByName[name] != null) {
                console.warn("\u7EC4\u4EF6\"" + name + "\"\u5B9A\u4E49\u5DF2\u88AB\u8986\u76D6,\u8BF7\u786E\u8BA4\u8BE5\u64CD\u4F5C");
            }
            componentCtor.extend = Component.extend;
            Component.constructorsByName[name] = componentCtor;
            addHiddenStyleForComponent(name);
        };
        /**
         * 定义的组件记录
         */
        Component.constructorsByName = {};
        /** 组件实例 */
        Component.instancesById = {};
        /**
         * 组件的事件名称
         */
        Component.Event = {
            created: 'created',
            release: 'release',
            mounted: 'mounted',
            templateLoadFailed: 'templateLoadFailed',
        };
        return Component;
    }(ViewModel));
    drunk.Component = Component;
    /**
     * 设置样式
     */
    function addHiddenStyleForComponent(name) {
        if (record[name]) {
            return;
        }
        dom.addCSSRule((_a = {}, _a[name] = { display: 'none' }, _a));
        record[name] = true;
        var _a;
    }
    Component.register(config.prefix + 'view', Component);
})(drunk || (drunk = {}));
/// <reference path="../binding.ts" />
/// <reference path="../../template/compiler.ts" />
/// <reference path="../../util/dom.ts" />
/// <reference path="../../config/config.ts" />
var drunk;
(function (drunk) {
    var dom = drunk.dom;
    var reg = {
        semic: /\s*;\s*/,
        statement: /(\w+):\s*(.+)/,
        breakword: /\n+/g
    };
    var getHelpMessage = function () { return ("\u6B63\u786E\u7684\u7528\u6CD5\u5982\u4E0B:\n        " + drunk.config.prefix + "on=\"click: expression\"\n        " + drunk.config.prefix + "on=\"mousedown: expression; mouseup: callback()\"\n        " + drunk.config.prefix + "on=\"click: callback($event, $el)\""); };
    var EventBinding = (function (_super) {
        __extends(EventBinding, _super);
        function EventBinding() {
            _super.apply(this, arguments);
        }
        EventBinding.prototype.init = function () {
            var _this = this;
            var events = [];
            this.expression.replace(reg.breakword, ' ').split(reg.semic).forEach(function (str) {
                if (str && /\S/.test(str)) {
                    events.push(_this._parseEvent(str));
                }
            });
            this._events = events;
        };
        EventBinding.prototype._parseEvent = function (str) {
            var _this = this;
            var matches = str.match(reg.statement);
            var prefix = drunk.config.prefix;
            console.assert(matches !== null, "\u4E0D\u5408\u6CD5\u7684\"" + prefix + "on\"\u8868\u8FBE\u5F0F " + str + ", " + getHelpMessage());
            var type = matches[1];
            var expr = matches[2];
            var func = drunk.Parser.parse(expr.trim());
            var handler = function (e) {
                if (drunk.config.debug) {
                    console.log(type + ': ' + expr);
                }
                func.call(_this.viewModel, e, _this.element, drunk.util.global);
            };
            dom.on(this.element, type, handler);
            return { type: type, handler: handler };
        };
        EventBinding.prototype.release = function () {
            var _this = this;
            this._events.forEach(function (event) {
                dom.off(_this.element, event.type, event.handler);
            });
            this._events = null;
        };
        EventBinding = __decorate([
            drunk.binding("on")
        ], EventBinding);
        return EventBinding;
    }(drunk.Binding));
})(drunk || (drunk = {}));
/// <reference path="../binding.ts" />
/// <reference path="../../util/util.ts" />
var drunk;
(function (drunk) {
    var Binding = drunk.Binding;
    var AttributeBinding = (function (_super) {
        __extends(AttributeBinding, _super);
        function AttributeBinding() {
            _super.apply(this, arguments);
        }
        AttributeBinding.prototype.update = function (newValue) {
            var _this = this;
            if (this.attribute) {
                // 如果有提供指定的属性名
                this._setAttribute(this.attribute, newValue);
            }
            else if (Object.prototype.toString.call(newValue) === '[object Object]') {
                Object.keys(newValue).forEach(function (name) {
                    _this._setAttribute(name, newValue[name]);
                });
            }
        };
        AttributeBinding.prototype._setAttribute = function (name, value) {
            if (name === 'src' || name === 'href') {
                value = value == null ? '' : value;
            }
            this.element.setAttribute(name, value);
        };
        AttributeBinding = __decorate([
            drunk.binding('attr')
        ], AttributeBinding);
        return AttributeBinding;
    }(Binding));
})(drunk || (drunk = {}));
/// <reference path="../binding.ts" />
/// <reference path="../../util/dom.ts" />
var drunk;
(function (drunk) {
    var dom = drunk.dom;
    var Binding = drunk.Binding;
    var DataBind = (function (_super) {
        __extends(DataBind, _super);
        function DataBind() {
            _super.apply(this, arguments);
        }
        DataBind.prototype.update = function (newValue) {
            newValue = newValue == null ? '' : newValue;
            var el = this.element;
            if (el.nodeType === 3) {
                el.nodeValue = newValue;
            }
            else if (el.nodeType === 1) {
                switch (el.tagName.toLowerCase()) {
                    case "input":
                    case "textarea":
                    case "select":
                        el.value = newValue;
                        break;
                    default:
                        dom.html(el, newValue);
                }
            }
        };
        DataBind = __decorate([
            drunk.binding("bind")
        ], DataBind);
        return DataBind;
    }(Binding));
})(drunk || (drunk = {}));
/// <reference path="../binding.ts" />
/// <reference path="../../util/dom.ts" />
var drunk;
(function (drunk) {
    var dom = drunk.dom;
    var Binding = drunk.Binding;
    var ClassBinding = (function (_super) {
        __extends(ClassBinding, _super);
        function ClassBinding() {
            _super.apply(this, arguments);
        }
        ClassBinding.prototype.update = function (data) {
            var elem = this.element;
            if (Array.isArray(data)) {
                this._toggleClassList(data);
            }
            else if (data && typeof data === 'object') {
                this._setClassByMap(data);
            }
            else if (typeof data === 'string' && (data = data.trim()) !== this._oldClass) {
                this._toggleClassString(data);
            }
        };
        ClassBinding.prototype.release = function () {
            this._oldClass = null;
        };
        ClassBinding.prototype._toggleClassList = function (classList) {
            var _this = this;
            var classMap = {};
            var oldClass = this._oldClass;
            if (oldClass) {
                oldClass.forEach(function (name) {
                    if (classList.indexOf(name) === -1) {
                        dom.removeClass(_this.element, name);
                    }
                    else {
                        classMap[name] = true;
                    }
                });
            }
            classList.forEach(function (name) {
                if (!classMap[name]) {
                    dom.addClass(_this.element, name);
                }
            });
            this._oldClass = classList;
        };
        ClassBinding.prototype._setClassByMap = function (classMap) {
            var _this = this;
            Object.keys(classMap).forEach(function (name) {
                if (classMap[name]) {
                    dom.addClass(_this.element, name);
                }
                else {
                    dom.removeClass(_this.element, name);
                }
            });
        };
        ClassBinding.prototype._toggleClassString = function (str) {
            if (this._oldClass) {
                dom.removeClass(this.element, this._oldClass);
            }
            this._oldClass = str;
            if (str) {
                dom.addClass(this.element, str);
            }
        };
        ClassBinding = __decorate([
            drunk.binding("class")
        ], ClassBinding);
        return ClassBinding;
    }(Binding));
})(drunk || (drunk = {}));
/// <reference path="../binding.ts" />
/// <reference path="../../util/dom.ts" />
/// <reference path="../../component/component.ts" />
/// <reference path="../../template/compiler.ts" />
/// <reference path="../../map/map.ts" />
var drunk;
(function (drunk) {
    var Map = drunk.Map;
    var dom = drunk.dom;
    var util = drunk.util;
    var Binding = drunk.Binding;
    var Template = drunk.Template;
    var Component = drunk.Component;
    var global = util.global;
    /**
     * 用于repeat作用域下的子viewModel
     * @param $parent     父级ViewModel
     * @param ownModel    私有的数据
     */
    var RepeatItem = (function (_super) {
        __extends(RepeatItem, _super);
        function RepeatItem($parent, ownModel) {
            _super.call(this);
            this.$parent = $parent;
            this.__inheritParentMembers(ownModel);
        }
        RepeatItem.prototype.__init = function () {
        };
        /**
         * 继承父级viewModel的filter和私有model
         */
        RepeatItem.prototype.__inheritParentMembers = function (ownModel) {
            var _this = this;
            var parent = this.$parent;
            var models = parent._models;
            _super.prototype.__init.call(this, parent._model);
            this.$filter = parent.$filter;
            if (models) {
                models.forEach(function (model) {
                    _this.__proxyModel(model);
                });
            }
            this.__proxyModel(ownModel);
            drunk.observable.create(ownModel);
        };
        /**
         * 代理指定model上的所有属性
         */
        RepeatItem.prototype.__proxyModel = function (model) {
            var _this = this;
            Object.keys(model).forEach(function (property) {
                util.createProxy(_this, property, model);
            });
            if (!this._models) {
                this._models = [];
            }
            this._models.push(model);
        };
        /**
         * 重写代理方法,顺便也让父级viewModel代理该属性
         */
        RepeatItem.prototype.$proxy = function (property) {
            if (this._proxyProps[property]) {
                return;
            }
            if (util.createProxy(this, property, this.$parent)) {
                this.$parent.$proxy(property);
            }
            this._proxyProps[property] = true;
        };
        RepeatItem.prototype.$getModel = function () {
            var result = _super.prototype.$getModel.call(this);
            this._models.forEach(function (model) {
                util.extend(result, util.deepClone(model));
            });
            return result;
        };
        /**
         * @override
         */
        RepeatItem.prototype.$emit = function (type) {
            var args = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                args[_i - 1] = arguments[_i];
            }
            if (type != Component.Event.created && type != Component.Event.mounted && type != Component.Event.release && type != Component.Event.templateLoadFailed) {
                (_a = this.$parent).$emit.apply(_a, [type].concat(args));
            }
            _super.prototype.$emit.apply(this, [type].concat(args));
            return this;
            var _a;
        };
        /**
         * 重写获取事件处理方法,忘父级查找该方法
         */
        RepeatItem.prototype.__getHandler = function (handlerName) {
            var context = this;
            var handler = this[handlerName];
            while (!handler && context.$parent) {
                context = context.$parent;
                handler = context[handlerName];
            }
            if (!handler) {
                if (typeof global[handlerName] !== 'function') {
                    throw new Error("\u672A\u627E\u5230\u8BE5\u4E8B\u4EF6\u5904\u7406\u65B9\u6CD5" + handlerName);
                }
                handler = global[handlerName];
                context = global;
            }
            return function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i - 0] = arguments[_i];
                }
                return handler.apply(context, args);
            };
        };
        /**
         * 实例释放
         */
        RepeatItem.prototype.$release = function () {
            _super.prototype.$release.call(this);
            this._flagNode = this._element = null;
        };
        /**
         * 把数据转成列表,如果为空则转成空数组
         * @param  target  把对象转成带有item信息的数组
         */
        RepeatItem.toList = function (target) {
            var ret = [];
            if (Array.isArray(target)) {
                target.forEach(function (val, idx) {
                    ret.push({
                        key: idx,
                        idx: idx,
                        val: val
                    });
                });
            }
            else if (util.isPlainObjectOrObservableObject(target)) {
                var idx = 0;
                var key = void 0;
                for (key in target) {
                    ret.push({
                        key: key,
                        idx: idx++,
                        val: target[key]
                    });
                }
            }
            else if (typeof target === 'number') {
                for (var i = 0; i < target; i++) {
                    ret.push({
                        key: i,
                        idx: i,
                        val: i
                    });
                }
            }
            return ret;
        };
        return RepeatItem;
    }(Component));
    drunk.RepeatItem = RepeatItem;
    var regParam = /\s+in\s+/;
    var regComma = /\s*,\s*/;
    function invalidExpression(expression) {
        throw new TypeError("\u9519\u8BEF\u7684" + drunk.config.prefix + "repeat\u8868\u8FBE\u5F0F: " + expression);
    }
    /**
     * drunk-repeat的绑定实现类
     */
    var RepeatBinding = (function (_super) {
        __extends(RepeatBinding, _super);
        function RepeatBinding() {
            _super.apply(this, arguments);
        }
        /**
         * 初始化绑定
         */
        RepeatBinding.prototype.init = function () {
            this._createCommentNodes();
            this._parseExpression();
            this._map = new Map();
            this._items = [];
            this._bind = Template.compile(this.element);
        };
        /**
         * 创建注释标记标签
         */
        RepeatBinding.prototype._createCommentNodes = function () {
            this._flagNodeContent = "[repeat-item]" + this.expression;
            this._headNode = dom.createFlagNode('<repeat>: ' + this.expression);
            this._tailNode = dom.createFlagNode('</repeat>: ' + this.expression);
            dom.before(this._headNode, this.element);
            dom.replace(this._tailNode, this.element);
            Binding.setWeakRef(this._headNode, this);
            Binding.setWeakRef(this._tailNode, this);
        };
        /**
         * 解析表达式
         */
        RepeatBinding.prototype._parseExpression = function () {
            var expression = this.expression;
            var parts = expression.split(regParam);
            if (parts.length !== 2) {
                invalidExpression(expression);
            }
            var params = parts[0];
            var key;
            var value;
            if (params.indexOf(',') > 0) {
                params = params.split(regComma);
                if (params[0] === '') {
                    invalidExpression(expression);
                }
                key = params[1];
                value = params[0];
            }
            else {
                value = params;
            }
            this._param = {
                key: key,
                val: value
            };
            this.expression = parts[1].trim();
        };
        /**
         * 数据更新
         */
        RepeatBinding.prototype.update = function (newValue) {
            var _this = this;
            if (this._cancelRenderJob) {
                this._cancelRenderJob();
            }
            var items = this._items = RepeatItem.toList(newValue);
            var isEmpty = !this._itemVms || this._itemVms.length === 0;
            var newVms = [];
            items.forEach(function (item, index) {
                var itemVm = newVms[index] = _this._getRepeatItem(item);
                itemVm._isUsed = true;
            });
            if (!isEmpty) {
                this._unrealizeItems();
            }
            newVms.forEach(function (itemVm) { return itemVm._isUsed = false; });
            this._itemVms = newVms;
            if (!newVms.length) {
                return;
            }
            return this._render();
        };
        /**
         * 渲染item元素
         */
        RepeatBinding.prototype._render = function () {
            var _this = this;
            var index = 0;
            var length = this._items.length;
            var placeholder;
            var renderJob;
            var next = function (node) {
                placeholder = node.nextSibling;
                while (placeholder && placeholder !== _this._tailNode && placeholder.flag != _this._flagNodeContent) {
                    placeholder = placeholder.nextSibling;
                }
            };
            var renderItems = function () {
                if (!_this._isActived) {
                    // return console.log('该repeat绑定已被销毁');
                    return;
                }
                var viewModel;
                // 100ms作为当前线程跑的时长，超过该时间则让出线程
                var endTime = Date.now() + 100;
                while (index < length) {
                    viewModel = _this._itemVms[index++];
                    if (viewModel._flagNode !== placeholder) {
                        // 判断占位节点是否是当前item的节点，不是则换位
                        dom.before(viewModel._flagNode, placeholder);
                        if (!viewModel._isBinded) {
                            // 创建节点和生成绑定
                            viewModel.element = viewModel._element = _this.element.cloneNode(true);
                            dom.after(viewModel._element, viewModel._flagNode);
                            _this._bind(viewModel, viewModel.element);
                            Component.setWeakRef(viewModel._element, viewModel);
                            viewModel._isBinded = true;
                        }
                        else {
                            dom.after(viewModel._element, viewModel._flagNode);
                        }
                        if (drunk.config.renderOptimization && Date.now() >= endTime && index < length) {
                            // 如果创建节点达到了一定时间，让出线程给ui线程
                            if (!_this._cancelRenderJob) {
                                _this._cancelRenderJob = function () {
                                    renderJob && util.cancelAnimationFrame(renderJob);
                                    _this._cancelRenderJob = renderJob = null;
                                };
                            }
                            return renderJob = util.requestAnimationFrame(renderItems);
                        }
                    }
                    else {
                        next(placeholder);
                    }
                }
                _this._cancelRenderJob = renderJob = null;
            };
            next(this._headNode);
            renderItems();
        };
        /**
         * 根据item信息对象获取或创建RepeatItem实例
         */
        RepeatBinding.prototype._getRepeatItem = function (item) {
            var value = item.val;
            var viewModelList = this._map.get(value);
            var viewModel;
            if (viewModelList) {
                for (var i = 0; viewModel = viewModelList[i]; i++) {
                    if (!viewModel._isUsed) {
                        break;
                    }
                }
            }
            if (viewModel) {
                this._updateItemModel(viewModel, item);
            }
            else {
                viewModel = this._realizeItem(item);
            }
            return viewModel;
        };
        /**
         * 根据item信息对象创建RepeatItem实例
         */
        RepeatBinding.prototype._realizeItem = function (item) {
            var value = item.val;
            var options = {};
            this._updateItemModel(options, item);
            var viewModel = new RepeatItem(this.viewModel, options);
            var viewModelList = this._map.get(value);
            viewModel._flagNode = dom.createFlagNode(this._flagNodeContent);
            Component.setWeakRef(viewModel._flagNode, viewModel);
            if (!viewModelList) {
                viewModelList = [];
                this._map.set(value, viewModelList);
            }
            viewModelList.push(viewModel);
            return viewModel;
        };
        /**
         * 更新item的数据，设置$odd,$even,$last,$first的值和指定访问item信息的字段的值
         */
        RepeatBinding.prototype._updateItemModel = function (target, item) {
            target.$odd = 0 === item.idx % 2;
            target.$even = !target.$odd;
            target.$last = item.idx === this._items.length - 1;
            target.$first = 0 === item.idx;
            target[this._param.val] = item.val;
            if (this._param.key) {
                target[this._param.key] = item.key;
            }
        };
        /**
         * 释放不再使用的RepeatItem实例并删除其指定的元素
         * @param  force  是否强制移除所有item
         */
        RepeatBinding.prototype._unrealizeItems = function (force) {
            var _this = this;
            var nameOfVal = this._param.val;
            this._itemVms.forEach(function (viewModel, index) {
                if (viewModel._isUsed && !force) {
                    return;
                }
                var value = viewModel[nameOfVal];
                var viewModelList = _this._map.get(value);
                util.removeArrayItem(viewModelList, viewModel);
                if (!viewModelList.length) {
                    _this._map.delete(value);
                }
                var element = viewModel._element;
                var flagNode = viewModel._flagNode;
                flagNode.flag = 'Unused repeat item';
                Component.removeWeakRef(flagNode);
                viewModel.$release();
                dom.remove(flagNode);
                if (element) {
                    Component.removeWeakRef(element);
                    dom.remove(element);
                }
            });
        };
        /**
         * 释放该Binding实例
         */
        RepeatBinding.prototype.release = function () {
            if (this._itemVms && this._itemVms.length) {
                this._unrealizeItems(true);
            }
            if (this._cancelRenderJob) {
                this._cancelRenderJob();
            }
            Binding.removeWeakRef(this._headNode, this);
            Binding.removeWeakRef(this._tailNode, this);
            dom.remove(this._headNode);
            dom.remove(this._tailNode);
            this._map.clear();
            this._map = this._items = this._itemVms = this._bind = this._headNode = this._tailNode = null;
        };
        RepeatBinding.isTerminal = true;
        RepeatBinding.priority = Binding.Priority.aboveNormal + 1;
        RepeatBinding = __decorate([
            drunk.binding("repeat")
        ], RepeatBinding);
        return RepeatBinding;
    }(Binding));
})(drunk || (drunk = {}));
/// <reference path="./repeat.ts" />
/// <reference path="../binding.ts" />
/// <reference path="../../component/component.ts" />
/// <reference path="../../util/dom.ts" />
/// <reference path="../../template/fragment.ts" />
var drunk;
(function (drunk) {
    var dom = drunk.dom;
    var util = drunk.util;
    var Binding = drunk.Binding;
    var Template = drunk.Template;
    var Component = drunk.Component;
    var reOneInterpolate = /^\{\{([^{]+)\}\}$/;
    var reStatement = /(\w+):\s*(.+)/;
    var reSemic = /\s*;\s*/;
    var reBreakword = /\n+/g;
    var getHelpMessage = function () { return ("\u6B63\u786E\u7684\u7528\u6CD5\u5982\u4E0B:\n        " + drunk.config.prefix + "on=\"click: expression\"\n        " + drunk.config.prefix + "on=\"mousedown: expression; mouseup: callback()\"\n        " + drunk.config.prefix + "on=\"click: callback($event, $el)\""); };
    var ComponentBinding = (function (_super) {
        __extends(ComponentBinding, _super);
        function ComponentBinding() {
            _super.apply(this, arguments);
        }
        /**
         * 初始化组件,找到组件类并生成实例,创建组件的绑定
         */
        ComponentBinding.prototype.init = function () {
            var src = this.element.getAttribute('src');
            this.element.removeAttribute('src');
            if (src) {
                return this._initAsyncComponent(src);
            }
            var Ctor = Component.getConstructorByName(this.expression);
            if (!Ctor) {
                throw new Error(this.expression + ": 未找到该组件.");
            }
            this.component = new Ctor();
            this.unwatches = [];
            this._processComponentAttributes();
            return this._realizeComponent();
        };
        /**
         * 初始化异步组件,先加载为fragment,再设置为组件的element,在进行初始化
         */
        ComponentBinding.prototype._initAsyncComponent = function (src) {
            var _this = this;
            return Template.renderFragment(src, null, true).then(function (fragment) {
                if (_this.isDisposed) {
                    return;
                }
                var Ctor = Component.getConstructorByName(_this.expression);
                if (!Ctor) {
                    throw new Error(_this.expression + " : \u672A\u627E\u5230\u8BE5\u7EC4\u4EF6");
                }
                _this.unwatches = [];
                _this.component = new Ctor();
                _this.component.element = util.toArray(fragment.childNodes);
                _this._processComponentAttributes();
                return _this._realizeComponent();
            });
        };
        /**
         * 获取双向绑定的属性名
         */
        ComponentBinding.prototype._getTwoWayBindingAttrs = function () {
            var result = this.element.getAttribute('two-way');
            var marked = {};
            this.element.removeAttribute('two-way');
            if (result) {
                result.trim().split(/\s+/).forEach(function (str) {
                    marked[util.camelCase(str)] = true;
                });
            }
            return marked;
        };
        /**
         * 为组件准备数据和绑定事件
         */
        ComponentBinding.prototype._processComponentAttributes = function () {
            var _this = this;
            var element = this.element;
            var component = this.component;
            var twoWayBindingAttrs = this._getTwoWayBindingAttrs();
            this._processEventBinding();
            if (element.hasAttributes()) {
                // 遍历元素上所有的属性做数据准备或数据绑定的处理
                // 如果某个属性用到插值表达式,如"a={{b}}",则对起进行表达式监听(当b改变时通知component的a属性更新到最新的值)
                util.toArray(element.attributes).forEach(function (attr) {
                    var attrName = attr.name;
                    var attrValue = attr.value;
                    if (attrName.indexOf(drunk.config.prefix) === 0) {
                        return console.warn("\u81EA\u5B9A\u4E49\u7EC4\u4EF6\u6807\u7B7E\u4E0A\u4E0D\u652F\u6301\u4F7F\u7528\"" + attrName + "\"\u7ED1\u5B9A\u8BED\u6CD5");
                    }
                    if (!attrValue) {
                        component[util.camelCase(attrName)] = true;
                        return;
                    }
                    var expression = attrValue.trim();
                    if (attrName.indexOf("on-") === 0) {
                        // on-click="doSomething()"
                        // => "click", "doSomething()"
                        attrName = util.camelCase(attrName.slice(3));
                        return _this._registerComponentEvent(attrName, expression);
                    }
                    attrName = util.camelCase(attrName);
                    if (!drunk.Parser.hasInterpolation(expression)) {
                        // 没有插值表达式
                        // title="someConstantValue"
                        var value = void 0;
                        if (attrValue === 'true') {
                            value = true;
                        }
                        else if (attrValue === 'false') {
                            value = false;
                        }
                        else {
                            value = parseFloat(attrValue);
                            value = isNaN(value) ? attrValue : value;
                        }
                        return component[attrName] = value;
                    }
                    // title="{{somelet}}"
                    _this._initComponentWatcher(attrName, expression, twoWayBindingAttrs[attrName]);
                });
            }
            component.$emit(Component.Event.created, component);
        };
        /**
         * 处理组件的视图与数据绑定
         */
        ComponentBinding.prototype._realizeComponent = function () {
            var _this = this;
            var element = this.element;
            var component = this.component;
            var viewModel = this.viewModel;
            this._realizePromise = component.$processTemplate().then(function (template) {
                if (_this.isDisposed) {
                    return;
                }
                var headNode = _this._headNode = dom.createFlagNode("<component>: " + _this.expression);
                var tailNode = _this._tailNode = dom.createFlagNode("</component>: " + _this.expression);
                dom.replace(headNode, element);
                dom.after(tailNode, headNode);
                dom.after(template, headNode);
                Binding.setWeakRef(headNode, _this);
                Binding.setWeakRef(tailNode, _this);
                component.$mount(template, viewModel, element);
                var currNode = headNode.nextSibling;
                var nodeList = [headNode];
                while (currNode && currNode !== tailNode) {
                    nodeList.push(currNode);
                    currNode = currNode.nextSibling;
                }
                nodeList.push(tailNode);
                if (viewModel instanceof drunk.RepeatItem) {
                    if (viewModel._element === element) {
                        viewModel._element = nodeList;
                    }
                }
            });
            this._realizePromise.done(null, function (error) {
                if (error && error.message !== 'Canceled') {
                    console.warn(_this.expression + ": \u7EC4\u4EF6\u521B\u5EFA\u5931\u8D25\n", error);
                }
            });
            return this._realizePromise;
        };
        ComponentBinding.prototype._processEventBinding = function () {
            var _this = this;
            var bindingName = drunk.config.prefix + 'on';
            var expression = this.element.getAttribute(bindingName);
            if (expression == null) {
                return;
            }
            this.element.removeAttribute(bindingName);
            expression.replace(reBreakword, ' ').split(reSemic).map(function (str) {
                var matches = str.match(reStatement);
                console.assert(matches !== null, "\u4E0D\u5408\u6CD5\u7684\"" + drunk.config.prefix + "on\"\u8868\u8FBE\u5F0F " + str + ", " + getHelpMessage());
                _this._registerComponentEvent(matches[1], matches[2]);
            });
        };
        /**
         * 注册组件的事件
         */
        ComponentBinding.prototype._registerComponentEvent = function (eventName, expression) {
            var _this = this;
            var viewModel = this.viewModel;
            var func = drunk.Parser.parse(expression);
            this.component.$on(eventName, function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i - 0] = arguments[_i];
                }
                // 事件的处理函数,会生成一个$event对象,在表达式中可以访问该对象.
                // $event对象有type和args两个字段,args字段是组件派发这个事件所传递的参数的列表
                // $el字段为该组件实例
                if (drunk.config.debug) {
                    console.log(eventName + ": " + expression);
                }
                func.call(viewModel, {
                    type: eventName,
                    args: args,
                    target: _this.component
                }, _this.component, util.global);
            });
        };
        /**
         * 监控绑定表达式,表达式里任意数据更新时,同步到component的指定属性
         */
        ComponentBinding.prototype._initComponentWatcher = function (property, expression, isTwoWay) {
            var viewModel = this.viewModel;
            var component = this.component;
            var unwatch;
            if (isTwoWay) {
                var result = expression.match(reOneInterpolate);
                if (!result) {
                    throw new Error(expression + ": \u8BE5\u8868\u8FBE\u5F0F\u4E0D\u80FD\u8FDB\u884C\u53CC\u5411\u7ED1\u5B9A");
                }
                var ownerProperty_1 = result[1].trim();
                unwatch = component.$watch(property, function (newValue, oldValue) {
                    var currValue = viewModel.$eval(expression, true);
                    if (newValue === currValue) {
                        return;
                    }
                    viewModel.$setValue(ownerProperty_1, newValue);
                });
                this.unwatches.push(unwatch);
            }
            unwatch = viewModel.$watch(expression, function (newValue) {
                if (component[property] === newValue) {
                    return;
                }
                component[property] = newValue;
            }, false, true);
            this.unwatches.push(unwatch);
        };
        /**
         * 组件释放
         */
        ComponentBinding.prototype.release = function () {
            if (this._realizePromise) {
                this._realizePromise.cancel();
            }
            if (this.component) {
                this.component.$release();
            }
            if (this.unwatches) {
                // 移除所有的属性监控
                this.unwatches.forEach(function (unwatch) { return unwatch(); });
            }
            if (this._headNode && this._tailNode) {
                dom.remove(this._headNode);
                dom.remove(this._tailNode);
                Binding.removeWeakRef(this._headNode, this);
                Binding.removeWeakRef(this._tailNode, this);
            }
            // 移除所有引用
            this._headNode = this._tailNode = this.component = this.unwatches = this._realizePromise = null;
            this.isDisposed = true;
        };
        ComponentBinding.isTerminal = true;
        ComponentBinding.priority = Binding.Priority.aboveNormal;
        ComponentBinding = __decorate([
            drunk.binding("component")
        ], ComponentBinding);
        return ComponentBinding;
    }(Binding));
})(drunk || (drunk = {}));
/// <reference path="../binding.ts" />
/// <reference path="../../util/dom.ts" />
/// <reference path="../../template/compiler.ts" />
var drunk;
(function (drunk) {
    var dom = drunk.dom;
    var Template = drunk.Template;
    var Binding = drunk.Binding;
    var IfBinding = (function (_super) {
        __extends(IfBinding, _super);
        function IfBinding() {
            _super.apply(this, arguments);
        }
        IfBinding.prototype.init = function () {
            this._flagNode = dom.createFlagNode("<if: " + this.expression + " />");
            this._bind = Template.compile(this.element);
            this._inDocument = false;
            dom.replace(this._flagNode, this.element);
            Binding.setWeakRef(this._flagNode, this);
        };
        IfBinding.prototype.update = function (value) {
            if (!!value) {
                return this.addToDocument();
            }
            else {
                this.removeFromDocument();
            }
        };
        IfBinding.prototype.addToDocument = function () {
            if (this._inDocument) {
                return;
            }
            this._clonedElement = this.element.cloneNode(true);
            dom.after(this._clonedElement, this._flagNode);
            Binding.setWeakRef(this._clonedElement, this);
            this._unbind = this._bind(this.viewModel, this._clonedElement);
            this._inDocument = true;
        };
        IfBinding.prototype.removeFromDocument = function () {
            if (!this._inDocument || !this._unbind) {
                return;
            }
            this._unbind();
            dom.remove(this._clonedElement);
            Binding.removeWeakRef(this._clonedElement, this);
            this._unbind = null;
            this._clonedElement = null;
            this._inDocument = false;
        };
        IfBinding.prototype.release = function () {
            this.removeFromDocument();
            dom.remove(this._flagNode);
            Binding.removeWeakRef(this._flagNode, this);
            this._flagNode = this._bind = null;
        };
        IfBinding.isTerminal = true;
        IfBinding.priority = Binding.Priority.aboveNormal + 2;
        IfBinding = __decorate([
            drunk.binding("if")
        ], IfBinding);
        return IfBinding;
    }(Binding));
})(drunk || (drunk = {}));
/// <reference path="../binding.ts" />
/// <reference path="../../template/loader.ts" />
/// <reference path="../../template/compiler.ts" />
/// <reference path="../../promise/promise.ts" />
/// <reference path="../../util/dom.ts" />
var drunk;
(function (drunk) {
    var dom = drunk.dom;
    var util = drunk.util;
    var Template = drunk.Template;
    var Binding = drunk.Binding;
    var IncludeBinding = (function (_super) {
        __extends(IncludeBinding, _super);
        function IncludeBinding() {
            _super.apply(this, arguments);
        }
        IncludeBinding.prototype.update = function (url) {
            var _this = this;
            if (!this._isActived || (url && url === this._url)) {
                return;
            }
            this._url = url;
            this._removeBind();
            if (url) {
                return this._bindPromise = Template.renderFragment(url, null, true).then(function (fragment) {
                    _this._createBinding(fragment);
                });
            }
        };
        IncludeBinding.prototype.release = function () {
            this._removeBind();
            this._url = this._unbind = null;
        };
        IncludeBinding.prototype._createBinding = function (fragment) {
            var _this = this;
            this._bindPromise = null;
            this._elements = util.toArray(fragment.childNodes);
            this._elements.forEach(function (el) { return _this.element.appendChild(el); });
            this._unbind = Template.compile(this._elements)(this.viewModel, this._elements);
        };
        IncludeBinding.prototype._removeBind = function () {
            if (this._bindPromise) {
                this._bindPromise.cancel();
                this._bindPromise = null;
            }
            if (this._elements) {
                var unbind_1 = this._unbind;
                dom.remove(this._elements).then(function () {
                    unbind_1();
                });
                this._elements = null;
            }
        };
        IncludeBinding.priority = Binding.Priority.low + 1;
        IncludeBinding = __decorate([
            drunk.binding("include")
        ], IncludeBinding);
        return IncludeBinding;
    }(Binding));
})(drunk || (drunk = {}));
/// <reference path="../binding.ts" />
/// <reference path="../../util/dom.ts" />
var drunk;
(function (drunk) {
    var dom = drunk.dom;
    var util = drunk.util;
    var ModelBinding = (function (_super) {
        __extends(ModelBinding, _super);
        function ModelBinding() {
            _super.apply(this, arguments);
        }
        ModelBinding.prototype.init = function () {
            var tag = this.element.tagName.toLowerCase();
            switch (tag) {
                case "input":
                    this.initAsInput();
                    break;
                case "select":
                    this.initAsSelect();
                    break;
                case "textarea":
                    this.initAsTextarea();
                    break;
            }
            this._changedHandler = this._changedHandler.bind(this);
            dom.on(this.element, this._changedEvent, this._changedHandler);
        };
        ModelBinding.prototype.initAsInput = function () {
            var type = this.element.type;
            switch (type) {
                case "checkbox":
                    this.initCheckbox();
                    break;
                case "radio":
                    this.initRadio();
                    break;
                case "text":
                case "tel":
                case "number":
                case "email":
                case "url":
                case "password":
                case "search":
                    this.initAsTextarea();
                    break;
                default:
                    this.initCommon();
            }
        };
        ModelBinding.prototype.initCheckbox = function () {
            this._changedEvent = "change";
            this._updateView = this._setCheckboxValue;
            this._getValue = this._getCheckboxValue;
        };
        ModelBinding.prototype.initRadio = function () {
            this._changedEvent = "change";
            this._updateView = this._setRadioValue;
            this._getValue = this._getCommonControlValue;
        };
        ModelBinding.prototype.initAsSelect = function () {
            this._changedEvent = "change";
            this._updateView = this._setSelectValue;
            this._getValue = this._getSelectValue;
        };
        ModelBinding.prototype.initAsTextarea = function () {
            this._changedEvent = "input";
            this._updateView = this._setCommonControlValue;
            this._getValue = this._getCommonControlValue;
        };
        ModelBinding.prototype.initCommon = function () {
            this._changedEvent = "change";
            this._updateView = this._setCommonControlValue;
            this._getValue = this._getCommonControlValue;
        };
        ModelBinding.prototype.update = function (newValue, oldValue) {
            this._updateView(newValue);
        };
        ModelBinding.prototype.release = function () {
            this._changedHandler = null;
            dom.off(this.element, this._changedEvent, this._changedHandler);
        };
        ModelBinding.prototype._changedHandler = function () {
            this.$setValue(this._getValue());
        };
        ModelBinding.prototype._setCheckboxValue = function (newValue) {
            this.element.checked = !!newValue;
        };
        ModelBinding.prototype._getCheckboxValue = function () {
            return !!this.element.checked;
        };
        ModelBinding.prototype._setRadioValue = function (newValue) {
            this.element.checked = this.element.value == newValue;
        };
        ModelBinding.prototype._getSelectValue = function () {
            if (this.element.options) {
                for (var i = 0, option = void 0; option = this.element.options[i]; i++) {
                    if (option.selected) {
                        return option.value;
                    }
                }
            }
            return this.element.value;
        };
        ModelBinding.prototype._setSelectValue = function (newValue) {
            if (newValue == null) {
                this.element.value = '';
                util.toArray(this.element.options).forEach(function (option) { return option.selected = false; });
            }
            else {
                for (var i = 0, option_1; option_1 = this.element.options[i]; i++) {
                    if (option_1.value == newValue) {
                        option_1.selected = true;
                        return;
                    }
                }
                var option = document.createElement('option');
                option.textContent = option.value = newValue;
                this.element.add(option);
                option.selected = true;
            }
        };
        ModelBinding.prototype._setCommonControlValue = function (newValue) {
            newValue = newValue == null ? '' : newValue;
            this.element.value = newValue;
        };
        ModelBinding.prototype._getCommonControlValue = function () {
            return this.element.value;
        };
        ModelBinding = __decorate([
            drunk.binding("model")
        ], ModelBinding);
        return ModelBinding;
    }(drunk.Binding));
})(drunk || (drunk = {}));
/// <reference path="../binding.ts" />
var drunk;
(function (drunk) {
    var Action = drunk.Action;
    var ShowBinding = (function (_super) {
        __extends(ShowBinding, _super);
        function ShowBinding() {
            _super.apply(this, arguments);
        }
        ShowBinding.prototype.update = function (isVisible) {
            var style = this.element.style;
            if (!isVisible) {
                Action.triggerAction(this.element, Action.Type.removed).then(function () {
                    style.display = 'none';
                });
            }
            else if (isVisible) {
                style.display = '';
                Action.triggerAction(this.element, Action.Type.created);
            }
        };
        ShowBinding = __decorate([
            drunk.binding('show')
        ], ShowBinding);
        return ShowBinding;
    }(drunk.Binding));
})(drunk || (drunk = {}));
/// <reference path="../binding.ts" />
/// <reference path="../../component/component.ts" />
/// <reference path="../../util/dom.ts" />
/// <reference path="../../template/compiler.ts" />
var drunk;
(function (drunk) {
    var dom = drunk.dom;
    var util = drunk.util;
    var Template = drunk.Template;
    var TranscludeBinding = (function (_super) {
        __extends(TranscludeBinding, _super);
        function TranscludeBinding() {
            _super.apply(this, arguments);
        }
        /**
         * 初始化绑定,先注册transcludeResponse事件用于获取transclude的viewModel和nodelist
         * 然后发送getTranscludeContext事件通知
         */
        TranscludeBinding.prototype.init = function (ownerViewModel, placeholder) {
            if (!ownerViewModel || !placeholder) {
                throw new Error("$mount(element, ownerViewModel, placeholder): ownerViewModel\u548Cplaceholder\u672A\u63D0\u4F9B");
            }
            var nodes = [];
            var unbinds = [];
            var transclude = placeholder.childNodes;
            var fragment = document.createDocumentFragment();
            util.toArray(transclude).forEach(function (node) {
                nodes.push(node);
                fragment.appendChild(node);
            });
            // 换掉节点
            dom.replace(fragment, this.element);
            nodes.forEach(function (node) {
                // 编译模板并获取绑定创建函数
                // 保存解绑函数
                var bind = Template.compile(node);
                unbinds.push(bind(ownerViewModel, node));
            });
            this._nodes = nodes;
            this._unbinds = unbinds;
        };
        /**
         * 释放绑定
         */
        TranscludeBinding.prototype.release = function () {
            this._unbinds.forEach(function (unbind) { return unbind(); });
            this._nodes.forEach(function (node) { return dom.remove(node); });
            this._unbinds = null;
            this._nodes = null;
        };
        TranscludeBinding = __decorate([
            drunk.binding("transclude")
        ], TranscludeBinding);
        return TranscludeBinding;
    }(drunk.Binding));
})(drunk || (drunk = {}));
//# sourceMappingURL=drunk.js.map