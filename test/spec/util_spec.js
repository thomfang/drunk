/// <reference path="../../build/drunk.d.ts" />
/// <reference path="../jasmine.d.ts" />

describe("util", function () {

    var util = drunk.util;
    
    it("uid", function () {
        var obj = {};
        
        expect(typeof drunk.util.uniqueId(obj)).toBe('number');
    });

    it("camelCase", function () {
        var result = "dataRepeat";
        var str1 = util.camelCase("data-repeat");
        var str2 = util.camelCase("data_repeat");

        expect(str1).toBe(result);
        expect(str2).toBe(result);
    });

    it("extend", function () {
        var a = { a: 1 };
        var b = { b: 2 };
        var cd = { c: 3, d: 4 };

        util.extend(a, b, cd);

        expect(a).toEqual({
            a: 1,
            b: 2,
            c: 3,
            d: 4
        });
    });

    it("toArray", function () {
        var arr = [1, 2, 3, 4];

        function test() {
            var result = util.toArray(arguments);

            expect(result).toEqual(arr);
        }

        test.apply(null, arr);
    });

    it("addArrayItem", function () {
        var array = [1, 2, 3, 4];

        util.addArrayItem(array, 2);

        expect(array.length).toBe(4);
        expect(array.indexOf(2)).toBe(1);

        util.addArrayItem(array, 5);

        expect(array.length).toBe(5);
        expect(array.indexOf(5)).toBe(4);
    });

    it("removeArrayItem", function () {
        var array = [1, 2, 3, 4];

        util.removeArrayItem(array, 2);

        expect(array.length).toBe(3);
        expect(array.indexOf(2)).toBe(-1);

        util.removeArrayItem(array, 2);
        expect(array.length).toBe(3);
    });

    it("defineProperty", function () {
        var o = {};

        util.defineProperty(o, "a", "a");
        util.defineProperty(o, "b", "b", true);

        var keys = Object.keys(o);

        expect(keys.indexOf('a')).toBe(-1);
        expect(keys.indexOf('b')).not.toBe(-1);
    });

    it("proxy", function () {
        var src = {};
        var des = {};

        var res = util.proxy(des, 'a', src);

        expect(res).toBe(true);

        des.a = 123;

        expect(des.a).toBe(123);
        expect(src.a).toBe(123);

        res = util.proxy(des, 'a', src);

        expect(res).toBe(false);
    });
});

