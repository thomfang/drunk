/// <reference path="../util/util.ts" />
/// <reference path="./observable.ts" />

/**
 * 转换后的可以监控数组
 * 除了有常规数组的所有方法外还添加了几个工具方法，并在某些修改自身的方法调用后对新数据进行处理和
 * 发送数据更新的通知。
 */
namespace drunk.observable {

    import util = drunk.util;

    /**
     * 可监控数组的声明
     */
    export interface IObservableArray<T> extends Array<T> {
        __observer__?: Observer;
        $setAt?(index: number, value: any): void;
        $removeAt?<T>(index: number): T;
        $removeItem?(item: any): void;
        $removeAllItem?(item: any): void;
        $removeAll?(): void;
    }

    /**
     * 数组转换成observable后指向的原型对象
     */
    export var ObservableArrayPrototype: IObservableArray<any> = Object.create(Array.prototype);

    /**
     * 设置数组指定数组下标的值，并发送数组更新通知
     * @param  array   observableArray类型的数组
     * @param  index   要设置的数组下标
     * @param  value   要设置的值
     */
    export function $setAt<T>(array: IObservableArray<T>, index: number, value: T): void {
        if (index > array.length) {
            array.length = index + 1;
        }

        array.splice(index, 1, value);
    }

    /**
     * 根据索引移除数组中的元素，并发送数组更新通知
     * @param  array  observableArray类型的数组
     * @param  index  要移除的下标
     */
    export function $removeAt<T>(array: IObservableArray<T>, index: number): T {
        let result: T;

        if (index > -1 && index < array.length) {
            result = Array.prototype.splice.call(array, index, 1)[0];

            notify(array);
        }

        return result;
    }

    /**
     * 删除数组中出现的一个指定值，并发送数组更新通知
     * @param  array  observableArray类型的数组
     * @param  value  要移除的值
     */
    export function $removeItem<T>(array: IObservableArray<T>, value: any): void {
        util.removeArrayItem(array, value);
    }

    /**
     * 删除数组中所有的指定值，并发送数组更新通知
     * @param  array  observableArray类型的数组
     * @param  value  要移除的值
     */
    export function $removeAllItem<T>(array: IObservableArray<T>, value: any): void {
        var matchedIndexList: number[] = [];
        var step = 0;

        array.forEach((item, index) => {
            if (value === item) {
                matchedIndexList.push(index - step++);
            }
        });

        if (matchedIndexList.length) {
            matchedIndexList.forEach(index => {
                array.splice(index, 1);
            });
            notify(array);
        }
    }

    /**
     * 删除所有数组元素
     */
    export function $removeAll<T>(array: IObservableArray<T>) {
        if (array.length) {
            array.length = 0;
            notify(array);
        }
    }

    Object.defineProperties(ObservableArrayPrototype, {

        /**
         * 根据下标设置数组的值，并发送数据更新的通知
         * @param   index  数组下标
         * @param   value  要设置的值
         */
        $setAt: {
            value: function setObservableArrayItem(index: number, value: any) {
                $setAt(this, index, value);
            }
        },

        /**
         * 根据下标移除数组的值，并发送数据更新的通知
         * @param   index  数组下标
         */
        $removeAt: {
            value: function removeObservalbeArrayByIndex(index: number) {
                return $removeAt(this, index);
            }
        },

        /**
         * 移除指定的值，并发送数据更新的通知
         * @param  value  指定值
         */
        $removeItem: {
            value: function removeObservableArrayItem(value: any) {
                return $removeItem(this, value);
            }
        },

        /**
         * 移除数组中所有指定的值，并发送数据更新的通知
         * @param  value  指定值
         */
        $removeAllItem: {
            value: function removeAllObservableArrayItem(value: any) {
                return $removeAllItem(this, value);
            }
        },

        /**
         * 删除所有数组元素
         * @method removeAll
         */
        $removeAll: {
            value: function () {
                return $removeAll(this);
            }
        },

        pop: {
            value: function pop() {
                let result = Array.prototype.pop.call(this);
                notify(this);
                return result;
            }
        },

        shift: {
            value: function shift() {
                let result = Array.prototype.shift.call(this);
                notify(this);
                return result;
            }
        },

        push: {
            value: function push(...args: any[]) {
                let result = Array.prototype.push.apply(this, args);
                args.forEach(create);
                notify(this);
                return result;
            }
        },

        unshift: {
            value: function unshift(...args: any[]) {
                let result = Array.prototype.unshift.apply(this, args);
                args.forEach(create);
                notify(this);
                return result;
            }
        },

        splice: {
            value: function splice(...args: any[]) {
                let result = Array.prototype.splice.apply(this, args);
                args.slice(2).forEach(create);
                notify(this);
                return result;
            }
        },

        sort: {
            value: function sort(callback?: (a: any, b: any) => any[]) {
                let result = Array.prototype.sort.call(this, callback);
                notify(this);
                return result;
            }
        },

        reverse: {
            value: function reverse() {
                let result = Array.prototype.reverse.call(this);
                notify(this);
                return result;
            }
        }
    });
}