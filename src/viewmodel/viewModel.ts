/// <reference path="../util/util.ts" />
/// <reference path="../parser/parser.ts" />
/// <reference path="../promise/promise.ts" />
/// <reference path="../watcher/watcher.ts" />
/// <reference path="../binding/binding.ts" />
/// <reference path="../filter/filter" />
/// <reference path="../events/events" />


module drunk {

    export interface IModel {
        [key: string]: any;
    }
    
    /**
     * ViewModel类， 实现数据与模板元素的绑定
     * 
     * @class ViewModel
     */
    export class ViewModel extends Events {

        _model: IModel;
        _bindings: Binding[];
        _watchers: { [on: string]: Watcher };
        
        /**
         * 过滤器方法,包含内置的
         * @property filter
         * @type Filter
         */
        filter: {[name: string]: filter.Filter};
        
        /**
         * 事件处理方法集合
         * @property handlers
         * @type object
         */
        handlers: {[name: string]: (...args: any[]) => any};

        /**
         * constructor
         * @param  {IModel} [model] 数据
         */
        constructor(model?: IModel) {
            super();
            
            model = model || {};
            observable.create(model);
            
            util.defineProperty(this, "_model", model);
            util.defineProperty(this, "_bindings", []);
            util.defineProperty(this, "_watchers", {});
        }
        
        /**
         * 代理某个属性到最新的IModel上
         * 
         * @method proxy
         * @param  {string}  name  需要代理的属性名
         */
        proxy(name: string): void {
            if (ViewModel.isProxy(this, name)) {
                return;
            }
            
            var value = this[name];
            
            ViewModel.proxy(this, name, this._model);
            
            if (value !== undefined) {
                this[name] = value;
            }
        }
        
        /**
         * 获取事件回调
         * 
         * @method getHandler
         * @param  {string}  handlerName  时间回调名称
         * @return {ViewModel} 返回事件处理函数
         */
        getHandler(handlerName: string): Function {
            var handler = this.handlers[handlerName];
            var context: any = this;
            
            if (!handler) {
                if (typeof window[handlerName] === 'function') {
                    handler = window[handlerName];
                    context = window;
                }
                throw new Error(handlerName + ": 没有找到该事件处理方法");
            }
            
            return (...args: any[]) => {
                handler.apply(context, args);
            };
        }
        
        /**
         * 执行表达式并返回结果
         * 
         * @method eval
         * @param  {string}  expression      表达式
         * @param  {boolean} [isInterpolate] 是否是插值表达式
         * @return {string}                  结果
         */
        eval(expression: string, isInterpolate?: boolean): any {
            var getter: parser.Getter;
            var value: any;
            
            if (isInterpolate) {
                getter = parser.parseInterpolate(expression);
            }
            else {
                getter = parser.parseGetter(expression);
            }
            
            value = getter.call(undefined, this);
            
            if (getter.filters) {
                value = filter.applyFilters(value, getter.filters, this);
            }
            
            return value;
        }
        
        /**
         * 根据表达式设置值
         * 
         * @method setValue
         * @param  {string}  expression  表达式
         * @param  {any}     value       值
         */
        setValue(expression: string, value: any): void {
            var setter = parser.parseSetter(expression);
            setter.call(undefined, this, value);
        }
        
        /**
         * 把model数据转成json并返回
         * @method getModel
         * @return {IModel}  反悔json格式的不带getter/setter的model
         */
        getModel() {
            // 深度拷贝
            function deepClone(des, src) {
                Object.keys(src).forEach((key) => {
                    if (util.isObject(src[key])) {
                        des[key] = deepClone({}, src[key]);
                    }
                });
                return des;
            }
            
            return deepClone({}, this._model);
        }
        
        /**
         * 监听表达式的里每个数据的变化
         * 
         * @method watch
         * @param  {string}  expression  表达式
         */
        watch(expression: string, action: BindingUpdateAction, isDeepWatch?: boolean) {
            var key: string = Watcher.getReferKey(expression, isDeepWatch);
            var watcher: Watcher;

            watcher = this._watchers[key];

            if (!watcher) {
                watcher = new Watcher(this, expression, isDeepWatch);
            }

            var wrappedAction: BindingUpdateAction = (newValue: any, oldValue: any) => {
                action.call(this, newValue, oldValue);
            };

            watcher.addAction(wrappedAction);

            return () => {
                watcher.removeAction(wrappedAction);
            };
        }
        
        /**
         * 释放ViewModel实例的所有元素与数据的绑定
         * 解除所有的代理属性
         * 解除所有的视图于数据绑定
         * 移除事件缓存
         * 销毁所有的watcher
         * 
         * @method dispose
         */
        dispose() {
            Object.keys(this._model).forEach((property) => {
                delete this[property];
            });
            
            Object.keys(this._watchers).forEach((key) => {
                this._watchers[key].dispose();
            });
            
            this._bindings.forEach((binding) => {
                binding.dispose();
            });
            
            this._model = null;
            this._events = null;
            this._bindings = null;
            this._watchers = null;
        }
    }

    export module ViewModel {
        /**
         * 数据代理，把对象a的某个属性的读写代理到对象b上
         * 
         * @method proxy
         * @static
         * @param  {object}  a    对象a
         * @param  {string}  name 代理的属性名
         * @param  {object}  b    对象b
         */
        export function proxy(a: Object, name: string, b: Object): void {
            Object.defineProperty(a, name, {
                enumerable: true,
                configurable: true,
                get: propertyGetterSetter,
                set: propertyGetterSetter
            });

            function propertyGetterSetter() {
                if (arguments.length === 0) {
                    return b[name];
                }
                b[name] = arguments[0];
            }
        }
        
        /**
         * 判断对象上的某个属性是否代理到其他对象上
         * 
         * @method isProxy
         * @static
         * @param  {object} target 目标对象
         * @param  {string} name   属性名
         * @return {boolean}       是否代理
         */
        export function isProxy(target: Object | ViewModel, name: string): boolean {
            var descriptor = Object.getOwnPropertyDescriptor(target, name);

            return descriptor && descriptor.get === descriptor.set;
        }
    }
}