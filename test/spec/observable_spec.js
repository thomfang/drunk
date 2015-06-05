/// <reference path="../../build/drunk.d.ts" />
/// <reference path="../jasmine.d.ts" />

describe("observable", function () {
    
    var observable = drunk.observable;
    var ObservableArray = drunk.observable.ObservableArrayPrototype;
    var ObservableObject = drunk.observable.ObservableObjectPrototype;
    var Observer = drunk.observable.Observer;

    it("create observable object", function () {
        var obj = {};

        expect(obj.__proto__).toBe(Object.prototype);

        var ob1 = observable.create(obj);
        var ob2 = observable.create(obj);

        expect(obj.__proto__).not.toBe(Object.prototype);
        expect(obj.__proto__).toBe(ObservableObject);
        expect(obj.__observer__).toBeDefined();
        expect(obj.removeProperty).toBeDefined();
        expect(obj.setProperty).toBeDefined();

        expect(ob1).toBe(ob2);
        expect(obj.__observer__).toBe(ob1);
    });

    it("create observable array", function () {
        var arr = [];

        expect(arr.__proto__).toBe(Array.prototype);

        var ob1 = observable.create(arr);
        var ob2 = observable.create(arr);

        expect(arr.__proto__).not.toBe(Array.prototype);
        expect(arr.__proto__).toBe(ObservableArray);
        expect(arr.__observer__).toBeDefined();
        expect(arr.removeAt).toBeDefined();
        expect(arr.removeItem).toBeDefined();
        expect(arr.setAt).toBeDefined();
        expect(arr.removeAllItem).toBeDefined();

        expect(arr.__observer__).toBe(ob1);
        expect(ob1).toBe(ob2);

        expect(arr.push).not.toBe(Array.prototype.push);
        expect(arr.pop).not.toBe(Array.prototype.pop);
        expect(arr.shift).not.toBe(Array.prototype.shift);
        expect(arr.splice).not.toBe(Array.prototype.splice);
        expect(arr.unshift).not.toBe(Array.prototype.unshift);
        expect(arr.reverse).not.toBe(Array.prototype.reverse);
        expect(arr.sort).not.toBe(Array.prototype.sort);

    });

    it("ObservableObject.setProperty", function () {
        var obj = {};
        var ob = observable.create(obj);

        var oldMethod = observable.observe;

        spyOn(observable, "observe").and.callThrough();

        spyOn(ob, "notify").and.callThrough();

        var val = { name: 'a' };

        obj.setProperty("a", val);

        expect(obj.a).toBe(val);
        expect(observable.observe).toHaveBeenCalledWith(obj, 'a', val);
        expect(ob.notify).toHaveBeenCalled();
        expect(val.__observer__).toBeDefined();

        observable.observe = oldMethod;
    });

    it("ObservableObject.removeProperty", function () {
        var obj = { a: 'a' };
        var ob = observable.create(obj);

        spyOn(ob, "notify").and.callThrough();

        obj.removeProperty('a');

        expect(ob.notify).toHaveBeenCalled();
        expect(obj.a).toBeUndefined();
    });

    it("ObservableArray.push", function () {
        var arr = [];
        var ob = observable.create(arr);

        spyOn(ob, 'notify').and.callThrough();

        var oldMethod = observable.create;
        spyOn(observable, "create").and.callThrough();

        arr.push(1, 2, 3, 4);

        expect(arr.length).toBe(4);
        expect(arr).toEqual([1, 2, 3, 4]);
        expect(ob.notify).toHaveBeenCalled();
        expect(observable.create.calls.count()).toBe(4);

        observable.create = oldMethod;
    });

    it("ObservableArray.pop", function () {
        var arr = [1, 2, 3, 4];
        var ob = observable.create(arr);

        spyOn(ob, 'notify').and.callThrough();

        arr.pop();

        expect(arr.length).toBe(3);
        expect(arr).toEqual([1, 2, 3]);
        expect(ob.notify).toHaveBeenCalled();
    });

    it("ObservableArray.shift", function () {
        var arr = [1, 2, 3, 4];
        var ob = observable.create(arr);

        spyOn(ob, 'notify').and.callThrough();

        arr.shift();

        expect(arr.length).toBe(3);
        expect(arr).toEqual([2, 3, 4]);
        expect(ob.notify).toHaveBeenCalled();
    });

    it("ObservableArray.unshift", function () {
        var arr = [1, 2, 3, 4];
        var ob = observable.create(arr);

        spyOn(ob, 'notify').and.callThrough();

        arr.unshift(0);

        expect(arr.length).toBe(5);
        expect(arr).toEqual([0, 1, 2, 3, 4]);
        expect(ob.notify).toHaveBeenCalled();
    });

    it("ObservableArray.reverse", function () {
        var arr = [1, 2, 3, 4];
        var ob = observable.create(arr);

        spyOn(ob, 'notify').and.callThrough();

        arr.reverse();

        expect(arr).toEqual([4, 3, 2, 1]);
        expect(ob.notify).toHaveBeenCalled();
    });

    it("ObservableArray.sort", function () {
        var arr = [1, 4, 3, 0];
        var ob = observable.create(arr);

        spyOn(ob, 'notify').and.callThrough();

        arr.sort();

        expect(arr).toEqual([0, 1, 3, 4]);
        expect(ob.notify).toHaveBeenCalled();
    });

    it("ObservableArray.setAt", function () {
        var arr = [];
        var ob = observable.create(arr);

        spyOn(arr, "splice").and.callThrough();

        var val = { name: 'a' };

        arr.setAt(0, val);

        expect(arr[0]).toBe(val);
        expect(arr.length).toBe(1);
        expect(arr.splice).toHaveBeenCalledWith(0, 1, val);
        expect(val.__observer__).toBeDefined();
    });
    
    it("ObservableArray.removeAt", function () {
        var arr = [1, 2, 3, 4];
        var ob = observable.create(arr);

        spyOn(arr, "splice").and.callThrough();
        arr.removeAt(2);

        expect(arr).toEqual([1, 2, 4]);
    });

    it("ObservableArray.removeItem", function () {
        var arr = [1, 2, 3, 4];
        var ob = observable.create(arr);

        spyOn(arr, "splice").and.callThrough();
        arr.removeItem(3);

        expect(arr).toEqual([1, 2, 4]);
        expect(arr.splice).toHaveBeenCalledWith(2, 1);
    });
    
    it("ObservableArray.removeAllItem", function () {
        var arr = [1, 2, 3, 4, 2, 454, 22, 2, 0];
        var ob = observable.create(arr);

        spyOn(arr, "splice").and.callThrough();
        arr.removeAllItem(2);

        expect(arr).toEqual([1, 3, 4, 454, 22, 0]);
    });
});