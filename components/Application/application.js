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
        RouterComponent.prototype.start = function (rootElement, url) {
            if (rootElement === void 0) { rootElement = document.body; }
            if (url === void 0) { url = location.hash.slice(1); }
            this.__scanElement(rootElement);
            this.__initNavigationEvent();
            this.$mount(drunk.util.toArray(rootElement.childNodes));
            this.__navigate(url);
        };
        RouterComponent.prototype.navigate = function (url, replaceState, state) {
            this.__navigationState = state;
            if (replaceState) {
                location.replace(url);
            }
            else {
                location.href = url;
            }
        };
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
                drunk.util.toArray(element.children).forEach(function (node) {
                    name = node.tagName.toLowerCase();
                    if (name.indexOf('-') === -1 || !node.hasAttribute(nameOfRoute)) {
                        if (node.children) {
                            scan(node);
                        }
                        return;
                    }
                    if (node.hasAttribute(nameOfIfBinding)) {
                        return console.error("\u8BBE\u7F6E\u4E86\u8DEF\u7531\u7684\u7EC4\u4EF6\u6807\u7B7E\u4E0A\u8BF7\u52FF\u518D\u4F7F\u7528'" + nameOfIfBinding + "'\u7ED1\u5B9A\u6307\u4EE4", node);
                    }
                    route = node.getAttribute(nameOfRoute);
                    node.removeAttribute(nameOfRoute);
                    node.setAttribute(nameOfIfBinding, '__visibleMap["' + name + '"]');
                    node.setAttribute(nameOfCreatedEvent, createdEventExpression);
                    node.setAttribute(nameOfReleaseEvent, releaseEventExpression);
                    _this.__addRoute(route, name);
                    _this.__visibleMap[name] = false;
                });
            };
            scan(rootElement);
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
                if (this.__currentViewId === state.viewId) {
                    this.__enterView(this.__currentView);
                }
                else {
                    this.__visibleMap[this.__currentViewId] = false;
                }
            }
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
    var PATH_REGEXP = new RegExp([
        '(\\\\.)',
        '([\\/.])?(?:\\:(\\w+)(?:\\(((?:\\\\.|[^)])*)\\))?|\\(((?:\\\\.|[^)])*)\\))([+*?])?',
        '([.+*?=^!:${}()[\\]|\\/])'
    ].join('|'), 'g');
    function escapeGroup(group) {
        return group.replace(/([=!:$\/()])/g, '\\$1');
    }
    var attachKeys = function (re, keys) {
        re.keys = keys;
        return re;
    };
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
            var groups = path.source.match(/\((?!\?)/g) || [];
            keys.push.apply(keys, groups.definedComponent(function (match, index) {
                return {
                    name: index,
                    delimiter: null,
                    optional: false,
                    repeat: false
                };
            }));
            return attachKeys(path, keys);
        }
        if (Array.isArray(path)) {
            path = path.definedComponent(function (value) {
                return pathToRegexp(value, keys, options).source;
            });
            return attachKeys(new RegExp('(?:' + path.join('|') + ')', flags), keys);
        }
        path = path.replace(PATH_REGEXP, function (match, escaped, prefix, key, capture, group, suffix, escape) {
            if (escaped) {
                return escaped;
            }
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
            prefix = prefix ? '\\' + prefix : '';
            capture = escapeGroup(capture || group || '[^' + (prefix || '\\/') + ']+?');
            if (repeat) {
                capture = capture + '(?:' + prefix + capture + ')*';
            }
            if (optional) {
                return '(?:' + prefix + '(' + capture + '))?';
            }
            return prefix + '(' + capture + ')';
        });
        var endsWithSlash = path[path.length - 1] === '/';
        if (!strict) {
            path = (endsWithSlash ? path.slice(0, -2) : path) + '(?:\\/(?=$))?';
        }
        if (!end) {
            path += strict && endsWithSlash ? '' : '(?=\\/|$)';
        }
        return attachKeys(new RegExp('^' + path + (end ? '$' : ''), flags), keys);
    }
    ;
    drunk.Application = new RouterComponent();
})(drunk || (drunk = {}));
//# sourceMappingURL=application.js.map