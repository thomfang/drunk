/// <reference path="../util/util.ts" />
/// <reference path="./observableArray.ts" />
/// <reference path="./observableObject.ts" />

module drunk.observable {
    
    var observableIdCounter: number = 0;
     
    /**
     * 监控对象类，为每个需要监控的对象和数组生成一个实例，用于代理监听事件
     * @constructor
     */
    export class Observable {

        private _action: { [property: string]: (() => void)[] };
        private _itemChangedActions: Array<() => void>;
        
        id: number = observableIdCounter++;
        
        /**
         * 根据property来添加绑定回调，如果property为null，则添加到数据的全局监听
         * @param {string|null} property - 要绑定的字段名
         * @param {function} action - 监听函数
         */
        bind(property: string | any, action: () => void): void {
            if (property == null && typeof action === 'function') {
                return this._addItemChangedaction(action);
            }

            if (!this._action) {
                this._action = {};
            }

            if (!this._action[property]) {
                this._action[property] = [];
            }

            var actions = this._action[property];

            util.addArrayItem(actions, action);
        }
          
        /**
         * 移除字段的绑定监听，如果property为null，则从全局监听的回调队列中移除
         * @param {string|null} property - 字段名
         * @param {function} action - 要求绑定的回调
         */
        unbind(property: string | any, action: () => void): void {
            if (property == null && typeof action === 'function') {
                return this._removeItemChangedaction(action);
            }

            if (!this._action || !this._action[property] || !this._action[property].length) {
                return;
            }

            var actions = this._action[property];

            util.removeArrayItem(actions, action);
            
            if (action.length === 0) {
                this._action[property] = null;
            }
        }
          
        /**
         * 通知某字段已更新
         * @param {string} [property] - 字段名，如果字段为null，则通知全局更新
         */
        notify(property?: string): void {
            if (property == null) {
                return this._notifyItemChanged();
            }

            if (!this._action || !this._action[property] || !this._action[property].length) {
                return;
            }

            var actions = this._action[property];

            actions.forEach((action) => {
                action.call(null);
            });
        }

        private _addItemChangedaction(action: () => void) {
            if (!this._itemChangedActions) {
                this._itemChangedActions = [];
            }

            util.addArrayItem(this._itemChangedActions, action);
        }

        private _removeItemChangedaction(action: () => void) {
            if (!this._itemChangedActions || !this._itemChangedActions.length) {
                return;
            }

            util.removeArrayItem(this._itemChangedActions, action);
            
            if (this._itemChangedActions.length === 0) {
                this._itemChangedActions = null;
            }
        }

        private _notifyItemChanged() {
            if (!this._itemChangedActions || !this._itemChangedActions.length) {
                return;
            }

            this._itemChangedActions.forEach((action) => {
                action.call(null);
            });
        }
    }
     
    /**
     * 根据数据返回对应的Observable 实例，如果该数据已经存在对应的 Observable 实例则直接返回，否则创建一个新的实例
     * @param {ObservableArray|ObservableObject} data - 数组或JSON对象
     * @returns {Observable} 返回一个Observable实例
     */
    export function create<T>(data: ObservableArray<T> | ObservableObject | any): Observable {
        var isObject = util.isObject(data);

        if (!isObject && !Array.isArray(data)) {
            return;
        }

        var ob: Observable;

        if (typeof data.__observable__ === 'undefined') {
            // 如果从未创建过observable实例
            ob = new Observable();

            util.defineProperty(data, '__observable__', ob);

            if (isObject) {
                // 替换原型链
                data.__proto__ = ObservableObjectPrototype;

                // 转换每个字段的getter seterr
                Object.keys(data).forEach((property: string) => {
                    convert(data, property, data[property]);
                });
            }
            else {
                // 替换原型链
                data.__proto__ = ObservableArrayPrototype;

                // 为每一个item创建Observable实例
                data.forEach((item) => {
                    create(item);
                });
            }
        }
        else {
            ob = data.__observable__;
        }

        return ob;
    }
    
    /**
     * 绑定数据的某个字段改变的回调
     * @param {ObservableArray|ObservableObject} data - 数组或JSON数据
     * @param {string|null} property - 数据的指定字段
     */
    export function bind<T>(data: ObservableArray<T> | ObservableObject, property: string | any, action: () => void): void {
        var ob: Observable = create(data);
        
        if (!ob) {
            throw new Error("observable.bind: 只接受数组或JSON格式数据");
        }
        
        ob.bind(property, action);
    }
    
    /**
     * 一个用于获取当前正在访问observable数据某个字段的回调
     * @param {Observable} observable - 返回的当前正在访问的数据的observable对象
     * @param {string} property - 正在访问的数据的字段
     * @param {any} data - 对应字段的数据
     * @param {ObservableObject} data - 已经创建过observable实例的JSON类型数据
     */
    export var onPropertyAccess: (observale: Observable, property: string, value: any, data: ObservableObject) => void;
     
    /**
     * 设置JSON对象属性的 getter/setter，使其能在数据更新是能接受到事件
     * @param data JSON对象
     * @param property  JSON对象上的字段
     */
    export function convert(data: ObservableObject, property: string, value): void {
        var dataOb: Observable = create(data);
        var valueOb: Observable = create(value);

        Object.defineProperty(data, property, {
            enumerable: true,
            configurable: true,
            get: propertyGetterSetter,
            set: propertyGetterSetter
        });
        
        if (valueOb) {
            valueOb.bind(null, propertyChanged);
        }
        
        // 属性的getter和setter，聚合在一个函数换取空间？
        function propertyGetterSetter(newValue?: any) {
            // 如果没有传入任何参数，则为访问，返回值
            if (arguments.length === 0) {
                
                if (onPropertyAccess) {
                    // 调用存在的onPropertyAcess方法
                    onPropertyAccess(dataOb, property, value, data);
                }
                
                return value;
            }
            
            // 有传入参数，则是赋值操作
            if (newValue === value) {
                // 如果值相同，不做任何处理
                return;
            }
            
            if (valueOb) {
                valueOb.unbind(null, propertyChanged);
            }
            
            value = newValue;
            valueOb = create(newValue);
            
            if (valueOb) {
                valueOb.bind(null, propertyChanged);
            }
            
            propertyChanged();
        }
        
        // 假设value是一个数组，当数组添加了一个新的item时，
        // 告知data的observable实例派发property改变的通知
        function propertyChanged() {
            dataOb.notify(property);
        }
    }
     
    /**
     * 通知数据的指定属性更新
     * @param {ObservableArray|ObservableObject} data - 数据
     * @param {string} [property] - 要通知的字段名，如果该参数不提供，则派发该该数据更新的通知
     */
    export function notify<T>(data: ObservableArray<T> | ObservableObject, property?: string): void {
        var ob: Observable = data.__observable__;

        if (ob) {
            ob.notify(property);
        }
    }
}
