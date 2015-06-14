/// <reference path="../../build/drunk.d.ts" />
/// <reference path="../jasmine.d.ts" />

describe("Cache", function () {

    var cache = new drunk.Cache(3);
    
    function stringify() {
        var node = cache._head;
        var res = [];
        
        while (node) {
            res.push(node.key);
            node = node.next;
        }
        
        return res.join('->');
    };

    it("set", function () {
        
        cache.set('b', 2);
        cache.set('a', 1);
        
        expect(cache._count).toBe(2);
        expect(cache._cacheMap.a).toBeDefined();
        expect(cache._cacheMap.b).toBeDefined();
        expect(stringify()).toBe('a->b');
        expect(cache._head.key).toBe('a');
        expect(cache._tail.key).toBe('b');
    });

    it("get", function () {
        expect(cache.get('a')).toBe(1);
        expect(cache.get('b')).toBe(2);
        expect(stringify()).toBe('b->a');
        expect(cache._head.key).toBe('b');;
        expect(cache._tail.key).toBe('a');
    });
    
    it("should only keep 3 cache", function () {
        cache.set('c', 3);
        cache.set('d', 4);
        
        expect(stringify()).toBe('d->c->b');
    });
});

