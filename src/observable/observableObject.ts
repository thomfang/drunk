/// <reference path="../util/util.ts" />
/// <reference path="./observable.ts" />
 
/**
 * 转换后的可以监控对象
 * 添加了设置和移除字段的两个能发送数据更新的方法。
 */
namespace drunk.observable {
    
    /**
     * 可监控JSON对象的声明
     */
    export interface IObservableObject {
        [name: string]: any;
        __observer__?: Observer;
        $set?(name: string, value: any): void;
        $remove?(name: string): void;
    }
     
    /**
     * 设置对象的属性，并发送更新的消息
     * @param  data   JSON对象或已经为observable的JSON对象
     * @param  name   字段名
     */
    export function $set(data: IObservableObject, name: string, value: any): void {
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
     * @param  data  JSON对象或已经为observable的JSON对象
     * @param  name  字段名
     */
    export function $remove(data: IObservableObject, name: string): void {
        if (!data.hasOwnProperty(name)) {
            return;
        }

        delete data[name];
        notify(data);
    }
    
    /**
     * 对象转换成observable后指向的原型对象
     */
    export var ObservableObjectPrototype: IObservableObject = {};
    
    /**
     * 设置对象的指定字段的值
     * @param   name  字段名
     * @param   value 值
     */
    util.defineProperty(ObservableObjectPrototype, "$set", function setObservableObjectProperty(name: string, value: any) {
        $set(this, name, value);
    });

    /**
     * 删除对象的指定字段的值
     * @param   name  字段名
     */
    util.defineProperty(ObservableObjectPrototype, "$remove", function removeObservableObjectProperty(name: string) {
        $remove(this, name);
    });
}