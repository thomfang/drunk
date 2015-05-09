/// <reference path="../util/util.ts" />

/**
 * @module drunk.observable
 */
module drunk.observable {
    
    /**
     * 可监控JSON对象的声明
     * @interface ObservableObject
     */
    export interface ObservableObject {
        [name: string]: any;
        __observable__?: Observable;
        setProperty?(name: string, value: any): void;
        removeProperty?(name: string): void;
    }
     
    /**
     * 设置对象的属性，并发送更新的消息
     * @method setProperty
     * @param {ObservableObject} data - 一个JSON对象或已经为observable的JSON对象
     * @param {string} name - 字段名
     * @param {any} value - 值
     */
    export function setProperty(data: ObservableObject, name: string, value: any): void {
        if (data.hasOwnProperty(name)) {
            data[name] = value;
            return;
        }

        convert(data, name, value);
        notify(data);
    }
     
    /**
     * 移除对象属性，并会发送更新的消息
     * @method removeProperty
     * @param {ObservableObject} data - 一个JSON对象或已经为observable的JSON对象
     * @param {string} name - 字段名
     */
    export function removeProperty(data: ObservableObject, name: string): void {
        if (!data.hasOwnProperty(name)) {
            return;
        }

        delete data[name];
        notify(data);
    }
    
    /**
     * @member ObservableObjectPrototype
     */
    export var ObservableObjectPrototype = {};

    util.defineProperty(ObservableObjectPrototype, "setProperty", function setObservableObjectProperty(name: string, value: any) {
        setProperty(this, name, value);
    });

    util.defineProperty(ObservableObjectPrototype, "removeProperty", function removeObservableObjectProperty(name: string) {
        removeProperty(this, name);
    });
}