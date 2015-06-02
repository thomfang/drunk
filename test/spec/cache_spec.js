/// <reference path="../../build/drunk.d.ts" />
/// <reference path="../jasmine.d.ts" />

describe("Cache", function () {

    var cache = new drunk.Cache();

    it("set", function () {
        
        cache.set('a', 1);
        cache.set('b', 2);
        
        expect(cache['_store']['a']).toBe(1);
        expect(cache['_store']['b']).toBe(2);
    });

    it("get", function () {
        expect(cache.get('a')).toBe(1);
        expect(cache.get('b')).toBe(2);
    });

    it("remove", function () {
        cache.remove('a');
        expect(cache.get('a')).toBeUndefined();
        expect(cache['_store']['a']).toBeUndefined();
    });
    
    it("cleanup", function () {
        cache.cleanup();
        
        expect(cache['_store']).toEqual({});
    });
});

