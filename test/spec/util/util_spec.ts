/// <reference path="../../jasmine.d.ts" />
/// <reference path="../../../src/util/util.ts" />
/// <reference path="../../../src/util/xhr.ts" />
/// <reference path="../../../src/util/tpl.ts" />

module UtilTestCase {
    
    import util = drunk.util;

    describe("drunk.util", () => {

        it("isObject", () => {
            expect(util.isObject({})).toBe(true);
            expect(util.isObject('123')).toBe(false);
            expect(util.isObject(123)).toBe(false);
            expect(util.isObject(new Date())).toBe(false);
            expect(util.isObject(null)).toBe(false);
            expect(util.isObject(undefined)).toBe(false);
        });

        it("extend", () => {
            var src1 = { a: 'a' };
            var src2 = { b: 'b' }

            var target = {};
            util.extend(target, src1);
            expect(target['a']).toBe('a');

            target = {};
            util.extend(target, src1, src2);
            expect(target['a']).toBe('a');
            expect(target['b']).toBe('b');
        });

        it("toArray", () => {
            var obj = { 0: 1, 1: 2, 2: 3, length: 3 };
            var res = util.toArray(obj);

            expect(Array.isArray(res)).toBe(true);
            expect(res[0]).toBe(1);
            expect(res[1]).toBe(2);
            expect(res[2]).toBe(3);
        });

        it("ensureItem", () => {
            var arr = [];

            util.addArrayItem(arr, 1);
            expect(arr[0]).toBe(1);
            expect(arr.length).toBe(1);

            util.addArrayItem(arr, 1);
            expect(arr.length).toBe(1);

            var fn = () => { };

            util.addArrayItem(arr, fn);
            expect(arr[1]).toBe(fn);
            expect(arr.length).toBe(2);

            util.addArrayItem(arr, fn);
            expect(arr.length).toBe(2);
        });

        it("removeItem", () => {
            var arr = [1, 2, 5, 1];

            util.removeArrayItem(arr, 1);
            expect(arr.length).toBe(3);
            expect(arr[0]).toBe(2);

            util.removeArrayItem(arr, 1);
            expect(arr.length).toBe(2);
            expect(arr[1]).toBe(5);
        });

        it("defineProperty", () => {
            var a = {};
            util.defineProperty(a, 'name', 'a');
            expect(a['name']).toBe('a');
            expect(Object.keys(a).length).toBe(0);

            var b = {};
            util.defineProperty(b, 'name', 'b', true);
            expect(b['name']).toBe('b');
            expect(Object.keys(b)[0]).toBe('name');

            var c: any = {};
            util.defineProperty(c, 'name', 'c');
            expect(c['name']).toBe('c');

            c.name = 'd';
            expect(c.name).toBe('d');

            util.defineProperty(c, 'name', 'e');
            expect(c.name).toBe('e');
        });

        it("nextTick", function(done) {
            var invoked = false;

            util.nextTick(() => {
                expect(invoked).toBe(false);

                done();
            });

            setTimeout(() => {
                invoked = true;
            }, 0);
        });

        it("proxy", () => {
            var a: any = {};
            var b: any = {};
            var c: any = {};
            var d: any = {};

            util.proxy(a, 'name', b);

            a.name = 'a';
            expect(a.name).toBe('a');
            expect(b.name).toBe('a');

            util.proxy(a, 'list', c);

            a.list = [1, 2, 3];
            expect(c.list).toBe(a.list);
            expect(c.list.length).toBe(3);
            expect(c.list[0]).toBe(1);

            expect(util.proxy(a, 'name', d)).toBe(false);
        });
    });

}