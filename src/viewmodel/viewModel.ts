/// <reference path="../util/util.ts" />
/// <reference path="../parser/parser.ts" />
/// <reference path="../promise/promise.ts" />
/// <reference path="../watcher/watcher.ts" />
/// <reference path="../binding/binding.ts" />
/// <reference path="../filter/filter" />
/// <reference path="../events/events" />


module drunk {

    export interface IModel extends observable.ObservableObject {
        [key: string]: any;
    }
    
    var counter = 0;
    
    /**
     * ViewModel类， 实现数据与模板元素的绑定
     * 
     * @class ViewModel
     */
    export class ViewModel extends Events {
        
        /**
         * 实例是否未被释放
         * @property _isActived
         * @type boolean
         */
        _isActived: boolean;

        /**
         * 数据对象
         * @property _model
         * @type object
         * @private
         */
        _model: IModel;
        
        /**
         * 该实例下所有的绑定实例的列表
         * @property _bindings
         * @type Array<Binding>
         * @private
         */
        _bindings: Binding[];
        
        /**
         * 该实例下所有的watcher实例表
         * @property _watchers
         * @type {[expression]: Watcher}
         * @private
         */
        _watchers: { [on: string]: Watcher };
        
        /**
         * 唯一id
         * @property $id
         * @type number
         */
        $id: number;
        
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
            
            this.__init();
        }
        
        protected __init(model?: IModel) {
            model = model || {};
            observable.create(model);
    
            util.defineProperty(this, "$id", counter++);
            util.defineProperty(this, "filter", Object.create(filter.filters));
            util.defineProperty(this, "_model", model);
            util.defineProperty(this, "_bindings", []);
            util.defineProperty(this, "_watchers", {});
            util.defineProperty(this, "_isActived", true);
            
            Object.keys(model).forEach((property) => {
                this.proxy(property);
            });
        }
        
        /**
         * 代理某个属性到最新的IModel上
         * 
         * @method proxy
         * @param  {string}  name  需要代理的属性名
         */
        proxy(name: string): void {
            var value = this[name];
        
            if (value === undefined) {
                value = this._model[name];
            }
            
            if (util.proxy(this, name, this._model)) {
                this._model.setProperty(name, value);
            }
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
            var getter;
        
            if (isInterpolate) {
                getter = parser.parseInterpolate(expression);
                
                if (!getter) {
                    return expression;
                }
            }
            else {
                getter = parser.parseGetter(expression);
            }
            
            return this.__getValueByGetter(getter, isInterpolate);
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
        watch(expression: string, action: BindingUpdateAction, isDeepWatch?: boolean, isImmediate?: boolean) {
            var key: string = Watcher.getNameOfKey(expression, isDeepWatch);
            var watcher: Watcher;

            watcher = this._watchers[key];

            if (!watcher) {
                watcher = new Watcher(this, expression, isDeepWatch);
            }

            var wrappedAction: BindingUpdateAction = (newValue: any, oldValue: any) => {
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
            
            Events.cleanup(this);
            
            this._model = null;
            this._bindings = null;
            this._watchers = null;
        }
        
        /**
         * 获取事件回调,内置方法
         * 
         * @method __getHandler
         * @internal
         * @param  {string}  handlerName  时间回调名称
         * @return {ViewModel} 返回事件处理函数
         */
        __getHandler(handlerName: string): Function {
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
         * 根据getter函数获取数据
         * @method __getValueByGetter
         * @param  {function}    getter         表达式解析生成的getter函数
         * @param  {boolean}     isInterpolate  是否是插值表达式
         * @param  {Event}       [event]        事件对象
         * @param  {HTMLElement} [el]           元素对象
         * @return {any}
         */
        __getValueByGetter(getter, isInterpolate) {
            var args = [this].concat(util.toArray(arguments).slice(1));
            var value = getter.apply(null, args);
            return filter.applyFilters.apply(null, [value, getter.filters, this.filter, isInterpolate].concat(args));
        };
    }
}