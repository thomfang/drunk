/// <reference path="../../jasmine.d.ts" />
/// <reference path="../../../src/util/util.ts" />
/// <reference path="../../../src/util/xhr.ts" />
/// <reference path="../../../src/util/tpl.ts" />

module UtilTestCase {

    describe("drunk.util", () => {

        it("isObject", () => {
            expect(drunk.util.isObject({})).toBe(true);
            expect(drunk.util.isObject('123')).toBe(false);
            expect(drunk.util.isObject(123)).toBe(false);
            expect(drunk.util.isObject(new Date())).toBe(false);
            expect(drunk.util.isObject(null)).toBe(false);
            expect(drunk.util.isObject(undefined)).toBe(false);
        });

        it("extend", () => {
            var src1 = { a: 'a' };
            var src2 = { b: 'b' }

            var target = {};
            drunk.util.extend(target, src1);
            expect(target['a']).toBe('a');

            target = {};
            drunk.util.extend(target, src1, src2);
            expect(target['a']).toBe('a');
            expect(target['b']).toBe('b');
        });

        it("toArray", () => {
            var obj = { 0: 1, 1: 2, 2: 3, length: 3 };
            var res = drunk.util.toArray(obj);

            expect(Array.isArray(res)).toBe(true);
            expect(res[0]).toBe(1);
            expect(res[1]).toBe(2);
            expect(res[2]).toBe(3);
        });

        it("ensureItem", () => {
            var arr = [];

            drunk.util.addArrayItem(arr, 1);
            expect(arr[0]).toBe(1);
            expect(arr.length).toBe(1);

            drunk.util.addArrayItem(arr, 1);
            expect(arr.length).toBe(1);

            var fn = () => { };

            drunk.util.addArrayItem(arr, fn);
            expect(arr[1]).toBe(fn);
            expect(arr.length).toBe(2);

            drunk.util.addArrayItem(arr, fn);
            expect(arr.length).toBe(2);
        });

        it("removeItem", () => {
            var arr = [1, 2, 5, 1];

            drunk.util.removeArrayItem(arr, 1);
            expect(arr.length).toBe(3);
            expect(arr[0]).toBe(2);

            drunk.util.removeArrayItem(arr, 1);
            expect(arr.length).toBe(2);
            expect(arr[1]).toBe(5);
        });

        it("defineProperty", () => {
            var a = {};
            drunk.util.defineProperty(a, 'name', 'a');
            expect(a['name']).toBe('a');
            expect(Object.keys(a).length).toBe(0);

            var b = {};
            drunk.util.defineProperty(b, 'name', 'b', true);
            expect(b['name']).toBe('b');
            expect(Object.keys(b)[0]).toBe('name');

            var c: any = {};
            drunk.util.defineProperty(c, 'name', 'c');
            expect(c['name']).toBe('c');

            c.name = 'd';
            expect(c.name).toBe('d');

            drunk.util.defineProperty(c, 'name', 'e');
            expect(c.name).toBe('e');
        });

        it("nextTick", function(done) {
            var invoked = false;

            drunk.util.nextTick(() => {
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

            drunk.util.proxy(a, 'name', b);

            a.name = 'a';
            expect(a.name).toBe('a');
            expect(b.name).toBe('a');

            drunk.util.proxy(a, 'list', c);

            a.list = [1, 2, 3];
            expect(c.list).toBe(a.list);
            expect(c.list.length).toBe(3);
            expect(c.list[0]).toBe(1);

            expect(drunk.util.proxy(a, 'name', d)).toBe(false);
        });

        it("ajax", (done) => {
            drunk.util.ajax({
                url: "ajax_test.json",
                type: 'GET',
                dataType: 'json'
            }).then((result) => {
                
                expect(drunk.util.isObject(result)).toBe(true);
                expect((<any>result).name).toBe('ajax_test');

                drunk.util.ajax({
                    url: "ajax_test.json"
                }).then((result: string) => {
                    expect(typeof result).toBe('string');
                    done();
                });
            });

        });

        it("loadTemplate: template in script tag", (done) => {
            var tplString = "<div></div>";
            var tplScriptElem = document.createElement("script");
            
            tplScriptElem.id = "tpl/test.html";
            tplScriptElem.type = 'text/template';
            tplScriptElem.innerHTML = tplString;

            document.body.appendChild(tplScriptElem);

            drunk.util.loadTemplate('tpl/test.html').then((res) => {
                expect(res).toBe(tplString);

                drunk.util.loadTemplate('test_tpl.html').then((res) => {
                    expect(res).toBe("<div>test tpl</div>");
                    done();
                });
            });
        });

        it("loadTemplate: template on server", (done) => {
            
            drunk.util.loadTemplate("runner.html").then((html) => {
                expect(typeof html).toBe('string');
                done();
            });
        });
    });

}