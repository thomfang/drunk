interface Thenable<R> {
    then<U>(onFulfillment?: (value: R) => U | Thenable<U>, onRejection?: (error: any) => U | Thenable<U>): Thenable<U>;
}

interface Executor<R> {
    (resolve: (value?: R | Thenable<R>) => void, reject: (reason?: any) => void): void;
}

module drunk.promise {

    enum PromiseState { PENDING, RESOLVED, REJECTED }

    function noop() {

    }

    function init<R>(defer: Promise<R>, executor: Executor<R>): void {
        function resolve<R>(value: R | Thenable<R>): void {
            resolveDefer(defer, value);
        }

        function reject<R>(reason: R | Thenable<R>): void {
            rejectDefer(defer, reason);
        }

        try {
            executor(resolve, reject);
        }
        catch (e) {
            rejectDefer(defer, e);
        }
    }

    function resolveDefer(defer, value): void {
        if (defer._state !== PromiseState.PENDING) {
            return;
        }
        if (defer === value) {
            publish(defer, undefined, PromiseState.RESOLVED);
        }
        else if (isThenable(value)) {
            handleThenable(value, defer);
        }
        else {
            publish(defer, value, PromiseState.RESOLVED);
        }
    }

    function rejectDefer(defer, reason): void {
        if (defer._state !== PromiseState.PENDING) {
            return;
        }
        publish(defer, reason, PromiseState.REJECTED);
    }

    function isThenable(target): boolean {
        return target && typeof target.then === 'function';
    }

    function handleThenable(thenable, defer) {
        var toResolve = (value) => {
            resolveDefer(defer, value);
        };
        var toReject = (reason) => {
            rejectDefer(defer, reason);
        };

        if (thenable instanceof Promise) {
            if (thenable._state === PromiseState.PENDING) {
                subscribe(thenable, defer, toResolve, toReject);
            } else if (thenable._state === PromiseState.RESOLVED) {
                publish(defer, thenable._value, PromiseState.RESOLVED);
            } else {
                publish(defer, thenable._value, PromiseState.REJECTED);
            }
        } else {
            thenable.then(toResolve, toReject);
        }
    }

    function publish(defer, value, state): void {
        defer._state = state;
        defer._value = value;

        nextTick(() => {
            var arr = defer._listeners;
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

    function nextTick(callback: (state, defer, callback, value) => void) {
        setTimeout(callback, 0);
    }

    function invokeCallback(state, defer, callback, value) {
        var hasCallback = typeof callback === 'function';
        var failed = true;

        if (hasCallback) {
            try {
                value = callback.call(null, value);
                failed = false;
            }
            catch (e) {
                value = e;
            }
        }

        if (defer._state !== PromiseState.PENDING) {
            return;
        }

        if (failed) {
            rejectDefer(defer, value);
        }
        else {
            resolveDefer(defer, value);
        }
    }

    function subscribe(defer, subDefer, onFulfillment, onRejection) {
        var arr = defer._listeners;
        var len = arr.length;

        arr[len + PromiseState.PENDING] = subDefer;
        arr[len + PromiseState.RESOLVED] = onFulfillment;
        arr[len + PromiseState.REJECTED] = onRejection;
    }

    export class Promise<R> implements Thenable<R> {

        static all<R>(iterable: any[]): Promise<R[]> {
            return new Promise((resolve, reject) => {
                var len = iterable.length;
                var count = 0;
                var result = [];
                var rejected = false;

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

                    thenable.then((value) => {
                        if (rejected) {
                            return;
                        }

                        check(i, value);
                    }, (reason) => {
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

                for (var i = 0, thenable; i < len; i++) {
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
                        thenable.then((value) => {
                            check(value);
                        }, (reason) => {
                            check(reason, true);
                        });
                    }
                }

                iterable = null;
            });
        }

        static resolve<R>(value?: R | Thenable<R>): Promise<R> {
            var defer = new Promise(noop);

            if (!isThenable(value)) {
                defer._state = PromiseState.RESOLVED;
                defer._value = value;
            }
            else {
                resolveDefer(defer, value);
            }
            return defer;
        }

        static reject<R>(reason?: R | Thenable<R>): Promise<R> {
            var defer = new Promise(noop);

            if (!isThenable(reason)) {
                defer._state = PromiseState.REJECTED;
                defer._value = reason;
            }
            else {
                resolveDefer(defer, reason);
            }
            return defer;
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

            var defer = new Promise(noop);

            if (state) {
                var callback = arguments[state - 1];

                nextTick(() => {
                    invokeCallback(state, defer, callback, value);
                });
            }
            else {
                subscribe(this, defer, onFulfillment, onRejection);
            }

            return defer;
        }

        catch<U>(onRejection?: (reason: any) => U | Thenable<U>): Promise<U> {
            return this.then(null, onRejection);
        }

        done<U>(onFulfillment?: (value: R) => U | Thenable<U>): Promise<U> {
            return this.then(onFulfillment);
        }

        fail<U>(onRejection?: (reason: any) => U | Thenable<U>): Promise<U> {
            return this.catch(onRejection);
        }
    }
}