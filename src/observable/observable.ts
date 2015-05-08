/// <reference path="../util/util.ts" />

module drunk.observable {
	/**
	 * 可监控数组的声明
	 */
    export interface ObservableArray<T> extends Array<T> {
        __observable__?: Observable;
    }

	/**
	 * 可监控对象的声明
	 */
    export interface ObservableObject {
        __observable__?: Observable;
        [key: string]: any;
    }
    
    var observableIdCounter: number = 0;

	/**
	 * 监控对象类
	 * 为每个需要监控的对象和数组生成一个实例，用于代理监听事件
	 */
    export class Observable {

        private _listener: { [key: string]: (() => void)[] };
        private _itemChangedListener: Array<() => void>;
        
        id: number = observableIdCounter++;
	
		/**
 		 * 根据key来添加监控回调
 		 */
        bind(key: string | any, listener: () => void): void {
            if (key == null && typeof listener === 'function') {
                return this._addItemChangedListener(listener);
            }

            if (!this._listener) {
                this._listener = {};
            }

            if (!this._listener[key]) {
                this._listener[key] = [];
            }

            var listeners = this._listener[key];

            util.addArrayItem(listeners, listener);
        }
	
		/**
 		 * 移除某属性的指定监控回调
 		 */
        unbind(key: string | any, listener: () => void): void {
            if (key == null && typeof listener === 'function') {
                return this._removeItemChangedListener(listener);
            }

            if (!this._listener || !this._listener[key] || !this._listener[key].length) {
                return;
            }

            var listeners = this._listener[key];

            util.removeArrayItem(listeners, listener);
        }
	
		/**
 		 * 通知某属性改变
 		 */
        notify(key: string | any): void {
            if (key == null) {
                return this._notifyItemChanged();
            }

            if (!this._listener || !this._listener[key] || !this._listener[key].length) {
                return;
            }

            var listeners = this._listener[key];

            listeners.forEach((listener) => {
                listener.call(null);
            });
        }

        private _addItemChangedListener(listener: () => void) {
            if (!this._itemChangedListener) {
                this._itemChangedListener = [];
            }

            util.addArrayItem(this._itemChangedListener, listener);
        }

        private _removeItemChangedListener(listener: () => void) {
            if (!this._itemChangedListener || !this._itemChangedListener.length) {
                return;
            }

            util.removeArrayItem(this._itemChangedListener, listener);
        }

        private _notifyItemChanged() {
            if (!this._itemChangedListener || !this._itemChangedListener.length) {
                return;
            }

            this._itemChangedListener.forEach((listener) => {
                listener.call(null);
            });
        }
    }

	/**
	 * 根据数据返回对应的Observable 实例
	 * 如果该数据已经存在对应的 Observable 实例则直接反悔，否则创建一个新的
     * @param data 数组或JSON对象
     * @returns 返回一个Observable实例
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
                Object.keys(data).forEach((key: string) => {
                    convert(data, key, data[key]);
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
     * @param data 数组或 JSON数据
     * @param key  数据的指定字段
     */
    export function bind<T>(data: ObservableArray<T> | ObservableObject, key: string | any, listener: () => void): void {
        var ob: Observable = create(data);
        
        if (!ob) {
            throw new Error("observable.bind: 只接受数组或JSON格式数据");
        }
        
        ob.bind(key, listener);
    }
    
    /**
     * 当前活动中的watcher，用于收集和绑定所有的依赖属性
     */
    export var currentWatcher;

	/**
	 * 设置JSON对象属性的 getter/setter，使其能在数据更新是能接受到事件
     * @param data JSON对象
     * @param key  JSON对象上的字段
	 */
    export function convert(data: ObservableObject, key: string, value): void {
        var dataOb: Observable = create(data);
        var valueOb: Observable = create(value);

        Object.defineProperty(data, key, {
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
                
                if (currentWatcher) {
                    // 如果有正在工作中的watcher对象，订阅属性改变
                    // @TODO Watcher类 
                    currentWatcher.subscribe(dataOb);
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
        
        // 假设 value 是一个数组，当数组添加了一个新的 item 时，
        // 告知data的observable实例派发key改变的通知
        function propertyChanged() {
            dataOb.notify(key);
        }
    }

	/**
	 * 通知对象指定属性更新或全更新
	 */
    export function notify<T>(data: ObservableArray<T> | ObservableObject, updatedKey?: string): void {
        var ob: Observable = data.__observable__;

        if (ob) {
            ob.notify(updatedKey);
        }
    }
}
