/// <reference path="../util/util.ts" />

module drunk.observable {

    /**
     * 可监控数组的声明
     * @interface ObservableArray
     */
    export interface ObservableArray<T> extends Array<T> {
        __observable__?: Observable;
        setItem?(index: number, value: any): void;
        removeAt?<T>(index: number): T;
        removeItem?(value: any): void;
        removeAllItem?(value: any): void;
    }

    export var ObservableArrayPrototype: any[] = Object.create(Array.prototype);

    /**
     * 设置数组指定数组下标的值，并发送数组更新通知
     * @param {array} array - observableArray类型的数组
     * @param {number} index - 要设置的数组下标
     * @param {any} value - 要设置的值
     */
    export function setItem<T>(array: ObservableArray<T>, index: number, value: T): void {
        if (index > array.length) {
            array.length = index + 1;
        }

        array.splice(index, 1, value);
    }
     
    /**
     * 根据索引移除数组中的元素，并发送数组更新通知
     * @param {array} array - observableArray类型的数组
     * @param {number} index - 要移除的下标
     * @returns {any} 返回移除的值
     */
    export function removeAt<T>(array: ObservableArray<T>, index: number): T {
        var result: T;

        if (index > -1 && index < array.length) {
            result = Array.prototype.splice.call(array, index, 1)[0];
        }

        notify(array);

        return result;
    }
    
    /**
     * 删除数组中出现的一个指定值，并发送数组更新通知
     * @param {array} array - observableArray类型的数组
     * @param {any} value - 要移除的值
     */
    export function removeItem<T>(array: ObservableArray<T>, value: any): void {
        util.removeArrayItem(array, value);
    }
    
    /**
     * 删除数组中所有的指定值，并发送数组更新通知
     * @param {array} array - observableArray类型的数组
     * @param {any} value - 要移除的值
     */
    export function removeAllItem<T>(array: ObservableArray<T>, value: any): void {
        var index: number = array.indexOf(value);

        while (index > -1) {
            Array.prototype.splice.call(array, index, 1);
            index = array.indexOf(value);
        }

        notify(array);
    }

    util.defineProperty(ObservableArrayPrototype, "setItem", function setObservableArrayItem(index: number, value: any) {
        return setItem(this, index, value);
    });

    util.defineProperty(ObservableArrayPrototype, "removeAt", function removeObservalbeArrayByIndex(index: number) {
        return removeAt(this, index);
    });

    util.defineProperty(ObservableArrayPrototype, "removeItem", function removeObservableArrayItem(value: any) {
        return removeItem(this, value);
    });

    util.defineProperty(ObservableArrayPrototype, "removeAllItem", function removeAllObservableArrayItem(value: any) {
        return removeAllItem(this, value);
    });
    
    /*
     * 调用原生方法并发送通知
     */
    function executeArrayMethodAndNotify<T>(array: ObservableArray<T>, methodName: string, args: any[], callback?: () => void): any {
        var result = Array.prototype[methodName].apply(array, args);

        if (callback) {
            callback();
        }

        notify(array);

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
                create(item);
            });
        });
    });

    util.defineProperty(ObservableArrayPrototype, "unshift", function unshift(...args: any[]) {
        return executeArrayMethodAndNotify(this, "unshift", args, () => {
            args.forEach((item) => {
                create(item);
            });
        });
    });

    util.defineProperty(ObservableArrayPrototype, "splice", function splice(...args: any[]) {
        return executeArrayMethodAndNotify(this, "splice", args, () => {
            args.slice(2).forEach((item) => {
                create(item);
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