/// <reference path="../util/util.ts" />
/// <reference path="../parser/parser.ts" />
/// <reference path="../watcher/watcher.ts" />
/// <reference path="../binding/binding.ts" />
/// <reference path="../filter/filter.ts" />
/// <reference path="../events/eventemitter.ts" />

namespace drunk {

    import util = drunk.util;
    import parser = drunk.parser;
    import Watcher = drunk.Watcher;
    import observable = drunk.observable;
    import EventEmitter = drunk.EventEmitter;

    export interface IModel extends observable.IObservableObject {
        [key: string]: any;
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

        /**
         * 过滤器方法,包含内置的
         */
        $filter: { [name: string]: filter.IFilter };

        /**
         * 事件处理方法集合
         */
        handlers: { [name: string]: (...args: any[]) => any };

        /**
         * @param   model  初始化数据
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

            util.defineProperty(this, "$filter", Object.create(filter.filters));
            util.defineProperty(this, "_model", model);
            util.defineProperty(this, "_bindings", []);
            util.defineProperty(this, "_watchers", {});
            util.defineProperty(this, "_isActived", true);

            Object.keys(model).forEach((property) => {
                this.$proxy(property);
            });
        }

        /**
         * 代理某个属性到最新的IModel上
         * @param   property  需要代理的属性名
         */
        $proxy(property: string): void {
            var value = this[property];

            if (value === undefined) {
                value = this._model[property];
            }

            if (util.proxy(this, property, this._model)) {
                this._model.$set(property, value);
            }
        }

        /**
         * 执行表达式并返回结果
         * @param   expression      表达式
         * @param   isInterpolate   是否是插值表达式
         */
        $eval(expression: string, isInterpolate?: boolean): any {
            var getter;

            if (isInterpolate) {
                if (!parser.hasInterpolation(expression)) {
                    return expression;
                }
                getter = parser.parseInterpolate(expression);
            }
            else {
                getter = parser.parseGetter(expression);
            }

            return this.__getValueByGetter(getter, isInterpolate);
        }

        /**
         * 根据表达式设置值
         * @param   expression  表达式
         * @param   value       值
         */
        $setValue(expression: string, value: any): void {
            var setter = parser.parseSetter(expression);
            setter.call(undefined, this, value);
        }

        /**
         * 把model数据转成json并返回
         * @return   json格式的不带getter/setter的model对象
         */
        $getModel() {
            return util.deepClone(this._model);
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
            let getter: Function;
            let setter: Function;

            if (typeof descriptor === 'function') {
                getter = descriptor;
                parser.getProxyProperties(descriptor).forEach(p => this.$proxy(p));
            }
            else {
                if (descriptor.get) {
                    getter = descriptor.get;
                    parser.getProxyProperties(descriptor.get).forEach(p => this.$proxy(p));
                }
                if (descriptor.set) {
                    setter = descriptor.set;
                    parser.getProxyProperties(descriptor.set).forEach(p => this.$proxy(p));
                }
            }

            function computedGetterAndSetter() {
                if (!arguments.length) {
                    if (getter) {
                        return getter.call(this);
                    }
                }
                else if (setter) {
                    setter.call(this, arguments[0]);
                }
            }

            Object.defineProperty(this, property, {
                configurable: true,
                enumerable: true,
                set: computedGetterAndSetter,
                get: computedGetterAndSetter
            });
        }

        /**
         * 释放ViewModel实例的所有元素与数据的绑定,解除所有的代理属性,解除所有的视图于数据绑定,移除事件缓存,销毁所有的watcher
         */
        $release() {
            if (!this._isActived) {
                return;
            }

            Object.keys(this._model).forEach(property => {
                delete this[property];
            });

            Object.keys(this._watchers).forEach(key => {
                if (this._watchers[key]) {
                    this._watchers[key].dispose();
                }
            });

            this._bindings.slice().forEach(binding => {
                binding.dispose();
            });

            EventEmitter.cleanup(this);

            this._isActived = false;
            this._model = this._bindings = this._watchers = this.$filter = null;
        }

        /**
         * 获取事件回调,内置方法
         * @param  handlerName  事件回调名称
         * @return              返回事件处理函数
         */
        __getHandler(handlerName: string): Function {
            var handler = this[handlerName];
            var context: any = this;

            if (!handler) {
                if (typeof window[handlerName] === 'function') {
                    handler = window[handlerName];
                    context = window;
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
        __getValueByGetter(getter, isInterpolate) {
            var args = [this].concat(util.toArray(arguments).slice(1));
            var value = getter.apply(null, args);
            return filter.pipeFor.apply(null, [value, getter.filters, this.$filter, isInterpolate].concat(args));
        }
    }
}