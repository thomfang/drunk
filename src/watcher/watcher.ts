/// <reference path="../util/util.ts" />
/// <reference path="../promise/promise.ts" />
/// <reference path="../parser/parser.ts" />
/// <reference path="../observable/observable.ts" />

namespace drunk {
    
    import util = drunk.util;
    import Promise = drunk.Promise;
    import observable = drunk.observable;

    export class Watcher {

        /**
         * 根据表达式和是否深度监听生成唯一的key,用于储存在关联的viewModel实例的watcher表中
         * @param   expression  表达式
         * @param   isDeepWatch 是否深度监听
         */
        static getNameOfKey(expression: string, isDeepWatch?: boolean): string {
            return !!isDeepWatch ? expression + '<deep>' : expression;
        }

        private _isInterpolate: boolean;
        private _actions: IBindingUpdateAction[] = [];
        private _observers: { [id: string]: observable.Observer } = {};
        private _properties: { [number: string]: { [property: string]: boolean } } = {};
        private _tmpObservers: { [id: string]: observable.Observer };
        private _tmpProperties: { [number: string]: { [property: string]: boolean } };
        private _isActived: boolean = true;
        private _throttle: util.IAsyncJob;
        private _getter: parser.IGetter;
        
        /**
         * 表达式求值的结果
         */
        value: any;

        /**
         * 每个watcher对应一个表达式,watcher管理着对应这个表达式更新的回调函数.watcher在对表达式进行求值是,访问每个数据的getter,并得到该数据的observer引用,然后订阅该observer.当某个数据更新时该数据的observer实例会发送通知给所有的watcher,watcher接收到消息后会调用所有的表达式更新的回调.
         * @param   viewModel   ViewModel实例，用于访问数据
         * @param   expression  监听的表达式
         * @param   isDeepWatch 是否深度监听,当对象或数组里的任意一个数据改变都会发送更新消息
         */
        constructor(public viewModel: ViewModel, public expression: string, public isDeepWatch?: boolean) {
            this._isInterpolate = parser.hasInterpolation(expression);
            this._getter = this._isInterpolate ? parser.parseInterpolate(expression) : parser.parseGetter(expression);

            if (!this._getter.dynamic) {
                throw new Error('不能监控不包含任何变量的表达式: "' + expression + '"');
            }

            this.__propertyChanged = this.__propertyChanged.bind(this);
            this.value = this.__getValue();
        }

        /**
         * 添加数据更新回调
         * @param  action  回调函数
         */
        addAction(action: IBindingUpdateAction): void {
            if (!this._isActived) {
                return;
            }
            util.addArrayItem(this._actions, action);
        }

        /**
         * 移除数据更新回调
         * @param  action 回调函数
         */
        removeAction(action: IBindingUpdateAction): void {
            if (!this._isActived) {
                return;
            }

            util.removeArrayItem(this._actions, action);

            if (!this._actions.length) {
                this.dispose();
            }
        }

        /**
         * 数据更新派发，会先做缓冲，防止在同一时刻对此出发更新操作，等下一次系统轮训时再真正执行更新操作
         */
        __propertyChanged(): void {
            if (!this._throttle) {
                this._throttle = util.execAsyncWork(this.__flush, this);
            }
        }

        /**
         * 立即获取最新的数据判断并判断是否已经更新，如果已经更新，执行所有的回调
         */
        __flush(): void {
            if (!this._isActived) {
                return;
            }

            this._throttle = null;

            let oldValue: any = this.value;
            let newValue: any = this.__getValue();

            if ((typeof newValue === 'object' && newValue != null) || newValue !== oldValue) {
                this.value = newValue;
                this._actions.slice().forEach(action => {
                    if (this._isActived) {
                        action(newValue, oldValue);
                    }
                });
            }
        }

        /**
         * 销毁实例和移除所有应用
         */
        dispose() {
            if (!this._isActived) {
                return;
            }

            Object.keys(this._observers).forEach((id) => {
                Object.keys(this._properties[id]).forEach(property => {
                    this._observers[id].$removeListener(property, this.__propertyChanged);
                });
            });

            if (this._throttle) {
                this._throttle.cancel();
                this._throttle = null;
            }

            let key: string = Watcher.getNameOfKey(this.expression, this.isDeepWatch);

            this.viewModel._watchers[key] =
                this.__propertyChanged =
                this.value =
                this.viewModel =
                this.expression =
                this._getter =
                this._actions =
                this._observers =
                this._properties =
                this._tmpProperties =
                this._tmpObservers = null;

            this._isActived = false;
        }

        /**
         * 执行表达式函数获取最新的数据
         */
        private __getValue(): any {
            this.__beforeGetValue();

            let newValue = this._getter.call(this.viewModel);

            if (this.isDeepWatch) {
                visit(newValue);
            }

            if (this._getter.filters) {
                // 派发到各个filter中处理
                newValue = filter.pipeFor(newValue, this._getter.filters, this.viewModel.$filter, this._isInterpolate, this.viewModel);
            }

            this.__afterGetValue();

            return newValue;
        }

        /**
         * 设置observable的属性访问回调为当前watcher实例的订阅方法,当访问某个属性是就会对该属性进行订阅
         */
        private __beforeGetValue(): void {
            this._tmpObservers = {};
            this._tmpProperties = {};
            observable.onPropertyAccessing = this._subscribePropertyChanged.bind(this);
        }

        /**
         * 表达式求解完后的收尾工作,取消注册onPropertyAccessed回调,并对比旧的observer表和新的表看有哪些实例已经不需要订阅
         */
        private __afterGetValue(): void {
            // 清楚属性访问回调
            observable.onPropertyAccessing = null;

            let observers = this._observers;
            let properties = this._properties;
            let tmpObservers = this._tmpObservers;
            let tmpProperties = this._tmpProperties;
            let propertyChanged = this.__propertyChanged;

            Object.keys(observers).forEach(id => {
                let observer = observers[id];

                if (!tmpObservers[id]) {
                    // 如果没有再订阅该observer,取消订阅所有的属性
                    Object.keys(properties[id]).forEach(property => {
                        observer.$removeListener(property, propertyChanged);
                    });
                }
                else {
                    Object.keys(properties[id]).forEach(property => {
                        if (!tmpProperties[id][property]) {
                            // 如果没有再订阅该属性,取消订阅该属性
                            observer.$removeListener(property, propertyChanged);
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
         * @param  observer 属性的所属观察者
         * @param  property 属性名
         */
        private _subscribePropertyChanged(observer: observable.Observer, property: string) {
            let id = util.uuid(observer);
            let propertyChanged = this.__propertyChanged;
            let observers = this._observers;
            let properties = this._properties;
            let tmpObservers = this._tmpObservers;
            let tmpProperties = this._tmpProperties;

            if (!tmpObservers[id]) {
                // 添加到临时订阅observer表
                // 添加到临时订阅属性列表
                tmpObservers[id] = observer;
                tmpProperties[id] = { [property]: true };


                if (!observers[id]) {
                    // 如果旧的订阅表也没有,则添加到旧表,并在判断
                    observers[id] = observer;
                    properties[id] = { [property]: true };

                    observer.$addListener(property, propertyChanged);
                }
                else if (!properties[id][property]) {
                    // 如果没有订阅过该属性
                    properties[id][property] = true;
                    observer.$addListener(property, propertyChanged);
                }
            }
            else if (!tmpProperties[id][property]) {
                tmpProperties[id][property] = true;

                if (!properties[id][property]) {
                    observer.$addListener(property, propertyChanged);
                    properties[id][property] = true;
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