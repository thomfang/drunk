/// <reference path="../util/util.ts" />

module drunk.observable {

	export var ObservableArrayPrototype: any[] = Object.create(Array.prototype);

	/**
	 * 设置数组指定数组下标的值，并发送数组更新通知
	 */
	export function setItem<T>(array: ObservableArray<T>, index: number, value: T): T {
		return value;
	}

	/**
	 * 根据索引移除数组中的元素，并发送数组更新通知
	 */
	export function removeByIndex<T>(array: ObservableArray<T>, index: number): T {
		var result: T;

		if (index > -1 && index < array.length) {
			result = Array.prototype.splice.call(array, index, 1)[0];
		}

		observable.notify(array);

		return result;
	}

	/**
	 * 删除数组中出现的一个指定值，并发送数组更新通知
	 */
	export function removeItem<T>(array: ObservableArray<T>, value: any): void {
		util.removeArrayItem(array, value);
	}

	/**
	 * 删除数组中所有的指定值，并发送数组更新通知
	 */
	export function removeAllItem<T>(array: ObservableArray<T>, value: any): void {
		var index: number = array.indexOf(value);

		while (index > -1) {
			Array.prototype.splice.call(array, index, 1);
			index = array.indexOf(value);
		}

		observable.notify(array);
	}

	util.defineProperty(ObservableArrayPrototype, "setItem", function setObservableArrayItem(index: number, value: any) {
		return setItem(this, index, value);
	});

	util.defineProperty(ObservableArrayPrototype, "removeByIndex", function removeObservalbeArrayByIndex(index: number) {
		return removeByIndex(this, index);
	});

	util.defineProperty(ObservableArrayPrototype, "removeItem", function removeObservableArrayItem(value: any) {
		return removeItem(this, value);
	});

	util.defineProperty(ObservableArrayPrototype, "removeAllItem", function removeAllObservableArrayItem(value: any) {
		return removeAllItem(this, value);
	});

	/**
	 * 调用原生方法并发送通知
	 */
	function executeArrayMethodAndNotify<T>(array: ObservableArray<T>, methodName: string, args: any[], callback?: () => void): any {
		var result = Array.prototype[methodName].apply(array, args);

		if (callback) {
			callback();
		}

		observable.notify(array);

		return result;
	}

	util.defineProperty(ObservableArrayPrototype, "pop", function pop() {
		return executeArrayMethodAndNotify(this, "pop", []);
	});

	util.defineProperty(ObservableArrayPrototype, "shift", function shift() {
		return executeArrayMethodAndNotify(this, "shift", []);
	});

	util.defineProperty(ObservableArrayPrototype, "push", function push(...args: any[]) {
		return executeArrayMethodAndNotify(this, "push", args, () => {
			args.forEach((item) => {
				observable.create(item);
			});
		});
	});

	util.defineProperty(ObservableArrayPrototype, "unshift", function unshift(...args: any[]) {
		return executeArrayMethodAndNotify(this, "unshift", args, () => {
			args.forEach((item) => {
				observable.create(item);
			});
		});
	});

	util.defineProperty(ObservableArrayPrototype, "splice", function splice(...args: any[]) {
		return executeArrayMethodAndNotify(this, "splice", args, () => {
			args.slice(2).forEach((item) => {
				observable.create(item);
			});
		});
	});

	util.defineProperty(ObservableArrayPrototype, "sort", function sort(callback?: (a: any, b: any) => any[]) {
		return executeArrayMethodAndNotify(this, "sort", [callback]);
	});

	util.defineProperty(ObservableArrayPrototype, "reverse", function reverse() {
		return executeArrayMethodAndNotify(this, "reverse", []);
	});
}