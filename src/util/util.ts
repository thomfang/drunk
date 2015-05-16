/// <reference path="../promise/promise.ts" />

/**
 * 工具方法模块
 * 
 * @module drunk.util
 * @class util
 * @main
 */
module drunk.util {

    /**
     * 判断是否是对象
     * 
     * @static
     * @method isObject
     * @param  {any}        target 判断目标
     * @return {boolean}           返回结果
     */
    export function isObject(target: any): boolean {
        return Object.prototype.toString.call(target) === '[object Object]';
    }

    /**
     * 拓展对象
     * 
     * @static
     * @method extend
     * @param  {object}  destination  目标对象
     * @param  {object}  ...sources   不定长参数，源对象的集合
     * @return {object}               返回输入的目标对象
     */
    export function extend(destination: any, ...sources: any[]): any {
        sources.forEach((src) => {
            if (src) {
                Object.keys(src).forEach((key) => {
                    (<any>destination)[key] = src[key];
                });
            }
        });
        return destination;
    }

    /**
     * 转换成数组
     * 
     * @static
     * @method toArray
     * @param  {array} arrayLike  类似数组的对象
     * @return {array}            转换后的数组
     */
    export function toArray(arrayLike: any): any[] {
        return Array.prototype.slice.call(arrayLike);
    }

    /**
     * 给数组添加item，确保item不重复
     * 
     * @static
     * @method addArrayItem
     * @param  {array}  array  数组
     * @param  {any}    item   值 
     */
    export function addArrayItem(array: any[], item: any): void {
        if (array.indexOf(item) < 0) {
            array.push(item);
        }
    }

    /**
     * 移除数组的指定值
     * 
     * @static
     * @method removeArrayItem
     * @param  {array}  array  数组
     * @param  {any}    item   值 
     */
    export function removeArrayItem(array: any[], item: any): void {
        var index = array.indexOf(item);
        if (index > -1) {
            array.splice(index, 1);
        }
    }

    /**
     * Object.defineProperty的快捷方法，会设置configurable,writable默认为true
     * 
     * @static
     * @method defineProperty
     * @param  {any}     target         设置的目标
     * @param  {string}  propertyName   属性
     * @param  {any}     propertyValue  值
     * @param  {boolean} [enumerable]   该属性是否可枚举
     */
    export function defineProperty(target: any, propertyName: string, propertyValue: any, enumerable?: boolean): void {
        Object.defineProperty(target, propertyName, {
            value: propertyValue,
            writable: true,
            configurable: true,
            enumerable: !!enumerable
        });
    }

    /**
     * 设置函数在下一帧执行
     * 
     * @static
     * @method nextTick
     * @param  {function}  callback  回调函数
     * @param  {any}       [sender]  函数执行时要bind的对象
     * @return {number}              返回定时器的id
     */
    export function nextTick(callback: () => void, sender: any = null): number {
        return setTimeout(callback.bind(sender), 0);
    }
}
