/// <reference path="../util/util.ts" />
/// <reference path="../promise/promise.ts" />
/// <reference path="../parser/parser.ts" />
/// <reference path="../observable/observable.ts" />

module drunk {

    export class Watcher {
        
        /**
         * 根据表达式和是否深度监听生成唯一的key,用于储存在关联的viewModel实例的watcher表中
         * @method getNameOfKey
         * @static
         * @param  {string}   expression  表达式
         * @param  {boolean}  isDeepWatch 是否深度监听
         * @return {string}   返回一个生成的key
         */
        static getNameOfKey(expression: string, isDeepWatch?: boolean): string {
            return !!isDeepWatch ? expression + '<deep>' : expression;
        }

        private _isInterpolate: boolean;
        private _actions: IBindingUpdateAction[] = [];
        private _observers: { [id: string]: observable.Observer } = {};
        private _properties: { [number: string]: {[property: string]: boolean}} = {};
        private _tmpObservers: { [id: string]: observable.Observer };
        private _tmpProperties: { [number: string]: {[property: string]: boolean}};

        private _timerid: number;
        private _getter: parser.IGetter;
        
        /**
         * 表达式求值的结果
         * @property value
         * @type any
         */
        value: any;
        
        /**
         * 是否还是个活动的watcher
         * @property _isActived
         * @private
         * @type boolean
         */
        private _isActived: boolean = true;
        
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
        constructor(private viewModel: ViewModel, private expression: string, private isDeepWatch?: boolean) {
            this._isInterpolate = parser.hasInterpolation(expression);
            this._getter = this._isInterpolate ? parser.parseInterpolate(expression) : parser.parseGetter(expression);
            
            if (!this._getter.dynamic) {
                throw new Error('不能监控一个静态表达式:"' + expression + '"');
            }
            
            this.__propertyChanged = this.__propertyChanged.bind(this);
        }
        
        /**
         * 添加数据更新回调
         * @method addAction
         * @param {function} action  回调函数
         */
        addAction(action: IBindingUpdateAction): void {
            util.addArrayItem(this._actions, action);
        }
        
        /**
         * 移除数据更新回调
         * 
         * @method removeAction
         * @param  {function} action 回调函数
         */
        removeAction(action: IBindingUpdateAction): void {
            util.removeArrayItem(this._actions, action);

            if (!this._actions.length) {
                this.dispose();
            }
        }
        
        /**
         * 数据更新派发，会先做缓冲，防止在同一时刻对此出发更新操作，等下一次系统轮训时再真正执行更新操作
         * @method __propertyChanged
         */
        __propertyChanged(): void {
            clearTimeout(this._timerid);
            this._timerid = util.nextTick(this.__runActions, this);
        }
        
        /**
         * 立即获取最新的数据判断并判断是否已经更新，如果已经更新，执行所有的回调
         * @method __runActions
         * @private
         * @return {Promise} 等待所有回调执行完毕的promise对象
         */
        __runActions(): void {
            let oldValue: any = this.value;
            let newValue: any = this.__getValue();

            if ((typeof newValue === 'object' && newValue != null) || newValue !== oldValue) {
                this._actions.slice().forEach((action) => {
                    action(newValue, oldValue);
                });
            }
        }
        
        /**
         * 释放引用和内存
         * @method dispose 
         */
        dispose() {
            if (!this._isActived) {
                return;
            }

            Object.keys(this._observers).forEach((id) => {
                Object.keys(this._properties[id]).forEach(property => {
                    this._observers[id].removeListener(property, this.__propertyChanged);
                });
            });

            let key: string = Watcher.getNameOfKey(this.expression, this.isDeepWatch);
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
        }
        
        /**
         * 执行表达式函数获取最新的数据
         * @method __getValue
         * @private
         * @return {any}
         */
        private __getValue(): any {
            this.__beforeGetValue();

            let newValue: any = this._getter(this.viewModel);

            if (this.isDeepWatch) {
                visit(newValue);
            }

            if (this._getter.filters) {
                // 派发到各个filter中处理
            }

            this.__afterGetValue();

            return newValue;
        }
        
        /**
         * 设置observable的属性访问回调为当前watcher实例的订阅方法,当访问某个属性是就会对该属性进行订阅
         * @method __beforeGetValue
         * @private
         */
        private __beforeGetValue(): void {
            this._tmpObservers = {};
            this._tmpProperties = {};
            observable.onAccessingProperty = this._subscribePropertyChanged.bind(this);
        }
        
        /**
         * 表达式求解完后的收尾工作,取消注册onPropertyAccessed回调,并对比旧的observer表和新的表看有哪些
         * 实例已经不需要订阅
         * @method __afterGetValue
         * @private
         */
        private __afterGetValue(): void {
            // 清楚属性访问回调
            observable.onAccessingProperty = null;
            
            let observers = this._observers;
            let properties = this._properties;
            let tmpObservers = this._tmpObservers;
            let tmpProperties = this._tmpProperties;
            let propertyChanged = this.__propertyChanged;
            
            Object.keys(observers).forEach(function (id) {
                let observer = observers[id];
                
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
        }
    
        /**
         * 订阅属性的更新消息
         * @method __subscribePropertyChanged
         * @private
         * @param  {Observer} observer 属性的所属观察者
         * @param  {string}   property 属性名
         */
        private _subscribePropertyChanged(observer: observable.Observer, property: string) {
            let id = util.uuid(observer);
            let propertyChanged = this.__propertyChanged;
    
            if (!this._tmpObservers[id]) {
                // 添加到临时订阅observer表
                // 添加到临时订阅属性列表
                this._tmpObservers[id] = observer;
                this._tmpProperties[id] = {[property]: true};
                
    
                if (!this._observers[id]) {
                    // 如果旧的订阅表也没有,则添加到旧表,并在判断
                    this._observers[id] = observer;
                    this._properties[id] = {[property]: true};
                    
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
        }
    }
    
    // 遍历访问所有的属性以订阅所有的数据
    function visit(target: any) {
        if (util.isObject(target)) {
            Object.keys(target).forEach(key => {
                visit(target[key]);
            });
        }
        else if (Array.isArray(target)) {
            target.forEach(item => {
                visit(item);
            });
        }
    }
}