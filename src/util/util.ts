/**
 * 工具方法模块
 */
namespace drunk.util {

    var global: any = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
    var uniqueSymbol = typeof global.Symbol !== 'undefined' ? global.Symbol('__DRUNK_UID__') : '__DRUNK_UID__';
    var uidCounter: number = 0;

    /**
     * 获取对象的唯一id
     * @param  target  设置的对象
     */
    export function uniqueId(target: any): number {
        if (typeof target[uniqueSymbol] === 'undefined') {
            defineProperty(target, uniqueSymbol, uidCounter++);
        }
        return target[uniqueSymbol];
    }

    /**
     * 判断是否是对象
     * @param   target 判断目标
     */
    export function isObject(target: any): boolean {
        if (!target || typeof target !== 'object') {
            return false;
        }
        let proto = Object.getPrototypeOf(target);
        return Object.prototype.toString.call(target) === '[object Object]' && (proto === Object.prototype || proto === observable.ObservableObjectPrototype);
    }

    /**
     * 拓展对象
     * @param  destination  目标对象
     * @param  ...sources   不定长参数，源对象的集合
     * @return              返回输入的目标对象
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
     * 深度拷贝对象
     * @param   target  需要拷贝的对象
     */
    export function deepClone(target: any): any {
        if (Array.isArray(target)) {
            return target.map((item) => {
                return deepClone(item);
            });
        }
        if (isObject(target)) {
            var ret = {};
            Object.keys(target).forEach(name => {
                ret[name] = deepClone(target[name]);
            });
            return ret;
        }
        return target;
    }

    /**
     * 转换成数组
     * @param   arrayLike  类似数组的对象
     * @return             转换后的数组
     */
    export function toArray(arrayLike: any): any[] {
        return Array.prototype.slice.call(arrayLike);
    }

    /**
     * 给数组添加item，确保item不重复
     * @param   array  数组
     * @param   item   值 
     */
    export function addArrayItem(array: any[], item: any): void {
        if (array.indexOf(item) < 0) {
            array.push(item);
        }
    }

    /**
     * 移除数组的指定值
     * @param   array  数组
     * @param   item   值 
     */
    export function removeArrayItem(array: any[], item: any): void {
        var index = array.indexOf(item);
        if (index > -1) {
            array.splice(index, 1);
        }
    }

    /**
     * 字符串驼峰化
     * @param   str 字符串
     */
    export function camelCase(str: string) {
        return str.replace(/[-_](\w)/g, ($0, $1) => $1.toUpperCase());
    }

    /**
     * Object.defineProperty的快捷方法，会设置configurable,writable默认为true
     * @param   target         设置的目标
     * @param   propertyName   属性
     * @param   propertyValue  值
     * @param   enumerable     该属性是否可枚举
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
     * 属性代理,把a对象的某个属性的读写代理到b对象上,返回代理是否成功的结果
     * @param   a         对象a
     * @param   property  属性名
     * @param   b         对象b
     * @return            如果已经代理过,则不再代理该属性
     */
    export function proxy(a: Object, property: string, b: Object) {
        var proto = Object.getPrototypeOf(a);
        var desOfProto = Object.getOwnPropertyDescriptor(proto, property);

        if (desOfProto && (typeof desOfProto.get === 'function' && desOfProto.get === desOfProto.set)) {
            return false;
        }

        var des = Object.getOwnPropertyDescriptor(a, property);

        if (des && ((typeof des.get === 'function' && des.get === des.set) || !des.configurable)) {
            return false;
        }

        function proxyGetterSetter() {
            if (arguments.length === 0) {
                return b[property];
            }
            b[property] = arguments[0];
        }

        Object.defineProperty(a, property, {
            enumerable: true,
            configurable: true,
            set: proxyGetterSetter,
            get: proxyGetterSetter
        });

        return true;
    }

    export interface IAsyncJob {
        completed: boolean;
        cancel(): void;
    }

    /**
     * 创建一个异步工作
     * @param   work       回调函数
     * @param   context    上下文对象
     * @return             返回一个带有cancel方法的job对象
     */
    export function execAsyncWork(work: () => any, context?: any): IAsyncJob {
        let timerId: number;
        let job: IAsyncJob = {
            completed: false,
            cancel() {
                if (!job.completed) {
                    clearTimeout(timerId);
                }
                context = work = null;
            }
        };

        timerId = setTimeout(() => {
            work.call(context);
            job.completed = true;
            context = work = null;
        }, 0);

        return job;
    }
    
    var handleCounter = 1;
    var requestAnimationCallbackMap = {};
    var requestAnimationWorker: number;

    export var requestAnimationFrame: (callback: FrameRequestCallback) => number =
        global.requestAnimationFrame && global.requestAnimationFrame.bind(global) || function (callback: FrameRequestCallback) {
            let handle = handleCounter++;

            requestAnimationCallbackMap[handle] = callback;
            requestAnimationWorker = requestAnimationWorker || global.setTimeout(function () {
                let handlers = requestAnimationCallbackMap;
                let now = Date.now();
                requestAnimationCallbackMap = {};
                requestAnimationWorker = null;
                Object.keys(handlers).forEach(id => handlers[id](now));
            }, 16);

            return handle;
        };

    export var cancelAnimationFrame: (handle: number) => void =
        global.cancelAnimationFrame && global.cancelAnimationFrame.bind(global) || function (handle: number) {
            delete requestAnimationCallbackMap[handle];
        };
}
