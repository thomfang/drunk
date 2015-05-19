/// <reference path="../util/util.ts" />
/// <reference path="../promise/promise.ts" />
/// <reference path="../parser/parser.ts" />
/// <reference path="../observable/observable.ts" />

module drunk {

    export class Watcher {
        
        /**
         * 根据表达式和是否深度监听生成唯一的key,用于储存在关联的viewModel实例的watcher表中
         * @method getReferKey
         * @static
         * @param  {string}   expression  表达式
         * @param  {boolean}  isDeepWatch 是否深度监听
         * @return {string}   返回一个生成的key
         */
        static getReferKey(expression: string, isDeepWatch?: boolean): string {
            return !!isDeepWatch ? expression + '<deep>' : expression;
        }

        private _actions: BindingUpdateAction[] = [];
        private _observers: { [id: string]: observable.Observer } = {};
        private _tmpObservers: { [id: string]: observable.Observer };
        private _properties: { [id: string]: string } = {};

        private _timerid: number;
        private _getter: parser.Getter;
        private _setter: parser.Setter;
        
        /**
         * 表达式求值的结果
         * @property value
         * @type any
         */
        value: any;
        
        /**
         * 是否还是个活动的watcher
         * @property isActived
         * @type boolean
         */
        isActived: boolean = true;
        
        /**
         * 是否已经初始化得到数据
         * @property initialized
         * @type boolean
         */
        initialized: boolean;
        
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
            this.propertyChanged = this.propertyChanged.bind(this);
            this._getter = parser.parseGetter(expression);
        }
        
        /**
         * 添加数据更新回调
         * 
         * @method addAction
         * @param {function} action  回调函数
         */
        addAction(action: BindingUpdateAction): void {
            util.addArrayItem(this._actions, action);
        }
        
        /**
         * 移除数据更新回调
         * 
         * @method removeAction
         * @param  {function} action 回调函数
         */
        removeAction(action: BindingUpdateAction): void {
            util.removeArrayItem(this._actions, action);

            if (!this._actions.length) {
                this.dispose();
            }
        }
        
        /**
         * 数据更新派发，会先做缓冲，防止在同一时刻对此出发更新操作，等下一次系统轮训时再真正执行更新操作
         * 
         * @method propertyChanged
         */
        propertyChanged(): void {
            clearTimeout(this._timerid);
            this._timerid = util.nextTick(this.doAction, this);
        }
        
        /**
         * 立即获取最新的数据判断并判断是否已经更新，如果已经更新，执行所有的回调
         * 
         * @method doAction
         * @return {Promise} 等待所有回调执行完毕的promise对象
         */
        doAction(): void {
            var oldValue: any = this.value;
            var newValue: any = this._getValue();

            if ((typeof newValue === 'object' && newValue != null) || newValue !== oldValue) {
                this._actions.slice().forEach((action) => {
                    action(newValue, oldValue);
                });

                this.initialized = true;
            }
        }
        
        /**
         * 设置表达式的值
         * @method setValue
         * @param  {any}  value  值
         */
        setValue(value: any) {
            if (!this._setter) {
                this._setter = parser.parseSetter(this.expression);
            }
            this._setter.call(undefined, this.viewModel, value);
        }
        
        /**
         * 释放引用和内存
         * @method dispose 
         */
        dispose() {
            if (!this.isActived) {
                return;
            }

            Object.keys(this._observers).forEach((id) => {
                this._observers[id].unbind(this._properties[id], this.propertyChanged);
            });

            var key: string = Watcher.getReferKey(this.expression, this.isDeepWatch);
            this.viewModel._watchers[key] = null;

            this._actions = null;
            this._timerid = null;
            this._getter = null;
            this._setter = null;
            this._observers = null;
            this._tmpObservers = null;
            this._properties = null;
            this.isActived = false;
            this.viewModel = null;
            this.expression = null;
        }
        
        // 获取表达式最新的值
        private _getValue(): any {
            this._beforeAccess();

            var newValue: any = this._getter(this.viewModel);

            if (this.isDeepWatch) {
                visit(newValue);
            }

            if (this._getter.filters) {
                // 派发到各个filter中处理
            }

            this._afterAccess();

            return newValue;
        }
        
        // 访问数据前做的准备工作
        private _beforeAccess(): void {
            this._tmpObservers = {};
            observable.onAccessingProperty = this._subscribe.bind(this);
        }
        
        // 访问书后做的处理工作
        private _afterAccess(): void {
            observable.onAccessingProperty = null;

            Object.keys(this._observers).forEach((id) => {
                if (!this._tmpObservers[id]) {
                    // 如果已经不再对某个数据有关联，取消订阅该数据
                    this._observers[id].unbind(this._properties[id], this.propertyChanged);
                    this._properties[id] = null;
                }
            });

            this._observers = this._tmpObservers;
            this._tmpObservers = null;
        }
    
        // 订阅数据的observer
        private _subscribe(observer: observable.Observer, property: string) {
            var id: number = observer.id;

            if (!this._tmpObservers[id]) {
                // 假如临时订阅表中
                this._tmpObservers[id] = observer;

                if (!this._observers[id]) {
                    // 如果没有订阅过，保存对observer的引用
                    this._observers[id] = observer;
                    this._properties[id] = property;
                    // 添加订阅
                    observer.bind(property, this.propertyChanged);
                }
            }
        }
    }
    
    // 遍历访问所有的属性以订阅所有的数据
    function visit(target: any) {
        if (util.isObject(target)) {
            Object.keys(target).forEach((key) => {
                visit(target[key]);
            });
        }
        else if (Array.isArray(target)) {
            target.forEach((item) => {
                visit(item);
            });
        }
    }
}