/// <reference path="../../jasmine.d.ts" />
/// <reference path="../../../src/util/util.ts" />
/// <reference path="../../../src/util/xhr.ts" />
/// <reference path="../../../src/util/tpl.ts" />

module AjaxTestCase {
    import util = drunk.util;

    describe("drunk.util", () => {

        it("ajax", (done) => {
            util.ajax({
                url: "ajax_test.json",
                type: 'GET',
                dataType: 'json'
            }).then((result) => {
                expect(util.isObject(result)).toBe(true);
                expect((<any>result).name).toBe('ajax_test');

                util.ajax({
                    url: "ajax_test.json"
                }).then((result: string) => {
                    expect(typeof result).toBe('string');
                    done();
                });
            });

        });

    });
}