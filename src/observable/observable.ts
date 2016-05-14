/// <reference path="../util/util.ts" />
/// <reference path="./observableArray.ts" />
/// <reference path="./observableObject.ts" />
/// <reference path="./observer.ts" />
/// <reference path="../events/eventemitter.ts" />

/**
 * observable模块的工具方法，用于创建可观察的数据，数据绑定等
 */
namespace drunk.observable {
    
    import util = drunk.util;
     
    /**
     * 根据数据返回对应的Observer 实例，如果该数据已经存在对应的 Observer 实例则直接返回，否则创建一个新的实例
     * @param data 数组或JSON对象
     */
    export function create<T>(data: IObservableArray<T> | IObservableObject | any): Observer {
        let isObject = util.isObject(data);

        if (!isObject && !Array.isArray(data)) {
            return;
        }

        let ob: Observer;

        if (typeof data.__observer__ === 'undefined') {
            // 如果从未创建过observer实例
            ob = new Observer();

            util.defineProperty(data, '__observer__', ob);

            if (isObject) {
                // 替换原型链
                data.__proto__ = ObservableObjectPrototype;

                // 转换每个字段的getter seterr
                Object.keys(data).forEach((property: string) => {
                    observe(data, property, data[property]);
                });
            }
            else {
                // 替换原型链
                data.__proto__ = ObservableArrayPrototype;

                // 为每一个item创建Observer实例
                data.forEach((item) => {
                    create(item);
                });
            }
        }
        else {
            ob = data.__observer__;
        }

        return ob;
    }
    
    /**
     * 访问observableObject的字段时会调用的回调
     * @param   observer  返回的当前正在访问的数据的observer对象
     * @param   property  正在访问的数据的字段
     * @param   value     对应字段的数据
     * @param   data      可观察数据
     */
    export var onPropertyAccessing: (observer: Observer, property: string, value: any, data: IObservableObject) => void;
     
    /**
     * 转换对象属性的getter/setter，使其能在数据更新是能接受到事件
     * @param  data  	 JSON对象
     * @param  property  JSON对象上的字段
     */
    export function observe(target: IObservableObject, property: string, value): void {
        let descriptor = Object.getOwnPropertyDescriptor(target, property);
        
        if (descriptor && typeof descriptor.get === 'function' && descriptor.get === descriptor.set) {
            // 如果已经绑定过了， 则不再绑定
            return;
        }
        
        let targetObserver: Observer = create(target);
        let valueObserver: Observer = create(value);

        Object.defineProperty(target, property, {
            enumerable: true,
            configurable: true,
            get: propertyGetterSetter,
            set: propertyGetterSetter
        });
        
        if (valueObserver) {
            valueObserver.addPropertyChangedCallback(propertyChanged);
        }
        
        // 属性的getter和setter，聚合在一个函数换取空间？
        function propertyGetterSetter() {
            if (arguments.length === 0) {
                // 如果没有传入任何参数，则为访问，返回值
                
                if (onPropertyAccessing) {
                    // 调用存在的onPropertyAcess方法
                    onPropertyAccessing(targetObserver, property, value, target);
                }
                
                return value;
            }
            
            let newValue: any = arguments[0];
            
            // 有传入参数，则是赋值操作
            if (!isNotEqual(newValue, value)) {
                // 如果值相同，不做任何处理
                return;
            }
            
            if (valueObserver) {
                valueObserver.removePropertyChangedCallback(propertyChanged);
            }
            
            value = newValue;
            valueObserver = create(newValue);
            
            if (valueObserver) {
                valueObserver.addPropertyChangedCallback(propertyChanged);
            }
            
            propertyChanged();
        }
        
        // 假设value是一个数组，当数组添加了一个新的item时，
        // 告知data的observer实例派发property改变的通知
        function propertyChanged() {
            targetObserver.$emit(property);
        }
    }
     
    /**
     * 通知数据的指定属性更新
     * @param  data       数据
     * @param  property   要通知的字段名，如果该参数不提供，则派发该该数据更新的通知
     */
    export function notify<T>(data: IObservableArray<T> | IObservableObject): void {
        let ob: Observer = data.__observer__;

        if (ob) {
            ob.notify();
        }
    }
    
    // 判断两个值是否不同
    function isNotEqual(a, b) {
        return a !== b || (typeof a === 'object' && a);
    }
}
