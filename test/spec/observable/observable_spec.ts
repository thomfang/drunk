/// <reference path="../../../src/observable/observable.ts" />
/// <reference path="../../jasmine.d.ts" />

module ObservableTestCase {
    
    import observable = drunk.observable;
    
    describe("drunk.observable", () => {
       
       describe("Observable", () => {
           
           var instance: observable.Observable;
           
           beforeEach(() => {
               instance = new observable.Observable();
           });
           
           it("bind(property, action): property to be a string", () => {
               var spy: any = jasmine.createSpy("Action of a");
               instance.bind("a", spy);
               
               expect(instance["_action"]).toBeDefined();
               expect(Array.isArray(instance["_action"]["a"])).toBe(true);
               expect(instance["_action"]["a"]["length"]).toBe(1);
               expect(instance["_action"]["a"][0]).toBe(spy);
               
               expect(instance["_itemChangedActions"]).toBeUndefined();
           });
           
           it("bind(property, action): property to be null", () => {
               var spy: any = jasmine.createSpy("Action of a");
               instance.bind(null, spy);
               
               expect(instance["_action"]).toBeUndefined();
               expect(instance["_itemChangedActions"]).toBeDefined();
               expect(instance["_itemChangedActions"]["length"]).toBe(1);
               expect(instance["_itemChangedActions"][0]).toBe(spy);
           });
           
           it("notify(property): property to be a string", () => {
               var spy = jasmine.createSpy("Action of a");
               instance.bind("a", spy);
               
               instance.notify("a");
               expect(spy).toHaveBeenCalled();
               
               instance.notify("b");
               expect(spy.calls.count()).toBe(1);
               
               instance.notify();
               expect(spy.calls.count()).toBe(1);
           });
           
           it("notify(property): property to be empty", () => {
               var spy = jasmine.createSpy("Action of a");
               instance.bind(null, spy);
               
               instance.notify("a");
               expect(spy).not.toHaveBeenCalled();
               
               instance.notify("b");
               expect(spy).not.toHaveBeenCalled();
               
               instance.notify();
               expect(spy).toHaveBeenCalled();
           });
           
           it("unbind(property, action): property to be a string", () => {
               var spy: any = jasmine.createSpy("Action of a");
               instance.bind("a", spy);
               
               instance.unbind("a", spy);
               expect(instance["_action"]["a"]).toBeNull();
           });
           
           it("unbind(property, action): property to be empty", () => {
               var spy: any = jasmine.createSpy("Action of a");
               instance.bind(null, spy);
               
               instance.unbind(null, spy);
               expect(instance["_itemChangedActions"]).toBeNull();
           });
       });
       
       describe("create(data)", () => {
           
           it("data to be null", () => {
               expect(observable.create(null)).toBeUndefined();
           });
           
           it("data to be a clean array", () => {
               var data: observable.ObservableArray<any> = [];
               var result = observable.create(data);
               
               expect(data.__observable__ instanceof observable.Observable).toBe(true);
               expect(result instanceof observable.Observable).toBe(true);
           });
           
           it("data to be an observable array", () => {
               var data = [];
               var ob = observable.create(data);
               
               expect(observable.create(data)).toBe(ob);
           });
           
           it("data to be a clean object", () => {
               var data: observable.ObservableObject = {};
               var result = observable.create(data);
               
               expect(data.__observable__ instanceof observable.Observable).toBe(true);
               expect(result instanceof observable.Observable).toBe(true);
           });
           
           it("data to be a observable object", () => {
               var data = {};
               var ob = observable.create(data);
               
               expect(observable.create(data)).toBe(ob);
           });
       });
       
       describe("bind(observableData, property, action)", () => {
           
           it("data to be null", () => {
               var catchedError = false;
               
               try {
                   observable.bind(null, 'a', () => {});
               }
               catch (e) {
                   catchedError = true;
               }
               
               expect(catchedError).toBe(true);
           });
           
           it("data to be array", () => {
               var data: observable.ObservableArray<any> = [];
               var action = () => {};
               
               observable.bind(data, null, action);
               
               expect(data.__observable__).toBeDefined();
               
               data = [];
               observable.create(data);
               
               var spy = spyOn(data.__observable__, "bind").and.callThrough();
               
               observable.bind(data, null, action);
               
               expect(spy).toHaveBeenCalledWith(null, action);
           });
           
           
           it("data to be object", () => {
               var data: observable.ObservableObject = {};
               var action = () => {};
               
               observable.bind(data, 'a', action);
               
               expect(data.__observable__).toBeDefined();
               
               data = {};
               observable.create(data);
               
               var spy = spyOn(data.__observable__, "bind").and.callThrough();
               
               observable.bind(data, 'a', action);
               
               expect(spy).toHaveBeenCalledWith('a', action);
           });
       });
       
       describe("convert(observaleObject, property, value)", () => {
           
           var obj: observable.ObservableObject;
           
           beforeEach(() => {
               obj = {};
               observable.create(obj);
           });
           
           it("create a function as getter and setter for property", () => {
               expect(Object.getOwnPropertyDescriptor(obj, "a")).toBeUndefined();
               
               observable.convert(obj, "a", null);
               
               var descriptor = Object.getOwnPropertyDescriptor(obj, "a");
               
               expect(descriptor.get).toBe(descriptor.set);
               expect(descriptor.configurable).toBe(true);
               expect(descriptor.enumerable).toBe(true);
           });
           
           it("bind a propertyChanged action to observable of the value", () => {
               var value: observable.ObservableArray<any> = [];
               
               observable.convert(obj, "a", value);
               
               expect(value.__observable__["_itemChangedActions"].length).toBe(1);
           });
           
           it("call onPropertyAccess when access the converted property", () => {
               observable.onPropertyAccess = jasmine.createSpy("onPropertyAccess");
               
               observable.convert(obj, "a", null);
               
               var a = obj["a"];
               
               expect(observable.onPropertyAccess).toHaveBeenCalledWith(obj.__observable__, "a", null, obj);
               
               observable.onPropertyAccess = null;
           });
           
           it("observable value(object) changed and notify", () => {
               var value: observable.ObservableObject = {};
               var spy = jasmine.createSpy("property 'a' changed");
               
               observable.convert(obj, "a", value);
               observable.bind(obj, "a", spy);
               
               value.setProperty("some property", null);
               
               expect(spy).toHaveBeenCalled();
           });
           
           it("observable value(array) changed and notify", () => {
               var value: observable.ObservableArray<any> = [];
               var spy = jasmine.createSpy("property 'a' changed");
               
               observable.convert(obj, "a", value);
               observable.bind(obj, "a", spy);
               
               value.push(null);
               
               expect(spy).toHaveBeenCalled();
           });
       });
       
       describe("notify(observableData, property)", () => {
           
           it("notify an observable array property changed", () => {
               var array: observable.ObservableArray<any> = [];
               var spy = jasmine.createSpy("array changed action");
               
               observable.create(array);
               observable.bind(array, null, spy);
               
               observable.notify(array, null);
               
               expect(spy).toHaveBeenCalled();
           });
           
           it("notify an observable object property changed", () => {
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
       
    });
}