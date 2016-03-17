namespace drunk {

    export interface IThenable<R> {
        then<U>(onFulfillment?: (value: R) => U | IThenable<U>, onRejection?: (error: any) => U | IThenable<U>): IThenable<U>;
    }

    export interface IPromiseExecutor<R> {
        (resolve: (value?: R | IThenable<R>) => void, reject: (reason?: any) => void): void;
    }


    export enum PromiseState { PENDING, RESOLVED, REJECTED }

    function noop() { }

    function init<R>(promise: Promise<R>, executor: IPromiseExecutor<R>): void {
        function resolve<R>(value: R | IThenable<R>): void {
            resolvePromise(promise, value);
        }

        function reject<R>(reason: R | IThenable<R>): void {
            rejectPromise(promise, reason);
        }

        try {
            executor(resolve, reject);
        }
        catch (e) {
            rejectPromise(promise, e);
        }
    }

    function resolvePromise<R>(promise: Promise<R> | any, value: any): void {
        // 已经处理过就不管了
        if (promise._state !== PromiseState.PENDING) {
            return;
        }

        if (promise === value) {
            publish(promise, new TypeError('Chaining cycle detected for promise #<Promise>'), PromiseState.REJECTED);
        }
        else if (isThenable(value)) {
            handleThenable(value, promise);
        }
        else {
            publish(promise, value, PromiseState.RESOLVED);
        }
    }

    function rejectPromise<R>(promise: Promise<R> | any, reason: any): void {
        if (promise._state !== PromiseState.PENDING) {
            return;
        }

        if (promise === reason) {
            reason = new TypeError('Chaining cycle detected for promise #<Promise>');
        }

        publish(promise, reason, PromiseState.REJECTED);
    }

    // 够不够严谨?
    function isThenable(target): boolean {
        return target && typeof target.then === 'function';
    }

    function handleThenable<R>(thenable: any, promise: Promise<R>) {
        let toResolve = value => {
            resolvePromise(promise, value);
        };
        let toReject = reason => {
            rejectPromise(promise, reason);
        };

        // 如果是自己实现的 Promise 类实例，直接publish 不同放进下一帧了
        if (thenable instanceof Promise) {
            if (thenable._state === PromiseState.PENDING) {
                subscribe(thenable, promise, toResolve, toReject);
            }
            else if (thenable._state === PromiseState.RESOLVED) {
                publish(promise, thenable._value, PromiseState.RESOLVED);
            }
            else {
                publish(promise, thenable._value, PromiseState.REJECTED);
            }
        }
        // 第三方的直接调用它的 then 方法
        else {
            thenable.then(toResolve, toReject);
        }
    }

    function publish(promise: any, value: any, state: PromiseState): void {
        promise._state = state;
        promise._value = value;

        nextTick(() => {
            let listeners = promise._listeners;
            let total = listeners.length;

            if (!total) {
                return;
            }

            for (let i = 0; i < total; i += 3) {
                invokeCallback(state, listeners[i], listeners[i + state], value);
            }

            listeners.length = 0;
        });
    }

    function nextTick<R>(callback: (state: PromiseState, promise: Promise<R>, callback: () => void, value: any) => void) {
        setTimeout(callback, 0);
    }

    function invokeCallback<R>(state: PromiseState, promise: Promise<R>, callback: () => void, value: any) {
        let hasCallback = typeof callback === 'function';
        let done = false;
        let fail = false;

        if (hasCallback) {
            try {
                value = callback.call(undefined, value);
                done = true;
            }
            catch (e) {
                value = e;
                fail = true;
            }
        }

        // 已经被处理过的就不管了
        if (promise._state !== PromiseState.PENDING) {
            return;
        }

        // 处理成功
        if (hasCallback && done) {
            resolvePromise(promise, value);
        }
        // 如果调用异常直接作为 reject 处理
        else if (fail) {
            rejectPromise(promise, value);
        }
        // 没有提供对应状态的回调，就传递状态
        else if (state === PromiseState.RESOLVED) {
            publish(promise, value, state);
        }
        else {
            rejectPromise(promise, value);
        }
    }

    // 三个 item 为一个 子promise的订阅
    // 每段的第一个 item 为子 promise 实例
    // 第二个 item 为fulfillment 回调
    // 第三个 item 为 rejection 回调
    function subscribe<R>(promise: Promise<R>, subPromise: Promise<R>, onFulfillment: (value: any) => any, onRejection: (reason: any) => any) {
        let arr = promise._listeners;
        let len = arr.length;

        arr[len + PromiseState.PENDING] = subPromise;
        arr[len + PromiseState.RESOLVED] = onFulfillment;
        arr[len + PromiseState.REJECTED] = onRejection;
    }

    /**
     * ES6 Promise实现
     */
    export class Promise<R> implements IThenable<R> {

        static all<R>(iterable: any[]): Promise<R[]> {
            return new Promise((resolve, reject) => {
                let total = iterable.length;
                let count = 0;
                let rejected = false;
                let result = [];

                let check = (i: number, value) => {
                    result[i] = value;

                    if (++count === total) {
                        resolve(result);
                        result = null;
                    }
                };

                if (!total) {
                    return resolve(result);
                }

                iterable.forEach((thenable, i) => {
                    if (!isThenable(thenable)) {
                        return check(i, thenable);
                    }

                    thenable.then(value => {
                        if (!rejected) {
                            check(i, value);
                        }
                    }, reason => {
                        if (!rejected) {
                            rejected = true;
                            result = null;
                            reject(reason);
                        }
                    });
                });

                iterable = null;
            });
        }

        static race<R>(iterable: any[]): Promise<R> {
            return new Promise((resolve, reject) => {
                let total = iterable.length;
                let ended = false;

                let check = (value: any, rejected?: boolean) => {
                    if (rejected) {
                        reject(value);
                    }
                    else {
                        resolve(value);
                    }
                    ended = true;
                };

                for (let i = 0, thenable: any; i < total; i++) {
                    thenable = iterable[i];

                    if (!isThenable(thenable)) {
                        resolve(thenable);
                        break;
                    }
                    if ((thenable instanceof Promise) && thenable._state !== PromiseState.PENDING) {
                        check(thenable._value, thenable._state === PromiseState.REJECTED);
                        break;
                    }
                    else {
                        thenable.then(value => check(value), reason => check(reason, true));
                    }
                }

                iterable = null;
            });
        }

        static resolve<R>(value?: R | IThenable<R>): Promise<R> {
            let promise = new Promise(noop);

            if (!isThenable(value)) {
                promise._state = PromiseState.RESOLVED;
                promise._value = value;
            }
            else {
                resolvePromise(promise, value);
            }
            return promise;
        }

        static reject<R>(reason?: R | IThenable<R>): Promise<R> {
            let promise = new Promise(noop);

            if (!isThenable(reason)) {
                promise._state = PromiseState.REJECTED;
                promise._value = reason;
            }
            else {
                resolvePromise(promise, reason);
            }
            return promise;
        }

        _state: PromiseState = PromiseState.PENDING;
        _value: any;
        _listeners: any[] = [];

        /**
         * @constructor
         */
        constructor(executor: IPromiseExecutor<R>) {
            if (typeof executor !== 'function') {
                throw new TypeError("Promise constructor takes a function argument");
            }
            if (!(this instanceof Promise)) {
                throw new TypeError("Promise instance must be created by 'new' operator");
            }

            init(this, executor);
        }

        then<U>(onFulfillment?: (value: R) => U | IThenable<U>, onRejection?: (reason: any) => U | IThenable<U>): Promise<U> {
            let state = this._state;
            let value = this._value;

            if (state === PromiseState.RESOLVED && !onFulfillment) {
                return Promise.resolve(value);
            }
            if (state === PromiseState.REJECTED && !onRejection) {
                return Promise.reject(value);
            }

            let promise = new Promise(noop);

            if (state) {
                let callback = arguments[state - 1];

                nextTick(() => {
                    invokeCallback(state, promise, callback, value);
                });
            }
            else {
                subscribe(this, promise, onFulfillment, onRejection);
            }

            return promise;
        }

        catch<U>(onRejection?: (reason: any) => U | IThenable<U>): Promise<U> {
            return this.then(null, onRejection);
        }
    }
}