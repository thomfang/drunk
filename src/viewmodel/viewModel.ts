/// <reference path="../util/util.ts" />
/// <reference path="../parser/parser.ts" />
/// <reference path="../promise/promise.ts" />
/// <reference path="../watcher/watcher.ts" />
/// <reference path="../binding/binding.ts" />
/// <reference path="../filter/filter" />


module drunk {

    export interface Model {
        [key: string]: any;
    }
    
    /**
     * ViewModel类， 实现数据与模板元素的绑定
     * 
     * @class ViewModel
     */
    export class ViewModel {

        _models: Model[];
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

        constructor(model?: Model) {
            model = model || {};
            observable.create(model);
            
            util.defineProperty(this, "_models", [model]);
            util.defineProperty(this, "_bindings", []);
            util.defineProperty(this, "_watchers", {});
        }
        
        /**
         * 初始化
         * @method initialize
         */
        initialize() {
            
        }
        
        /**
         * 代理某个属性到最新的Model上
         * 
         * @method proxy
         * @param  {string}  name  需要代理的属性名
         */
        proxy(name: string): void {
            if (ViewModel.isProxy(this, name)) {
                return;
            }

            var model = this._models[this._models.length - 1];
            ViewModel.proxy(this, name, model);
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
         * 把model数据转成json
         * @method toJSON
         */
        toJSON() {
            var json: Model = {};
            
            // 深度拷贝
            function deepClone(des, src) {
                Object.keys(src).forEach((key) => {
                    if (util.isObject(src[key])) {
                        des[key] = deepClone({}, src[key]);
                    }
                });
                return des;
            }
            
            this._models.forEach((model) => {
               deepClone(json, model);
            });
            
            return json;
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
         * 
         * @method release
         * @return  {Promise} 返回一个promise对象
         */
        release(): Promise<any> {
            return new Promise((resolve, reject) => {

            });
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