var drunk;
(function (drunk) {
    (function (PromiseState) {
        PromiseState[PromiseState["PENDING"] = 0] = "PENDING";
        PromiseState[PromiseState["RESOLVED"] = 1] = "RESOLVED";
        PromiseState[PromiseState["REJECTED"] = 2] = "REJECTED";
    })(drunk.PromiseState || (drunk.PromiseState = {}));
    var PromiseState = drunk.PromiseState;
    function noop() {
    }
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
        // 模拟 chrome 和 safari，不是标准
        if (promise === value) {
            publish(promise, undefined, PromiseState.RESOLVED);
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
        // 模拟 chrome 和 safari，不是标准
        if (promise === reason) {
            reason = undefined;
        }
        publish(promise, reason, PromiseState.REJECTED);
    }
    // 够不够严谨？
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
        nextTick(function () {
            var arr = promise._listeners;
            var len = arr.length;
            if (!len) {
                return;
            }
            for (var i = 0; i < len; i += 3) {
                invokeCallback(state, arr[i], arr[i + state], value);
            }
            arr.length = 0;
        });
    }
    function nextTick(callback) {
        setTimeout(callback, 0);
    }
    function invokeCallback(state, promise, callback, value) {
        var hasCallback = typeof callback === 'function';
        var done = false;
        var fail = false;
        if (hasCallback) {
            try {
                value = callback.call(null, value);
                done = true;
            }
            catch (e) {
                value = e;
                fail = true;
            }
        }
        // 已经被处理过的就不管了
        if (promise._state !== PromiseState.PENDING) {
            return;
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
    /**
     * ES6 Promise实现
     */
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
                throw new TypeError("Promise instance muse be created by 'new' operator");
            }
            init(this, executor);
        }
        Promise.all = function (iterable) {
            return new Promise(function (resolve, reject) {
                var len = iterable.length;
                var count = 0;
                var result = [];
                var rejected = false;
                var check = function (i, value) {
                    result[i] = value;
                    if (++count === len) {
                        resolve(result);
                        result = null;
                    }
                };
                if (!len) {
                    return resolve(result);
                }
                iterable.forEach(function (thenable, i) {
                    if (!isThenable(thenable)) {
                        return check(i, thenable);
                    }
                    thenable.then(function (value) {
                        if (rejected) {
                            return;
                        }
                        check(i, value);
                    }, function (reason) {
                        if (rejected) {
                            return;
                        }
                        rejected = true;
                        result = null;
                        reject(reason);
                    });
                });
                iterable = null;
            });
        };
        Promise.race = function (iterable) {
            return new Promise(function (resolve, reject) {
                var len = iterable.length;
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
                for (var i = 0, thenable = void 0; i < len; i++) {
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
                        thenable.then(function (value) {
                            check(value);
                        }, function (reason) {
                            check(reason, true);
                        });
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
                var callback = arguments[state - 1];
                nextTick(function () {
                    invokeCallback(state, promise, callback, value);
                });
            }
            else {
                subscribe(this, promise, onFulfillment, onRejection);
            }
            return promise;
        };
        Promise.prototype.catch = function (onRejection) {
            return this.then(null, onRejection);
        };
        return Promise;
    })();
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
                throw new Error('缓存容量必须大于0');
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
    })();
    drunk.Cache = Cache;
})(drunk || (drunk = {}));
/**
 * 工具方法模块
 */
var drunk;
(function (drunk) {
    var util;
    (function (util) {
        var nameOfUid = '__DRUNK_UUID__';
        var counter = 0;
        /**
         * 获取对象的唯一id
         * @param  target  设置的对象
         */
        function uuid(target) {
            if (typeof target[nameOfUid] === 'undefined') {
                defineProperty(target, nameOfUid, counter++);
            }
            return target[nameOfUid];
        }
        util.uuid = uuid;
        /**
         * 判断是否是对象
         * @param   target 判断目标
         */
        function isObject(target) {
            if (!target) {
                return false;
            }
            var proto = Object.getPrototypeOf(target);
            return Object.prototype.toString.call(target) === '[object Object]' && (proto === Object.prototype || proto === drunk.observable.ObservableObjectPrototype);
        }
        util.isObject = isObject;
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
            if (isObject(target)) {
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
        /**
         * Object.defineProperty的快捷方法，会设置configurable,writable默认为true
         * @param   target         设置的目标
         * @param   propertyName   属性
         * @param   propertyValue  值
         * @param   enumerable     该属性是否可枚举
         */
        function defineProperty(target, propertyName, propertyValue, enumerable) {
            Object.defineProperty(target, propertyName, {
                value: propertyValue,
                writable: true,
                configurable: true,
                enumerable: !!enumerable
            });
        }
        util.defineProperty = defineProperty;
        /**
         * 属性代理,把a对象的某个属性的读写代理到b对象上,返回代理是否成功的结果
         * @param   a         对象a
         * @param   property  属性名
         * @param   b         对象b
         * @return            如果已经代理过,则不再代理该属性
         */
        function proxy(a, property, b) {
            var des = Object.getOwnPropertyDescriptor(a, property);
            if (des && typeof des.get === 'function' && des.get === des.set) {
                return false;
            }
            function proxyGetterSetter() {
                if (arguments.length === 0) {
                    return b[property];
                }
                b[property] = arguments[0];
            }
            Object.defineProperty(a, property, {
                enumerable: true,
                configurable: true,
                set: proxyGetterSetter,
                get: proxyGetterSetter
            });
            return true;
        }
        util.proxy = proxy;
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
                }
            };
            timerId = setTimeout(function () {
                work.call(context);
                job.completed = true;
            }, 0);
            return job;
        }
        util.execAsyncWork = execAsyncWork;
    })(util = drunk.util || (drunk.util = {}));
})(drunk || (drunk = {}));
/// <reference path="../util/util" />
var drunk;
(function (drunk) {
    var uuidOfNaN = drunk.util.uuid({});
    var uuidOfNull = drunk.util.uuid({});
    var uuidOfUndefined = drunk.util.uuid({});
    var uuidOfTrue = drunk.util.uuid({});
    var uuidOfFalse = drunk.util.uuid({});
    /**
     * Map类，可把任务类型的对象作为key
     */
    var Map = (function () {
        function Map() {
            /**
             * 对应Key的数据
             */
            this._store = {};
            /**
             * 所有的key的列表
             */
            this._keys = [];
            /**
             * 所有的key生成的uuid的列表
             */
            this._uuids = [];
        }
        /**
         * 获取指定key的uuid
         */
        Map.prototype._uuidOf = function (key) {
            var type = typeof key;
            var uuid;
            if (type !== 'object') {
                if (isNaN(key)) {
                    uuid = uuidOfNaN;
                }
                else if (key === null) {
                    uuid = uuidOfNull;
                }
                else if (key === undefined) {
                    uuid = uuidOfUndefined;
                }
                else if (key === true) {
                    uuid = uuidOfTrue;
                }
                else if (key === false) {
                    uuid = uuidOfFalse;
                }
                else if (type === 'string') {
                    uuid = '"' + key + '"';
                }
                else if (type === 'number') {
                    uuid = '-' + key + '-';
                }
                else {
                    throw new Error('Not support type');
                }
            }
            else {
                uuid = drunk.util.uuid(key);
            }
            return uuid;
        };
        /**
         * 设值
         * @param   key  键,可为任意类型
         * @param  value 值
         */
        Map.prototype.set = function (key, value) {
            var uuid = this._uuidOf(key);
            if (this._uuids.indexOf(uuid) < 0) {
                this._uuids.push(uuid);
                this._keys.push(key);
            }
            this._store[uuid] = value;
            return this;
        };
        /**
         * 取值
         * @param key  键名
         */
        Map.prototype.get = function (key) {
            var uuid = this._uuidOf(key);
            return this._store[uuid];
        };
        /**
         * 是否有对应键的值
         * @param  key 键名
         */
        Map.prototype.has = function (key) {
            var uuid = this._uuidOf(key);
            return this._uuids.indexOf(uuid) > -1;
        };
        /**
         * 删除指定键的记录
         * @param   key 键名
         */
        Map.prototype.delete = function (key) {
            var uuid = this._uuidOf(key);
            var index = this._uuids.indexOf(uuid);
            if (index > -1) {
                this._uuids.splice(index, 1);
                this._keys.splice(index, 1);
                delete this._store[uuid];
                return true;
            }
            return false;
        };
        /**
         * 清除所有的成员
         */
        Map.prototype.clear = function () {
            this._keys = [];
            this._uuids = [];
            this._store = {};
        };
        /**
         * 遍历
         * @param   callback  回调
         * @param   context   上下文,回调里的this参数
         */
        Map.prototype.forEach = function (callback, context) {
            var _this = this;
            var uuids = this._uuids.slice();
            this.keys().forEach(function (key, index) {
                var uuid = uuids[index];
                callback.call(context, _this._store[uuid], key, _this);
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
            return this._uuids.map(function (uuid) { return _this._store[uuid]; });
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
    })();
    drunk.Map = Map;
})(drunk || (drunk = {}));
/// <reference path="../util/util.ts" />
var drunk;
(function (drunk) {
    var eventStore = {};
    function getStore(emitter) {
        var id = drunk.util.uuid(emitter);
        if (!eventStore[id]) {
            eventStore[id] = {};
        }
        return eventStore[id];
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
            var store = getStore(this);
            if (!store[type]) {
                store[type] = [];
            }
            drunk.util.addArrayItem(store[type], listener);
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
            listener.__isOnce = true;
            this.$addListener(type, listener);
            return this;
        };
        /**
         * 移除指定类型的事件监听
         * @param   type     事件类型
         * @param   listener 事件回调
         */
        EventEmitter.prototype.$removeListener = function (type, listener) {
            var store = getStore(this);
            var listeners = store[type];
            if (!listeners || !listeners.length) {
                return;
            }
            drunk.util.removeArrayItem(listeners, listener);
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
                getStore(this)[type] = null;
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
            var store = getStore(this);
            var listeners = store[type];
            if (!listeners || !listeners.length) {
                return;
            }
            listeners.slice().forEach(function (listener) {
                listener.apply(_this, args);
                if (listener.__isOnce) {
                    drunk.util.removeArrayItem(listeners, listener);
                }
            });
            return this;
        };
        /**
         * 获取指定事件类型的所有listener回调
         * @param   type  事件类型
         */
        EventEmitter.prototype.$listeners = function (type) {
            var listeners = getStore(this)[type];
            return listeners ? listeners.slice() : [];
        };
        /**
         * 获取事件实例的指定事件类型的回调技术
         * @param  emitter  事件类实例
         * @param  type     事件类型
         */
        EventEmitter.listenerCount = function (emitter, type) {
            var store = getStore(emitter);
            if (!store[type]) {
                return 0;
            }
            return store[type].length;
        };
        /**
         * 移除对象的所有事件回调引用
         * @param  emitter  事件发射器实例
         */
        EventEmitter.cleanup = function (emitter) {
            var id = drunk.util.uuid(emitter);
            eventStore[id] = null;
        };
        return EventEmitter;
    })();
    drunk.EventEmitter = EventEmitter;
})(drunk || (drunk = {}));
/// <reference path="./util" />
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
/// <reference path="./util" />
/// <reference path="./querystring" />
/// <reference path="../promise/promise" />
var drunk;
(function (drunk) {
    var util;
    (function (util) {
        var FORM_DATA_CONTENT_TYPE = 'application/x-www-form-urlencoded; charset=UTF-8';
        /**
         * XMLHTTP request工具方法
         * @param   options  配置参数
         */
        function ajax(options) {
            var xhr = new XMLHttpRequest();
            if (typeof options.url !== 'string' || !options.url) {
                throw new Error('发送ajax请求失败:url未提供或不合法');
            }
            return new drunk.Promise(function (resolve, reject) {
                var url = options.url;
                var type = (options.type || 'GET').toUpperCase();
                var headers = options.headers || {};
                var data = options.data;
                var contentType = options.contentType || FORM_DATA_CONTENT_TYPE;
                var timerID;
                var rejectAndClearTimer = function () {
                    clearTimeout(timerID);
                    if (reject) {
                        reject(xhr);
                        reject = null;
                    }
                };
                if (util.isObject(data)) {
                    if (options.contentType && options.contentType.match(/json/i)) {
                        data = JSON.stringify(data);
                    }
                    else {
                        data = drunk.querystring.stringify(data);
                        if (type === 'GET') {
                            url += (url.indexOf('?') === -1 ? '?' : '&') + data;
                            data = null;
                        }
                    }
                }
                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4) {
                        if (xhr.status >= 200 && xhr.status < 300 || xhr.status === 304) {
                            var res = xhr.responseText;
                            xhr = null;
                            resolve(options.dataType === 'json' ? JSON.parse(res) : res);
                        }
                        else {
                            rejectAndClearTimer();
                        }
                    }
                };
                xhr.onerror = function () {
                    rejectAndClearTimer();
                };
                xhr.open((type).toUpperCase(), url, true);
                if (options.withCredentials || (options.xhrFields && options.xhrFields.withCredentials)) {
                    xhr.withCredentials = true;
                }
                xhr.setRequestHeader("Content-Type", contentType);
                Object.keys(headers).forEach(function (name) {
                    xhr.setRequestHeader(name, headers[name]);
                });
                xhr.send(data);
                if (typeof options.timeout === 'number') {
                    timerID = setTimeout(function () {
                        xhr.abort();
                        rejectAndClearTimer();
                    }, options.timeout);
                }
            });
        }
        util.ajax = ajax;
    })(util = drunk.util || (drunk.util = {}));
})(drunk || (drunk = {}));
/// <reference path="../promise/promise" />
/// <reference path="../util/util" />
/// <reference path="../events/eventemitter" />
/**
 * 调度器模块
 */
