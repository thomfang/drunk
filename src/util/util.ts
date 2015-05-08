/// <reference path="../promise/promise.ts" />

module drunk.util {

    export function isObject(target: any): boolean {
        return Object.prototype.toString.call(target) === '[object Object]';
    }
    
    export function extend<T>(destination: T, ...sources: any[]): T {
        sources.forEach((src) => {
            Object.keys(src).forEach((key) => {
                (<any>destination)[key] = src[key];
            });
        });
        return destination;
    }
    
    export function toArray(arrayLike: any): any[] {
        return Array.prototype.slice.call(arrayLike);
    }
    
    export function addArrayItem(array: any[], item: any): void {
        if (array.indexOf(item) < 0) {
            array.push(item);
        }
    }
    
    export function removeArrayItem(array: any[], item: any): void {
        var index = array.indexOf(item);
        if (index > -1) {
            array.splice(index, 1);
        }
    }
    
    export function defineProperty(target: any, propertyName: string, propertyValue: any, enumerable?: boolean): void {
        Object.defineProperty(target, propertyName, {
            value: propertyValue,
            writable: true,
            configurable: true,
            enumerable: !!enumerable
        });
    }
    
    export function nextTick(callback: () => void, sender: any = null): number {
        return setTimeout(callback.bind(sender), 0);
    }
    
    export function proxy(target: any, propertyName: string, source: {}): boolean {
        var des = Object.getOwnPropertyDescriptor(target, propertyName);
        if (!des || typeof des.get !== 'function') {
            Object.defineProperty(target, propertyName, {
                set(value) {
                    (<any>source)[propertyName] = value;
                },
                get() {
                    return (<any>source)[propertyName];
                },
                configurable: true,
                enumerable: true
            });
            return true;
        }
        return false;
    }
}
