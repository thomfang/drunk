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
    var Promise = (function () {
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
                for (var i = 0, thenable; i < len; i++) {
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
 *
 * @module drunk.config
 * @class config
 */
var drunk;
(function (drunk) {
    var config;
    (function (config) {
        /**
         * 绑定指令的前缀
         *
         * @property prefix
         * @type string
         */
        config.prefix = "drunk-";
        /**
         * debug模式配置变量
         *
         * @property debug
         * @type boolean
         */
        config.debug = true;
    })(config = drunk.config || (drunk.config = {}));
})(drunk || (drunk = {}));
var drunk;
(function (drunk) {
    var cacheList = [];
    /**
     * 简单缓存类,提供简单的设置获取移除和清空功能
     * @module drunk.cache
     * @class Cache
     */
    var Cache = (function () {
        function Cache() {
            /**
             * 存储中心
             * @property _store
             * @private
             * @type object
             */
            this._store = {};
            cacheList.push(this);
        }
        /**
         * 清空所有缓存实例
         * @method cleanup
         * @static
         */
        Cache.cleanup = function () {
            cacheList.forEach(function (cache) { return cache.cleanup(); });
        };
        /**
         * 根据key获取缓存的值
         * @method get
         * @param  {string}  key  要获取的字段
         * @return {T}
         */
        Cache.prototype.get = function (key) {
            return this._store[key];
        };
        /**
         * 根据key和value设置缓存
         * @method  set
         * @param  {string}  key   要缓存的字段
         * @param  {any}     value 要缓存的值
         */
        Cache.prototype.set = function (key, value) {
            this._store[key] = value;
        };
        /**
         * 移除对应字段的缓存
         * @method remove
         * @param  {string}  key  要移除的字段
         */
        Cache.prototype.remove = function (key) {
            delete this._store[key];
        };
        /**
         * 清空该实例下所有的缓存
         * @method cleanup
         */
        Cache.prototype.cleanup = function () {
            var _this = this;
            Object.keys(this._store).forEach(function (key) {
                delete _this._store[key];
            });
        };
        return Cache;
    })();
    drunk.Cache = Cache;
})(drunk || (drunk = {}));
/// <reference path="../promise/promise.ts" />
/**
 * 工具方法模块
 *
 * @module drunk.util
 * @class util
 * @main
 */
var drunk;
(function (drunk) {
    var util;
    (function (util) {
        var nameOfUid = '__DRUNK_UUID__';
        var counter = 0;
        /**
         * 获取对象的为一id
         * @method uuid
         * @static
         * @param  {any}     target  设置的对象
         * @return {number}
         */
        function uuid(target) {
            if (typeof target[nameOfUid] === undefined) {
                target[nameOfUid] = counter++;
            }
            return target[nameOfUid];
        }
        util.uuid = uuid;
        /**
         * 判断是否是对象
         *
         * @static
         * @method isObject
         * @param  {any}        target 判断目标
         * @return {boolean}           返回结果
         */
        function isObject(target) {
            return Object.prototype.toString.call(target) === '[object Object]';
        }
        util.isObject = isObject;
        /**
         * 拓展对象
         *
         * @static
         * @method extend
         * @param  {object}  destination  目标对象
         * @param  {object}  ...sources   不定长参数，源对象的集合
         * @return {object}               返回输入的目标对象
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
         * @method deepClone
         * @static
         * @param  {any}  target  需要拷贝的对象
         * @return {any}
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
            }
            return target;
        }
        util.deepClone = deepClone;
        /**
         * 转换成数组
         *
         * @static
         * @method toArray
         * @param  {array} arrayLike  类似数组的对象
         * @return {array}            转换后的数组
         */
        function toArray(arrayLike) {
            return Array.prototype.slice.call(arrayLike);
        }
        util.toArray = toArray;
        /**
         * 给数组添加item，确保item不重复
         *
         * @static
         * @method addArrayItem
         * @param  {array}  array  数组
         * @param  {any}    item   值
         */
        function addArrayItem(array, item) {
            if (array.indexOf(item) < 0) {
                array.push(item);
            }
        }
        util.addArrayItem = addArrayItem;
        /**
         * 移除数组的指定值
         *
         * @static
         * @method removeArrayItem
         * @param  {array}  array  数组
         * @param  {any}    item   值
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
         * @method camelCase
         * @static
         * @param  {string}  str 字符串
         * @return {string}
         */
        function camelCase(str) {
            return str.replace(/[-_](\w)/g, function ($0, $1) { return $1.toUpperCase(); });
        }
        util.camelCase = camelCase;
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
         * @method proxy
         * @static
         * @param  {Object}  a         对象a
         * @param  {string}  property  属性名
         * @param  {Object}  b         对象b
         * @return {boolean}           如果已经代理过,则不再代理该属性
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
         * 设置函数在下一帧执行
         *
         * @static
         * @method nextTick
         * @param  {function}  callback  回调函数
         * @param  {any}       [sender]  函数执行时要bind的对象
         * @return {number}              返回定时器的id
         */
        function nextTick(callback, sender) {
            if (sender === void 0) { sender = null; }
            return setTimeout(callback.bind(sender), 0);
        }
        util.nextTick = nextTick;
    })(util = drunk.util || (drunk.util = {}));
})(drunk || (drunk = {}));
/// <reference path="../util/util.ts" />
var drunk;
(function (drunk) {
    var eventStore = {};
    function getStore(object) {
        var id = drunk.util.uuid(object);
        if (!eventStore[id]) {
            eventStore[id] = {};
        }
        return eventStore[id];
    }
    /**
     * 事件管理类
     *
     * @class Events
     */
    var Events = (function () {
        function Events() {
        }
        /**
         * 注册事件
         *
         * @method addListener
         * @param  {string}          type       事件类型
         * @param  {IEventListener}   listener   事件回调
         */
        Events.prototype.addListener = function (type, listener) {
            var store = getStore(this);
            if (!store[type]) {
                store[type] = [];
            }
            drunk.util.addArrayItem(store[type], listener);
        };
        /**
         * 移除指定类型的事件监听
         *
         * @method removeListener
         * @param  {string}         type     事件类型
         * @param  {IEventListener}  listener 事件回调
         */
        Events.prototype.removeListener = function (type, listener) {
            var store = getStore(this);
            var listeners = store[type];
            if (!listeners || listeners.length) {
                return;
            }
            drunk.util.removeArrayItem(listeners, listener);
        };
        /**
         * 派发指定类型事件
         *
         * @method dispatchEvent
         * @param  {string}  type       事件类型
         * @param  {any[]}   ...args    其他参数
         */
        Events.prototype.dispatchEvent = function (type) {
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
                listener.apply(void 0, [_this].concat(args));
            });
        };
        /**
         * 获取事件实例的指定事件类型的回调技术
         * @method getListenerCount
         * @static
         * @param  {Events} instance  事件类实例
         * @param  {string} type      事件类型
         * @return {number}
         */
        Events.getListenerCount = function (object, type) {
            var store = getStore(object);
            if (!store[type]) {
                return 0;
            }
            return store[type].length;
        };
        /**
         * 移除对象的所有事件回调引用
         * @method cleanup
         * @static
         * @param  {object}  object  指定对象
         */
        Events.cleanup = function (object) {
            var id = drunk.util.uuid(object);
            eventStore[id] = null;
        };
        ;
        return Events;
    })();
    drunk.Events = Events;
})(drunk || (drunk = {}));
/**
 * DOM操作的工具方法模块
 *
 * @module drunk.elementUtil
 * @main
 * @class ElementUtil
 */
var drunk;
(function (drunk) {
    var elementUtil;
    (function (elementUtil) {
        /**
         * 根据提供的html字符串创建html元素
         * @static
         * @method create
         * @param  {string}  html  html字符串
         * @return {Node|Node[]}          创建好的html元素
         */
        function create(html) {
            var div = document.createElement("div");
            var str = html.trim();
            console.assert(str.length > 0, "HTML是空的");
            div.innerHTML = str;
            return div.childNodes.length === 1 ? div.firstChild : drunk.util.toArray(div.childNodes);
        }
        elementUtil.create = create;
        /**
         * 在旧的元素节点前插入新的元素节点
         * @static
         * @method insertBefore
         * @param  {Node}  newNode  新的节点
         * @param  {Node}  oldNode  旧的节点
         */
        function insertBefore(newNode, oldNode) {
            if (oldNode.parentNode) {
                oldNode.parentNode.insertBefore(newNode, oldNode);
            }
        }
        elementUtil.insertBefore = insertBefore;
        /**
         * 在旧的元素节点后插入新的元素节点
         * @static
         * @method insertAfter
         * @param  {Node}  newNode  新的节点
         * @param  {Node}  oldNode  旧的节点
         */
        function insertAfter(newNode, oldNode) {
            if (oldNode.nextSibling) {
                insertBefore(newNode, oldNode.nextSibling);
            }
            else {
                oldNode.parentNode.appendChild(newNode);
            }
        }
        elementUtil.insertAfter = insertAfter;
        /**
         * 移除元素节点
         * @static
         * @method remove
         * @param  {Node|Node[]}  target  节点
         */
        function remove(target) {
            if (Array.isArray(target)) {
                target.forEach(function (node) {
                    if (node.parentNode) {
                        node.parentNode.removeChild(node);
                    }
                });
            }
            else if (target.parentNode) {
                target.parentNode.removeChild(target);
            }
        }
        elementUtil.remove = remove;
        /**
         * 新的节点替换旧的节点
         * @static
         * @method replace
         * @param  {Node}  newNode  新的节点
         * @param  {Node}  oldNode  旧的节点
         */
        function replace(newNode, oldNode) {
            var parent = oldNode.parentNode;
            if (!parent) {
                return;
            }
            if (Array.isArray(newNode)) {
                newNode.forEach(function (node) {
                    parent.insertBefore(node, oldNode);
                });
                parent.removeChild(oldNode);
            }
            else {
                parent.replaceChild(newNode, oldNode);
            }
        }
        elementUtil.replace = replace;
        /**
         * 为节点注册事件监听
         * @static
         * @method addListener
         * @param  {HTMLElement} element  元素
         * @param  {string}      type     事件名
         * @param  {function}    listener 事件处理函数
         */
        function addListener(element, type, listener) {
            element.addEventListener(type, listener, false);
        }
        elementUtil.addListener = addListener;
        /**
         * 移除节点的事件监听
         * @static
         * @method removeListener
         * @param  {HTMLElement} element  元素
         * @param  {string}      type     事件名
         * @param  {function}    listener 事件处理函数
         */
        function removeListener(element, type, listener) {
            element.removeEventListener(type, listener, false);
        }
        elementUtil.removeListener = removeListener;
        /**
         * 添加样式
         * @static
         * @method addClass
         * @param  {HTMLElement}  element    元素
         * @param  {string}       token      样式名
         */
        function addClass(element, token) {
            var list = token.trim().split(/\s+/);
            list.forEach(function (name) {
                element.classList.add(name);
            });
        }
        elementUtil.addClass = addClass;
        /**
         * 移除样式
         * @static
         * @method removeClass
         * @param  {HTMLElement}  element    元素
         * @param  {string}       token      样式名
         */
        function removeClass(element, token) {
            var list = token.trim().split(/\s+/);
            list.forEach(function (name) {
                element.classList.remove(name);
            });
        }
        elementUtil.removeClass = removeClass;
    })(elementUtil = drunk.elementUtil || (drunk.elementUtil = {}));
})(drunk || (drunk = {}));
/// <reference path="../util/util.ts" />
/// <reference path="../promise/promise.ts" />
/**
 * @module drunk.util
 * @class util
 */
var drunk;
(function (drunk) {
    var util;
    (function (util) {
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
        function ajax(options) {
            var xhr = new XMLHttpRequest();
            return new drunk.Promise(function (resolve, reject) {
                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4) {
                        if (xhr.status >= 200 && xhr.status < 300 || xhr.status === 304) {
                            var res = xhr.responseText;
                            resolve(options.dataType === 'json' ? JSON.parse(res) : res);
                            xhr = null;
                        }
                        else {
                            reject(xhr);
                        }
                    }
                };
                xhr.onerror = function () {
                    reject(xhr);
                };
                xhr.open((options.type || 'GET').toUpperCase(), options.url, true);
                if (options.withCredentials || (options.xhrFields && options.xhrFields.withCredentials)) {
                    xhr.withCredentials = true;
                }
                var headers = options.headers || {};
                var data = options.data;
                var contentType = options.contentType || 'application/x-www-form-urlencoded; charset=UTF-8';
                xhr.setRequestHeader("Content-Type", contentType);
                Object.keys(headers).forEach(function (name) {
                    xhr.setRequestHeader(name, headers[name]);
                });
                if (util.isObject(data)) {
                    if (options.contentType && options.contentType.match(/^json$/i)) {
                        data = JSON.stringify(data);
                    }
                    else {
                        data = [];
                        Object.keys(options.data).forEach(function (key) {
                            data.push(key + '=' + encodeURIComponent(options.data[key]));
                        });
                        data = data.join("&");
                    }
                }
                xhr.send(data);
            });
        }
        util.ajax = ajax;
    })(util = drunk.util || (drunk.util = {}));
})(drunk || (drunk = {}));
/// <reference path="../util/util.ts" />
/// <reference path="./observable.ts" />
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
var drunk;
(function (drunk) {
    var observable;
    (function (observable) {
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
        function setProperty(data, name, value) {
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
        observable.setProperty = setProperty;
        /**
         * 移除对象属性，并会发送更新的消息
         *
         * @static
         * @for observable
         * @method removeProperty
         * @param {ObservableObject}  data  JSON对象或已经为observable的JSON对象
         * @param {string}            name  字段名
         */
        function removeProperty(data, name) {
            if (!data.hasOwnProperty(name)) {
                return;
            }
            delete data[name];
            observable.notify(data);
        }
        observable.removeProperty = removeProperty;
        /**
         * 对象转换成observable后指向的原型对象
         *
         * @property ObservableObjectPrototype
         * @static
         * @for observable
         */
        observable.ObservableObjectPrototype = {};
        /**
         * 设置对象的指定字段的值
         *
         * @for ObservableObject
         * @method setProperty
         * @param  {string}  name  字段名
         * @param  {any}     value 值
         */
        drunk.util.defineProperty(observable.ObservableObjectPrototype, "setProperty", function setObservableObjectProperty(name, value) {
            setProperty(this, name, value);
        });
        /**
         * 删除对象的指定字段的值
         *
         * @for ObservableObject
         * @method removeProperty
         * @param  {string}  name  字段名
         */
        drunk.util.defineProperty(observable.ObservableObjectPrototype, "removeProperty", function removeObservableObjectProperty(name) {
            removeProperty(this, name);
        });
    })(observable = drunk.observable || (drunk.observable = {}));
})(drunk || (drunk = {}));
/// <reference path="../util/util.ts" />
/// <reference path="./observableArray.ts" />
/// <reference path="./observableObject.ts" />
/// <reference path="../events/events" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
/**
 * @module drunk.observable
 */
var drunk;
(function (drunk) {
    var observable;
    (function (observable) {
        /**
         * 监控对象类，为每个需要监控的对象和数组生成一个实例，用于代理监听事件
         * @class Observer
         * @extends Events
         * @constructor
         */
        var Observer = (function (_super) {
            __extends(Observer, _super);
            function Observer() {
                _super.apply(this, arguments);
            }
            /**
             * 添加任意属性改变的回调
             * @method addPropertyChangedCallback
             * @param  {function}  callback
             */
            Observer.prototype.addPropertyChangedCallback = function (callback) {
                if (!this._propertyChangedCallbackList) {
                    this._propertyChangedCallbackList = [];
                }
                drunk.util.addArrayItem(this._propertyChangedCallbackList, callback);
            };
            /**
             * 移除任意属性改变的指定回调
             * @method removePropertyChangedCallback
             * @param  {function}  callback
             */
            Observer.prototype.removePropertyChangedCallback = function (callback) {
                if (!this._propertyChangedCallbackList) {
                    this._propertyChangedCallbackList = [];
                }
                drunk.util.addArrayItem(this._propertyChangedCallbackList, callback);
                if (this._propertyChangedCallbackList.length === 0) {
                    this._propertyChangedCallbackList = null;
                }
            };
            /**
             * 发送任意属性改变的通知
             * @method notify
             */
            Observer.prototype.notify = function () {
                if (!this._propertyChangedCallbackList) {
                    return;
                }
                this._propertyChangedCallbackList.forEach(function (callback) { return callback(); });
            };
            return Observer;
        })(drunk.Events);
        observable.Observer = Observer;
    })(observable = drunk.observable || (drunk.observable = {}));
})(drunk || (drunk = {}));
/// <reference path="../util/util.ts" />
/// <reference path="./observableArray.ts" />
/// <reference path="./observableObject.ts" />
/// <reference path="./observer.ts" />
/**
 * observable模块的工具方法，用于创建可观察的数据，数据绑定等
 *
 * @module drunk.observable
 * @class observable
 * @main
 */
var drunk;
(function (drunk) {
    var observable;
    (function (observable) {
        /**
         * 根据数据返回对应的Observer 实例，如果该数据已经存在对应的 Observer 实例则直接返回，否则创建一个新的实例
         * @static
         * @method create
         * @param {ObservableArray|ObservableObject} data 数组或JSON对象
         * @return {Observer} 返回一个Observer实例
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
         * 访问observableObject的字段时会调用的回调
         * @static
         * @property onAccessingProperty
         * @param {Observer}     observer  返回的当前正在访问的数据的observer对象
         * @param {string}       property  正在访问的数据的字段
         * @param {any}             value  对应字段的数据
         * @param {ObservableObject} data  可观察数据
         */
        observable.onAccessingProperty;
        /**
         * 转换对象属性的getter/setter，使其能在数据更新是能接受到事件
         * @static
         * @method observe
         * @param {ObservableObject} data  	   JSON对象
         * @param {string}           property  JSON对象上的字段
         */
        function observe(data, property, value) {
            var descriptor = Object.getOwnPropertyDescriptor(data, property);
            if (descriptor && descriptor.get === descriptor.set) {
                // 如果已经绑定过了， 则不再绑定
                return;
            }
            var dataOb = create(data);
            var valueOb = create(value);
            Object.defineProperty(data, property, {
                enumerable: true,
                configurable: true,
                get: propertyGetterSetter,
                set: propertyGetterSetter
            });
            if (valueOb) {
                valueOb.addPropertyChangedCallback(propertyChanged);
            }
            // 属性的getter和setter，聚合在一个函数换取空间？
            function propertyGetterSetter() {
                if (arguments.length === 0) {
                    // 如果没有传入任何参数，则为访问，返回值
                    if (observable.onAccessingProperty) {
                        // 调用存在的onPropertyAcess方法
                        observable.onAccessingProperty(dataOb, property, value, data);
                    }
                    return value;
                }
                var newValue = arguments[0];
                // 有传入参数，则是赋值操作
                if (!isNotEqual(newValue, value)) {
                    // 如果值相同，不做任何处理
                    return;
                }
                if (valueOb) {
                    valueOb.addPropertyChangedCallback(propertyChanged);
                }
                value = newValue;
                valueOb = create(newValue);
                if (valueOb) {
                    valueOb.addPropertyChangedCallback(propertyChanged);
                }
                propertyChanged();
            }
            // 假设value是一个数组，当数组添加了一个新的item时，
            // 告知data的observer实例派发property改变的通知
            function propertyChanged() {
                dataOb.dispatchEvent(property);
            }
        }
        observable.observe = observe;
        /**
         * 通知数据的指定属性更新
         * @static
         * @method notify
         * @param {ObservableArray|ObservableObject} data       数据
         * @param {string}  	                     [property] 要通知的字段名，如果该参数不提供，则派发该该数据更新的通知
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
var drunk;
(function (drunk) {
    var observable;
    (function (observable) {
        /**
         * 数组转换成observable后指向的原型对象
         *
         * @property ObservableArrayPrototype
         * @static
         * @for observable
         */
        observable.ObservableArrayPrototype = Object.create(Array.prototype);
        /**
         * 设置数组指定数组下标的值，并发送数组更新通知
         *
         * @static
         * @method setAt
         * @param {array}  array   observableArray类型的数组
         * @param {number} index   要设置的数组下标
         * @param {any}    value   要设置的值
         */
        function setAt(array, index, value) {
            if (index > array.length) {
                array.length = index + 1;
            }
            array.splice(index, 1, value);
        }
        observable.setAt = setAt;
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
        function removeAt(array, index) {
            var result;
            if (index > -1 && index < array.length) {
                result = Array.prototype.splice.call(array, index, 1)[0];
                observable.notify(array);
            }
            return result;
        }
        observable.removeAt = removeAt;
        /**
         * 删除数组中出现的一个指定值，并发送数组更新通知
         *
         * @static
         * @for observable
         * @method removeItem
         * @param {array} array  observableArray类型的数组
         * @param {any}   value  要移除的值
         */
        function removeItem(array, value) {
            drunk.util.removeArrayItem(array, value);
        }
        observable.removeItem = removeItem;
        /**
         * 删除数组中所有的指定值，并发送数组更新通知
         *
         * @static
         * @for observable
         * @method removeAllItem
         * @param {array} array  observableArray类型的数组
         * @param {any}   value  要移除的值
         */
        function removeAllItem(array, value) {
            var index = array.indexOf(value);
            var removed = false;
            while (index > -1) {
                Array.prototype.splice.call(array, index, 1);
                index = array.indexOf(value);
                removed = true;
            }
            if (removed) {
                observable.notify(array);
            }
        }
        observable.removeAllItem = removeAllItem;
        /**
         * 根据下标设置数组的值，并发送数据更新的通知
         *
         * @for ObservableArray
         * @method setAt
         * @param  {number}  index  数组下标
         * @param  {any}     value  要设置的值
         */
        drunk.util.defineProperty(observable.ObservableArrayPrototype, "setAt", function setObservableArrayItem(index, value) {
            setAt(this, index, value);
        });
        /**
         * 根据下标移除数组的值，并发送数据更新的通知
         *
         * @for ObservableArray
         * @method removeAt
         * @param  {number}  index  数组下标
         */
        drunk.util.defineProperty(observable.ObservableArrayPrototype, "removeAt", function removeObservalbeArrayByIndex(index) {
            return removeAt(this, index);
        });
        /**
         * 移除指定的值，并发送数据更新的通知
         *
         * @for ObservableArray
         * @method removeItem
         * @param  {any}  value  指定值
         */
        drunk.util.defineProperty(observable.ObservableArrayPrototype, "removeItem", function removeObservableArrayItem(value) {
            return removeItem(this, value);
        });
        /**
         * 移除数组中所有指定的值，并发送数据更新的通知
         *
         * @for ObservableArray
         * @method removeAllItem
         * @param  {any}  value  指定值
         */
        drunk.util.defineProperty(observable.ObservableArrayPrototype, "removeAllItem", function removeAllObservableArrayItem(value) {
            return removeAllItem(this, value);
        });
        /*
         * 调用原生方法并发送通知
         */
        function executeArrayMethodAndNotify(array, methodName, args, callback) {
            var result = (_a = Array.prototype)[methodName].apply(_a, [array].concat(args));
            if (callback) {
                callback();
            }
            observable.notify(array);
            return result;
            var _a;
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
        function Watcher(viewModel, expression, isDeepWatch) {
            this.viewModel = viewModel;
            this.expression = expression;
            this.isDeepWatch = isDeepWatch;
            this._actions = [];
            this._observers = {};
            this._properties = {};
            /**
             * 是否还是个活动的watcher
             * @property _isActived
             * @private
             * @type boolean
             */
            this._isActived = true;
            this._isInterpolate = drunk.parser.hasInterpolation(expression);
            this._getter = this._isInterpolate ? drunk.parser.parseInterpolate(expression) : drunk.parser.parseGetter(expression);
            if (!this._getter.dynamic) {
                throw new Error('不能监控一个静态表达式:"' + expression + '"');
            }
            this.__propertyChanged = this.__propertyChanged.bind(this);
        }
        /**
         * 根据表达式和是否深度监听生成唯一的key,用于储存在关联的viewModel实例的watcher表中
         * @method getNameOfKey
         * @static
         * @param  {string}   expression  表达式
         * @param  {boolean}  isDeepWatch 是否深度监听
         * @return {string}   返回一个生成的key
         */
        Watcher.getNameOfKey = function (expression, isDeepWatch) {
            return !!isDeepWatch ? expression + '<deep>' : expression;
        };
        /**
         * 添加数据更新回调
         * @method addAction
         * @param {function} action  回调函数
         */
        Watcher.prototype.addAction = function (action) {
            drunk.util.addArrayItem(this._actions, action);
        };
        /**
         * 移除数据更新回调
         *
         * @method removeAction
         * @param  {function} action 回调函数
         */
        Watcher.prototype.removeAction = function (action) {
            drunk.util.removeArrayItem(this._actions, action);
            if (!this._actions.length) {
                this.dispose();
            }
        };
        /**
         * 数据更新派发，会先做缓冲，防止在同一时刻对此出发更新操作，等下一次系统轮训时再真正执行更新操作
         * @method __propertyChanged
         */
        Watcher.prototype.__propertyChanged = function () {
            clearTimeout(this._timerid);
            this._timerid = drunk.util.nextTick(this.__runActions, this);
        };
        /**
         * 立即获取最新的数据判断并判断是否已经更新，如果已经更新，执行所有的回调
         * @method __runActions
         * @private
         * @return {Promise} 等待所有回调执行完毕的promise对象
         */
        Watcher.prototype.__runActions = function () {
            var oldValue = this.value;
            var newValue = this.__getValue();
            if ((typeof newValue === 'object' && newValue != null) || newValue !== oldValue) {
                this._actions.slice().forEach(function (action) {
                    action(newValue, oldValue);
                });
            }
        };
        /**
         * 释放引用和内存
         * @method dispose
         */
        Watcher.prototype.dispose = function () {
            var _this = this;
            if (!this._isActived) {
                return;
            }
            Object.keys(this._observers).forEach(function (id) {
                Object.keys(_this._properties[id]).forEach(function (property) {
                    _this._observers[id].removeListener(property, _this.__propertyChanged);
                });
            });
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
         * @method __getValue
         * @private
         * @return {any}
         */
        Watcher.prototype.__getValue = function () {
            this.__beforeGetValue();
            var newValue = this._getter(this.viewModel);
            if (this.isDeepWatch) {
                visit(newValue);
            }
            if (this._getter.filters) {
            }
            this.__afterGetValue();
            return newValue;
        };
        /**
         * 设置observable的属性访问回调为当前watcher实例的订阅方法,当访问某个属性是就会对该属性进行订阅
         * @method __beforeGetValue
         * @private
         */
        Watcher.prototype.__beforeGetValue = function () {
            this._tmpObservers = {};
            this._tmpProperties = {};
            drunk.observable.onAccessingProperty = this._subscribePropertyChanged.bind(this);
        };
        /**
         * 表达式求解完后的收尾工作,取消注册onPropertyAccessed回调,并对比旧的observer表和新的表看有哪些
         * 实例已经不需要订阅
         * @method __afterGetValue
         * @private
         */
        Watcher.prototype.__afterGetValue = function () {
            // 清楚属性访问回调
            drunk.observable.onAccessingProperty = null;
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
                        observer.removeListener(property, propertyChanged);
                    });
                }
                else {
                    Object.keys(properties[id]).forEach(function (property) {
                        if (!tmpProperties[id][property]) {
                            // 如果没有再订阅该属性,取消订阅该属性
                            observer.removeListener(property, propertyChanged);
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
         * @method __subscribePropertyChanged
         * @private
         * @param  {Observer} observer 属性的所属观察者
         * @param  {string}   property 属性名
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
                    observer.addListener(property, propertyChanged);
                }
                else if (!this._properties[id][property]) {
                    // 如果没有订阅过该属性
                    this._properties[id][property] = true;
                    observer.addListener(property, propertyChanged);
                }
            }
            else if (!this._tmpProperties[id][property]) {
                this._tmpProperties[id][property] = true;
                if (!this._properties[id][property]) {
                    observer.addListener(property, propertyChanged);
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
/// <reference path="../viewmodel/viewModel.ts" />
/// <reference path="../promise/promise.ts" />
/// <reference path="../util/xhr.ts" />
/// <reference path="../util/elem" />
/// <reference path="../config/config.ts" />
/// <reference path="../parser/parser.ts" />
/**
 * 模板工具模块， 提供编译创建绑定，模板加载的工具方法
 * @module drunk.Template
 * @class Template
 * @main
 */
var drunk;
(function (drunk) {
    var Template;
    (function (Template) {
        /**
         * 编译模板元素生成绑定方法
         * @param  {any}        node        模板元素
         * @param  {boolean}    isRootNode  是否是根元素
         * @return {function}               绑定元素与viewModel的方法
         */
        function compile(node) {
            var isArray = Array.isArray(node);
            var executor = isArray || node.nodeType === 11 ? null : compileNode(node);
            var isEnding = executor && executor.isEnding;
            var childExecutor;
            if (isArray) {
                executor = compileNodeList(node);
            }
            else if (!isEnding && node.tagName !== 'SCRIPT' && node.hasChildNodes()) {
                childExecutor = compileNodeList(node.childNodes);
            }
            return function (viewModel, element) {
                var startIndex = viewModel._bindings.length;
                var bindingList;
                if (executor) {
                    executor(viewModel, element);
                }
                if (childExecutor) {
                    executor(viewModel, element.childNodes);
                }
                bindingList = viewModel._bindings.slice(startIndex);
                return function () {
                    bindingList.forEach(function (binding) {
                        binding.dispose();
                    });
                };
            };
        }
        Template.compile = compile;
        // 判断元素是什么类型,调用相应的类型编译方法
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
        // 编译NodeList
        function compileNodeList(nodeList) {
            var executors = [];
            drunk.util.toArray(nodeList).forEach(function (node) {
                var executor;
                var childExecutor;
                executor = compileNode(node);
                if (!(executor && executor.isEnding) && node.hasChildNodes()) {
                    childExecutor = compileNodeList(node.childNodes);
                }
                executors.push(executor, childExecutor);
            });
            if (executors.length > 1) {
                return function (viewModel, nodes) {
                    if (nodes.length * 2 !== executors.length) {
                        throw new Error("创建绑定之前,节点已经被动态修改");
                    }
                    var i = 0;
                    var nodeExecutor;
                    var childExecutor;
                    drunk.util.toArray(nodes).forEach(function (node) {
                        nodeExecutor = executors[i++];
                        childExecutor = executors[i++];
                        if (nodeExecutor) {
                            nodeExecutor(viewModel, node);
                        }
                        if (childExecutor) {
                            childExecutor(viewModel, node.childNodes);
                        }
                    });
                };
            }
        }
        // 编译元素的绑定并创建绑定描述符
        function compileElement(element) {
            var executor;
            if (element.hasAttributes()) {
                // 如果元素上有属性， 先判断是否存在终止型绑定指令
                // 如果不存在则判断是否有普通的绑定指令
                executor = processEndingBinding(element) || processNormalBinding(element);
            }
            if (element.tagName === 'TEXTAREA') {
                // 如果是textarea， 它的值有可能存在插值表达式， 比如 "the textarea value with {{some_var}}"
                // 第一次进行绑定先换成插值表达式
                var originExecutor = executor;
                executor = function (viewModel, textarea) {
                    textarea.value = viewModel.eval(textarea.value, true);
                    if (originExecutor) {
                        originExecutor(viewModel, textarea);
                    }
                };
            }
            return executor;
        }
        // 编译文本节点
        function compileTextNode(node) {
            var content = node.textContent;
            var tokens = drunk.parser.parseInterpolate(content, true);
            if (!tokens) {
                return;
            }
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
                drunk.elementUtil.replace(frag, element);
            };
        }
        // 检测是否存在终止编译的绑定，比如component指令会终止当前编译过程，如果有创建绑定描述符
        function processEndingBinding(element) {
            var endings = drunk.Binding.getEndingNames();
            var name;
            var expression;
            for (var i = 0; name = endings[i]; i++) {
                if (expression = element.getAttribute(drunk.config.prefix + name)) {
                    // 如果存在该绑定
                    return createExecutor(element, {
                        name: name,
                        expression: expression,
                        isEnding: true
                    });
                }
            }
        }
        // 查找并创建通常的绑定
        function processNormalBinding(element) {
            var executors;
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
                        expression: expression
                    });
                }
                if (executor) {
                    executors.push(executor);
                }
            });
            if (executors.length) {
                // 存在绑定
                return function (viewModel, element) {
                    executors.forEach(function (executor) {
                        executor(viewModel, element);
                    });
                };
            }
        }
        // 生成绑定描述符方法
        function createExecutor(element, descriptor) {
            var definition = drunk.Binding.getDefinintionByName(descriptor.name);
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
            executor = function (viewModel, element) {
                drunk.Binding.create(viewModel, element, descriptor);
            };
            executor.isEnding = descriptor.isEnding;
            return executor;
        }
    })(Template = drunk.Template || (drunk.Template = {}));
})(drunk || (drunk = {}));
/// <reference path="../promise/promise.ts" />
/// <reference path="../viewmodel/viewModel.ts" />
/// <reference path="../template/compiler.ts" />
/// <reference path="../parser/parser.ts" />
/// <reference path="../watcher/watcher.ts" />
/// <reference path="../util/elem" />
/// <reference path="../util/util.ts" />
/// <reference path="../config/config.ts" />
var drunk;
(function (drunk) {
    var Binding = (function () {
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
        function Binding(viewModel, element, descriptor) {
            this.viewModel = viewModel;
            this.element = element;
            this._isActived = true;
            this._isLocked = false;
            drunk.util.extend(this, descriptor);
        }
        /**
         * 初始化绑定
         * @method initialize
         */
        Binding.prototype.initialize = function () {
            var _this = this;
            if (this.init) {
                this.init();
            }
            this._isActived = true;
            if (!this.update) {
                return;
            }
            var expression = this.expression;
            var isInterpolate = this.isInterpolate;
            var viewModel = this.viewModel;
            var getter = drunk.parser.parseGetter(expression, isInterpolate);
            if (!getter.dynamic) {
                // 如果只是一个静态表达式直接取值更新
                return this.update(viewModel.eval(expression, isInterpolate), undefined);
            }
            var wrapped = function (newValue, oldValue) {
                if (!_this._isActived || _this._isLocked) {
                    _this._isLocked = false;
                    return;
                }
                _this.update(newValue, oldValue);
            };
            this._unwatch = viewModel.watch(expression, wrapped, this.isDeepWatch, true);
            this._update = wrapped;
        };
        /**
         * 移除绑定并销毁
         * @method teardown
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
         * @method setValue
         * @param  {any}     value    要设置的值
         * @param  {boolean} [isLocked] 是否加锁
         */
        Binding.prototype.setValue = function (value, isLocked) {
            this._isLocked = !!isLocked;
            this.viewModel.setValue(this.expression, value);
        };
        return Binding;
    })();
    drunk.Binding = Binding;
    var Binding;
    (function (Binding) {
        /**
         * 终止型绑定信息列表,每个绑定信息包含了name(名字)和priority(优先级)信息
         * @property endingList
         * @private
         * @type Array<{name: string; priority: number}>
         */
        var endingList = [];
        /**
         * 终止型绑定的名称
         * @property endingNames
         * @private
         * @type Array<string>
         */
        var endingNames = [];
        var definitions = {};
        /**
         * 根据一个绑定原型对象注册一个binding指令
         *
         * @method register
         * @static
         * @param  {string}          name  指令名
         * @param  {function|Object} def   binding实现的定义对象或绑定的更新函数
         */
        function register(name, definition) {
            if (definition.isEnding) {
                setEnding(name, definition.priority || 0);
            }
            if (definitions[name]) {
                console.warn(name, "绑定已定义，原定义为：", definitions[name]);
                console.warn("替换为", definition);
            }
            definitions[name] = definition;
        }
        Binding.register = register;
        /**
         * 根据绑定名获取绑定的定义
         *
         * @method getDefinitionByName
         * @static
         * @param  {string}  name      绑定的名称
         * @return {BindingDefinition} 具有绑定定义信息的对象
         */
        function getDefinintionByName(name) {
            return definitions[name];
        }
        Binding.getDefinintionByName = getDefinintionByName;
        /**
         * 获取已经根据优先级排序的终止型绑定的名称列表
         *
         * @method getEndingNames
         * @static
         * @return {array}  返回绑定名称列表
         */
        function getEndingNames() {
            return endingNames.slice();
        }
        Binding.getEndingNames = getEndingNames;
        /**
         * 创建viewModel与模板元素的绑定
         *
         * @method create
         * @static
         * @param  {ViewModel}   viewModel  ViewModel实例
         * @param  {HTMLElement} element    元素
         * @return {Promise}                返回promise对象
         */
        function create(viewModel, element, descriptor) {
            var binding = new Binding(viewModel, element, descriptor);
            drunk.util.addArrayItem(viewModel._bindings, binding);
            return drunk.Promise.resolve(binding.initialize());
        }
        Binding.create = create;
        /**
         * 设置终止型的绑定，根据提供的优先级对终止型绑定列表进行排序，优先级高的绑定会先于优先级的绑定创建
         *
         * @method setEnding
         * @private
         * @static
         * @param  {string}  name      绑定的名称
         * @param  {number}  priority  绑定的优先级
         */
        function setEnding(name, priority) {
            // 检测是否已经存在该绑定
            for (var i = 0, item = void 0; item = endingList[i]; i++) {
                if (item.name === name) {
                    item.priority = priority;
                    break;
                }
            }
            // 添加到列表中
            endingList.push({
                name: name,
                priority: priority
            });
            // 重新根据优先级排序
            endingList.sort(function (a, b) { return b.priority - a.priority; });
            // 更新名字列表
            endingNames = endingList.map(function (item) { return item.name; });
        }
    })(Binding = drunk.Binding || (drunk.Binding = {}));
})(drunk || (drunk = {}));
/// <reference path="../util/util.ts" />
/// <reference path="../parser/parser.ts" />
/// <reference path="../promise/promise.ts" />
/// <reference path="../watcher/watcher.ts" />
/// <reference path="../binding/binding.ts" />
/// <reference path="../filter/filter" />
/// <reference path="../events/events" />
var drunk;
(function (drunk) {
    var counter = 0;
    /**
     * ViewModel类， 实现数据与模板元素的绑定
     *
     * @class ViewModel
     */
    var ViewModel = (function (_super) {
        __extends(ViewModel, _super);
        /**
         * constructor
         * @param  {IModel} [model] 数据
         */
        function ViewModel(model) {
            _super.call(this);
            this.__init();
        }
        /**
         * 初始化私有属性,并对model里的所有字段进行代理处理
         * @method __init
         * @protected
         * @param  {IModel} [model]  数据对象
         */
        ViewModel.prototype.__init = function (model) {
            var _this = this;
            model = model || {};
            drunk.observable.create(model);
            drunk.util.defineProperty(this, "filter", Object.create(drunk.filter.filters));
            drunk.util.defineProperty(this, "_model", model);
            drunk.util.defineProperty(this, "_bindings", []);
            drunk.util.defineProperty(this, "_watchers", {});
            drunk.util.defineProperty(this, "_isActived", true);
            Object.keys(model).forEach(function (property) {
                _this.proxy(property);
            });
        };
        /**
         * 代理某个属性到最新的IModel上
         *
         * @method proxy
         * @param  {string}  name  需要代理的属性名
         */
        ViewModel.prototype.proxy = function (name) {
            var value = this[name];
            if (value === undefined) {
                value = this._model[name];
            }
            if (drunk.util.proxy(this, name, this._model)) {
                this._model.setProperty(name, value);
            }
        };
        /**
         * 执行表达式并返回结果
         *
         * @method eval
         * @param  {string}  expression      表达式
         * @param  {boolean} [isInterpolate] 是否是插值表达式
         * @return {string}                  结果
         */
        ViewModel.prototype.eval = function (expression, isInterpolate) {
            var getter;
            if (isInterpolate) {
                getter = drunk.parser.parseInterpolate(expression);
                if (!getter) {
                    return expression;
                }
            }
            else {
                getter = drunk.parser.parseGetter(expression);
            }
            return this.__getValueByGetter(getter, isInterpolate);
        };
        /**
         * 根据表达式设置值
         *
         * @method setValue
         * @param  {string}  expression  表达式
         * @param  {any}     value       值
         */
        ViewModel.prototype.setValue = function (expression, value) {
            var setter = drunk.parser.parseSetter(expression);
            setter.call(undefined, this, value);
        };
        /**
         * 把model数据转成json并返回
         * @method getModel
         * @return {IModel}  反悔json格式的不带getter/setter的model
         */
        ViewModel.prototype.getModel = function () {
            return drunk.util.deepClone(this._model);
        };
        /**
         * 监听表达式的里每个数据的变化
         *
         * @method watch
         * @param  {string}  expression  表达式
         */
        ViewModel.prototype.watch = function (expression, action, isDeepWatch, isImmediate) {
            var _this = this;
            var key = drunk.Watcher.getNameOfKey(expression, isDeepWatch);
            var watcher;
            watcher = this._watchers[key];
            if (!watcher) {
                watcher = new drunk.Watcher(this, expression, isDeepWatch);
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
         * 释放ViewModel实例的所有元素与数据的绑定
         * 解除所有的代理属性
         * 解除所有的视图于数据绑定
         * 移除事件缓存
         * 销毁所有的watcher
         *
         * @method dispose
         */
        ViewModel.prototype.dispose = function () {
            var _this = this;
            Object.keys(this._model).forEach(function (property) {
                delete _this[property];
            });
            Object.keys(this._watchers).forEach(function (key) {
                _this._watchers[key].dispose();
            });
            this._bindings.forEach(function (binding) {
                binding.dispose();
            });
            drunk.Events.cleanup(this);
            this._model = null;
            this._bindings = null;
            this._watchers = null;
        };
        /**
         * 获取事件回调,内置方法
         *
         * @method __getHandler
         * @internal
         * @param  {string}  handlerName  时间回调名称
         * @return {ViewModel} 返回事件处理函数
         */
        ViewModel.prototype.__getHandler = function (handlerName) {
            var handler = this.handlers[handlerName];
            var context = this;
            if (!handler) {
                if (typeof window[handlerName] === 'function') {
                    handler = window[handlerName];
                    context = window;
                }
                throw new Error(handlerName + ": 没有找到该事件处理方法");
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
         * @method __getValueByGetter
         * @param  {function}    getter         表达式解析生成的getter函数
         * @param  {boolean}     isInterpolate  是否是插值表达式
         * @param  {Event}       [event]        事件对象
         * @param  {HTMLElement} [el]           元素对象
         * @return {any}
         */
        ViewModel.prototype.__getValueByGetter = function (getter, isInterpolate) {
            var args = [this].concat(drunk.util.toArray(arguments).slice(1));
            var value = getter.apply(null, args);
            return drunk.filter.applyFilters.apply(null, [value, getter.filters, this.filter, isInterpolate].concat(args));
        };
        ;
        return ViewModel;
    })(drunk.Events);
    drunk.ViewModel = ViewModel;
})(drunk || (drunk = {}));
/// <reference path="../viewmodel/viewmodel.ts" />
/// <reference path="../filter/filter" />
/// <reference path="../cache/cache" />
/**
 * 简单的解析器,只是做了字符串替换,然后使用new Function生成函数
 * @module drunk.parser
 * @class parser
 */
var drunk;
(function (drunk) {
    var parser;
    (function (parser) {
        var eventName = "$event";
        var elementName = "$el";
        var valueName = "__value";
        var contextName = "__context";
        var proxyOperation = contextName + ".proxy";
        var getHandlerOperation = contextName + ".__getHandler";
        // 保留关键字
        var reserved = [
            'break', 'case', 'catch', 'continue', 'debugger', 'default', 'delete', 'do',
            'else', 'finally', 'for', 'function', 'if', 'in', 'instanceof', 'new', 'return',
            'switch', 'this', 'throw', 'try', 'typeof', 'let', 'void', 'while',
            'class', 'null', 'undefined', 'true', 'false', 'with', eventName, elementName,
            'let', 'abstract', 'import', 'yield', 'arguments'
        ];
        var tokenCache = new drunk.Cache();
        var getterCache = new drunk.Cache();
        var setterCache = new drunk.Cache();
        var filterCache = new drunk.Cache();
        var expressionCache = new drunk.Cache();
        var identifierCache = new drunk.Cache();
        var interpolateGetterCache = new drunk.Cache();
        var regIdentifier = /("|').*?\1|[a-zA-Z$_][a-z0-9A-Z$_]*/g;
        var regFilter = /("|').*?\1|\|\||\|\s*([a-zA-Z$_][a-z0-9A-Z$_]*)(:[^|]*)?/g;
        var regInterpolate = /\{\{([^{]+)\}\}/g;
        var regBrackets = /^\([^)]*\)/;
        var regObjectKey = /[{,]\s*$/;
        var regColon = /^\s*:/;
        var regAnychar = /\S+/;
        // 解析filter定义
        function parseFilterDef(str, skipSetter) {
            if (skipSetter === void 0) { skipSetter = false; }
            if (!filterCache.get(str)) {
                var def = [];
                var idx;
                str.replace(regFilter, function ($0, quote, name, args, i) {
                    if (!name) {
                        return $0;
                    }
                    if (idx == null) {
                        // 记录filter开始的位置， 因为filter只能是连续的出现一直到表达式结尾
                        idx = i;
                    }
                    var param;
                    if (args) {
                        param = parseGetter('[' + args.slice(1) + ']');
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
        // 断言非空字符串
        function assertNotEmptyString(target, message) {
            if (!(typeof target === 'string' && regAnychar.test(target))) {
                throw new Error(message + ": 表达式为空");
            }
        }
        // 是否是对象的key
        function isObjectKey(str) {
            return str.match(regObjectKey) != null;
        }
        // 前一个字符是否是冒号
        function isColon(str) {
            return str.match(regColon) != null;
        }
        // 是否是一个方法调用
        function isCallFunction(str) {
            return str.match(regBrackets) != null;
        }
        // 解析所有的标记并对表达式进行格式化
        function parseIdentifier(str) {
            var cache = identifierCache.get(str);
            if (!cache) {
                var index = 0;
                var proxies = [];
                var identifiers = [];
                var formated = str.replace(regIdentifier, function (x, p, i) {
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
        // 创建函数
        function createFunction(expression) {
            var args = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                args[_i - 1] = arguments[_i];
            }
            try {
                return Function.apply(Function, args);
            }
            catch (err) {
                console.error('解析错误\n\n', '非法的表达式"' + expression + '", 尝试解析后的结果为:\n\n', args[args.length - 1], '\n\n', err.stack);
            }
        }
        /**
         * 解析表达式
         *
         * @method parse
         * @static
         * @param  {string}  expression  表达式
         * @return {function}            返回一个方法
         */
        function parse(expression) {
            assertNotEmptyString(expression, "解析表达式失败");
            var fn = expressionCache.get(expression);
            if (!fn) {
                var detail = parseIdentifier(expression);
                var fnBody = detail.proxies + "return (" + detail.formated + ");";
                fn = createFunction(expression, contextName, eventName, eventName, fnBody);
                expressionCache.set(expression, fn);
            }
            return fn;
        }
        parser.parse = parse;
        /**
         * 解析表达式生成getter函数
         *
         * @method parsetGetter
         * @static
         * @param  {string}  expression  表达式字符串
         * @param  {boolean} skipFilter  跳过解析filter
         * @return {function}            getter函数
         */
        function parseGetter(expression, skipFilter) {
            assertNotEmptyString(expression, "创建getter失败");
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
         *
         * @method parsetSetter
         * @static
         * @param  {string}  expression 表达式字符串
         * @return {function}           setter函数
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
                expression.replace(regInterpolate, function ($0, exp, i) {
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
         *
         * @method hasInterpolation
         * @static
         * @param  {string}  str  字符串
         * @return {boolean}      返回结果
         */
        function hasInterpolation(str) {
            return typeof str === 'string' && str.match(regAnychar) !== null && str.match(regInterpolate) !== null;
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
         *
         * @method applyFilters
         * @static
         * @param  {any}            value       输入
         * @param  {FilterDef[]}    filterDefs  filter定义集合
         * @param  {ViewModel}      viewModel   ViewModel实例
         * @param  {any[]}          ...args     其他参数
         * @return {any}                        过滤后得到的值
         */
        function applyFilters(value, filterDefs, filterMap, isInterpolate, viewModel) {
            var args = [];
            for (var _i = 5; _i < arguments.length; _i++) {
                args[_i - 5] = arguments[_i];
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
                    return filter.applyFilters(item, filterDefs[i], filterMap, false, viewModel);
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
                param = def.param ? def.param.apply(null, args) : [];
                value = method.apply(viewModel, [value].concat(param));
            });
            return value;
        }
        filter.applyFilters = applyFilters;
        // 判断插值表达式的值个数,如果只有一个,则返回该值,如果有多个,则返回所有值的字符串相加
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
            format: /(YY|M|D|H|m|s)(\1)*/g
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
        filter.filters = {
            /**
             * 对输入的字符串进行编码
             * @method escape
             * @param  {string}  input  输入
             * @return {string}         输出
             */
            escape: function (input) {
                return input.replace(reg.escape, function (x) {
                    return escapeChars[x];
                });
            },
            /**
             * 对输入的字符串进行解码
             * @method unescape
             * @param  {string}  input  输入
             * @return {string}         输出
             */
            unescape: function (input) {
                return input.replace(reg.unescape, function (a) {
                    return unescapeChars[a];
                });
            },
            /**
             * 对输入的字符串进行截断
             * @method truncate
             * @param  {string}  input  输入
             * @param  {number}  length 保留的最大长度
             * @param  {string}  [tail] 结尾的字符串,默认为'...'
             * @return {string}         输出
             */
            truncate: function (input, length, tail) {
                if (input.length <= length) {
                    return input;
                }
                return input.slice(0, length) + (tail != null ? tail : "...");
            },
            /**
             * 为特殊字符添加斜杠
             * @method addslashes
             * @param  {string}  input  输入
             * @return {string}         输出
             */
            addslashes: function (input) {
                return input.replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
            },
            /**
             * 移除特殊字符的斜杠
             * @method stripslashes
             * @param  {string}  input  输入
             * @return {string}         输出
             */
            stripslashes: function (input) {
                return input.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\0/g, '\0').replace(/\\\\/g, '\\');
            },
            /**
             * 计算输入的长度，支持字符串、数组和对象
             * @method length
             * @param  {string|array|object}  input 输入
             * @return {number}  长度
             */
            length: function (input) {
                if (input == null) {
                    return 0;
                }
                if (input.length != null) {
                    return input.length;
                }
                if (typeof input === 'object') {
                    var length = 0;
                    for (var k in input) {
                        if (input.hasOwnProperty(k)) {
                            length += 1;
                        }
                    }
                    return length;
                }
            },
            /**
             * JSON.stringify的别名
             * @method json
             * @param  {any}  input     输入
             * @param  {number} [ident] 缩进
             * @return {string}         格式化后的字符串
             */
            json: function (input, ident) {
                return JSON.stringify(input, null, ident || 4);
            },
            /**
             * 移除所有tag标签字符串,比如"<div>123</div>" => "123"
             * @method striptags
             * @param  {string}  input  输入
             * @return {string}         输出
             */
            striptags: function (input) {
                return input.replace(reg.striptags, "");
            },
            /**
             * 当输入为undefined或null是返回默认值
             * @method default
             * @param  {any}  input        输入
             * @param  {any}  defaultValue 默认值
             * @return {any}               根据输入返回的值
             */
            default: function (input, defaltValue) {
                return input == null ? defaltValue : input;
            },
            /**
             * 根据输入的时间戳返回指定格式的日期字符串
             * @method date
             * @param  {number|string} input  时间戳
             * @param  {string}        format 要返回的时间格式
             * @return {string}               格式化后的时间字符串
             */
            date: function (input, format) {
                return formatDate(input, format);
            },
            /**
             * 在控制台上打印输入
             * @method debug
             * @param  {any}  input  输入
             * @return {any}         返回输入的值
             */
            debug: function (input) {
                console.log("Current data: ", input);
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
                    case "YYYY":
                        return y;
                    case "YY":
                        return y.slice(2);
                    case "MM":
                        return padded(M);
                    case "M":
                        return M;
                    case "DD":
                        return padded(d);
                    case "D":
                        return d;
                    case "H":
                        return H;
                    case "HH":
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
/// <reference path="../promise/promise.ts" />
/// <reference path="../util/xhr.ts" />
/// <reference path="../cache/cache" />
/**
 * @module drunk.Template
 * @class Template
 */
var drunk;
(function (drunk) {
    var Template;
    (function (Template) {
        var cache = new drunk.Cache();
        var loading = new drunk.Cache();
        /**
         * 加载模板，先尝试从script标签上查找，找不到再发送ajax请求，
         * 加载到的模板字符串会进行缓存
         * @static
         * @method loadTemplate
         * @param   {string}  urlOrId  script模板标签的id或模板的url地址
         * @returns {Promise}           一个 promise 对象promise的返回值为模板字符串
         */
        function load(urlOrId) {
            var template = cache.get(urlOrId);
            var node;
            if (template != null) {
                return drunk.Promise.resolve(template);
            }
            if ((node = document.getElementById(urlOrId)) && node.innerHTML) {
                template = node.innerHTML;
                cache.set(urlOrId, template);
                return drunk.Promise.resolve(template);
            }
            var promise = loading.get(urlOrId);
            if (!promise) {
                promise = drunk.util.ajax({ url: urlOrId }).then(function (template) {
                    cache.set(urlOrId, template);
                    loading.remove(urlOrId);
                    return template;
                });
                loading.set(urlOrId, promise);
            }
            return promise;
        }
        Template.load = load;
    })(Template = drunk.Template || (drunk.Template = {}));
})(drunk || (drunk = {}));
/// <reference path="../viewmodel/viewmodel" />
/// <reference path="../template/loader" />
var drunk;
(function (drunk) {
    var Component = (function (_super) {
        __extends(Component, _super);
        /**
         * 组件类，继承ViewModel类，实现了模板的准备和数据的绑定
         *
         * @class Component
         * @constructor
         */
        function Component(model) {
            _super.call(this, model);
        }
        Component.prototype.__init = function (model) {
            var _this = this;
            _super.prototype.__init.call(this, model);
            if (this.filters) {
                // 如果配置了过滤器
                drunk.util.extend(this.filter, this.filters);
            }
            if (this.handlers) {
                // 如果配置了事件处理函数
                drunk.util.extend(this, this.handlers);
            }
            if (this.init) {
                this.init();
            }
            if (this.watchers) {
                // 如果配置了监控器
                Object.keys(this.watchers).forEach(function (expression) {
                    _this.watch(expression, _this.watchers[expression]);
                });
            }
            if (this.data) {
                // 如果有配置数据源,类似: {
                //     "matchlist": function () { return drunk.xhr('matchlist.json');  }
                //     "counter": 0
                // }
                Object.keys(this.data).forEach(function (name) {
                    var data = _this.data[name];
                    if (typeof data === 'function') {
                        // 如果是一个函数,直接调用该函数
                        data = data();
                    }
                    // 代理该数据字段
                    _this.proxy(name);
                    // 不论返回的是什么值,使用promise进行处理
                    drunk.Promise.resolve(data).then(function (result) {
                        _this[name] = result;
                    }, function (reason) {
                        console.warn("数据准备失败:", reason);
                    });
                });
            }
        };
        /**
         * 处理模板，并返回模板元素
         *
         * @method processTemplate
         * @return {Promise}
         */
        Component.prototype.processTemplate = function (templateUrl) {
            function onFailed(reason) {
                console.warn("模板加载失败: " + templateUrl, reason);
            }
            if (typeof templateUrl === 'string') {
                return drunk.Template.load(templateUrl).then(drunk.elementUtil.create).catch(onFailed);
            }
            if (this.element) {
                return drunk.Promise.resolve(this.element);
            }
            if (typeof this.template === 'string') {
                return drunk.Promise.resolve(drunk.elementUtil.create(this.template));
            }
            templateUrl = this.templateUrl;
            if (typeof templateUrl === 'string') {
                return drunk.Template.load(templateUrl).then(drunk.elementUtil.create).catch(onFailed);
            }
            throw new Error((this.name || this.constructor.name) + "组件模板未指定");
        };
        /**
         * 把组件挂载到元素上
         * @method mount
         */
        Component.prototype.mount = function (element) {
            console.assert(!this._isMounted, "该组件已有挂载到", this.element);
            if (element['__viewModel']) {
                return console.error("Component.$mount(element): 尝试挂载到一个已经挂载过组件实例的元素节点", element);
            }
            drunk.Template.compile(element)(this, element);
            element['__viewModel'] = this;
            this.element = element;
            this._isMounted = true;
            this.dispatchEvent(Component.MOUNTED);
        };
        /**
         * 释放组件
         * @method dispose
         */
        Component.prototype.dispose = function () {
            _super.prototype.dispose.call(this);
            if (this._isMounted) {
                this.element['__viewModel'] = null;
                this._isMounted = false;
            }
            this.element = null;
        };
        /**
         * 获取组件所属的上级的viewModel和组件标签(组件标签类似于:<my-view></my-view>)
         * @event GET_COMPONENT_CONTEXT
         * @param {string}  eventName  需要响应的事件名
         */
        Component.GET_COMPONENT_CONTEXT = "get:component:contenxt";
        /**
         * 子组件被创建时触发的事件
         * @event SUB_COMPONENT_CREATED
         * @param  {Component}  component 触发的回调中得到的组件实例参数
         */
        Component.SUB_COMPONENT_CREATED = "new:sub:component";
        /**
         * 子组件的与视图挂载并创建绑定之后触发的事件
         * @event SUB_COMPONENT_MOUNTED
         * @param  {Component}  component 触发的回调中得到的组件实例参数
         */
        Component.SUB_COMPONENT_MOUNTED = "sub:component:mounted";
        /**
         * 子组件即将被销毁触发的事件
         * @event SUB_COMPONENT_BEFORE_RELEASE
         * @param  {Component}  component 触发的回调中得到的组件实例参数
         */
        Component.SUB_COMPONENT_BEFORE_RELEASE = "sub:component:before:release";
        /**
         * 子组件已经释放完毕触发的事件
         * @event SUB_COMPONENT_RELEASED
         * @param  {Component}  component 触发的回调中得到的组件实例参数
         */
        Component.SUB_COMPONENT_RELEASED = "sub:component:released";
        /**
         * 当前实例挂载到dom上时
         * @event MOUNTED
         */
        Component.MOUNTED = "component:mounted";
        return Component;
    })(drunk.ViewModel);
    drunk.Component = Component;
    var Component;
    (function (Component) {
        Component.defined = {};
        /**
         * 自定义一个组件类
         * @method define
         * @static
         * @param  {string}
         */
        function define(name, members) {
            members.name = name;
            return;
        }
        Component.define = define;
        /**
         * 当前组件类拓展出一个子组件
         * @method extend
         * @static
         * @param  {string}      name       子组件名
         * @param  {IComponent}  members    子组件的成员
         * @return {IComponentContructor}
         */
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
                _super.apply(void 0, [this].concat(args));
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
         * @method reigster
         * @static
         * @param  {string}   name          组件名
         * @param  {function} componentCtor 组件类
         */
        function register(name, componentCtor) {
            console.assert(name.indexOf('-') > -1, name, '组件明必须在中间带"-"字符,如"custom-view"');
            if (Component.defined[name] != null) {
                console.warn('组件 "' + name + '" 已被覆盖,请确认该操作');
            }
            componentCtor.extend = Component.extend;
            Component.defined[name] = componentCtor;
        }
        Component.register = register;
    })(Component = drunk.Component || (drunk.Component = {}));
})(drunk || (drunk = {}));
/// <reference path="../binding" />
/// <reference path="../../template/compiler" />
/// <reference path="../../util/elem" />
/// <reference path="../../config/config" />
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
var drunk;
(function (drunk) {
    var reg = {
        semic: /\s*;\s*/,
        statement: /(\w+):\s*(.+)/
    };
    drunk.Binding.register("on", {
        init: function () {
            var _this = this;
            var exp = this.expression;
            this.events = exp.split(reg.semic).map(function (str) { return _this.parseEvent(str); });
        },
        parseEvent: function (str) {
            var matches = str.match(reg.statement);
            var prefix = drunk.config.prefix;
            console.assert(matches !== null, "非法的 " + prefix + 'on 绑定表达式, ', str, '正确的用法如下:\n', prefix + 'on="eventType: expression"\n', prefix + 'on="eventType: expression; eventType2: callback()"\n', prefix + 'on="eventType: callback($event, $el)"\n');
            var self = this;
            var type = matches[1];
            var expr = matches[2];
            var func = drunk.parser.parse(expr.trim());
            function handler(e) {
                func.call(null, self.viewModel, e, self.element);
                if (drunk.config.debug) {
                    console.log(type + ': ' + expr);
                }
            }
            drunk.elementUtil.addListener(this.element, type, handler);
            return { type: type, handler: handler };
        },
        release: function () {
            var _this = this;
            this.events.forEach(function (event) {
                drunk.elementUtil.addListener(_this.element, event.type, event.handler);
            });
            this.events = null;
        }
    });
})(drunk || (drunk = {}));
/// <reference path="../binding" />
/// <reference path="../../util/util" />
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
var drunk;
(function (drunk) {
    function setAttribute(element, name, value) {
        if (name === 'src' || name === 'href') {
            value = value == null ? '' : value;
        }
        element.setAttribute(name, value);
    }
    var AttributeBindingDefinition = {
        update: function (newValue) {
            var _this = this;
            if (this.attrName) {
                // 如果有提供指定的属性名
                setAttribute(this.element, this.attrName, newValue);
            }
            else if (drunk.util.isObject(newValue)) {
                Object.keys(newValue).forEach(function (name) {
                    setAttribute(_this.element, name, newValue[name]);
                });
            }
        }
    };
    drunk.Binding.register('attr', AttributeBindingDefinition);
})(drunk || (drunk = {}));
/// <reference path="../binding" />
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
var drunk;
(function (drunk) {
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
                        el.innerHTML = newValue;
                }
            }
        }
    });
})(drunk || (drunk = {}));
/// <reference path="../binding" />
/// <reference path="../../util/elem" />
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
var drunk;
(function (drunk) {
    drunk.Binding.register("class", {
        update: function (data) {
            var elem = this.element;
            if (Array.isArray(data)) {
                var classMap = {};
                var oldValue = this.oldValue;
                if (oldValue) {
                    oldValue.forEach(function (name) {
                        if (data.indexOf(name) === -1) {
                            drunk.elementUtil.removeClass(elem, name);
                        }
                        else {
                            classMap[name] = true;
                        }
                    });
                }
                data.forEach(function (name) {
                    if (!classMap[name]) {
                        drunk.elementUtil.addClass(elem, name);
                    }
                });
                this.oldValue = data;
            }
            else if (data && typeof data === 'object') {
                Object.keys(data).forEach(function (name) {
                    if (data[name]) {
                        drunk.elementUtil.addClass(elem, name);
                    }
                    else {
                        drunk.elementUtil.removeClass(elem, name);
                    }
                });
            }
            else if (typeof data === 'string' && (data = data.trim()) !== this.oldValue) {
                if (this.oldValue) {
                    drunk.elementUtil.removeClass(elem, this.oldValue);
                }
                this.oldValue = data;
                if (data) {
                    drunk.elementUtil.addClass(elem, data);
                }
            }
        }
    });
})(drunk || (drunk = {}));
/// <reference path="../binding" />
/// <reference path="../../component/component" />
/// <reference path="../../util/elem" />
var drunk;
(function (drunk) {
    drunk.Binding.register("component", {
        isEnding: true,
        priority: 80,
        /*
         * 初始化组件,找到组件类并生成实例,创建组件的绑定
         */
        init: function () {
            var Ctor = drunk.Component.defined[this.expression];
            if (!Ctor) {
                throw new Error(this.expression + ": 未找到该组件.");
            }
            this.component = new Ctor();
            this.unwatches = [];
            this.processComponentContextEvent();
            this.processComponentAttributes();
            // 触发组件实例创建事件
            this.viewModel.dispatchEvent(drunk.Component.SUB_COMPONENT_CREATED, this.component);
            return this.processComponentBinding();
        },
        processComponentContextEvent: function () {
            var _this = this;
            var element = this.element;
            var viewModel = this.viewModel;
            // 在组件实例上注册getComponentContext事件,
            // 该事件提供获取组件父级viewModel及element上下文的借口,
            // 可以在任何地方触发该事件以获取组件相关上下文,
            // 只要在触发该事件时把特定事件名传递过来,就会触发该事件名并把上下文传递过去
            this.component.addListener(drunk.Component.GET_COMPONENT_CONTEXT, function (eventName) {
                if (typeof eventName === 'string') {
                    _this.dispatchEvent(eventName, viewModel, element);
                }
            });
        },
        /*
         * 为组件准备数据和绑定事件
         */
        processComponentAttributes: function () {
            var _this = this;
            var element = this.element;
            var component = this.component;
            if (!element.hasAttributes()) {
                return;
            }
            // 遍历元素上所有的属性做数据准备或数据绑定的处理
            // 如果某个属性用到插值表达式,如"a={{b}}",则对起进行表达式监听(当b改变时通知component的a属性更新到最新的值)
            drunk.util.toArray(element.attributes).forEach(function (attr) {
                var attrName = attr.name;
                var attrValue = attr.value;
                if (attrName.indexOf(drunk.config.prefix) > -1) {
                    return console.warn("自定义组件标签上不支持使用绑定语法");
                }
                if (!attrValue) {
                    component[attrName] = true;
                    return;
                }
                var expression = attrValue.trim();
                if (attrName.indexOf("on-") === 0) {
                    // on-click="doSomething()"
                    // => "click", "doSomething()"
                    attrName = drunk.util.camelCase(attrName.slice(3));
                    return _this.registerComponentEvent(attrName, expression);
                }
                attrName = drunk.util.camelCase(attrName);
                if (!drunk.parser.hasInterpolation(expression)) {
                    // 没有插值表达式
                    // title="someConstantValue"
                    component[attrName] = attrValue;
                    return;
                }
                // title="{{somelet}}"
                _this.watchExpressionForComponent(attrName, expression);
            });
        },
        /*
         * 处理组件的视图于数据绑定
         */
        processComponentBinding: function () {
            var _this = this;
            var component = this.component;
            var viewModel = this.viewModel;
            return component.processTemplate().then(function (template) {
                if (_this.isDisposed) {
                    return;
                }
                drunk.elementUtil.replace(template, _this.element);
                component.mount(template);
                // 触发组件已经挂载到元素上的事件
                viewModel.dispatchEvent(drunk.Component.SUB_COMPONENT_MOUNTED, component);
            }).catch(function (reason) {
                console.warn("组件挂载失败,错误信息:");
                console.warn(reason);
            });
        },
        /*
         * 注册组件的事件
         */
        registerComponentEvent: function (eventName, expression) {
            var viewModel = this.viewModel;
            var func = drunk.parser.parse(expression);
            // 事件的处理函数,会生成一个$event对象,在表达式中可以访问该对象.
            // $events对象有type和args两个字段,args字段是组件派发这个事件所传递的参数的列表
            var handler = function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i - 0] = arguments[_i];
                }
                func.call(undefined, viewModel, {
                    type: eventName,
                    args: args
                });
            };
            this.component.addListener(eventName, handler);
        },
        /*
         * 监控绑定表达式,表达式里任意数据更新时,同步到component的指定属性
         */
        watchExpressionForComponent: function (property, expression) {
            var viewModel = this.viewModel;
            var component = this.component;
            var unwatch = viewModel.watch(expression, function (newValue) {
                component[property] = newValue;
            }, true, true);
            this.unwatches.push(unwatch);
        },
        /*
         * 组件释放
         */
        release: function () {
            // 触发组件即将释放事件
            this.viewModel.dispatchEvent(drunk.Component.SUB_COMPONENT_BEFORE_RELEASE, this.component);
            if (this.component.element) {
                drunk.elementUtil.remove(this.component.element);
            }
            // 组件实例释放
            this.component.dispose();
            // 移除所有的属性监控
            this.unwatches.forEach(function (unwatch) { return unwatch(); });
            // 触发组件已经释放完毕事件
            this.viewModel.dispatchEvent(drunk.Component.SUB_COMPONENT_RELEASED, this.component);
            // 移除所有引用
            this.component = null;
            this.unwatches = null;
            this.isDisposed = true;
        }
    });
})(drunk || (drunk = {}));
/// <reference path="../binding" />
/// <reference path="../../util/elem" />
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
var drunk;
(function (drunk) {
    drunk.Binding.register("if", {
        isEnding: true,
        priority: 100,
        init: function () {
            this.startNode = document.createComment(" if: " + this.expression);
            this.endedNode = document.createComment(" /if: " + this.expression);
            this.bindingExecutor = drunk.Template.compile(this.element);
            this.inDocument = false;
            drunk.elementUtil.replace(this.startNode, this.element);
            drunk.elementUtil.insertAfter(this.endedNode, this.startNode);
        },
        update: function (value) {
            if (!!value) {
                this.addToDocument();
            }
            else {
                this.removeFromDocument();
            }
        },
        addToDocument: function () {
            if (this.inDocument) {
                return;
            }
            this.tmpElement = this.element.cloneNode(true);
            drunk.elementUtil.insertAfter(this.tmpElement, this.startNode);
            this.unbindExecutor = this.bindingExecutor(this.viewModel, this.tmpElement);
            this.inDocument = true;
        },
        removeFromDocument: function () {
            if (!this.inDocument) {
                return;
            }
            this.unbindExecutor();
            drunk.elementUtil.remove(this.tmpElement);
            this.unbindExecutor = null;
            this.tmpElement = null;
            this.inDocument = false;
        },
        release: function () {
            this.removeFromDocument();
            drunk.elementUtil.replace(this.element, this.startNode);
            drunk.elementUtil.remove(this.endedNode);
            this.startNode = null;
            this.endedNode = null;
            this.bindingExecutor = null;
        }
    });
})(drunk || (drunk = {}));
/// <reference path="../binding" />
/// <reference path="../../template/loader" />
/// <reference path="../../template/compiler" />
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
var drunk;
(function (drunk) {
    drunk.Binding.register("include", {
        update: function (url) {
            if (url && this.url === url) {
                return;
            }
            this.unbind();
            if (url) {
                this.url = url;
                drunk.Template.load(url).then(this.createBinding.bind(this));
            }
        },
        createBinding: function (template) {
            this.element.innerHTML = template;
            var bindingExecutor = drunk.Template.compile(this.element);
            this._unbindExecutor = bindingExecutor(this.viewModel, this.element);
        },
        unbind: function () {
            if (this._unbindExecutor) {
                this._unbindExecutor();
                this._unbindExecutor = null;
            }
        },
        release: function () {
            this.unbind();
            this.url = null;
            this.element.innerHTML = "";
        }
    });
})(drunk || (drunk = {}));
/// <reference path="../binding" />
/// <reference path="../../util/elem" />
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
            drunk.elementUtil.addListener(this.element, this._changedEvent, this._changedHandler);
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
            this.__updateView = setCheckboxValue;
            this.__getValue = getCheckboxValue;
        },
        initRadio: function () {
            this._changedEvent = "change";
            this.__updateView = setRadioValue;
            this.__getValue = getCommonValue;
        },
        initSelect: function () {
            this._changedEvent = "change";
            this.__updateView = setCommonValue;
            this.__getValue = getCommonValue;
        },
        initTextarea: function () {
            this._changedEvent = "input";
            this.__updateView = setCommonValue;
            this.__getValue = getCommonValue;
        },
        initCommon: function () {
            this._changedEvent = "change";
            this.__updateView = setCommonValue;
            this.__getValue = getCommonValue;
        },
        update: function (value) {
            this.__updateView(value);
        },
        release: function () {
            drunk.elementUtil.removeListener(this.element, this._changedEvent, this._changedHandler);
            this.element = this._changedHandler = null;
        },
        _changedHandler: function () {
            this.setValue(this.__getValue(), true);
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
/// <reference path="../../util/elem" />
/// <reference path="../../component/component" />
/// <reference path="../../template/compiler" />
/// <reference path="../../viewmodel/viewmodel" />
var drunk;
(function (drunk) {
    var REPEAT_PREFIX = "__repeat_id";
    var counter = 0;
    var regParam = /\s+in\s+/;
    var regComma = /\s*,\s*/;
    var RepeatBindingDefinition = {
        isEnding: true,
        priority: 90,
        // 初始化绑定
        init: function () {
            this.createCommentNodes();
            this.parseDefinition();
            this.$id = REPEAT_PREFIX + counter++;
            this.cache = {};
            this.bindingExecutor = drunk.Template.compile(this.element);
        },
        // 创建注释标记标签
        createCommentNodes: function () {
            this.startNode = document.createComment(this.expression + " : [循环开始]");
            this.endedNode = document.createComment(this.expression + " : [循环结束]");
            drunk.elementUtil.insertBefore(this.startNode, this.element);
            drunk.elementUtil.replace(this.endedNode, this.element);
        },
        // 解析表达式定义
        parseDefinition: function () {
            var expression = this.expression;
            var parts = expression.split(regParam);
            console.assert(parts.length === 2, '非法的 ', drunk.config.prefix + 'repeat 表达式: ', expression);
            var params = parts[0];
            var key;
            var value;
            if (params.indexOf(',') > 0) {
                params = params.split(regComma);
                key = params[1];
                value = params[0];
            }
            else {
                value = params;
            }
            this.param = {
                key: key,
                val: value
            };
            this.expression = parts[1].trim();
        },
        // 数据更新
        update: function (newValue) {
            var data = toList(newValue);
            var last = data.length - 1;
            var isEmpty = !this.itemVms || this.itemVms.length === 0;
            var vmList = [];
            var viewModel, item, i;
            for (i = 0; i <= last; i++) {
                item = data[i];
                viewModel = vmList[i] = this.getItemVm(item, i === last);
                viewModel._isChecked = true;
                if (isEmpty) {
                    drunk.elementUtil.insertBefore(viewModel.element, this.endedNode);
                }
            }
            if (!isEmpty) {
                this.releaseVm(this.itemVms);
                var curr, el;
                i = data.length;
                curr = this.endedNode.previousSibling;
                while (i--) {
                    viewModel = vmList[i];
                    el = viewModel.element;
                    if (el !== curr) {
                        drunk.elementUtil.insertAfter(el, curr);
                    }
                    else {
                        curr = curr.previousSibling;
                    }
                }
            }
            vmList.forEach(function (viewModel) {
                viewModel._isChecked = false;
                if (!viewModel._isBinded) {
                    this.bindingExecutor(viewModel, viewModel.element);
                    viewModel._isBinded = true;
                }
            }, this);
            this.itemVms = vmList;
        },
        getItemVm: function (item, isLast) {
            var val = item.val;
            var isCollection = drunk.util.isObject(val) || Array.isArray(val);
            var viewModel;
            if (isCollection) {
                viewModel = val[this.$id];
            }
            else {
                var list = this.cache[val];
                if (list) {
                    var i = 0;
                    viewModel = list[0];
                    while (viewModel && viewModel._isChecked) {
                        viewModel = list[++i];
                    }
                }
            }
            if (viewModel) {
                this.updateItemModel(viewModel, item, isLast);
            }
            else {
                viewModel = this.createItemVm(item, isLast, isCollection);
            }
            return viewModel;
        },
        createItemVm: function (item, isLast, isCollection) {
            var own = {};
            var val = item.val;
            this.updateItemModel(own, item, isLast);
            var viewModel = new RepeatItem(this.viewModel, own, this.element.cloneNode(true));
            if (isCollection) {
                drunk.util.defineProperty(val, this.$id, viewModel);
                viewModel._isCollection = true;
            }
            else {
                this.cache[val] = this.cache[val] || [];
                this.cache[val].push(viewModel);
            }
            return viewModel;
        },
        updateItemModel: function (target, item, isLast) {
            target.$odd = 0 === item.idx % 2;
            target.$last = isLast;
            target.$first = 0 === item.idx;
            target[this.param.val] = item.val;
            if (this.param.key) {
                target[this.param.key] = item.key;
            }
        },
        releaseVm: function (itemVms, force) {
            var cache = this.cache;
            var value = this.param.val;
            var id = this.$id;
            itemVms.forEach(function (viewModel) {
                if (viewModel._isChecked && !force) {
                    return;
                }
                // 如果未在使用或强制销毁
                var val = viewModel[value];
                if (viewModel._isCollection) {
                    // 移除数据对viewModel实例的引用
                    val[id] = null;
                }
                else {
                    drunk.util.removeArrayItem(cache[val], viewModel);
                }
                drunk.elementUtil.remove(viewModel.element);
                viewModel.dispose();
            });
        },
        release: function () {
            if (this.itemVms && this.itemVms.length) {
                this.releaseVm(this.itemVms, true);
            }
            drunk.elementUtil.remove(this.startNode);
            drunk.elementUtil.replace(this.element, this.endedNode);
            this.cache = null;
            this.itemVms = null;
            this.startNode = null;
            this.endedNode = null;
            this.element = null;
            this.bindingExecutor = null;
        }
    };
    drunk.Binding.register("repeat", RepeatBindingDefinition);
    /**
     * 用于repeat作用域下的子viewModel
     * @class RepeatItem
     * @constructor
     * @private
     * @param {Component}   parent      父级ViewModel
     * @param {object}      ownModel    私有的数据
     * @param {HTMLElement} element     元素对象
     */
    var RepeatItem = (function (_super) {
        __extends(RepeatItem, _super);
        function RepeatItem(parent, ownModel, element) {
            _super.call(this, ownModel);
            this.parent = parent;
            this.element = element;
            this._models = [];
        }
        RepeatItem.prototype.__init = function (ownModel) {
            var parent = this.parent;
            var models = parent._models;
            _super.prototype.__init.call(this, parent._model);
            this.filter = parent.filter;
            this.__proxyModel(ownModel);
            drunk.observable.create(ownModel);
            if (models) {
                models.forEach(function (model) {
                    this.__proxyModel(model);
                }, this);
            }
        };
        RepeatItem.prototype.proxy = function (property) {
            if (drunk.util.proxy(this, name, this._model)) {
                this.parent.proxy(name);
            }
        };
        RepeatItem.prototype.__getHandler = function (name) {
            var context = this;
            var handler = this[name];
            while (!handler && context.parent) {
                context = context.parent;
                handler = context[name];
            }
            if (!handler) {
                if (typeof window[name] !== 'function') {
                    throw new Error("Handler not found: " + name);
                }
                handler = window[name];
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
        RepeatItem.prototype.__proxyModel = function (model) {
            var _this = this;
            Object.keys(model).forEach(function (name) {
                drunk.util.proxy(_this, name, model);
            });
            this._models.push(model);
        };
        return RepeatItem;
    })(drunk.Component);
    /*
     * 把数据转成列表,如果为空则转成空数组
     */
    function toList(target) {
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
    }
})(drunk || (drunk = {}));
/// <reference path="../binding" />
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
var drunk;
(function (drunk) {
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
})(drunk || (drunk = {}));
/// <reference path="../binding" />
/// <reference path="../../component/component" />
/// <reference path="../../util/elem" />
/// <reference path="../../template/compiler" />
var drunk;
(function (drunk) {
    drunk.Binding.register("transclude", {
        /*
         * 初始化绑定,先注册transcludeResponse事件用于获取transclude的viewModel和nodelist
         * 然后发送getTranscludeContext事件通知
         */
        init: function () {
            var eventName = "transclude:setup";
            this.viewModel.addListener(eventName, this.setup.bind(this), true);
            this.viewModel.dispatchEvent(drunk.Component.GET_COMPONENT_CONTEXT, eventName);
        },
        /*
         * 设置transclude并创建绑定
         */
        setup: function (viewModel, element) {
            var nodes = [];
            var unbinds = [];
            var transclude = element.childNodes;
            var fragment = document.createDocumentFragment();
            drunk.util.toArray(transclude).forEach(function (node) {
                nodes.push(node);
                fragment.appendChild(node);
            });
            // 换掉节点
            drunk.elementUtil.replace(fragment, this.element);
            nodes.forEach(function (node) {
                // 编译模板病获取绑定创建函数
                // 保存解绑函数
                var bind = drunk.Template.compile(node);
                unbinds.push(bind(viewModel, node));
            });
            this.nodes = nodes;
            this.unbinds = unbinds;
        },
        /*
         * 释放绑定
         */
        release: function () {
            this.unbinds.forEach(function (unbind) { return unbind(); });
            this.nodes.forEach(function (node) { return drunk.elementUtil.remove(node); });
            this.unbinds = null;
            this.nodes = null;
        }
    });
})(drunk || (drunk = {}));
//# sourceMappingURL=drunk.js.map