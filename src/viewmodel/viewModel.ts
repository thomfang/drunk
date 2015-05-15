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
     * namespace drunk
     */
    export class ViewModel {

        _models: Model[];
        _bindings: Binding[];
        _watchers: { [on: string]: Watcher };
        
        /**
         * 过滤器方法,包含内置的
         */
        filter: {[name: string]: filter.Filter};

        constructor() {
            util.defineProperty(this, "_models", [{}]);
            util.defineProperty(this, "_bindings", []);
            util.defineProperty(this, "_watchers", {});
        }
        
        /**
         * 初始化
         * @method initialize
         */
        initialize() {
            util.defineProperty(this, "filter", Object.create(filter.filters));
        }
        
        /**
         * 代理某个属性到指定的model上
         * 
         * @method proxyKeyToModel
         * @param  {string}  key    需要代理的属性
         * @param  {object}   model  数据源
         */
        proxyKeyToModel(key: string, model: Model): void {

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
         * 代理model上的所以key到model上，当访问viewModel上的key是会引用到model上的值
         * 
         * @method proxyToModel
         * @param  {object}  model  数据
         */
        proxyToModel(model: Model): void {
            Object.keys(model).forEach((name) => {
                ViewModel.proxy(this, name, model);
            });
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
         * 获取事件回调
         * 
         * @method getHandler
         * @param  {string}  handlerName  时间回调名称
         * @return {ViewModel} 返回实例用于链式调用
         */
        getHandler(handlerName: string): ViewModel {
            return this;
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
            if (isInterpolate) {
                getter = parser.parseInterpolate(expression);
            }
            else {
                getter = parser.parseGetter(expression);
            }
            return getter.call(undefined, this);
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