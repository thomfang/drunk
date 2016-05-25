/// <reference path="../util/util.ts" />
/// <reference path="../parser/parser.ts" />
/// <reference path="../watcher/watcher.ts" />
/// <reference path="../binding/binding.ts" />
/// <reference path="../filter/filter.ts" />
/// <reference path="../events/eventemitter.ts" />

namespace drunk {

    import util = drunk.util;
    import Parser = drunk.Parser;
    import Filter = drunk.Filter;
    import Watcher = drunk.Watcher;
    import observable = drunk.observable;
    import EventEmitter = drunk.EventEmitter;

    var global = util.global;

    export interface IModel extends observable.IObservableObject {
        [key: string]: any;
    }

    /**
     * Decorator for ViewModel#$computed
     */
    export function computed(target: ViewModel, property: string, descriptor: PropertyDescriptor) {
        let getter: any;
        let setter: any;
        let proxies: string[];

        if (descriptor.get) {
            getter = descriptor.get;
            proxies = Parser.getProxyProperties(descriptor.get);
        }
        if (descriptor.set) {
            setter = descriptor.set;
        }

        function computedGetterSetter() {
            if (!arguments.length) {
                if (getter) {
                    if (proxies) {
                        proxies.forEach(prop => this.$proxy(prop));
                    }
                    try {
                        return getter.call(this);
                    } catch (e) { }
                }
            }
            else if (setter) {
                try {
                    setter.call(this, arguments[0]);
                } catch (e) { }
            }
        }

        descriptor.get = computedGetterSetter;
        descriptor.set = computedGetterSetter;
        descriptor.enumerable = true;
        descriptor.configurable = true;

        return descriptor;
    }

    /**
     * ViewModel类， 实现数据与模板元素的绑定
     */
    export class ViewModel extends EventEmitter {

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
        _watchers: { [expression: string]: Watcher };

        /** 代理的属性 */
        _proxyProps: { [property: string]: boolean };

        /**
         * 过滤器方法,包含内置的
         */
        $filter: { [name: string]: Filter.IFilter };

        /**
         * 事件处理方法集合
         */
        handlers: { [name: string]: (...args: any[]) => any };

        /**
         * @param  model  初始化数据
         */
        constructor(model?: IModel) {
            super();

            this.__init(model);
        }

        /**
         * 初始化私有属性,并对model里的所有字段进行代理处理
         * @param  model  数据对象
         */
        protected __init(model?: IModel) {
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

            Object.keys(model).forEach((property) => {
                this.$proxy(property);
            });
        }

        /**
         * 代理某个属性到最新的IModel上
         * @param   property  需要代理的属性名
         */
        $proxy(property: string): void {
            if (this._proxyProps[property]) {
                return;
            }
            var value = this[property];

            if (value === undefined) {
                value = this._model[property];
            }

            if (util.proxy(this, property, this._model)) {
                this._model.$set(property, value);
            }
            this._proxyProps[property] = true;
        }

        /**
         * 执行表达式并返回结果
         * @param   expression      表达式
         * @param   isInterpolate   是否是插值表达式
         */
        $eval(expression: string, isInterpolate?: boolean): any {
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
        }

        /**
         * 根据表达式设置值
         * @param   expression  表达式
         * @param   value       值
         */
        $setValue(expression: string, value: any): void {
            var setter = Parser.parseSetter(expression);
            setter.call(this, value);
        }

        /**
         * 把model数据转成json并返回
         * @return   json格式的不带getter/setter的model对象
         */
        $getModel() {
            let model = {};
            Object.keys(this._proxyProps).forEach(prop => model[prop] = this._model[prop]);
            return util.extend(model, util.deepClone(this._model));
        }

        /**
         * 监听表达式的里每个数据的变化
         * @param   expression  表达式
         * @return              返回一个取消监听的函数
         */
        $watch(expression: string, action: IBindingUpdateAction, isDeepWatch?: boolean, isImmediate?: boolean) {
            var key: string = Watcher.getNameOfKey(expression, isDeepWatch);
            var watcher: Watcher;

            watcher = this._watchers[key];

            if (!watcher) {
                watcher = this._watchers[key] = new Watcher(this, expression, isDeepWatch);
            }

            var wrappedAction: IBindingUpdateAction = (newValue: any, oldValue: any) => {
                action.call(this, newValue, oldValue);
            };

            watcher.addAction(wrappedAction);

            if (isImmediate) {
                wrappedAction(watcher.value, undefined);
            }

            return () => {
                watcher.removeAction(wrappedAction);
            };
        }

        $computed(property: string, descriptor: () => any);
        $computed(property: string, descriptor: { set?: (value: any) => void, get?: () => any; });
        $computed(property: string, descriptor: any) {
            let observer = observable.create(this._model);
            if (typeof descriptor === 'function') {
                descriptor = {
                    get: descriptor
                };
            }
            descriptor = computed(this, property, descriptor);
            Object.defineProperty(this, property, descriptor);
            this._proxyProps[property] = true;
            observer.$emit(property);
        }

        /**
         * 释放ViewModel实例的所有元素与数据的绑定,解除所有的代理属性,解除所有的视图与数据绑定,移除事件缓存,销毁所有的watcher
         */
        $release() {
            if (!this._isActived) {
                return;
            }

            Object.keys(this._proxyProps).forEach(property => {
                delete this[property];
            });

            Object.keys(this._watchers).forEach(key => {
                if (this._watchers[key]) {
                    this._watchers[key].dispose();
                }
            });

            this._bindings.slice().forEach(binding => {
                binding.$dispose();
            });

            EventEmitter.cleanup(this);

            this._isActived = false;
            this._model = this._bindings = this._watchers = this._proxyProps = this.$filter = null;
        }

        /**
         * 获取事件回调,内置方法
         * @param  handlerName  事件回调名称
         * @return              返回事件处理函数
         */
        protected __getHandler(handlerName: string): Function {
            var handler = this[handlerName];
            var context: any = this;

            if (!handler) {
                if (typeof global[handlerName] === 'function') {
                    handler = global[handlerName];
                    context = global;
                }
                else {
                    throw new Error(handlerName + ": 没有找到该事件处理方法");
                }
            }

            return (...args: any[]) => {
                handler.apply(context, args);
            };
        }

        /**
         * 根据getter函数获取数据
         * @param   getter         表达式解析生成的getter函数
         * @param   isInterpolate  是否是插值表达式
         * @param   event          事件对象
         * @param   el             元素对象
         */
        protected __execGetter(getter, isInterpolate) {
            var value = getter.call(this);
            return Filter.pipeFor.apply(null, [value, getter.filters, this.$filter, isInterpolate, this]);
        }
    }
}