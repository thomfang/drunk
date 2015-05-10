/// <reference path="../../../src/observable/index.ts" />
/// <reference path="../../jasmine.d.ts" />

module ObservableTestCase {

    import observable = drunk.observable;

    describe("drunk.observable", () => {

        describe("Observer", () => {

            var instance: observable.Observer;

            beforeEach(() => {
                instance = new observable.Observer();
            });

            it("bind(stringProperty, action)", () => {
                var spy: any = jasmine.createSpy("Action of a");
                instance.bind("a", spy);

                expect(instance["_action"]).toBeDefined();
                expect(Array.isArray(instance["_action"]["a"])).toBe(true);
                expect(instance["_action"]["a"]["length"]).toBe(1);
                expect(instance["_action"]["a"][0]).toBe(spy);

                expect(instance["_itemChangedActions"]).toBeUndefined();
            });

            it("bind(null, action)", () => {
                var spy: any = jasmine.createSpy("Action of a");
                instance.bind(null, spy);

                expect(instance["_action"]).toBeUndefined();
                expect(instance["_itemChangedActions"]).toBeDefined();
                expect(instance["_itemChangedActions"]["length"]).toBe(1);
                expect(instance["_itemChangedActions"][0]).toBe(spy);
            });

            it("notify(stringProperty)", () => {
                var spy = jasmine.createSpy("Action of a");
                instance.bind("a", spy);

                instance.notify("a");
                expect(spy).toHaveBeenCalled();

                instance.notify("b");
                expect(spy.calls.count()).toBe(1);

                instance.notify();
                expect(spy.calls.count()).toBe(1);
            });

            it("notify(null|undefined)", () => {
                var spy = jasmine.createSpy("Action of a");
                instance.bind(null, spy);

                instance.notify("a");
                expect(spy).not.toHaveBeenCalled();

                instance.notify("b");
                expect(spy).not.toHaveBeenCalled();

                instance.notify();
                expect(spy).toHaveBeenCalled();
            });

            it("unbind(stringProperty, action)", () => {
                var spy: any = jasmine.createSpy("Action of a");
                instance.bind("a", spy);

                instance.unbind("a", spy);
                expect(instance["_action"]["a"]).toBeNull();
            });

            it("unbind(null|undefined, action)", () => {
                var spy: any = jasmine.createSpy("Action of a");
                instance.bind(null, spy);

                instance.unbind(null, spy);
                expect(instance["_itemChangedActions"]).toBeNull();
            });
        });

        describe("create(data)", () => {

            it("create(null)", () => {
                expect(observable.create(null)).toBeUndefined();
            });

            it("create(Array)", () => {
                var data: observable.ObservableArray<any> = [];
                var result = observable.create(data);

                expect(data.__observer__ instanceof observable.Observer).toBe(true);
                expect(result instanceof observable.Observer).toBe(true);
                expect(data["__proto__"]).toBe(observable.ObservableArrayPrototype);
            });

            it("create(ObservableArray)", () => {
                var data = [];
                var ob = observable.create(data);

                expect(observable.create(data)).toBe(ob);
            });

            it("create(object)", () => {
                var data: observable.ObservableObject = {};
                var result = observable.create(data);

                expect(data.__observer__ instanceof observable.Observer).toBe(true);
                expect(result instanceof observable.Observer).toBe(true);
                expect(data["__proto__"]).toBe(observable.ObservableObjectPrototype);
            });

            it("create(ObservableObject)", () => {
                var data = {};
                var ob = observable.create(data);

                expect(observable.create(data)).toBe(ob);
            });
        });

        describe("bind(observableData, property, action)", () => {

            it("bind(null, property, action)", () => {
                var catchedError = false;

                try {
                    observable.bind(null, 'a', () => { });
                }
                catch (e) {
                    catchedError = true;
                }

                expect(catchedError).toBe(true);
            });

            it("bind(array, property, action)", () => {
                var data: observable.ObservableArray<any> = [];
                var action = () => { };

                observable.bind(data, null, action);

                expect(data.__observer__).toBeDefined();

                data = [];
                observable.create(data);

                var spy = spyOn(data.__observer__, "bind").and.callThrough();

                observable.bind(data, null, action);

                expect(spy).toHaveBeenCalledWith(null, action);
            });


            it("bind(object, property, action)", () => {
                var data: observable.ObservableObject = {};
                var action = () => { };

                observable.bind(data, 'a', action);

                expect(data.__observer__).toBeDefined();

                data = {};
                observable.create(data);

                var spy = spyOn(data.__observer__, "bind").and.callThrough();

                observable.bind(data, 'a', action);

                expect(spy).toHaveBeenCalledWith('a', action);
            });
        });

        describe("observe(observaleObject, property, value)", () => {

            var obj: observable.ObservableObject;

            beforeEach(() => {
                obj = {};
                observable.create(obj);
            });

            it("create a function as getter and setter for property", () => {
                expect(Object.getOwnPropertyDescriptor(obj, "a")).toBeUndefined();

                observable.observe(obj, "a", null);

                var descriptor = Object.getOwnPropertyDescriptor(obj, "a");

                expect(descriptor.get).toBe(descriptor.set);
                expect(descriptor.configurable).toBe(true);
                expect(descriptor.enumerable).toBe(true);
            });

            it("bind a propertyChanged action to observable of the value", () => {
                var value: observable.ObservableArray<any> = [];

                observable.observe(obj, "a", value);

                expect(value.__observer__["_itemChangedActions"].length).toBe(1);
            });

            it("call onPropertyAccess when access the converted property", () => {
                observable.onPropertyAccess = jasmine.createSpy("onPropertyAccess");

                observable.observe(obj, "a", null);

                var a = obj["a"];

                expect(observable.onPropertyAccess).toHaveBeenCalledWith(obj.__observer__, "a", null, obj);

                observable.onPropertyAccess = null;
            });

            it("observable value(object) changed and notify", () => {
                var value: observable.ObservableObject = {};
                var spy = jasmine.createSpy("property 'a' changed");

                observable.observe(obj, "a", value);
                observable.bind(obj, "a", spy);

                value.setProperty("some property", null);

                expect(spy).toHaveBeenCalled();
            });

            it("observable value(array) changed and notify", () => {
                var value: observable.ObservableArray<any> = [];
                var spy = jasmine.createSpy("property 'a' changed");

                observable.observe(obj, "a", value);
                observable.bind(obj, "a", spy);

                value.push(null);

                expect(spy).toHaveBeenCalled();
            });
        });

        describe("notify(observableData, property)", () => {

            it("notify(array, null)", () => {
                var array: observable.ObservableArray<any> = [];
                var spy = jasmine.createSpy("array changed action");

                observable.create(array);
                observable.bind(array, null, spy);

                observable.notify(array, null);

                expect(spy).toHaveBeenCalled();
            });

            it("notify(object, property)", () => {
                var obj: observable.ObservableObject = {};
                var spy1 = jasmine.createSpy("property key changed action");
                var spy2 = jasmine.createSpy("object property changed");

                observable.create(obj);
                observable.bind(obj, "key", spy1);
                observable.bind(obj, null, spy2);

                observable.notify(obj, "key");
                observable.notify(obj);

                expect(spy1).toHaveBeenCalled();
                expect(spy2).toHaveBeenCalled();
            });
        });
        
        describe("ObservableArray", () => {
            var arr: observable.ObservableArray<any>;
            
            beforeEach(() => {
                arr = [];
                observable.create(arr);
            });
            
            it("pop()", () => {
                arr[0] = 123;
                expect(arr.length).toBe(1);
                
                var spy = jasmine.createSpy("array item updated");
                
                observable.bind(arr, null, spy);
                
                arr.pop();
                expect(spy).toHaveBeenCalled();
                expect(arr.length).toBe(0);
            });
            
            it("shift()", () => {
                arr[0] = 123;
                arr[1] = 234;
                expect(arr.length).toBe(2);
                
                var spy = jasmine.createSpy("array item updated");
                
                observable.bind(arr, null, spy);
                
                arr.shift();
                expect(spy).toHaveBeenCalled();
                expect(arr.length).toBe(1);
                expect(arr[0]).toBe(234);
            });
            
            it("unshift(...args)", () => {
                expect(arr.length).toBe(0);
                
                var spy = jasmine.createSpy("array item updated");
                
                observable.bind(arr, null, spy);
                
                arr.unshift(1);
                expect(spy.calls.count()).toBe(1);
                expect(arr.length).toBe(1);
                expect(arr[0]).toBe(1);
                
                arr.unshift(3,2);
                expect(spy.calls.count()).toBe(2);
                expect(arr).toEqual([3,2,1]);
            });
            
            it("push(...args)", () => {
                expect(arr.length).toBe(0);
                
                var spy = jasmine.createSpy("array item updated");
                
                observable.bind(arr, null, spy);
                
                arr.push(1);
                expect(spy.calls.count()).toBe(1);
                expect(arr.length).toBe(1);
                expect(arr[0]).toBe(1);
                
                arr.push(2,3);
                expect(spy.calls.count()).toBe(2);
                expect(arr).toEqual([1,2,3]);
            });
            
            it("splice(index, length, ...args)", () => {
                var tmp = [];
                
                for (var i = 0; i < 10; i++) {
                    arr.push(i);
                    tmp.push(i);
                }
                expect(arr.length).toBe(10);
                
                var spy = jasmine.createSpy("array item updated");
                
                observable.bind(arr, null, spy);
                
                arr.splice(1, 1);
                expect(spy.calls.count()).toBe(1);
                expect(arr.length).toBe(9);
                expect(arr[1]).toBe(2);
                
                arr.splice(1, 0, 1);
                expect(spy.calls.count()).toBe(2);
                expect(arr).toEqual(tmp);
                
                arr.splice(0, 0, 'a', 'b', 'c');
                expect(spy.calls.count()).toBe(3);
                expect(arr.length).toBe(13);
                expect(arr.slice(0, 3)).toEqual(['a','b','c']);
                
                arr.splice(0);
                expect(spy.calls.count()).toBe(4);
                expect(arr.length).toBe(0);
            });
            
            it("sort(callback)", () => {
                arr[0] = 3;
                arr[1] = 5;
                arr[2] = 1;
                expect(arr).toEqual([3,5,1]);
                
                var spy = jasmine.createSpy("array item updated");
                
                observable.bind(arr, null, spy);
                
                arr.sort();
                expect(spy.calls.count()).toBe(1);
                expect(arr).toEqual([1,3,5]);
                
                arr.sort((a, b) => {
                    return a - b;
                });
                expect(spy.calls.count()).toBe(2);
                expect(arr).toEqual([1,3,5]);
            });
            
            it("reverse()", () => {
                arr[0] = 3;
                arr[1] = 5;
                arr[2] = 1;
                expect(arr).toEqual([3,5,1]);
                
                var spy = jasmine.createSpy("array item updated");
                
                observable.bind(arr, null, spy);
                
                arr.reverse();
                expect(spy).toHaveBeenCalled();
                expect(arr).toEqual([1,5,3]);
            });
            
            it("setAt(index, value)", () => {
                var spy = jasmine.createSpy("array item updated");
                
                observable.bind(arr, null, spy);
                arr.setAt(0, "123");
                
                expect(arr[0]).toBe("123");
                expect(spy).toHaveBeenCalledWith();
            });
            
            it("removeAt(index)", () => {
                var spy = jasmine.createSpy("array item updated");
                
                arr.push("123");
                
                expect(arr[0]).toBe("123");
                
                observable.bind(arr, null, spy);
                
                arr.removeAt(0);
                expect(spy.calls.count()).toBe(1);
                
                arr.removeAt(2);
                expect(spy.calls.count()).toBe(1);
            });
            
            it("removeItem(value)", () => {
                var spy = jasmine.createSpy("array item updated");
                
                arr.push("1", "2", "3", 4, "2", 2);
                
                observable.bind(arr, null, spy);
                
                arr.removeItem("2");
                expect(arr.length).toBe(5);
                expect(spy.calls.count()).toBe(1);
                
                arr.removeItem(2);
                expect(arr.length).toBe(4);
                expect(spy.calls.count()).toBe(2);
            });
            
            it("removeAllItem(value)", () => {
                var spy = jasmine.createSpy("array item updated");
                
                arr.push("1", "2", "3", 4, "2", 2);
                
                observable.bind(arr, null, spy);
                
                arr.removeAllItem("2");
                expect(arr.length).toBe(4);
                expect(spy.calls.count()).toBe(1);
                
                arr.removeAllItem("2");
                expect(arr.length).toBe(4);
                expect(spy.calls.count()).toBe(1);
            });
        });
        
        describe("ObservableObject", () => {
            
            var obj: observable.ObservableObject;
            
            beforeEach(() => {
                obj = {};
                observable.create(obj);
            });
            
            it("setProperty(name, value)", () => {
                expect(obj).toEqual({});
                
                var spy = jasmine.createSpy("some property changed");
                var spyA = jasmine.createSpy("property a changed");
                var spyB = jasmine.createSpy("property b changed");
                var spyC = jasmine.createSpy("property c changed");
                
                obj["c"] = 123;
                
                observable.bind(obj, null, spy);
                observable.bind(obj, "a", spyA);
                observable.bind(obj, "b", spyB);
                observable.bind(obj, "c", spyC);
                
                obj.setProperty("a", "123");
                expect(spy.calls.count()).toBe(1);
                expect(spyA).not.toHaveBeenCalled();
                
                obj.setProperty("b", "234");
                expect(spy.calls.count()).toBe(2);
                expect(spyB).not.toHaveBeenCalled();
                
                obj.setProperty("c", "345");
                expect(spy.calls.count()).toBe(3);
                expect(spyC).not.toHaveBeenCalled();
                
                obj["a"] = null;
                obj["b"] = null;
                obj["c"] = null
                expect(spy.calls.count()).toBe(3);
                expect(spyA).toHaveBeenCalled();
                expect(spyB).toHaveBeenCalled();
                expect(spyC).toHaveBeenCalled();
            });
            
            it("removeProperty(name)", () => {
                obj.setProperty('a', 123);
                obj.setProperty('b', 234);
                obj['c'] = 345;
                
                expect(obj).toEqual({a: 123, b: 234, c: 345});
                
                var spy = jasmine.createSpy("some property changed");
                var spyA = jasmine.createSpy("property a changed");
                var spyB = jasmine.createSpy("property b changed");
                var spyC = jasmine.createSpy("property c changed");
                
                observable.bind(obj, null, spy);
                observable.bind(obj, "a", spyA);
                observable.bind(obj, "b", spyB);
                observable.bind(obj, "c", spyC);
                
                obj.removeProperty("a");
                expect(spy.calls.count()).toBe(1);
                expect(spyA).not.toHaveBeenCalled();
                
                obj.removeProperty("b");
                expect(spy.calls.count()).toBe(2);
                expect(spyB).not.toHaveBeenCalled();
                
                obj.removeProperty("c");
                expect(spy.calls.count()).toBe(3);
                expect(spyC).not.toHaveBeenCalled();
                
                obj.removeProperty('d');
                expect(spy.calls.count()).toBe(3);
                
                obj['a'] = 123;
                expect(spy.calls.count()).toBe(3); 
            });
        });

    });
}