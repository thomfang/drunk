///<reference path="../../build/drunk.d.ts" />
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var drunk;
(function (drunk) {
    var config = drunk.config;
    var Component = drunk.Component;
    var RouterComponent = (function (_super) {
        __extends(RouterComponent, _super);
        function RouterComponent() {
            _super.apply(this, arguments);
            this.__routerList = [];
            this.__visibleMap = {};
        }
        /**
         * 启动
         * @param  rootElement  默认以document.body启动
         * @param  url          启动的路由
         */
        RouterComponent.prototype.start = function (rootElement, url) {
            if (rootElement === void 0) { rootElement = document.body; }
            if (url === void 0) { url = location.hash.slice(1); }
            this.__scanElement(rootElement);
            this.__initNavigationEvent();
            this.$mount(drunk.util.toArray(rootElement.childNodes));
            this.__navigate(url);
        };
        /**
         * 导航到指定url
         * @param  url           url参数
         * @param  replaceState  是否替换掉当前的页面历史纪录
         * @param  state         传递的参数
         */
        RouterComponent.prototype.navigate = function (url, replaceState, state) {
            this.__navigationState = state;
            if (replaceState) {
                location.replace(url);
            }
            else {
                location.href = url;
            }
        };
        /**
         * 后退
         */
        RouterComponent.prototype.back = function () {
            history.back();
        };
        RouterComponent.prototype.__enterView = function (view) {
            this.__currentView = view;
            if (typeof view['onEnter'] === 'function') {
                view['onEnter'](this.__routerState, this.__navigationState);
            }
        };
        RouterComponent.prototype.__exitView = function (view) {
            if (typeof view['onExit'] === 'function') {
                view['onExit']();
            }
        };
        RouterComponent.prototype.__scanElement = function (rootElement) {
            var _this = this;
            var nameOfRoute = config.prefix + 'route';
            var nameOfIndex = config.prefix + 'index';
            var nameOfIfBinding = config.prefix + 'if';
            var nameOfCreatedEvent = 'on-' + Component.Event.created;
            var nameOfReleaseEvent = 'on-' + Component.Event.release;
            var createdEventExpression = '__enterView($el)';
            var releaseEventExpression = '__exitView($el)';
            var route;
            var name;
            var scan = function (element) {
                // 检查所有的child元素节点
                drunk.util.toArray(element.children).forEach(function (node) {
                    name = node.tagName.toLowerCase();
                    if (name.indexOf('-') === -1 || !node.hasAttribute(nameOfRoute)) {
                        // 如果没有指定路由或不是一个自定义组件标签
                        if (node.children) {
                            scan(node);
                        }
                        return;
                    }
                    if (node.hasAttribute(nameOfIfBinding)) {
                        return console.error("\u8BBE\u7F6E\u4E86\u8DEF\u7531\u7684\u7EC4\u4EF6\u6807\u7B7E\u4E0A\u8BF7\u52FF\u518D\u4F7F\u7528'" + nameOfIfBinding + "'\u7ED1\u5B9A\u6307\u4EE4", node);
                    }
                    route = node.getAttribute(nameOfRoute); // 路由表
                    node.removeAttribute(nameOfRoute); // 移除属性
                    // 添加一个if绑定,通过改实例的__visibleMap数据来监控和注册组件创建/销毁的事件,
                    // 用于当理由切换时改变显示的组件和得到相应的组件实例
                    // 会生成类似这样: <my-component drunk-if='__visibleMap.myComponent'></my-component>
                    node.setAttribute(nameOfIfBinding, '__visibleMap["' + name + '"]');
                    node.setAttribute(nameOfCreatedEvent, createdEventExpression);
                    node.setAttribute(nameOfReleaseEvent, releaseEventExpression);
                    // 添加并解析路由,设置改组件默认不可见
                    _this.__addRoute(route, name);
                    _this.__visibleMap[name] = false;
                });
            };
            scan(rootElement);
            // 查找drunk-index路径
            this.__routeIndex = rootElement.getAttribute(nameOfIndex);
            if (!this.__routeIndex) {
                console.error(rootElement, "节点上未找到" + nameOfIndex + "设置");
            }
            rootElement.removeAttribute(nameOfIndex);
        };
        RouterComponent.prototype.__addRoute = function (route, viewId) {
            var routeReg = pathToRegexp(route);
            var paramArr = routeReg.keys.map(function (key) { return key.name; });
            delete routeReg.keys;
            this.__routerList.push({
                routeReg: routeReg,
                routeStr: route,
                paramArr: paramArr,
                viewId: viewId
            });
        };
        RouterComponent.prototype.__initNavigationEvent = function () {
            var _this = this;
            window.addEventListener("hashchange", function () {
                _this.__navigate(location.hash.slice(1));
            });
        };
        RouterComponent.prototype.__navigate = function (url) {
            var state;
            if (!url || !(state = this.__parseUrl(url))) {
                return this.navigate('#' + this.__routeIndex, true);
            }
            this.__routerState = state;
            if (this.__currentView) {
                // 如果存在当前组件
                if (this.__currentViewId === state.viewId) {
                    // 判断是否是在同一组件中导航,如果是,直接调用该组件的onEnter方法
                    this.__enterView(this.__currentView);
                }
                else {
                    // 设置当前组件隐藏
                    this.__visibleMap[this.__currentViewId] = false;
                }
            }
            // 设置导航到的组件显示
            this.__visibleMap[state.viewId] = true;
            this.__currentViewId = state.viewId;
        };
        RouterComponent.prototype.__parseUrl = function (url) {
            var saveParam = function (param, j) {
                params[param] = result[j + 1];
            };
            var result;
            var params;
            for (var router = void 0, i = 0, routeReg = void 0, routeStr = void 0, paramArr = void 0; router = this.__routerList[i]; i++) {
                routeReg = router.routeReg;
                routeStr = router.routeStr;
                paramArr = router.paramArr;
                if (routeReg.test(url)) {
                    result = routeReg.exec(url);
                    params = {};
                    paramArr.forEach(saveParam);
                    return {
                        url: url,
                        route: routeStr,
                        params: params,
                        viewId: router.viewId
                    };
                }
            }
        };
        return RouterComponent;
    }(Component));
    drunk.RouterComponent = RouterComponent;
    /**
     * The main path matching regexp utility.
     *
     * @type {RegExp}
     */
    var PATH_REGEXP = new RegExp([
        // Match already escaped characters that would otherwise incorrectly appear
        // in future matches. This allows the user to escape special characters that
        // shouldn't be transformed.
        '(\\\\.)',
        // Match Express-style parameters and un-named parameters with a prefix
        // and optional suffixes. Matches appear as:
        //
        // "/:test(\\d+)?" => ["/", "test", "\d+", undefined, "?"]
        // "/route(\\d+)" => [undefined, undefined, undefined, "\d+", undefined]
        '([\\/.])?(?:\\:(\\w+)(?:\\(((?:\\\\.|[^)])*)\\))?|\\(((?:\\\\.|[^)])*)\\))([+*?])?',
        // Match regexp special characters that should always be escaped.
        '([.+*?=^!:${}()[\\]|\\/])'
    ].join('|'), 'g');
    /**
     * Escape the capturing group by escaping special characters and meaning.
     *
     * @param  {String} group
     * @return {String}
     */
    function escapeGroup(group) {
        return group.replace(/([=!:$\/()])/g, '\\$1');
    }
    /**
     * Attach the keys as a property of the regexp.
     *
     * @param  {RegExp} re
     * @param  {Array}  keys
     * @return {RegExp}
     */
    var attachKeys = function (re, keys) {
        re.keys = keys;
        return re;
    };
    /**
     * Normalize the given path string, returning a regular expression.
     *
     * An empty array should be passed in, which will contain the placeholder key
     * names. For example `/user/:id` will then contain `["id"]`.
     *
     * @param  {(String|RegExp|Array)} path
     * @param  {Array}                 keys
     * @param  {Object}                options
     * @return {RegExp}
     */
    function pathToRegexp(path, keys, options) {
        if (keys && !Array.isArray(keys)) {
            options = keys;
            keys = null;
        }
        keys = keys || [];
        options = options || {};
        var strict = options.strict;
        var end = options.end !== false;
        var flags = options.sensitive ? '' : 'i';
        var index = 0;
        if (path instanceof RegExp) {
            // Match all capturing groups of a regexp.
            var groups = path.source.match(/\((?!\?)/g) || [];
            // Map all the matches to their numeric keys and push into the keys.
            keys.push.apply(keys, groups.definedComponent(function (match, index) {
                return {
                    name: index,
                    delimiter: null,
                    optional: false,
                    repeat: false
                };
            }));
            // Return the source back to the user.
            return attachKeys(path, keys);
        }
        if (Array.isArray(path)) {
            // Map array parts into regexps and return their source. We also pass
            // the same keys and options instance into every generation to get
            // consistent matching groups before we join the sources together.
            path = path.definedComponent(function (value) {
                return pathToRegexp(value, keys, options).source;
            });
            // Generate a new regexp instance by joining all the parts together.
            return attachKeys(new RegExp('(?:' + path.join('|') + ')', flags), keys);
        }
        // Alter the path string into a usable regexp.
        path = path.replace(PATH_REGEXP, function (match, escaped, prefix, key, capture, group, suffix, escape) {
            // Avoiding re-escaping escaped characters.
            if (escaped) {
                return escaped;
            }
            // Escape regexp special characters.
            if (escape) {
                return '\\' + escape;
            }
            var repeat = suffix === '+' || suffix === '*';
            var optional = suffix === '?' || suffix === '*';
            keys.push({
                name: key || index++,
                delimiter: prefix || '/',
                optional: optional,
                repeat: repeat
            });
            // Escape the prefix character.
            prefix = prefix ? '\\' + prefix : '';
            // Match using the custom capturing group, or fallback to capturing
            // everything up to the next slash (or next period if the param was
            // prefixed with a period).
            capture = escapeGroup(capture || group || '[^' + (prefix || '\\/') + ']+?');
            // Allow parameters to be repeated more than once.
            if (repeat) {
                capture = capture + '(?:' + prefix + capture + ')*';
            }
            // Allow a parameter to be optional.
            if (optional) {
                return '(?:' + prefix + '(' + capture + '))?';
            }
            // Basic parameter support.
            return prefix + '(' + capture + ')';
        });
        // Check whether the path ends in a slash as it alters some match behaviour.
        var endsWithSlash = path[path.length - 1] === '/';
        // In non-strict mode we allow an optional trailing slash in the match. If
        // the path to match already ended with a slash, we need to remove it for
        // consistency. The slash is only valid at the very end of a path match, not
        // anywhere in the middle. This is important for non-ending mode, otherwise
        // "/test/" will match "/test//route".
        if (!strict) {
            path = (endsWithSlash ? path.slice(0, -2) : path) + '(?:\\/(?=$))?';
        }
        // In non-ending mode, we need prompt the capturing groups to match as much
        // as possible by using a positive lookahead for the end or next path segment.
        if (!end) {
            path += strict && endsWithSlash ? '' : '(?=\\/|$)';
        }
        return attachKeys(new RegExp('^' + path + (end ? '$' : ''), flags), keys);
    }
    ;
    drunk.Application = new RouterComponent();
})(drunk || (drunk = {}));
//# sourceMappingURL=application.js.map