var drunk;
(function (drunk) {
    var Scheduler;
    (function (Scheduler) {
        /**
         * 调度方法
         * @param  work      调度的执行函数
         * @param  priority  优先级
         * @param  context   上下文
         */
        function schedule(work, priority, context) {
            var job = new Job(work, clampPriority(priority), context);
            addJobToQueue(job);
            return job;
        }
        Scheduler.schedule = schedule;
        /**
         * 当指定优化级的任何都执行完成后触发的回调
         * @param  priority  优先级
         * @param  callback  回调
         */
        function requestDrain(priority, callback) {
            drunk.util.addArrayItem(drainPriorityQueue, priority);
            drainPriorityQueue.sort();
            drainEventEmitter.$once(String(priority), callback);
        }
        Scheduler.requestDrain = requestDrain;
        /**
         * 调度器优先级
         */
        (function (Priority) {
            Priority[Priority["max"] = 15] = "max";
            Priority[Priority["high"] = 13] = "high";
            Priority[Priority["aboveNormal"] = 9] = "aboveNormal";
            Priority[Priority["normal"] = 0] = "normal";
            Priority[Priority["belowNormal"] = -9] = "belowNormal";
            Priority[Priority["idle"] = -13] = "idle";
            Priority[Priority["min"] = -15] = "min";
        })(Scheduler.Priority || (Scheduler.Priority = {}));
        var Priority = Scheduler.Priority;
        ;
        /**
         * 调度器生成的工作对象类
         */
        var Job = (function () {
            /**
             * @param  _work    调度的回调
             * @param  priority 工作的优先级
             * @param  _context 回调的this参数
             */
            function Job(_work, _priority, _context) {
                this._work = _work;
                this._priority = _priority;
                this._context = _context;
            }
            Object.defineProperty(Job.prototype, "priority", {
                /**
                 * 优先级
                 */
                get: function () {
                    return this._priority;
                },
                set: function (value) {
                    this._priority = clampPriority(value);
                },
                enumerable: true,
                configurable: true
            });
            /**
             * 取消该否工作，会释放引用
             */
            Job.prototype.cancel = function () {
                if (this.completed || this._cancelled) {
                    return;
                }
                this._remove();
                this._release();
            };
            /**
             * 暂停该工作，不会释放引用
             */
            Job.prototype.pause = function () {
                if (this.completed || this._cancelled) {
                    return;
                }
                this._remove();
                this._isPaused = true;
            };
            /**
             * 恢复工作
             */
            Job.prototype.resume = function () {
                if (!this.completed && !this._cancelled && this._isPaused) {
                    addJobToQueue(this);
                    this._isPaused = false;
                }
            };
            /**
             * 内部方法，执行回调
             */
            Job.prototype._execute = function (shouldYield) {
                var _this = this;
                var jobInfo = new JobInfo(shouldYield);
                this._work.call(this._context, jobInfo);
                var result = jobInfo._result;
                jobInfo._release();
                if (result) {
                    if (typeof result === 'function') {
                        this._work = result;
                        addJobToQueue(this);
                    }
                    else {
                        result.then(function (newWork) {
                            if (_this._cancelled) {
                                return;
                            }
                            _this._work = newWork;
                            addJobToQueue(_this);
                        });
                    }
                }
                else {
                    this._release();
                    this.completed = true;
                }
            };
            /**
             * 从调度任务队列中移除
             */
            Job.prototype._remove = function () {
                var jobList = getJobListAtPriority(this.priority);
                drunk.util.removeArrayItem(jobList, this);
            };
            /**
             * 释放引用
             */
            Job.prototype._release = function () {
                this._work = null;
                this._context = null;
                this._priority = null;
            };
            return Job;
        })();
        var JobInfo = (function () {
            function JobInfo(_shouldYield) {
                this._shouldYield = _shouldYield;
            }
            Object.defineProperty(JobInfo.prototype, "shouldYield", {
                /**
                 * 是否应该让出线程
                 */
                get: function () {
                    this._throwIfDisabled();
                    return this._shouldYield();
                },
                enumerable: true,
                configurable: true
            });
            /**
             * 设置当前优先级的新一个调度工作，会立即添加到该优先级的任务队列尾部
             */
            JobInfo.prototype.setWork = function (work) {
                this._throwIfDisabled();
                this._result = work;
            };
            /**
             * 当promise任务完成后设置当前优先级的新一个调度工作，会添加到该优先级的任务队列尾部
             */
            JobInfo.prototype.setPromise = function (promise) {
                this._throwIfDisabled();
                this._result = promise;
            };
            /**
             * 释放引用并设置API不再可用
             */
            JobInfo.prototype._release = function () {
                this._publicApiDisabled = true;
                this._result = null;
                this._shouldYield = null;
            };
            /**
             * 如果API不再可用，用户尝试调用会抛出错误
             */
            JobInfo.prototype._throwIfDisabled = function () {
                if (this._publicApiDisabled) {
                    throw new Error('The APIs of this JobInfo object are disabled');
                }
            };
            return JobInfo;
        })();
        var isRunning = false;
        var immediateYield = false;
        var drainEventEmitter = new drunk.EventEmitter();
        var TIME_SLICE = 30;
        var PRIORITY_TAIL = Priority.min - 1;
        var drainPriorityQueue = [];
        var jobStore = {};
        for (var i = Priority.min; i <= Priority.max; i++) {
            jobStore[i] = [];
        }
        function getJobListAtPriority(priority) {
            return jobStore[priority];
        }
        function getHighestPriority() {
            for (var priority = Priority.max; priority >= Priority.min; priority--) {
                if (jobStore[priority].length) {
                    return priority;
                }
            }
            return PRIORITY_TAIL;
        }
        function getHighestPriorityJobList() {
            return jobStore[getHighestPriority()];
        }
        function addJobToQueue(job) {
            var jobList = getJobListAtPriority(job.priority);
            jobList.push(job);
            if (job.priority > getHighestPriority()) {
                immediateYield = true;
            }
            startRunning();
        }
        function clampPriority(priority) {
            priority = priority || Priority.normal;
            return Math.min(Priority.max, Math.max(Priority.min, priority));
        }
        function run() {
            if (isRunning) {
                return;
            }
            if (drainPriorityQueue.length && getHighestPriority() === PRIORITY_TAIL) {
                return drainPriorityQueue.forEach(function (priority) { return drainEventEmitter.$emit(String(priority)); });
            }
            isRunning = true;
            immediateYield = false;
            var endTime = Date.now() + TIME_SLICE;
            function shouldYield() {
                if (immediateYield) {
                    return true;
                }
                if (drainPriorityQueue.length) {
                    return false;
                }
                return Date.now() > endTime;
            }
            while (getHighestPriority() >= Priority.min && !shouldYield()) {
                var jobList = getHighestPriorityJobList();
                var currJob = jobList.shift();
                do {
                    currJob._execute(shouldYield);
                    currJob = jobList.shift();
                } while (currJob && !immediateYield);
                notifyDrainPriority();
            }
            immediateYield = false;
            isRunning = false;
            if (getHighestPriority() > PRIORITY_TAIL) {
                startRunning();
            }
        }
        function notifyDrainPriority() {
            var count = 0;
            var highestPriority = getHighestPriority();
            drainPriorityQueue.some(function (priority) {
                if (priority > highestPriority) {
                    count += 1;
                    drainEventEmitter.$emit(String(priority));
                    return true;
                }
                return false;
            });
            if (count > 0) {
                drainPriorityQueue.splice(0, count);
            }
        }
        function startRunning() {
            if (!isRunning) {
                drunk.util.execAsyncWork(run);
            }
        }
    })(Scheduler = drunk.Scheduler || (drunk.Scheduler = {}));
})(drunk || (drunk = {}));
/// <reference path="../util/util.ts" />
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
        /**
         * 设置对象的指定字段的值
         * @param   name  字段名
         * @param   value 值
         */
        drunk.util.defineProperty(observable.ObservableObjectPrototype, "$set", function setObservableObjectProperty(name, value) {
            $set(this, name, value);
        });
        /**
         * 删除对象的指定字段的值
         * @param   name  字段名
         */
        drunk.util.defineProperty(observable.ObservableObjectPrototype, "$remove", function removeObservableObjectProperty(name) {
            $remove(this, name);
        });
    })(observable = drunk.observable || (drunk.observable = {}));
})(drunk || (drunk = {}));
/// <reference path="../util/util.ts" />
/// <reference path="./observableArray.ts" />
/// <reference path="./observableObject.ts" />
/// <reference path="../events/eventemitter" />
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var drunk;
(function (drunk) {
    var observable;
    (function (observable) {
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
                drunk.util.addArrayItem(this._propertyChangedCallbackList, callback);
            };
            /**
             * 移除任意属性改变的指定回调
             */
            Observer.prototype.removePropertyChangedCallback = function (callback) {
                if (!this._propertyChangedCallbackList) {
                    return;
                }
                drunk.util.removeArrayItem(this._propertyChangedCallbackList, callback);
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
                this._propertyChangedCallbackList.forEach(function (callback) { return callback(); });
            };
            return Observer;
        })(drunk.EventEmitter);
        observable.Observer = Observer;
    })(observable = drunk.observable || (drunk.observable = {}));
})(drunk || (drunk = {}));
/// <reference path="../util/util.ts" />
/// <reference path="./observableArray.ts" />
/// <reference path="./observableObject.ts" />
/// <reference path="./observer.ts" />
/// <reference path="../events/eventemitter" />
/**
 * observable模块的工具方法，用于创建可观察的数据，数据绑定等
 */
