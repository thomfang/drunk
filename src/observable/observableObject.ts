/// <reference path="../util/util.ts" />
/// <reference path="./observable.ts" />

/**
 * @module drunk.observable
 * @class observable
 */
 
/**
 * 转换后的可以监控对象
 * 添加了设置和移除字段的两个能发送数据更新的方法。
 * 
 * @private
 * @class ObservableObject
 * @for observable
 */
module drunk.observable {
    
    /*
     * 可监控JSON对象的声明
     */
    export interface ObservableObject {
        [name: string]: any;
        __observer__?: Observer;
        setProperty?(name: string, value: any): void;
        removeProperty?(name: string): void;
    }
     
    /**
     * 设置对象的属性，并发送更新的消息
     * 
     * @static
     * @for observable
     * @method setProperty
     * @param {ObservableObject} data   JSON对象或已经为observable的JSON对象
     * @param {string}           name   字段名
     * @param {any}              value  值
     */
    export function setProperty(data: ObservableObject, name: string, value: any): void {
        var descriptor = Object.getOwnPropertyDescriptor(data, name);
        
        if (!descriptor || (!descriptor.get && !descriptor.set)) {
            var oldValue: any = data[name];
            
            observable.observe(data, name, value);
            
            if (oldValue !== value) {
                notify(data);
            }
        }
        else {
            data[name] = value;
        }
    }
     
    /**
     * 移除对象属性，并会发送更新的消息
     * 
     * @static
     * @for observable
     * @method removeProperty
     * @param {ObservableObject}  data  JSON对象或已经为observable的JSON对象
     * @param {string}            name  字段名
     */
    export function removeProperty(data: ObservableObject, name: string): void {
        if (!data.hasOwnProperty(name)) {
            return;
        }

        delete data[name];
        notify(data);
    }
    
    /**
     * 对象转换成observable后指向的原型对象
     * 
     * @property ObservableObjectPrototype
     * @static
     * @for observable
     */
    export var ObservableObjectPrototype = {};
    
    /**
     * 设置对象的指定字段的值
     * 
     * @for ObservableObject
     * @method setProperty
     * @param  {string}  name  字段名
     * @param  {any}     value 值
     */
    util.defineProperty(ObservableObjectPrototype, "setProperty", function setObservableObjectProperty(name: string, value: any) {
        setProperty(this, name, value);
    });

    /**
     * 删除对象的指定字段的值
     * 
     * @for ObservableObject
     * @method removeProperty
     * @param  {string}  name  字段名
     */
    util.defineProperty(ObservableObjectPrototype, "removeProperty", function removeObservableObjectProperty(name: string) {
        removeProperty(this, name);
    });
}