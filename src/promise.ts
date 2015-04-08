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

    function resolvePromise(promise, value): void {
        // Promise is handled, we won't handle it again.
        if (promise._state !== PromiseState.PENDING) {
            return;
        }
        
        // I have try this in Chrome and Safari, when resolve the promise itself,
        // it would be resolve the undefined value.
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

    function rejectPromise(promise, reason): void {
        if (promise._state !== PromiseState.PENDING) {
            return;
        }

        // I have try this in Chrome and Safari, when reject the promise itself,
        // it would be reject the undefined value.
        if (promise === reason) {
            reason = undefined;
        }

        publish(promise, reason, PromiseState.REJECTED);
    }

    // Would this check be okay?
    function isThenable(target): boolean {
        return target && typeof target.then === 'function';
    }

    function handleThenable(thenable, promise) {
        var toResolve = (value) => {
            resolvePromise(promise, value);
        };
        var toReject = (reason) => {
            rejectPromise(promise, reason);
        };
        
        // If this thenable object is the own Promise instance,
        // check it's state, if is settled, pulish the state of current promise,
        // if not, subscribe the thenable object.
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
        // Just subscribe it.
        else {
            thenable.then(toResolve, toReject);
        }
    }

    function publish(promise, value, state): void {
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

    function nextTick(callback: (state, promise, callback, value) => void) {
        setTimeout(callback, 0);
    }

    function invokeCallback(state, promise, callback, value) {
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

        // The state of next promise is no longer 'pending' anymore, no need to handle.
        if (promise._state !== PromiseState.PENDING) {
            return;
        }

        // If has callback and resolve done, the state will set to resolved.
        if (hasCallback && done) {
            resolvePromise(promise, value);
        }
        // No mater what state is before, if resolve fail, next promise would be rejected.
        else if (fail) {
            rejectPromise(promise, value);
        }
        // If no callback
        // state is resolved, publish for next promise right now.
        else if (state === PromiseState.RESOLVED) {
            publish(promise, value, state);
        }
        // Else the next promise rejected with the new value.
        else {
            rejectPromise(promise, value);
        }
    }

    // The promise listener list, 3 items to be a piece, as a subscriber,
    // first item is the promise subscriber,
    // second item is the fulfillment callback,
    // third item is the rejection callback.
    function subscribe(promise, subPromise, onFulfillment, onRejection) {
        var arr = promise._listeners;
        var len = arr.length;

        arr[len + PromiseState.PENDING]  = subPromise;
        arr[len + PromiseState.RESOLVED] = onFulfillment;
        arr[len + PromiseState.REJECTED] = onRejection;
    }

    export class Promise<R> implements Thenable<R> {

        static all<R>(iterable: any[]): Promise<R[]> {
            return new Promise((resolve, reject) => {
                var len      = iterable.length;
                var count    = 0;
                var result   = [];
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

                    thenable.then(
                        (value) => {
                            if (rejected) {
                                return;
                            }

                            check(i, value);
                        },
                        (reason) => {
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
                        thenable.then(
                            (value) => {
                                check(value);
                            },
                            (reason) => {
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