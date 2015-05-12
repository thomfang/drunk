module drunk {

    export interface Thenable<R> {
        then<U>(onFulfillment?: (value: R) => U | Thenable<U>, onRejection?: (error: any) => U | Thenable<U>): Thenable<U>;
    }

    export interface Executor<R> {
        (resolve: (value?: R | Thenable<R>) => void, reject: (reason?: any) => void): void;
    }


    enum PromiseState { PENDING, RESOLVED, REJECTED }

    function noop() {

    }

    function init<R>(promise: Promise<R>, executor: Executor<R>): void {
        function resolve<R>(value: R | Thenable<R>): void {
            resolvePromise(promise, value);
        }

        function reject<R>(reason: R | Thenable<R>): void {
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
        
        // 模拟 chrome 和 safari，不是标准
        if (promise === value) {
            publish(promise, undefined, PromiseState.RESOLVED);
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
        
        // 模拟 chrome 和 safari，不是标准
        if (promise === reason) {
            reason = undefined;
        }

        publish(promise, reason, PromiseState.REJECTED);
    }
    
    // 够不够严谨？
    function isThenable(target: any): boolean {
        return target && typeof target.then === 'function';
    }

    function handleThenable<R>(thenable: any, promise: Promise<R>) {
        var toResolve = (value: any) => {
            resolvePromise(promise, value);
        };
        var toReject = (reason: any) => {
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
            var arr = promise._listeners;
            var len = arr.length;

            if (!len) {
                return;
            }

            for (var i = 0; i < len; i += 3) {
                invokeCallback(state, arr[i], arr[i + state], value);
            }

            arr.length = 0;
        });
    }

    function nextTick<R>(callback: (state: PromiseState, promise: Promise<R>, callback: () => void, value: any) => void) {
        setTimeout(callback, 0);
    }

    function invokeCallback<R>(state: PromiseState, promise: Promise<R>, callback: () => void, value: any) {
        var hasCallback = typeof callback === 'function';
        var done = false;
        var fail = false;

        if (hasCallback) {
            try {
                value = callback.call(null, value);
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
        // Else the next promise rejected with the new value.
        else {
            rejectPromise(promise, value);
        }
    }
    
    // 三个 item 为一个 子promise的订阅
    // 每段的第一个 item 为子 promise 实例
    // 第二个 item 为fulfillment 回调
    // 第三个 item 为 rejection 回调
    function subscribe<R>(promise: Promise<R>, subPromise: Promise<R>, onFulfillment: (value: any) => any, onRejection: (reason: any) => any) {
        var arr = promise._listeners;
        var len = arr.length;

        arr[len + PromiseState.PENDING] = subPromise;
        arr[len + PromiseState.RESOLVED] = onFulfillment;
        arr[len + PromiseState.REJECTED] = onRejection;
    }

    export class Promise<R> implements Thenable<R> {

        static all<R>(iterable: any[]): Promise<R[]> {
            return new Promise((resolve, reject) => {
                var len: number = iterable.length;
                var count: number = 0;
                var result: any[] = [];
                var rejected: boolean = false;

                var check = (i: number, value: any) => {
                    result[i] = value;

                    if (++count === len) {
                        resolve(result);
                        result = null;
                    }
                };

                if (!len) {
                    return resolve(result);
                }

                iterable.forEach((thenable, i) => {
                    if (!isThenable(thenable)) {
                        return check(i, thenable);
                    }

                    thenable.then(
                        (value: any) => {
                            if (rejected) {
                                return;
                            }

                            check(i, value);
                        },
                        (reason: any) => {
                            if (rejected) {
                                return;
                            }

                            rejected = true;
                            result = null;
                            reject(reason);
                        });
                });

                iterable = null;
            });
        }

        static race<R>(iterable: any[]): Promise<R> {
            return new Promise((resolve, reject) => {
                var len = iterable.length;
                var ended = false;

                var check = (value: any, rejected?: boolean) => {
                    if (rejected) {
                        reject(value);
                    }
                    else {
                        resolve(value);
                    }
                    ended = true;
                };

                for (var i = 0, thenable: any; i < len; i++) {
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
                        thenable.then(
                            (value: any) => {
                                check(value);
                            },
                            (reason: any) => {
                                check(reason, true);
                            });
                    }
                }

                iterable = null;
            });
        }

        static resolve<R>(value?: R | Thenable<R>): Promise<R> {
            var promise = new Promise(noop);

            if (!isThenable(value)) {
                promise._state = PromiseState.RESOLVED;
                promise._value = value;
            }
            else {
                resolvePromise(promise, value);
            }
            return promise;
        }

        static reject<R>(reason?: R | Thenable<R>): Promise<R> {
            var promise = new Promise(noop);

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

        constructor(executor: Executor<R>) {
            if (typeof executor !== 'function') {
                throw new TypeError("Promise constructor takes a function argument");
            }
            if (!(this instanceof Promise)) {
                throw new TypeError("Promise instance muse be created by 'new' operator");
            }

            init(this, executor);
        }

        then<U>(onFulfillment?: (value: R) => U | Thenable<U>, onRejection?: (reason: any) => U | Thenable<U>): Promise<U> {
            var state = this._state;
            var value = this._value;

            if (state === PromiseState.RESOLVED && !onFulfillment) {
                return Promise.resolve(value);
            }
            if (state === PromiseState.REJECTED && !onRejection) {
                return Promise.reject(value);
            }

            var promise = new Promise(noop);

            if (state) {
                var callback = arguments[state - 1];

                nextTick(() => {
                    invokeCallback(state, promise, callback, value);
                });
            }
            else {
                subscribe(this, promise, onFulfillment, onRejection);
            }

            return promise;
        }

        catch<U>(onRejection?: (reason: any) => U | Thenable<U>): Promise<U> {
            return this.then(null, onRejection);
        }
    }
}