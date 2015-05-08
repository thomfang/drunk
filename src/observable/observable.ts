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

	/**
	 * 监控对象类
	 * 为每个需要监控的对象和数组生成一个实例，用于代理监听事件
	 */
	export class Observable {

		private _listener: { [key: string]: (() => void)[] };
		private _itemChangedListener: Array<() => void>;
	
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
	 */
	export function create<T>(data: ObservableArray<T> | ObservableObject | any): Observable {
		var isObject = util.isObject(data);

		if (!isObject && !Array.isArray(data)) {
			return;
		}

		var ob: Observable;

		if (typeof data.__observable__ === 'undefined') {
			ob = new Observable();

			util.defineProperty(data, '__observable__', ob);

			if (isObject) {
				data.__proto__ = ObservableObjectPrototype;

				Object.keys(data).forEach((key: string) => {
					convert(data, key, data[key]);
				});
			}
			else {
				data.__proto__ = ObservableArrayPrototype;

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
	 * 设置对象属性的 getter/setter，使其能在数据更新是能接受到事件
	 */
	export function convert(data: ObservableObject, key: string, value): void {
		var dataOb: Observable = create(data);
		var valueOb: Observable = create(value);

		Object.defineProperty(data, key, {
			enumerable: true,
			configurable: true,

			get() {
				return value;
			},

			set(newValue: any) {
				if (newValue !== value) {

				}
			}
		})
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
