/// <reference path="../util/util.ts" />
/// <reference path="../promise/promise.ts" />
/// <reference path="../watcher/watcher.ts" />
/// <reference path="../binding/binding.ts" />

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
        
        protected _models: Model[] = [{}];
        protected _bindings: Binding[] = [];
        protected _watchers: {[expression: string]: Watcher} = {};
        
        private _getLastModel(): Model {
            return this._models[this._models.length - 1];
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
            
            ViewModel.proxy(this, name, this._getLastModel());
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
         * 添加绑定实例
         * 
         * @method addBinding
         * @param  {Binding}  binding  绑定实例
         */
        addBinding(binding: any): void {
            util.addArrayItem(this._bindings, binding);
        }
        
        /**
         * 获取指定表达式的watcher
         * 
         * @method getWatcher
         * @param  {string}  expression     监控表达式
         * @param  {boolean} [isDeepWatch]  是否深度监控
         * @return {Watcher}                返回对应表达式的Watcher实例
         */
        getWatcher(expression: string, isDeepWatch = false): Watcher {
            var watcher: Watcher;
            
            return watcher;
        }
        
        /**
         * 执行时间回调
         * 
         * @method invokeHandler
         * @param  {string}  handlerName  时间回调名称
         * @return {ViewModel} 返回实例用于链式调用
         */
        invokeHandler(handlerName: string): ViewModel {
            return this;
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
        
        /**
         * 数据代理，把对象a的某个属性的读写代理到对象b上
         * 
         * @method proxy
         * @static
         * @param  {object}  a    对象a
         * @param  {string}  name 代理的属性名
         * @param  {object}  b    对象b
         */
        static proxy(a: Object, name: string, b: Object): void {
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
        static isProxy(target: Object | ViewModel, name: string): boolean {
            var descriptor = Object.getOwnPropertyDescriptor(target, name);
            
            return descriptor && descriptor.get === descriptor.set;
        }
    }
}