var drunk;
(function (drunk) {
    var observable;
    (function (observable) {
        /**
         * 根据数据返回对应的Observer 实例，如果该数据已经存在对应的 Observer 实例则直接返回，否则创建一个新的实例
         * @param data 数组或JSON对象
         */
        function create(data) {
            var isObject = drunk.util.isObject(data);
            if (!isObject && !Array.isArray(data)) {
                return;
            }
            var ob;
            if (typeof data.__observer__ === 'undefined') {
                // 如果从未创建过observer实例
                ob = new observable.Observer();
                drunk.util.defineProperty(data, '__observer__', ob);
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
            var ob = data.__observer__;
            if (ob) {
                ob.notify();
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
            drunk.util.removeArrayItem(array, value);
        }
        observable.$removeItem = $removeItem;
        /**
         * 删除数组中所有的指定值，并发送数组更新通知
         * @param  array  observableArray类型的数组
         * @param  value  要移除的值
         */
        function $removeAllItem(array, value) {
            var $removeItemIndexs = [];
            var step = 0;
            array.forEach(function (item, index) {
                if (value === item) {
                    $removeItemIndexs.push(index - step++);
                }
            });
            if ($removeItemIndexs.length) {
                $removeItemIndexs.forEach(function (index) {
                    array.splice(index, 1);
                });
                observable.notify(array);
            }
        }
        observable.$removeAllItem = $removeAllItem;
        /**
         * 删除所有数组元素
         */
        function removeAll(array) {
            if (array.length) {
                array.length = 0;
                observable.notify(array);
            }
        }
        observable.removeAll = removeAll;
        /**
         * 根据下标设置数组的值，并发送数据更新的通知
         * @param   index  数组下标
         * @param   value  要设置的值
         */
        drunk.util.defineProperty(observable.ObservableArrayPrototype, "$setAt", function setObservableArrayItem(index, value) {
            $setAt(this, index, value);
        });
        /**
         * 根据下标移除数组的值，并发送数据更新的通知
         * @param   index  数组下标
         */
        drunk.util.defineProperty(observable.ObservableArrayPrototype, "$removeAt", function removeObservalbeArrayByIndex(index) {
            return $removeAt(this, index);
        });
        /**
         * 移除指定的值，并发送数据更新的通知
         * @param  value  指定值
         */
        drunk.util.defineProperty(observable.ObservableArrayPrototype, "$removeItem", function removeObservableArrayItem(value) {
            return $removeItem(this, value);
        });
        /**
         * 移除数组中所有指定的值，并发送数据更新的通知
         * @param  value  指定值
         */
        drunk.util.defineProperty(observable.ObservableArrayPrototype, "$removeAllItem", function removeAllObservableArrayItem(value) {
            return $removeAllItem(this, value);
        });
        /**
         * 删除所有数组元素
         * @method removeAll
         */
        drunk.util.defineProperty(observable.ObservableArrayPrototype, 'removeAll', function () {
            return removeAll(this);
        });
        /**
         * 调用原生方法并发送通知
         */
        function executeArrayMethodAndNotify(array, methodName, args, callback) {
            var result = Array.prototype[methodName].apply(array, args);
            if (callback) {
                callback();
            }
            observable.notify(array);
            return result;
        }
        drunk.util.defineProperty(observable.ObservableArrayPrototype, "pop", function pop() {
            return executeArrayMethodAndNotify(this, "pop", []);
        });
        drunk.util.defineProperty(observable.ObservableArrayPrototype, "shift", function shift() {
            return executeArrayMethodAndNotify(this, "shift", []);
        });
        drunk.util.defineProperty(observable.ObservableArrayPrototype, "push", function push() {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i - 0] = arguments[_i];
            }
            return executeArrayMethodAndNotify(this, "push", args, function () {
                args.forEach(observable.create);
            });
        });
        drunk.util.defineProperty(observable.ObservableArrayPrototype, "unshift", function unshift() {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i - 0] = arguments[_i];
            }
            return executeArrayMethodAndNotify(this, "unshift", args, function () {
                args.forEach(observable.create);
            });
        });
        drunk.util.defineProperty(observable.ObservableArrayPrototype, "splice", function splice() {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i - 0] = arguments[_i];
            }
            return executeArrayMethodAndNotify(this, "splice", args, function () {
                args.slice(2).forEach(observable.create);
            });
        });
        drunk.util.defineProperty(observable.ObservableArrayPrototype, "sort", function sort(callback) {
            return executeArrayMethodAndNotify(this, "sort", [callback]);
        });
        drunk.util.defineProperty(observable.ObservableArrayPrototype, "reverse", function reverse() {
            return executeArrayMethodAndNotify(this, "reverse", []);
        });
    })(observable = drunk.observable || (drunk.observable = {}));
})(drunk || (drunk = {}));
/// <reference path="../util/util.ts" />
/// <reference path="../promise/promise.ts" />
/// <reference path="../parser/parser.ts" />
/// <reference path="../observable/observable.ts" />
var drunk;
(function (drunk) {
    var Watcher = (function () {
        /**
         * 每个watcher对应一个表达式,watcher管理着对应这个表达式更新的回调函数.watcher在对表达式进行求值是,访问每个数据的getter,并得到该数据的observer引用,然后订阅该observer.当某个数据更新时该数据的observer实例会发送通知给所有的watcher,watcher接收到消息后会调用所有的表达式更新的回调.
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
            this._isInterpolate = drunk.parser.hasInterpolation(expression);
            this._getter = this._isInterpolate ? drunk.parser.parseInterpolate(expression) : drunk.parser.parseGetter(expression);
            if (!this._getter.dynamic) {
                throw new Error('不能监控一个静态表达式:"' + expression + '"');
            }
            this.__propertyChanged = this.__propertyChanged.bind(this);
            this.value = this.__getValue();
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
            drunk.util.addArrayItem(this._actions, action);
        };
        /**
         * 移除数据更新回调
         * @param  action 回调函数
         */
        Watcher.prototype.removeAction = function (action) {
            if (!this._isActived) {
                return;
            }
            drunk.util.removeArrayItem(this._actions, action);
            if (!this._actions.length) {
                this.dispose();
            }
        };
        /**
         * 数据更新派发，会先做缓冲，防止在同一时刻对此出发更新操作，等下一次系统轮训时再真正执行更新操作
         */
        Watcher.prototype.__propertyChanged = function () {
            if (!this._runActionJob) {
                this._runActionJob = drunk.util.execAsyncWork(this.__flush, this);
            }
        };
        /**
         * 立即获取最新的数据判断并判断是否已经更新，如果已经更新，执行所有的回调
         */
        Watcher.prototype.__flush = function () {
            if (!this._isActived) {
                return;
            }
            var oldValue = this.value;
            var newValue = this.__getValue();
            if ((typeof newValue === 'object' && newValue != null) || newValue !== oldValue) {
                this.value = newValue;
                this._actions.slice().forEach(function (action) {
                    action(newValue, oldValue);
                });
            }
            this._runActionJob = null;
        };
        /**
         * 释放引用和内存
         */
        Watcher.prototype.dispose = function () {
            var _this = this;
            if (!this._isActived) {
                return;
            }
            Object.keys(this._observers).forEach(function (id) {
                Object.keys(_this._properties[id]).forEach(function (property) {
                    _this._observers[id].$removeListener(property, _this.__propertyChanged);
                });
            });
            if (this._runActionJob) {
                this._runActionJob.cancel();
                this._runActionJob = null;
            }
            var key = Watcher.getNameOfKey(this.expression, this.isDeepWatch);
            this.viewModel._watchers[key] = null;
            this.value = null;
            this.viewModel = null;
            this.expression = null;
            this._getter = null;
            this._actions = null;
            this._observers = null;
            this._properties = null;
            this._tmpObservers = null;
            this._isActived = false;
        };
        /**
         * 执行表达式函数获取最新的数据
         */
        Watcher.prototype.__getValue = function () {
            this.__beforeGetValue();
            var newValue = this._getter(this.viewModel);
            if (this.isDeepWatch) {
                visit(newValue);
            }
            if (this._getter.filters) {
                // 派发到各个filter中处理
                newValue = drunk.filter.pipeFor(newValue, this._getter.filters, this.viewModel.$filter, this._isInterpolate, this.viewModel);
            }
            this.__afterGetValue();
            return newValue;
        };
        /**
         * 设置observable的属性访问回调为当前watcher实例的订阅方法,当访问某个属性是就会对该属性进行订阅
         */
        Watcher.prototype.__beforeGetValue = function () {
            this._tmpObservers = {};
            this._tmpProperties = {};
            drunk.observable.onPropertyAccessing = this._subscribePropertyChanged.bind(this);
        };
        /**
         * 表达式求解完后的收尾工作,取消注册onPropertyAccessed回调,并对比旧的observer表和新的表看有哪些实例已经不需要订阅
         */
        Watcher.prototype.__afterGetValue = function () {
            // 清楚属性访问回调
            drunk.observable.onPropertyAccessing = null;
            var observers = this._observers;
            var properties = this._properties;
            var tmpObservers = this._tmpObservers;
            var tmpProperties = this._tmpProperties;
            var propertyChanged = this.__propertyChanged;
            Object.keys(observers).forEach(function (id) {
                var observer = observers[id];
                if (!tmpObservers[id]) {
                    // 如果没有再订阅该observer,取消订阅所有的属性
                    Object.keys(properties[id]).forEach(function (property) {
                        observer.$removeListener(property, propertyChanged);
                    });
                }
                else {
                    Object.keys(properties[id]).forEach(function (property) {
                        if (!tmpProperties[id][property]) {
                            // 如果没有再订阅该属性,取消订阅该属性
                            observer.$removeListener(property, propertyChanged);
                        }
                    });
                }
            });
            // 换成最新的
            this._observers = tmpObservers;
            this._properties = tmpProperties;
        };
        /**
         * 订阅属性的更新消息
         * @param  observer 属性的所属观察者
         * @param  property 属性名
         */
        Watcher.prototype._subscribePropertyChanged = function (observer, property) {
            var id = drunk.util.uuid(observer);
            var propertyChanged = this.__propertyChanged;
            if (!this._tmpObservers[id]) {
                // 添加到临时订阅observer表
                // 添加到临时订阅属性列表
                this._tmpObservers[id] = observer;
                this._tmpProperties[id] = (_a = {}, _a[property] = true, _a);
                if (!this._observers[id]) {
                    // 如果旧的订阅表也没有,则添加到旧表,并在判断
                    this._observers[id] = observer;
                    this._properties[id] = (_b = {}, _b[property] = true, _b);
                    observer.$addListener(property, propertyChanged);
                }
                else if (!this._properties[id][property]) {
                    // 如果没有订阅过该属性
                    this._properties[id][property] = true;
                    observer.$addListener(property, propertyChanged);
                }
            }
            else if (!this._tmpProperties[id][property]) {
                this._tmpProperties[id][property] = true;
                if (!this._properties[id][property]) {
                    observer.$addListener(property, propertyChanged);
                    this._properties[id][property] = true;
                }
            }
            var _a, _b;
        };
        return Watcher;
    })();
    drunk.Watcher = Watcher;
    // 遍历访问所有的属性以订阅所有的数据
    function visit(target) {
        if (drunk.util.isObject(target)) {
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
/// <reference path="../promise/promise" />
/// <reference path="../util/util" />
/// <reference path="../viewmodel/viewmodel" />
var drunk;
(function (drunk) {
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
            drunk.util.extend(this, descriptor);
        }
        /**
         * 初始化绑定
         */
        Binding.prototype.initialize = function (parentViewModel, placeholder) {
            var _this = this;
            var initResult;
            if (this.init) {
                initResult = drunk.Promise.resolve(this.init(parentViewModel, placeholder));
            }
            this._isActived = true;
            return new drunk.Promise(function (resolve, reject) {
                if (!_this.update) {
                    return resolve(initResult);
                }
                var expression = _this.expression;
                var isInterpolate = _this.isInterpolate;
                var viewModel = _this.viewModel;
                var getter = drunk.parser.parseGetter(expression, isInterpolate);
                if (!getter.dynamic) {
                    // 如果只是一个静态表达式直接取值更新
                    return resolve(drunk.Promise.all([_this.update(viewModel.$eval(expression, isInterpolate), undefined), initResult]));
                }
                _this._update = function (newValue, oldValue) {
                    if (!_this._isActived) {
                        return;
                    }
                    var res = _this.update(newValue, oldValue);
                    if (resolve) {
                        resolve([initResult, res]);
                        resolve = null;
                        initResult = null;
                    }
                };
                _this._unwatch = viewModel.$watch(expression, _this._update, _this.isDeepWatch, true);
            });
        };
        /**
         * 移除绑定并销毁
         */
        Binding.prototype.dispose = function () {
            if (!this._isActived) {
                return;
            }
            if (this.release) {
                this.release();
            }
            if (this._unwatch) {
                this._unwatch();
            }
            Binding.removeWeakRef(this.element, this);
            this._unwatch = null;
            this._update = null;
            this._isActived = false;
            this.element = null;
            this.expression = null;
            this.viewModel = null;
        };
        /**
         * 设置表达式的值到viewModel上,因为值更新会触发视图更新,会返回来触发当前绑定的update方法,所以为了避免不必要的
         * 性能消耗,这里提供加锁操作,在当前帧内设置锁定状态,发现是锁定的情况就不再调用update方法,下一帧的时候再把锁定状态取消
         * @param  value    要设置的值
         * @param  isLocked 是否加锁
         */
        Binding.prototype.setValue = function (value) {
            this.viewModel.$setValue(this.expression, value);
        };
        return Binding;
    })();
    drunk.Binding = Binding;
    var Binding;
    (function (Binding) {
        /**
         * 终止型绑定信息列表,每个绑定信息包含了name(名字)和priority(优先级)信息
         */
        var terminalBindingDescriptors = [];
        /**
         * 终止型绑定的名称
         */
        var terminalBindings = [];
        /**
         * 缓存的所有绑定声明的表
         */
        var definitions = {};
        /**
         * Binding实例与元素的弱引用关系表
         */
        var weakRefMap = {};
        /**
         * 获取元素的所有绑定实例
         * @param  element  元素节点
         */
        function getAllBindingsByElement(element) {
            var id = drunk.util.uuid(element);
            var bindings = weakRefMap[id];
            if (bindings) {
                return bindings.slice();
            }
        }
        Binding.getAllBindingsByElement = getAllBindingsByElement;
        /**
         * 添加引用
         * @param  element  元素节点
         * @param  binding  绑定实例
         */
        function setWeakRef(element, binding) {
            var id = drunk.util.uuid(element);
            if (!weakRefMap[id]) {
                weakRefMap[id] = [];
            }
            drunk.util.addArrayItem(weakRefMap[id], binding);
        }
        Binding.setWeakRef = setWeakRef;
        /**
         * 移除引用
         * @param   element  元素节点
         * @param   binding  绑定实例
         */
        function removeWeakRef(element, binding) {
            var id = drunk.util.uuid(element);
            var bindings = weakRefMap[id];
            if (!bindings) {
                return;
            }
            drunk.util.removeArrayItem(bindings, binding);
            if (bindings.length === 0) {
                weakRefMap[id] = null;
                drunk.Component.removeWeakRef(element);
            }
        }
        Binding.removeWeakRef = removeWeakRef;
        /**
         * 绑定创建的优先级
         */
        (function (Priority) {
            Priority[Priority["low"] = -100] = "low";
            Priority[Priority["high"] = 100] = "high";
            Priority[Priority["normal"] = 0] = "normal";
            Priority[Priority["aboveNormal"] = 50] = "aboveNormal";
            Priority[Priority["belowNormal"] = -50] = "belowNormal";
        })(Binding.Priority || (Binding.Priority = {}));
        var Priority = Binding.Priority;
        ;
        /**
         * 根据一个绑定原型对象注册一个binding指令
         * @param   name  指令名
         * @param   def   binding实现的定义对象或绑定的更新函数
         */
        function register(name, definition) {
            definition.priority = definition.priority || Priority.normal;
            if (definition.isTerminal) {
                setTernimalBinding(name, definition.priority);
            }
            if (definitions[name]) {
                console.warn(name, "绑定原已定义为：", definitions[name]);
                console.warn("替换为", definition);
            }
            definitions[name] = definition;
        }
        Binding.register = register;
        /**
         * 根据绑定名获取绑定的定义
         * @param   name      绑定的名称
         * @return            具有绑定定义信息的对象
         */
        function getByName(name) {
            return definitions[name];
        }
        Binding.getByName = getByName;
        /**
         * 获取已经根据优先级排序的终止型绑定的名称列表
         * @return 返回绑定名称列表
         */
        function getTerminalBindings() {
            return terminalBindings.slice();
        }
        Binding.getTerminalBindings = getTerminalBindings;
        /**
         * 创建viewModel与模板元素的绑定
         * @param   viewModel  ViewModel实例
         * @param   element    元素
         */
        function create(viewModel, element, descriptor, parentViewModel, placeholder) {
            var binding = new Binding(viewModel, element, descriptor);
            drunk.util.addArrayItem(viewModel._bindings, binding);
            Binding.setWeakRef(element, binding);
            drunk.Component.setWeakRef(element, viewModel);
            return binding.initialize(parentViewModel, placeholder);
        }
        Binding.create = create;
        /**
         * 设置终止型的绑定，根据提供的优先级对终止型绑定列表进行排序，优先级高的绑定会先于优先级的绑定创建
         * @param   name      绑定的名称
         * @param   priority  绑定的优先级
         */
        function setTernimalBinding(name, priority) {
            // 检测是否已经存在该绑定
            for (var i = 0, item = void 0; item = terminalBindingDescriptors[i]; i++) {
                if (item.name === name) {
                    item.priority = priority;
                    break;
                }
            }
            // 添加到列表中
            terminalBindingDescriptors.push({
                name: name,
                priority: priority
            });
            // 重新根据优先级排序
            terminalBindingDescriptors.sort(function (a, b) { return b.priority - a.priority; });
            // 更新名字列表
            terminalBindings = terminalBindingDescriptors.map(function (item) { return item.name; });
        }
    })(Binding = drunk.Binding || (drunk.Binding = {}));
})(drunk || (drunk = {}));
/// <reference path="../util/util.ts" />
/// <reference path="../parser/parser.ts" />
/// <reference path="../promise/promise.ts" />
/// <reference path="../watcher/watcher.ts" />
/// <reference path="../binding/binding.ts" />
/// <reference path="../filter/filter" />
/// <reference path="../events/eventemitter" />
var drunk;
(function (drunk) {
    /**
     * ViewModel类， 实现数据与模板元素的绑定
     */
    var ViewModel = (function (_super) {
        __extends(ViewModel, _super);
        /**
         * @param   model  初始化数据
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
            drunk.observable.create(model);
            drunk.util.defineProperty(this, "$filter", Object.create(drunk.filter.filters));
            drunk.util.defineProperty(this, "_model", model);
            drunk.util.defineProperty(this, "_bindings", []);
            drunk.util.defineProperty(this, "_watchers", {});
            drunk.util.defineProperty(this, "_isActived", true);
            Object.keys(model).forEach(function (property) {
                _this.$proxy(property);
            });
        };
        /**
         * 代理某个属性到最新的IModel上
         * @param   property  需要代理的属性名
         */
        ViewModel.prototype.$proxy = function (property) {
            var value = this[property];
            if (value === undefined) {
                value = this._model[property];
            }
            if (drunk.util.proxy(this, property, this._model)) {
                this._model.$set(property, value);
            }
        };
        /**
         * 执行表达式并返回结果
         * @param   expression      表达式
         * @param   isInterpolate   是否是插值表达式
         */
        ViewModel.prototype.$eval = function (expression, isInterpolate) {
            var getter;
            if (isInterpolate) {
                if (!drunk.parser.hasInterpolation(expression)) {
                    return expression;
                }
                getter = drunk.parser.parseInterpolate(expression);
            }
            else {
                getter = drunk.parser.parseGetter(expression);
            }
            return this.__getValueByGetter(getter, isInterpolate);
        };
        /**
         * 根据表达式设置值
         * @param   expression  表达式
         * @param   value       值
         */
        ViewModel.prototype.$setValue = function (expression, value) {
            var setter = drunk.parser.parseSetter(expression);
            setter.call(undefined, this, value);
        };
        /**
         * 把model数据转成json并返回
         * @return   json格式的不带getter/setter的model对象
         */
        ViewModel.prototype.$getModel = function () {
            return drunk.util.deepClone(this._model);
        };
        /**
         * 监听表达式的里每个数据的变化
         * @param   expression  表达式
         * @return              返回一个取消监听的函数
         */
        ViewModel.prototype.$watch = function (expression, action, isDeepWatch, isImmediate) {
            var _this = this;
            var key = drunk.Watcher.getNameOfKey(expression, isDeepWatch);
            var watcher;
            watcher = this._watchers[key];
            if (!watcher) {
                watcher = this._watchers[key] = new drunk.Watcher(this, expression, isDeepWatch);
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
        /**
         * 释放ViewModel实例的所有元素与数据的绑定,解除所有的代理属性,解除所有的视图于数据绑定,移除事件缓存,销毁所有的watcher
         */
        ViewModel.prototype.$release = function () {
            var _this = this;
            if (!this._isActived) {
                return;
            }
            Object.keys(this._model).forEach(function (property) {
                delete _this[property];
            });
            Object.keys(this._watchers).forEach(function (key) {
                if (_this._watchers[key]) {
                    _this._watchers[key].dispose();
                }
            });
            this._bindings.forEach(function (binding) {
                binding.dispose();
            });
            drunk.EventEmitter.cleanup(this);
            this._isActived = false;
            this._model = null;
            this._bindings = null;
            this._watchers = null;
            this.$filter = null;
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
                if (typeof window[handlerName] === 'function') {
                    handler = window[handlerName];
                    context = window;
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
        ViewModel.prototype.__getValueByGetter = function (getter, isInterpolate) {
            var args = [this].concat(drunk.util.toArray(arguments).slice(1));
            var value = getter.apply(null, args);
            return drunk.filter.pipeFor.apply(null, [value, getter.filters, this.$filter, isInterpolate].concat(args));
        };
        return ViewModel;
    })(drunk.EventEmitter);
    drunk.ViewModel = ViewModel;
})(drunk || (drunk = {}));
/// <reference path="../viewmodel/viewmodel.ts" />
/// <reference path="../filter/filter" />
/// <reference path="../cache/cache" />
/**
 * 简单的解析器,只是做了字符串替换,然后使用new Function生成函数
 */
var drunk;
(function (drunk) {
    var parser;
    (function (parser) {
        var eventName = "$event";
        var elementName = "$el";
        var valueName = "__value";
        var contextName = "__context";
        var proxyOperation = contextName + ".$proxy";
        var getHandlerOperation = contextName + ".__getHandler";
        // 保留关键字
        var reserved = [
            'break', 'case', 'catch', 'continue', 'debugger', 'default', 'delete', 'do',
            'else', 'finally', 'for', 'function', 'if', 'in', 'instanceof', 'new', 'return',
            'switch', 'this', 'throw', 'try', 'typeof', 'let', 'void', 'while',
            'class', 'null', 'undefined', 'true', 'false', 'with', eventName, elementName,
            'let', 'abstract', 'import', 'yield', 'arguments'
        ];
        var tokenCache = new drunk.Cache(500);
        var getterCache = new drunk.Cache(500);
        var setterCache = new drunk.Cache(500);
        var filterCache = new drunk.Cache(500);
        var expressionCache = new drunk.Cache(500);
        var identifierCache = new drunk.Cache(500);
        var interpolateGetterCache = new drunk.Cache(500);
        var reIdentifier = /("|').*?\1|[a-zA-Z$_][a-z0-9A-Z$_]*/g;
        var reFilter = /("|').*?\1|\|\||\|\s*([a-zA-Z$_][a-z0-9A-Z$_]*)(:[^|]*)?/g;
        var reInterpolate = /\{\{([^{]+)\}\}/g;
        var reBrackets = /^\([^)]*\)/;
        var reObjectKey = /[{,]\s*$/;
        var reColon = /^\s*:/;
        var reAnychar = /\S+/;
        /**
         *  解析filter定义
         */
        function parseFilterDef(str, skipSetter) {
            if (skipSetter === void 0) { skipSetter = false; }
            if (!filterCache.get(str)) {
                var def = [];
                var idx;
                str.replace(reFilter, function ($0, quote, name, args, i) {
                    if (!name) {
                        return $0;
                    }
                    if (idx == null) {
                        // 记录filter开始的位置， 因为filter只能是连续的出现一直到表达式结尾
                        idx = i;
                    }
                    var param;
                    if (args) {
                        param = parseGetter('[' + args.slice(1) + ']', false, true);
                    }
                    def.push({ name: name, param: param });
                });
                if (!def.length) {
                    return;
                }
                filterCache.set(str, {
                    input: str.slice(0, idx).trim(),
                    filters: def
                });
            }
            return filterCache.get(str);
        }
        /**
         *  断言非空字符串
         */
        function assertNotEmptyString(target, message) {
            if (!(typeof target === 'string' && reAnychar.test(target))) {
                throw new Error(message + ": 表达式为空");
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
                var index = 0;
                var proxies = [];
                var identifiers = [];
                var formated = str.replace(reIdentifier, function (x, p, i) {
                    if (p === '"' || p === "'" || str[i - 1] === '.') {
                        // 如果是字符串: "aaa"
                        // 或对象的属性: .aaa
                        index = i + x.length;
                        return x;
                    }
                    var prefix = str.slice(index, i); // 前一个字符
                    var suffix = str.slice(i + x.length); // 后一个字符
                    index = i + x.length;
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
                    if (identifiers.indexOf(x) < 0) {
                        // 标记未添加到列表中是
                        proxies.push('  ' + proxyOperation + '("' + x + '")');
                        identifiers.push(x);
                    }
                    // 否则为属性访问， 直接加上下文
                    // a 转成  __context.a
                    return contextName + '.' + x;
                });
                cache = {
                    proxies: identifiers.length ? ('if (' + proxyOperation + ') {\n' + proxies.join(';\n') + ';\n}\n') : '',
                    formated: formated,
                    identifiers: identifiers
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
                console.error("\"" + expression + "\"\u8868\u8FBE\u5F0F\u89E3\u6790\u5931\u8D25,\u5C1D\u8BD5\u89E3\u6790\u540E\u7684\u7ED3\u679C\u4E3A", args[args.length - 1]);
                throw err;
            }
        }
        /**
         * 解析表达式
         * @param  expression  表达式
         */
        function parse(expression) {
            assertNotEmptyString(expression, "解析表达式失败");
            var fn = expressionCache.get(expression);
            if (!fn) {
                var detail = parseIdentifier(expression);
                var fnBody = detail.proxies + "return (" + detail.formated + ");";
                fn = createFunction(expression, contextName, eventName, elementName, fnBody);
                expressionCache.set(expression, fn);
            }
            return fn;
        }
        parser.parse = parse;
        /**
         * 解析表达式生成getter函数
         * @param   expression      表达式字符串
         * @param   isInterpolate   是否是一哥插值表达式
         * @param   skipFilter      跳过解析filter
         */
        function parseGetter(expression, isInterpolate, skipFilter) {
            assertNotEmptyString(expression, "创建getter失败");
            if (isInterpolate) {
                return parseInterpolate(expression);
            }
            var getter = getterCache.get(expression);
            if (!getter) {
                var input = expression;
                var filter_1;
                if (!skipFilter && (filter_1 = parseFilterDef(expression))) {
                    input = filter_1.input;
                }
                var detail = parseIdentifier(input);
                var fnBody = detail.proxies + "try{return (" + detail.formated + ");}catch(e){}";
                getter = createFunction(expression, contextName, eventName, elementName, fnBody);
                getter.dynamic = !!detail.identifiers.length;
                getter.filters = filter_1 ? filter_1.filters : null;
                getterCache.set(expression, getter);
            }
            return getter;
        }
        parser.parseGetter = parseGetter;
        /**
         * 解析表达式生成setter函数
         * @param   expression 表达式字符串
         */
        function parseSetter(expression) {
            assertNotEmptyString(expression, "创建setter失败");
            var setter = setterCache.get(expression);
            if (!setter) {
                var detail = parseIdentifier(expression);
                var fnBody = detail.proxies + "return (" + detail.formated + " = " + valueName + ");";
                setter = createFunction(expression, contextName, valueName, fnBody);
                setterCache.set(expression, setter);
            }
            return setter;
        }
        parser.parseSetter = parseSetter;
        function parseInterpolate(expression, justTokens) {
            console.assert(hasInterpolation(expression), "parseInterpolate: 非法表达式", expression);
            var tokens = tokenCache.get(expression);
            if (!tokens) {
                tokens = [];
                var index = 0;
                var length_1 = expression.length;
                expression.replace(reInterpolate, function ($0, exp, i) {
                    if (i > index) {
                        tokens.push(expression.slice(index, i));
                    }
                    tokens.push({
                        expression: exp.trim()
                    });
                    index = i + $0.length;
                    return $0;
                });
                if (index < length_1 && index !== 0) {
                    tokens.push(expression.slice(index));
                }
                tokenCache.set(expression, tokens);
            }
            if (!tokens.length) {
                return;
            }
            return justTokens ? tokens : tokensToGetter(tokens, expression);
        }
        parser.parseInterpolate = parseInterpolate;
        /**
         * 是否有插值语法
         * @param   str  字符串
         */
        function hasInterpolation(str) {
            return typeof str === 'string' && str.match(reAnychar) !== null && str.match(reInterpolate) !== null;
        }
        parser.hasInterpolation = hasInterpolation;
        // 根据token生成getter函数
        function tokensToGetter(tokens, expression) {
            var getter = interpolateGetterCache.get(expression);
            if (!getter) {
                var dynamic = false;
                var filters = [];
                tokens = tokens.map(function (item, i) {
                    if (typeof item === 'string') {
                        filters[i] = null;
                        return item;
                    }
                    if (item && item.expression != null) {
                        getter = parseGetter(item.expression);
                        filters[i] = getter.filters;
                        if (!getter.dynamic) {
                            return getter((null));
                        }
                        dynamic = true;
                        return getter;
                    }
                    console.error("非法的token:\n", item);
                });
                getter = function (ctx) {
                    return tokens.map(function (item) {
                        if (typeof item === 'string') {
                            return item;
                        }
                        return item.call(null, ctx);
                    });
                };
                getter.dynamic = dynamic;
                getter.filters = filters;
                getter.isInterpolate = true;
                interpolateGetterCache.set(expression, getter);
            }
            return getter;
        }
    })(parser = drunk.parser || (drunk.parser = {}));
})(drunk || (drunk = {}));
/// <reference path="../parser/parser" />
/// <reference path="../viewmodel/viewModel" />
/**
 * 数据过滤器模块
 * @module drunk.filter
 */
var drunk;
(function (drunk) {
    var filter;
    (function (filter) {
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
                    return filter.pipeFor.apply(filter, [item, filterDefs[i], filterMap, false].concat(args));
                });
                // 对所有token求值得到的结果做处理,如果是undefined或null类型直接转成空字符串,避免页面显示出undefined或null
                return getInterpolateValue(value);
            }
            var name;
            var param;
            var method;
            // 应用于所有的filter
            filterDefs.forEach(function (def) {
                name = def.name;
                method = filterMap[name];
                if (typeof method !== 'function') {
                    throw new Error('Filter "' + name + '" not found');
                }
                param = def.param ? def.param.apply(def, args) : [];
                value = method.apply(void 0, [value].concat(param));
            });
            return value;
        }
        filter.pipeFor = pipeFor;
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
        filter.filters = {
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
    })(filter = drunk.filter || (drunk.filter = {}));
})(drunk || (drunk = {}));
/// <reference path="../binding" />
/// <reference path="../../config/config" />
/// <reference path="../../promise/promise" />
/// <reference path="../../scheduler/scheduler" />
var drunk;
(function (drunk) {
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
        var propertyPrefix = null;
        var transitionEndEvent = null;
        var animationEndEvent = null;
        function getPropertyName(property) {
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
            if (!propertyPrefix) {
                return property;
            }
            return propertyPrefix + (property.charAt(0).toUpperCase() + property.slice(1));
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
            var id = drunk.util.uuid(element);
            actionMap[id] = action;
        }
        Action.setCurrentAction = setCurrentAction;
        /**
         * 获取元素当前的action对象
         * @param   element  元素节点
         */
        function getCurrentAction(element) {
            var id = drunk.util.uuid(element);
            return actionMap[id];
        }
        Action.getCurrentAction = getCurrentAction;
        /**
         * 移除当前元素的action引用
         * @param  element
         */
        function removeRef(element) {
            var id = drunk.util.uuid(element);
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
            var definition = definitionMap[detail];
            if (definition) {
                // 如果有通过js注册的action,优先执行
                return runJavascriptAction(element, definition, type);
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
            return drunk.Promise.all(elements.map(function (el) {
                var action = getCurrentAction(el);
                return action && action.promise;
            }));
        }
        Action.process = process;
        function wait(time) {
            var action = {};
            action.promise = new drunk.Promise(function (resolve) {
                var timerid;
                action.cancel = function () {
                    clearTimeout(timerid);
                    action.cancel = null;
                    action.promise = null;
                };
                timerid = setTimeout(resolve, time);
            });
            return action;
        }
        function runJavascriptAction(element, definition, type) {
            var action = {};
            var executor = definition[type];
            action.promise = new drunk.Promise(function (resolve) {
                var cancel = executor(element, function () {
                    resolve();
                });
                action.cancel = function () {
                    action.cancel = null;
                    action.promise = null;
                    cancel();
                };
            });
            return action;
        }
        function runMaybeCSSAnimation(element, detail, type) {
            detail = detail ? detail + '-' : drunk.config.prefix;
            var action = {};
            var className = detail + type;
            // 如果transitionDuration或animationDuration都不为0s的话说明已经设置了该属性
            // 必须先在这里取一次transitionDuration的值,动画才会生效
            var style = getComputedStyle(element, null);
            var transitionDuration = style[getPropertyName('transitionDuration')];
            var transitionExist = transitionDuration !== '0s';
            var transitionTimerid;
            action.promise = new drunk.Promise(function (resolve) {
                // 给样式赋值后,取animationDuration的值,判断有没有设置animation动画
                element.classList.add(className);
                var animationExist = style[getPropertyName('animationDuration')] !== '0s';
                if (!transitionExist && !animationExist) {
                    // 如果为设置动画直接返回resolve状态
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
                };
            });
            return action;
        }
    })(Action = drunk.Action || (drunk.Action = {}));
    /**
     * action绑定的实现
     */
    var ActionBinding = (function () {
        function ActionBinding() {
        }
        ActionBinding.prototype.init = function () {
            var _this = this;
            this._actionJob = drunk.Scheduler.schedule(function () {
                _this._runActionByType(Action.Type.created);
                _this._actionJob = null;
            }, drunk.Scheduler.Priority.normal);
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
            actionQueue.promise = new drunk.Promise(function (resolve) {
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
                    };
                };
                runAction();
            });
            Action.setCurrentAction(element, actionQueue);
        };
        /**
         * 先取消还在运行的action，再运行指定的action
         */
        ActionBinding.prototype._runActionByType = function (type) {
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
            this._runActionByType(Action.Type.removed);
            this._actionNames = null;
            this._actionJob = null;
        };
        return ActionBinding;
    })();
    function isNumber(value) {
        return !isNaN(parseFloat(value));
    }
    drunk.Binding.register('action', ActionBinding.prototype);
})(drunk || (drunk = {}));
/// <reference path="../promise/promise" />
/// <reference path="./util" />
/// <reference path="../binding/bindings/action" />
/**
 * DOM操作的工具方法模块
 */
var drunk;
(function (drunk) {
    var dom;
    (function (dom) {
        /**
         * 根据提供的html字符串创建html元素
         * @param   html  html字符串
         * @return        创建好的html元素或元素列表数组
         */
        function create(htmlString) {
            var div = document.createElement("div");
            var str = htmlString.trim();
            console.assert(str.length > 0, "HTML是空的");
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
         * 在旧的元素节点前插入新的元素节点
         * @param  newNode  新的节点
         * @param  oldNode  旧的节点
         */
        function before(newNode, oldNode) {
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
            if (!Array.isArray(target)) {
                target = [target];
            }
            return drunk.Promise.all(target.map(function (node) {
                return removeAfterActionEnd(node);
            }));
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
    })(dom = drunk.dom || (drunk.dom = {}));
})(drunk || (drunk = {}));
/// <reference path="../viewmodel/viewModel.ts" />
/// <reference path="../promise/promise.ts" />
/// <reference path="../util/xhr.ts" />
/// <reference path="../util/dom" />
/// <reference path="../config/config.ts" />
/// <reference path="../parser/parser.ts" />
/**
 * 模板工具模块， 提供编译创建绑定，模板加载的工具方法
 */
var drunk;
(function (drunk) {
    var Template;
    (function (Template) {
        /**
         * 编译模板元素生成绑定方法
         * @param   node        模板元素
         * @param   isRootNode  是否是根元素
         * @return              绑定元素与viewModel的方法
         */
        function compile(node) {
            var isArray = Array.isArray(node);
            var executor = isArray || node.nodeType === 11 ? null : compileNode(node);
            var isTerminal = executor && executor.isTerminal;
            var childExecutor;
            if (isArray) {
                executor = compileNodeList(node);
            }
            else if (!isTerminal && isNeedCompileChild(node)) {
                childExecutor = compileNodeList(node.childNodes);
            }
            return function (viewModel, element, ownerViewModel, placeholder) {
                var allBindings = viewModel._bindings;
                var startIndex = allBindings.length;
                var bindingList;
                var promiseList = [];
                if (executor) {
                    promiseList.push(executor(viewModel, element, ownerViewModel, placeholder));
                }
                if (childExecutor) {
                    promiseList.push(childExecutor(viewModel, element.childNodes, ownerViewModel, placeholder));
                }
                bindingList = viewModel._bindings.slice(startIndex);
                return {
                    promise: drunk.Promise.all(promiseList),
                    unbind: function () {
                        bindingList.forEach(function (binding) {
                            binding.dispose();
                        });
                        startIndex = allBindings.indexOf(bindingList[0]);
                        allBindings.splice(startIndex, bindingList.length);
                    }
                };
            };
        }
        Template.compile = compile;
        /**
         *  判断元素是什么类型,调用相应的类型编译方法
         */
        function compileNode(node) {
            var nodeType = node.nodeType;
            if (nodeType === 1 && node.tagName !== "SCRIPT") {
                // 如果是元素节点
                return compileElement(node);
            }
            if (nodeType === 3) {
                // 如果是textNode
                return compileTextNode(node);
            }
        }
        /**
         *  编译NodeList
         */
        function compileNodeList(nodeList) {
            var executors = [];
            drunk.util.toArray(nodeList).forEach(function (node) {
                var executor;
                var childExecutor;
                executor = compileNode(node);
                if (!(executor && executor.isTerminal) && isNeedCompileChild(node)) {
                    childExecutor = compileNodeList(node.childNodes);
                }
                executors.push(executor, childExecutor);
            });
            if (executors.length > 1) {
                return function (viewModel, nodes, ownerViewModel, placeholder) {
                    if (nodes.length * 2 !== executors.length) {
                        throw new Error("创建绑定之前,节点已经被动态修改");
                    }
                    var i = 0;
                    var nodeExecutor;
                    var childExecutor;
                    var promiseList = [];
                    drunk.util.toArray(nodes).forEach(function (node) {
                        nodeExecutor = executors[i++];
                        childExecutor = executors[i++];
                        if (nodeExecutor) {
                            promiseList.push(nodeExecutor(viewModel, node, ownerViewModel, placeholder));
                        }
                        if (childExecutor) {
                            promiseList.push(childExecutor(viewModel, node.childNodes, ownerViewModel, placeholder));
                        }
                    });
                    return drunk.Promise.all(promiseList);
                };
            }
        }
        /**
         *  判断是否可以编译childNodes
         */
        function isNeedCompileChild(node) {
            return node.tagName !== 'SCRIPT' && node.hasChildNodes();
        }
        /**
         *  编译元素的绑定并创建绑定描述符
         */
        function compileElement(element) {
            var executor;
            var tagName = element.tagName.toLowerCase();
            if (tagName.indexOf('-') > 0) {
                element.setAttribute(drunk.config.prefix + 'component', tagName);
            }
            if (element.hasAttributes()) {
                // 如果元素上有属性， 先判断是否存在终止型绑定指令
                // 如果不存在则判断是否有普通的绑定指令
                executor = processTerminalBinding(element) || processNormalBinding(element);
            }
            if (element.tagName === 'TEXTAREA') {
                // 如果是textarea， 它的值有可能存在插值表达式， 比如 "the textarea value with {{some_let}}"
                // 第一次进行绑定先换成插值表达式
                var originExecutor = executor;
                executor = function (viewModel, textarea) {
                    textarea.value = viewModel.$eval(textarea.value, true);
                    if (originExecutor) {
                        return originExecutor(viewModel, textarea);
                    }
                };
            }
            return executor;
        }
        /**
         *  编译文本节点
         */
        function compileTextNode(node) {
            var content = node.textContent;
            if (!drunk.parser.hasInterpolation(content)) {
                return;
            }
            var tokens = drunk.parser.parseInterpolate(content, true);
            var fragment = document.createDocumentFragment();
            var executors = [];
            tokens.forEach(function (token, i) {
                if (typeof token === 'string') {
                    fragment.appendChild(document.createTextNode(token));
                    executors[i] = null;
                }
                else {
                    fragment.appendChild(document.createTextNode(' '));
                    executors[i] = createExecutor(node, {
                        name: "bind",
                        expression: token.expression
                    });
                }
            });
            return function (viewModel, element) {
                var frag = fragment.cloneNode(true);
                drunk.util.toArray(frag.childNodes).forEach(function (node, i) {
                    if (executors[i]) {
                        executors[i](viewModel, node);
                    }
                });
                drunk.dom.replace(frag, element);
            };
        }
        /**
         *  检测是否存在终止编译的绑定，比如component指令会终止当前编译过程，如果有创建绑定描述符
         */
        function processTerminalBinding(element) {
            var terminals = drunk.Binding.getTerminalBindings();
            var name;
            var expression;
            for (var i = 0; name = terminals[i]; i++) {
                if (expression = element.getAttribute(drunk.config.prefix + name)) {
                    // 如果存在该绑定
                    return createExecutor(element, {
                        name: name,
                        expression: expression
                    });
                }
            }
        }
        /**
         *  查找并创建通常的绑定
         */
        function processNormalBinding(element) {
            var executors = [];
            drunk.util.toArray(element.attributes).forEach(function (attr) {
                var name = attr.name;
                var index = name.indexOf(drunk.config.prefix);
                var expression = attr.value;
                var executor;
                if (index > -1 && index < name.length - 1) {
                    // 已经注册的绑定
                    name = name.slice(index + drunk.config.prefix.length);
                    executor = createExecutor(element, {
                        name: name,
                        expression: expression
                    });
                }
                else if (drunk.parser.hasInterpolation(expression)) {
                    // 如果是在某个属性上进行插值创建一个attr的绑定
                    executor = createExecutor(element, {
                        name: "attr",
                        attrName: name,
                        expression: expression,
                        isInterpolate: true
                    });
                }
                if (executor) {
                    executors.push(executor);
                }
            });
            if (executors.length) {
                executors.sort(function (a, b) {
                    return b.priority - a.priority;
                });
                // 存在绑定
                return function (viewModel, element, ownerViewModel, placeholder) {
                    return drunk.Promise.all(executors.map(function (executor) {
                        return executor(viewModel, element, ownerViewModel, placeholder);
                    }));
                };
            }
        }
        /**
         *  生成绑定描述符方法
         */
        function createExecutor(element, descriptor) {
            var definition = drunk.Binding.getByName(descriptor.name);
            var executor;
            if (!definition && drunk.config.debug) {
                console.warn(descriptor.name, "没有找到该绑定的定义");
                return;
            }
            if (!definition.retainAttribute && element.removeAttribute) {
                // 如果未声明保留这个绑定属性，则把它移除
                element.removeAttribute(drunk.config.prefix + descriptor.name);
            }
            drunk.util.extend(descriptor, definition);
            executor = function (viewModel, element, ownerViewModel, placeholder) {
                return drunk.Binding.create(viewModel, element, descriptor, ownerViewModel, placeholder);
            };
            executor.isTerminal = definition.isTerminal;
            executor.priority = definition.priority;
            return executor;
        }
    })(Template = drunk.Template || (drunk.Template = {}));
})(drunk || (drunk = {}));
/// <reference path="../promise/promise.ts" />
/// <reference path="../util/xhr.ts" />
/// <reference path="../cache/cache" />
var drunk;
(function (drunk) {
    var Template;
    (function (Template) {
        var cacheStore = new drunk.Cache(50);
        /**
         * 加载模板，先尝试从指定ID的标签上查找，找不到再作为url发送ajax请求，
         * 加载到的模板字符串会进行缓存
         * @param    urlOrId  script模板标签的id或模板的url地址
         * @returns           一个Promise 对象,Promise的返回值为模板字符串
         */
        function load(urlOrId) {
            var template = cacheStore.get(urlOrId);
            if (template != null) {
                return drunk.Promise.resolve(template);
            }
            var node = document.getElementById(urlOrId);
            if (node && node.innerHTML) {
                template = node.innerHTML;
                cacheStore.set(urlOrId, template);
                return drunk.Promise.resolve(template);
            }
            var promise = drunk.util.ajax({ url: urlOrId });
            cacheStore.set(urlOrId, promise);
            return promise;
        }
        Template.load = load;
    })(Template = drunk.Template || (drunk.Template = {}));
})(drunk || (drunk = {}));
/// <reference path="./loader" />
/// <reference path="../util/dom" />
/// <reference path="../cache/cache" />
/// <reference path="../promise/promise" />
var drunk;
(function (drunk) {
    var Template;
    (function (Template) {
        var cacheStore = new drunk.Cache(50);
        var styleRecord = {};
        var linkRecord = {};
        var scriptRecord = {};
        /**
         * 把模块连接渲染为documentFragment,会对样式和脚本进行处理,避免重复加载,如果提供宿主容器元素,则会把
         * 模板渲染到改容器中
         * @param   url               模板连接
         * @param   hostedElement     容器元素
         * @param   useCache          是否使用缓存还是重新加载
         * @return                    返回一个Promise对象
         */
        function renderFragment(url, hostedElement, useCache) {
            var fragmentId = url.toLowerCase();
            var fragmentPromise = cacheStore.get(fragmentId);
            if (!useCache || !fragmentPromise) {
                fragmentPromise = populateDocument(url);
                cacheStore.set(fragmentId, fragmentPromise);
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
        function populateDocument(href) {
            initialize();
            var htmlDoc = document.implementation.createHTMLDocument("frag");
            var base = htmlDoc.createElement("base");
            var anchor = htmlDoc.createElement("a");
            htmlDoc.head.appendChild(base);
            htmlDoc.body.appendChild(anchor);
            base.href = document.location.href;
            anchor.setAttribute("href", href);
            base.href = anchor.href;
            return Template.load(href).then(function (template) {
                drunk.dom.html(htmlDoc.documentElement, template);
                htmlDoc.head.appendChild(base);
            }).then(function () {
                return processDocument(htmlDoc, href);
            });
        }
        /**
         * 处理模板的资源
         */
        function processDocument(htmlDoc, href) {
            var body = htmlDoc.body;
            var lastNonInlineScriptPromise = drunk.Promise.resolve();
            var promiseList = [];
            drunk.util.toArray(htmlDoc.querySelectorAll('link[type="text/css"], link[rel="stylesheet"]')).forEach(addLink);
            drunk.util.toArray(htmlDoc.getElementsByTagName('style')).forEach(function (styleTag, index) { return addStyle(styleTag, href, index); });
            drunk.util.toArray(htmlDoc.getElementsByTagName('script')).forEach(function (scriptTag, index) {
                var result = addScript(scriptTag, href, index, lastNonInlineScriptPromise);
                if (result) {
                    if (!result.inline) {
                        lastNonInlineScriptPromise = result.promise;
                    }
                    promiseList.push(result.promise);
                }
            });
            drunk.util.toArray(htmlDoc.getElementsByTagName('img')).forEach(function (img) { return img.src = img.src; });
            drunk.util.toArray(htmlDoc.getElementsByTagName('a')).forEach(function (a) {
                // href为#开头的不用去更新属性
                if (a.href !== '') {
                    var href_1 = a.getAttribute('href');
                    if (href_1 && href_1[0] !== '#') {
                        a.href = href_1;
                    }
                }
            });
            return drunk.Promise.all(promiseList).then(function () {
                var fragment = document.createDocumentFragment();
                var imported = document.importNode(body, true);
                while (imported.childNodes.length > 0) {
                    fragment.appendChild(imported.firstChild);
                }
                return fragment;
            });
        }
        /**
         * 添加外链样式
         */
        function addLink(tag) {
            var tagUid = tag.href.toLowerCase();
            if (!linkRecord[tagUid]) {
                linkRecord[tagUid] = true;
                var newLink = tag.cloneNode(false);
                newLink.href = tag.href;
                document.head.appendChild(newLink);
            }
            tag.parentNode.removeChild(tag);
        }
        /**
         * 添加内链样式
         */
        function addStyle(tag, fragmentHref, position) {
            var tagUid = (fragmentHref + '  style[' + position + ']').toLowerCase();
            if (!styleRecord[tagUid]) {
                var newStyle = tag.cloneNode(true);
                styleRecord[tagUid] = true;
                newStyle.setAttribute('__', tagUid);
                document.head.appendChild(newStyle);
            }
            tag.parentNode.removeChild(tag);
        }
        /**
         * 添加脚本
         */
        function addScript(tag, fragmentHref, position, lastNonInlineScriptPromise) {
            var tagUid = tag.src;
            var inline = !tagUid;
            if (inline) {
                tagUid = fragmentHref + '  script[' + position + ']';
            }
            tagUid = tagUid.toLowerCase();
            tag.parentNode.removeChild(tag);
            if (!scriptRecord[tagUid]) {
                var newScript = document.createElement('script');
                var promise;
                scriptRecord[tagUid] = true;
                newScript.setAttribute('type', tag.type || 'text/javascript');
                newScript.setAttribute('async', 'false');
                if (tag.id) {
                    newScript.setAttribute('id', tag.id);
                }
                if (inline) {
                    var text = tag.text;
                    promise = lastNonInlineScriptPromise.then(function () {
                        newScript.text = text;
                    }).catch(function (e) {
                        // console.warn('脚本加载错误:', e);
                    });
                    newScript.setAttribute('__', tagUid);
                }
                else {
                    promise = new drunk.Promise(function (resolve) {
                        newScript.onload = newScript.onerror = function () {
                            resolve();
                        };
                        newScript.setAttribute('src', tag.src);
                    });
                }
                document.head.appendChild(newScript);
                return {
                    promise: promise,
                    inline: inline
                };
            }
        }
        var initialized = false;
        /**
         * 标记已经存在于页面上的脚本和样式
         */
        function initialize() {
            if (initialized) {
                return;
            }
            drunk.util.toArray(document.getElementsByTagName('script')).forEach(function (e) {
                scriptRecord[e.src.toLowerCase()] = true;
            });
            drunk.util.toArray(document.querySelectorAll('link[rel="stylesheet"], link[type="text/css"]')).forEach(function (e) {
                linkRecord[e.href.toLowerCase()] = true;
            });
            initialized = true;
        }
    })(Template = drunk.Template || (drunk.Template = {}));
})(drunk || (drunk = {}));
/// <reference path="../viewmodel/viewmodel" />
/// <reference path="../template/loader" />
/// <reference path="../template/compiler" />
/// <reference path="../config/config" />
/// <reference path="../util/dom" />
var drunk;
(function (drunk) {
    var Component = (function (_super) {
        __extends(Component, _super);
        /**
         * 组件类，继承ViewModel类，实现了模板的准备和数据的绑定
         * @param  model  初始化的数据
         */
        function Component(model) {
            _super.call(this, model);
        }
        /**
         * 实例创建时会调用的初始化方法,派生类可覆盖该方法
         */
        Component.prototype.init = function () {
        };
        Object.defineProperty(Component.prototype, "filters", {
            get: function () {
                return this.__filters;
            },
            set: function (newValue) {
                if (this.$filter) {
                    drunk.util.extend(this.$filter, newValue);
                }
                this.__filters = newValue;
            },
            enumerable: true,
            configurable: true
        });
        /**
         * 属性初始化
         * @param  model 数据
         */
        Component.prototype.__init = function (model) {
            var _this = this;
            _super.prototype.__init.call(this, model);
            drunk.util.defineProperty(this, '_isMounted', false);
            if (this.filters) {
                // 如果配置了过滤器
                drunk.util.extend(this.$filter, this.filters);
            }
            if (this.handlers) {
                // 如果配置了事件处理函数
                drunk.util.extend(this, this.handlers);
            }
            if (this.data) {
                Object.keys(this.data).forEach(function (name) {
                    var data = _this.data[name];
                    if (typeof data === 'function') {
                        // 如果是一个函数,直接调用该函数
                        data = data.call(_this);
                    }
                    // 代理该数据字段
                    _this.$proxy(name);
                    // 不论返回的是什么值,使用promise进行处理
                    drunk.Promise.resolve(data).then(function (result) {
                        _this[name] = result;
                    }, function (reason) {
                        console.warn("数据准备失败:", reason);
                    });
                });
            }
            this.init();
            if (this.watchers) {
                // 如果配置了监控器
                Object.keys(this.watchers).forEach(function (expression) {
                    _this.$watch(expression, _this.watchers[expression]);
                });
            }
        };
        /**
         * 处理模板，并返回模板元素
         */
        Component.prototype.$processTemplate = function (templateUrl) {
            function onFailed(reason) {
                console.warn("模板加载失败: " + templateUrl, reason);
            }
            if (typeof templateUrl === 'string') {
                return drunk.Template.renderFragment(templateUrl, null, true).then(function (fragment) { return drunk.util.toArray(fragment.childNodes); }).catch(onFailed);
            }
            if (this.element) {
                return drunk.Promise.resolve(this.element);
            }
            if (typeof this.template === 'string') {
                return drunk.Promise.resolve(drunk.dom.create(this.template));
            }
            templateUrl = this.templateUrl;
            if (typeof templateUrl === 'string') {
                return drunk.Template.renderFragment(templateUrl, null, true).then(function (fragment) { return drunk.util.toArray(fragment.childNodes); }).catch(onFailed);
            }
            throw new Error((this.name || this.constructor.name) + "组件的模板未指定");
        };
        /**
         * 把组件挂载到元素上
         * @param  element         要挂在的节点或节点数组
         * @param  ownerViewModel  父级viewModel实例
         * @param  placeholder     组件占位标签
         */
        Component.prototype.$mount = function (element, ownerViewModel, placeholder) {
            console.assert(!this._isMounted, "该组件已有挂载到", this.element);
            if (Component.getByElement(element)) {
                console.error("$mount(element): 尝试挂载到一个已经挂载过组件实例的元素节点", element);
                return drunk.Promise.reject();
            }
            var res = drunk.Template.compile(element)(this, element, ownerViewModel, placeholder);
            Component.setWeakRef(element, this);
            this.element = element;
            this._isMounted = true;
            return res.promise;
        };
        /**
         * 释放组件
         */
        Component.prototype.$release = function () {
            this.$emit(Component.Event.release, this);
            _super.prototype.$release.call(this);
            if (this._isMounted) {
                Component.removeWeakRef(this.element);
                this._isMounted = false;
            }
            this.element = null;
        };
        return Component;
    })(drunk.ViewModel);
    drunk.Component = Component;
    var Component;
    (function (Component) {
        var weakRefMap = {};
        /**
         * 组件的事件名称
         */
        Component.Event = {
            created: 'created',
            release: 'release',
            mounted: 'mounted'
        };
        /**
         * 获取挂在在元素上的viewModel实例
         * @param   element 元素
         * @return  Component实例
         */
        function getByElement(element) {
            var uid = drunk.util.uuid(element);
            return weakRefMap[uid];
        }
        Component.getByElement = getByElement;
        /**
         * 设置element与viewModel的引用
         * @param   element    元素
         * @param   component  组件实例
         */
        function setWeakRef(element, component) {
            var uid = drunk.util.uuid(element);
            if (weakRefMap[uid] !== undefined && weakRefMap[uid] !== component) {
                console.error(element, '元素尝试挂载到不同的组件实例');
            }
            else {
                weakRefMap[uid] = component;
            }
        }
        Component.setWeakRef = setWeakRef;
        /**
         * 移除挂载引用
         * @param  element  元素
         */
        function removeWeakRef(element) {
            var uid = drunk.util.uuid(element);
            if (weakRefMap[uid]) {
                delete weakRefMap[uid];
            }
        }
        Component.removeWeakRef = removeWeakRef;
        /**
         * 定义的组件记录
         */
        var definedComponentMap = {};
        /**
         * 根据组件名字获取组件构造函数
         * @param  name  组件名
         * @return  组件类的构造函数
         */
        function getByName(name) {
            return definedComponentMap[name];
        }
        Component.getByName = getByName;
        function define() {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i - 0] = arguments[_i];
            }
            var members;
            if (args.length === 2) {
                members = args[1];
                members.name = args[0];
            }
            else {
                members = args[0];
            }
            return Component.extend(members);
        }
        Component.define = define;
        function extend(name, members) {
            if (arguments.length === 1 && drunk.util.isObject(name)) {
                members = arguments[0];
                name = members.name;
            }
            else {
                members.name = arguments[0];
            }
            var _super = this;
            var prototype = Object.create(_super.prototype);
            var component = function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i - 0] = arguments[_i];
                }
                _super.apply(this, args);
            };
            drunk.util.extend(prototype, members);
            component.prototype = prototype;
            prototype.constructor = component;
            if (name) {
                Component.register(name, component);
            }
            else {
                component.extend = Component.extend;
            }
            return component;
        }
        Component.extend = extend;
        /**
         * 把一个继承了drunk.Component的组件类根据组件名字注册到组件系统中
         * @param  name          组件名
         * @param  componentCtor 组件类
         */
        function register(name, componentCtor) {
            console.assert(name.indexOf('-') > -1, name, '组件明必须在中间带"-"字符,如"custom-view"');
            if (definedComponentMap[name] != null) {
                console.warn('组件 "' + name + '" 已被覆盖,请确认该操作');
            }
            componentCtor.extend = Component.extend;
            definedComponentMap[name] = componentCtor;
            addHiddenStyleForComponent(name);
        }
        Component.register = register;
        var record = {};
        var styleSheet;
        /**
         * 设置样式
         * @param  name  组件名
         */
        function addHiddenStyleForComponent(name) {
            if (record[name]) {
                return;
            }
            if (!styleSheet) {
                var styleElement = document.createElement('style');
                document.head.appendChild(styleElement);
                styleSheet = styleElement.sheet;
            }
            styleSheet.insertRule(name + '{display:none}', styleSheet.cssRules.length);
        }
        // 注册内置的组件标签
        register(drunk.config.prefix + 'view', Component);
    })(Component = drunk.Component || (drunk.Component = {}));
})(drunk || (drunk = {}));
/// <reference path="../binding" />
/// <reference path="../../template/compiler" />
/// <reference path="../../util/dom" />
/// <reference path="../../config/config" />
var drunk;
(function (drunk) {
    var reg = {
        semic: /\s*;\s*/,
        statement: /(\w+):\s*(.+)/,
        breakword: /\n+/g
    };
    drunk.Binding.register("on", {
        init: function () {
            var _this = this;
            this._events = this.expression.replace(reg.breakword, ' ').split(reg.semic).map(function (str) { return _this._parseEvent(str); });
        },
        _parseEvent: function (str) {
            var _this = this;
            var matches = str.match(reg.statement);
            var prefix = drunk.config.prefix;
            console.assert(matches !== null, "非法的 " + prefix + 'on 绑定表达式, ', str, '正确的用法如下:\n', prefix + 'on="click: expression"\n', prefix + 'on="mousedown: expression; mouseup: callback()"\n', prefix + 'on="click: callback($event, $el)"\n');
            var type = matches[1];
            var expr = matches[2];
            var func = drunk.parser.parse(expr.trim());
            var handler = function (e) {
                if (drunk.config.debug) {
                    console.log(type + ': ' + expr);
                }
                func.call(null, _this.viewModel, e, _this.element);
            };
            drunk.dom.on(this.element, type, handler);
            return { type: type, handler: handler };
        },
        release: function () {
            var _this = this;
            this._events.forEach(function (event) {
                drunk.dom.off(_this.element, event.type, event.handler);
            });
            this._events = null;
        }
    });
})(drunk || (drunk = {}));
/// <reference path="../binding" />
/// <reference path="../../util/util" />
drunk.Binding.register('attr', {
    // attrName: null,
    update: function (newValue) {
        var _this = this;
        if (this.attrName) {
            // 如果有提供指定的属性名
            this._setAttribute(this.attrName, newValue);
        }
        else if (drunk.util.isObject(newValue)) {
            Object.keys(newValue).forEach(function (name) {
                _this._setAttribute(name, newValue[name]);
            });
        }
    },
    _setAttribute: function (name, value) {
        if (name === 'src' || name === 'href') {
            value = value == null ? '' : value;
        }
        this.element.setAttribute(name, value);
    }
});
/// <reference path="../binding" />
/// <reference path="../../util/dom" />
drunk.Binding.register("bind", {
    update: function (newValue) {
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
                    drunk.dom.html(el, newValue);
            }
        }
    }
});
/// <reference path="../binding" />
/// <reference path="../../util/dom" />
drunk.Binding.register("class", {
    _oldValue: null,
    update: function (data) {
        var elem = this.element;
        if (Array.isArray(data)) {
            var classMap = {};
            var oldValue = this._oldValue;
            if (oldValue) {
                oldValue.forEach(function (name) {
                    if (data.indexOf(name) === -1) {
                        drunk.dom.removeClass(elem, name);
                    }
                    else {
                        classMap[name] = true;
                    }
                });
            }
            data.forEach(function (name) {
                if (!classMap[name]) {
                    drunk.dom.addClass(elem, name);
                }
            });
            this._oldValue = data;
        }
        else if (data && typeof data === 'object') {
            Object.keys(data).forEach(function (name) {
                if (data[name]) {
                    drunk.dom.addClass(elem, name);
                }
                else {
                    drunk.dom.removeClass(elem, name);
                }
            });
        }
        else if (typeof data === 'string' && (data = data.trim()) !== this._oldValue) {
            if (this._oldValue) {
                drunk.dom.removeClass(elem, this._oldValue);
            }
            this._oldValue = data;
            if (data) {
                drunk.dom.addClass(elem, data);
            }
        }
    },
    release: function () {
        this._oldValue = null;
    }
});
/// <reference path="../binding" />
/// <reference path="../../util/dom" />
/// <reference path="../../component/component" />
/// <reference path="../../template/compiler" />
/// <reference path="../../scheduler/scheduler" />
/// <reference path="../../map/map" />
var drunk;
(function (drunk) {
    /**
     * 用于repeat作用域下的子viewModel
     * @param _parent     父级ViewModel
     * @param ownModel    私有的数据
     */
    var RepeatItem = (function (_super) {
        __extends(RepeatItem, _super);
        function RepeatItem(_parent, ownModel) {
            _super.call(this, ownModel);
            this._parent = _parent;
            this.__inheritParentMembers();
        }
        /**
         * 这里只初始化私有model
         */
        RepeatItem.prototype.__init = function (ownModel) {
            this.__proxyModel(ownModel);
            drunk.observable.create(ownModel);
        };
        /**
         * 继承父级viewModel的filter和私有model
         */
        RepeatItem.prototype.__inheritParentMembers = function () {
            var _this = this;
            var parent = this._parent;
            var models = parent._models;
            _super.prototype.__init.call(this, parent._model);
            this.$filter = parent.$filter;
            if (models) {
                models.forEach(function (model) {
                    _this.__proxyModel(model);
                });
            }
        };
        /**
         * 代理指定model上的所有属性
         */
        RepeatItem.prototype.__proxyModel = function (model) {
            var _this = this;
            Object.keys(model).forEach(function (property) {
                drunk.util.proxy(_this, property, model);
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
            if (drunk.util.proxy(this, property, this._model)) {
                this._parent.$proxy(property);
            }
        };
        /**
         * 重写获取事件处理方法,忘父级查找该方法
         */
        RepeatItem.prototype.__getHandler = function (handlerName) {
            var context = this;
            var handler = this[handlerName];
            while (!handler && context._parent) {
                context = context._parent;
                handler = context[handlerName];
            }
            if (!handler) {
                if (typeof window[handlerName] !== 'function') {
                    throw new Error("Handler not found: " + handlerName);
                }
                handler = window[handlerName];
                context = window;
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
            this._flagNode = null;
            this._element = null;
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
            else if (drunk.util.isObject(target)) {
                var idx = 0;
                var key;
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
    })(drunk.Component);
    drunk.RepeatItem = RepeatItem;
    var regParam = /\s+in\s+/;
    var regComma = /\s*,\s*/;
    function invalidExpression(expression) {
        throw new TypeError('错误的' + drunk.config.prefix + 'repeat表达式: ' + expression);
    }
    /**
     * drunk-repeat的绑定实现类
     */
    var RepeatBinding = (function () {
        function RepeatBinding() {
        }
        /**
         * 初始化绑定
         */
        RepeatBinding.prototype.init = function () {
            this._createCommentNodes();
            this._parseDefinition();
            this._map = new drunk.Map();
            this._items = [];
            this._bind = drunk.Template.compile(this.element);
        };
        /**
         * 创建注释标记标签
         */
        RepeatBinding.prototype._createCommentNodes = function () {
            this._flagNodeContent = "[repeat-item]" + this.expression;
            this._startNode = document.createComment('[start]repeat: ' + this.expression);
            this._endedNode = document.createComment('[ended]repeat: ' + this.expression);
            drunk.dom.before(this._startNode, this.element);
            drunk.dom.replace(this._endedNode, this.element);
        };
        /**
         * 解析表达式定义
         */
        RepeatBinding.prototype._parseDefinition = function () {
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
                this._unrealizeUnusedItems();
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
            var job;
            var next = function (node) {
                placeholder = node.nextSibling;
                while (placeholder && placeholder !== _this._endedNode &&
                    (placeholder.nodeType !== 8 || placeholder.textContent != _this._flagNodeContent)) {
                    placeholder = placeholder.nextSibling;
                }
            };
            return new drunk.Promise(function (resolve, reject) {
                var promiseList = [];
                var renderItems = function (jobInfo) {
                    if (!_this._isActived) {
                        return resolve('该repeat绑定已被销毁');
                    }
                    var viewModel;
                    // 100ms作为当前线程跑的时长，超过该时间则让出线程
                    var endTime = Date.now() + 100;
                    while (index < length) {
                        viewModel = _this._itemVms[index++];
                        if (viewModel._flagNode !== placeholder) {
                            // 判断占位节点是否是当前item的节点，不是则换位
                            drunk.dom.before(viewModel._flagNode, placeholder);
                            if (!viewModel._isBinded) {
                                // 创建节点和生成绑定
                                viewModel.element = viewModel._element = _this.element.cloneNode(true);
                                drunk.dom.after(viewModel._element, viewModel._flagNode);
                                promiseList.push(_this._bind(viewModel, viewModel.element).promise);
                                viewModel._isBinded = true;
                            }
                            else {
                                drunk.dom.after(viewModel._element, viewModel._flagNode);
                            }
                            if (Date.now() >= endTime && index < length) {
                                // 如果创建节点达到了一定时间，让出线程给ui线程
                                return jobInfo.setPromise(drunk.Promise.resolve(renderItems));
                            }
                        }
                        else {
                            next(placeholder);
                        }
                    }
                    resolve(promiseList);
                    job = null;
                    promiseList = null;
                    _this._cancelRenderJob = null;
                };
                next(_this._startNode);
                job = drunk.Scheduler.schedule(renderItems, drunk.Scheduler.Priority.aboveNormal);
                _this._cancelRenderJob = function () {
                    job.cancel();
                    resolve('repeat-item渲染中断');
                    _this._cancelRenderJob = null;
                    job = null;
                    promiseList = null;
                };
            });
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
                viewModel = this._realizeRepeatItem(item);
            }
            return viewModel;
        };
        /**
         * 根据item信息对象创建RepeatItem实例
         */
        RepeatBinding.prototype._realizeRepeatItem = function (item) {
            var value = item.val;
            var options = {};
            this._updateItemModel(options, item);
            var viewModel = new RepeatItem(this.viewModel, options);
            var viewModelList = this._map.get(value);
            viewModel._flagNode = document.createComment(this._flagNodeContent);
            // viewModel._placeholder = this._placeholderNode.cloneNode(true);
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
        RepeatBinding.prototype._unrealizeUnusedItems = function (force) {
            var _this = this;
            var nameOfVal = this._param.val;
            this._itemVms.forEach(function (viewModel, index) {
                if (viewModel._isUsed && !force) {
                    return;
                }
                var value = viewModel[nameOfVal];
                var viewModelList = _this._map.get(value);
                drunk.util.removeArrayItem(viewModelList, viewModel);
                if (!viewModelList.length) {
                    _this._map.delete(value);
                }
                var element = viewModel._element;
                var placeholder = viewModel._flagNode;
                placeholder.textContent = 'Unused repeat item';
                viewModel.$release();
                if (placeholder.parentNode) {
                    placeholder.parentNode.removeChild(placeholder);
                }
                if (element) {
                    drunk.dom.remove(element);
                }
            });
        };
        /**
         * 释放该Binding实例
         */
        RepeatBinding.prototype.release = function () {
            if (this._itemVms && this._itemVms.length) {
                this._unrealizeUnusedItems(true);
            }
            if (this._cancelRenderJob) {
                this._cancelRenderJob();
            }
            drunk.dom.remove(this._startNode);
            drunk.dom.remove(this._endedNode);
            this._map.clear();
            this._map = null;
            this._items = null;
            this._itemVms = null;
            this._bind = null;
            this._startNode = null;
            this._endedNode = null;
        };
        return RepeatBinding;
    })();
    ;
    RepeatBinding.prototype.isTerminal = true;
    RepeatBinding.prototype.priority = drunk.Binding.Priority.aboveNormal + 1;
    drunk.Binding.register("repeat", RepeatBinding.prototype);
})(drunk || (drunk = {}));
/// <reference path="../binding" />
/// <reference path="../../component/component" />
/// <reference path="../../util/dom" />
/// <reference path="./repeat" />
/// <reference path="../../template/fragment" />
var drunk;
(function (drunk) {
    var reOneInterpolate = /^\{\{([^{]+)\}\}$/;
    var ComponentBinding = (function () {
        function ComponentBinding() {
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
            var Ctor = drunk.Component.getByName(this.expression);
            if (!Ctor) {
                throw new Error(this.expression + ": 未找到该组件.");
            }
            this.component = new Ctor();
            this.unwatches = [];
            this._processComponentAttributes();
            return this._processComponentBinding();
        };
        /**
         * 初始化异步组件,先加载为fragment,再设置为组件的element,在进行初始化
         */
        ComponentBinding.prototype._initAsyncComponent = function (src) {
            var _this = this;
            return drunk.Template.renderFragment(src, null, true).then(function (fragment) {
                var Ctor = drunk.Component.getByName(_this.expression);
                if (!Ctor) {
                    throw new Error(_this.expression + ": 未找到该组件.");
                }
                _this.unwatches = [];
                _this.component = new Ctor();
                _this.component.element = drunk.util.toArray(fragment.childNodes);
                _this._processComponentAttributes();
                return _this._processComponentBinding();
            });
        };
        /**
         * 获取双向绑定的属性名
         */
        ComponentBinding.prototype._getTwowayBindingAttrMap = function () {
            var result = this.element.getAttribute('two-way');
            var marked = {};
            this.element.removeAttribute('two-way');
            if (result) {
                result.trim().split(/\s+/).forEach(function (str) {
                    marked[drunk.util.camelCase(str)] = true;
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
            var twowayBindingAttrMap = this._getTwowayBindingAttrMap();
            if (element.hasAttributes()) {
                // 遍历元素上所有的属性做数据准备或数据绑定的处理
                // 如果某个属性用到插值表达式,如"a={{b}}",则对起进行表达式监听(当b改变时通知component的a属性更新到最新的值)
                drunk.util.toArray(element.attributes).forEach(function (attr) {
                    var attrName = attr.name;
                    var attrValue = attr.value;
                    if (attrName.indexOf(drunk.config.prefix) > -1) {
                        return console.warn("\u81EA\u5B9A\u4E49\u7EC4\u4EF6\u6807\u7B7E\u4E0A\u4E0D\u652F\u6301\u4F7F\u7528\"" + attrName + "\"\u7ED1\u5B9A\u8BED\u6CD5");
                    }
                    if (!attrValue) {
                        component[drunk.util.camelCase(attrName)] = true;
                        return;
                    }
                    var expression = attrValue.trim();
                    if (attrName.indexOf("on-") === 0) {
                        // on-click="doSomething()"
                        // => "click", "doSomething()"
                        attrName = drunk.util.camelCase(attrName.slice(3));
                        return _this._registerComponentEvent(attrName, expression);
                    }
                    attrName = drunk.util.camelCase(attrName);
                    if (!drunk.parser.hasInterpolation(expression)) {
                        // 没有插值表达式
                        // title="someConstantValue"
                        var value;
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
                    _this._watchExpressionForComponent(attrName, expression, twowayBindingAttrMap[attrName]);
                });
            }
            component.$emit(drunk.Component.Event.created, component);
        };
        /**
         * 处理组件的视图与数据绑定
         */
        ComponentBinding.prototype._processComponentBinding = function () {
            var _this = this;
            var element = this.element;
            var component = this.component;
            var viewModel = this.viewModel;
            return component.$processTemplate().then(function (template) {
                if (_this.isDisposed) {
                    return;
                }
                var startNode = _this._startNode = document.createComment("[start]component: " + _this.expression);
                var endedNode = _this._endedNode = document.createComment("[ended]component: " + _this.expression);
                drunk.dom.replace(startNode, element);
                drunk.dom.after(endedNode, startNode);
                drunk.dom.after(template, startNode);
                var promise = component.$mount(template, viewModel, element);
                var nodeList = [startNode];
                var currNode = startNode.nextSibling;
                while (currNode && currNode !== endedNode) {
                    nodeList.push(currNode);
                    currNode = currNode.nextSibling;
                }
                nodeList.push(endedNode);
                if (viewModel instanceof drunk.RepeatItem) {
                    if (viewModel._element === element) {
                        viewModel._element = nodeList;
                    }
                }
                return promise;
            }).catch(function (error) {
                console.warn(_this.expression + ": \u7EC4\u4EF6\u521B\u5EFA\u5931\u8D25\n", error);
            });
        };
        /**
         * 注册组件的事件
         */
        ComponentBinding.prototype._registerComponentEvent = function (eventName, expression) {
            var _this = this;
            var viewModel = this.viewModel;
            var func = drunk.parser.parse(expression);
            this.component.$addListener(eventName, function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i - 0] = arguments[_i];
                }
                // 事件的处理函数,会生成一个$event对象,在表达式中可以访问该对象.
                // $event对象有type和args两个字段,args字段是组件派发这个事件所传递的参数的列表
                // $el字段为该组件实例
                func.call(undefined, viewModel, {
                    type: eventName,
                    args: args
                }, _this.component);
            });
        };
        /**
         * 监控绑定表达式,表达式里任意数据更新时,同步到component的指定属性
         */
        ComponentBinding.prototype._watchExpressionForComponent = function (property, expression, isTwoway) {
            var viewModel = this.viewModel;
            var component = this.component;
            var unwatch;
            if (isTwoway) {
                var result = expression.match(reOneInterpolate);
                if (!result) {
                    throw new Error(expression + ': 该表达式不能进行双向绑定');
                }
                var ownerProperty = result[1].trim();
                unwatch = component.$watch(property, function (newValue, oldValue) {
                    var currValue = viewModel.$eval(expression, true);
                    if (newValue === currValue) {
                        return;
                    }
                    viewModel.$setValue(ownerProperty, newValue);
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
            if (this.component) {
                var component = this.component;
                var element = component.element;
                component.$release();
                if (element) {
                    drunk.dom.remove(element);
                }
            }
            if (this.unwatches) {
                // 移除所有的属性监控
                this.unwatches.forEach(function (unwatch) { return unwatch(); });
            }
            if (this._startNode && this._endedNode) {
                drunk.dom.remove(this._startNode);
                drunk.dom.remove(this._endedNode);
            }
            // 移除所有引用
            this._startNode = null;
            this._endedNode = null;
            this.component = null;
            this.unwatches = null;
            this.isDisposed = true;
        };
        return ComponentBinding;
    })();
    ComponentBinding.prototype.isTerminal = true;
    ComponentBinding.prototype.priority = drunk.Binding.Priority.aboveNormal;
    drunk.Binding.register('component', ComponentBinding.prototype);
})(drunk || (drunk = {}));
/// <reference path="../binding" />
/// <reference path="../../util/dom" />
/// <reference path="../../template/compiler" />
drunk.Binding.register("if", {
    isTerminal: true,
    priority: drunk.Binding.Priority.aboveNormal + 2,
    init: function () {
        this._startNode = document.createComment("[start]if: " + this.expression);
        this._endedNode = document.createComment("[ended]if: " + this.expression);
        this._bind = drunk.Template.compile(this.element);
        this._inDocument = false;
        drunk.dom.replace(this._startNode, this.element);
        drunk.dom.after(this._endedNode, this._startNode);
    },
    update: function (value) {
        if (!!value) {
            return this.addToDocument();
        }
        else {
            this.removeFromDocument();
        }
    },
    addToDocument: function () {
        if (this._inDocument) {
            return;
        }
        this._tmpElement = this.element.cloneNode(true);
        drunk.dom.after(this._tmpElement, this._startNode);
        var res = this._bind(this.viewModel, this._tmpElement);
        this._unbind = res.unbind;
        this._inDocument = true;
        return res.promise;
    },
    removeFromDocument: function () {
        if (!this._inDocument || !this._unbind) {
            return;
        }
        this._unbind();
        drunk.dom.remove(this._tmpElement);
        this._unbind = null;
        this._tmpElement = null;
        this._inDocument = false;
    },
    release: function () {
        this.removeFromDocument();
        this._startNode.parentNode.removeChild(this._startNode);
        this._endedNode.parentNode.removeChild(this._endedNode);
        this._startNode = null;
        this._endedNode = null;
        this._bind = null;
    }
});
/// <reference path="../binding" />
/// <reference path="../../template/loader" />
/// <reference path="../../template/compiler" />
/// <reference path="../../config/config" />
/// <reference path="../../promise/promise" />
drunk.Binding.register("include", {
    _unbind: null,
    _url: null,
    _elements: null,
    update: function (url) {
        if (!this._isActived || (url && url === this._url)) {
            return;
        }
        this._url = url;
        var promiseList = [];
        if (this._elements) {
            promiseList.push(drunk.dom.remove(this._elements).then(this._removeBind.bind(this)));
        }
        if (url) {
            promiseList.push(drunk.Template.renderFragment(url, null, true).then(this._createBinding.bind(this)));
        }
        if (promiseList.length) {
            return drunk.Promise.all(promiseList);
        }
    },
    _createBinding: function (fragment) {
        var _this = this;
        this._elements = drunk.util.toArray(fragment.childNodes);
        this._elements.forEach(function (el) { return _this.element.appendChild(el); });
        var result = drunk.Template.compile(this._elements)(this.viewModel, this._elements);
        this._unbind = result.unbind;
        return result.promise;
    },
    _removeBind: function () {
        if (this._unbind) {
            this._unbind();
            this._unbind = null;
        }
        this._elements = null;
    },
    release: function () {
        this._unbind();
        this._url = null;
    }
});
/// <reference path="../binding" />
/// <reference path="../../util/dom" />
var drunk;
(function (drunk) {
    drunk.Binding.register("model", {
        init: function () {
            var tag = this.element.tagName.toLowerCase();
            switch (tag) {
                case "input":
                    this.initInput();
                    break;
                case "select":
                    this.initSelect();
                    break;
                case "textarea":
                    this.initTextarea();
                    break;
            }
            this._changedHandler = this._changedHandler.bind(this);
            drunk.dom.on(this.element, this._changedEvent, this._changedHandler);
        },
        initInput: function () {
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
                case "email":
                case "password":
                case "search":
                    this.initTextarea();
                    break;
                default:
                    this.initCommon();
            }
        },
        initCheckbox: function () {
            this._changedEvent = "change";
            this._updateView = setCheckboxValue;
            this._getValue = getCheckboxValue;
        },
        initRadio: function () {
            this._changedEvent = "change";
            this._updateView = setRadioValue;
            this._getValue = getCommonValue;
        },
        initSelect: function () {
            this._changedEvent = "change";
            this._updateView = setCommonValue;
            this._getValue = getCommonValue;
        },
        initTextarea: function () {
            this._changedEvent = "input";
            this._updateView = setCommonValue;
            this._getValue = getCommonValue;
        },
        initCommon: function () {
            this._changedEvent = "change";
            this._updateView = setCommonValue;
            this._getValue = getCommonValue;
        },
        update: function (value) {
            this._updateView(value);
        },
        release: function () {
            drunk.dom.off(this.element, this._changedEvent, this._changedHandler);
        },
        _changedHandler: function () {
            this.setValue(this._getValue(), true);
        }
    });
    function setCheckboxValue(newValue) {
        this.element.checked = !!newValue;
    }
    function getCheckboxValue() {
        return !!this.element.checked;
    }
    function setRadioValue(newValue) {
        this.element.checked = this.element.value == newValue;
    }
    function setCommonValue(newValue) {
        newValue = newValue == null ? '' : newValue;
        this.element.value = newValue;
    }
    function getCommonValue() {
        return this.element.value;
    }
})(drunk || (drunk = {}));
/// <reference path="../binding" />
drunk.Binding.register("show", {
    update: function (isVisible) {
        var style = this.element.style;
        if (!isVisible && style.display !== 'none') {
            style.display = 'none';
        }
        else if (isVisible && style.display === 'none') {
            style.display = '';
        }
    }
});
/// <reference path="../binding" />
/// <reference path="../../component/component" />
/// <reference path="../../util/dom" />
/// <reference path="../../template/compiler" />
/// <reference path="../../promise/promise" />
drunk.Binding.register("transclude", {
    /**
     * 初始化绑定,先注册transcludeResponse事件用于获取transclude的viewModel和nodelist
     * 然后发送getTranscludeContext事件通知
     */
    init: function (ownerViewModel, placeholder) {
        if (!ownerViewModel || !placeholder) {
            throw new Error('未提供父级component实例和组件声明的占位标签');
        }
        var nodes = [];
        var unbinds = [];
        var promiseList = [];
        var transclude = placeholder.childNodes;
        var fragment = document.createDocumentFragment();
        drunk.util.toArray(transclude).forEach(function (node) {
            nodes.push(node);
            fragment.appendChild(node);
        });
        // 换掉节点
        drunk.dom.replace(fragment, this.element);
        nodes.forEach(function (node) {
            // 编译模板并获取绑定创建函数
            // 保存解绑函数
            var bind = drunk.Template.compile(node);
            var result = bind(ownerViewModel, node);
            unbinds.push(result.unbind);
            promiseList.push(result.promise);
        });
        this._nodes = nodes;
        this._unbinds = unbinds;
        if (promiseList.length) {
            return drunk.Promise.all(promiseList);
        }
    },
    /**
     * 释放绑定
     */
    release: function () {
        this._unbinds.forEach(function (unbind) { return unbind(); });
        this._nodes.forEach(function (node) { return drunk.dom.remove(node); });
        this._unbinds = null;
        this._nodes = null;
    }
});
//# sourceMappingURL=drunk.js.map