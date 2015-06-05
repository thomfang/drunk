/// <reference path="../../build/drunk.d.ts" />
/// <reference path="../jasmine.d.ts" />

describe("xhr", function () {
    
    var util = drunk.util;

    it("should response as a string", function (done) {
        var onDone = function (res) {
            expect(res).not.toBeNull();
            expect(typeof res).toBe("string");
            expect(JSON.parse(res)).toEqual({ name: "test" });
            done();
        };

        var options = {
            type: "GET",
            url: "test.json",
        };

        util.ajax(options).then(onDone);
    });

    it("should response as a JSON", function (done) {
        var onDone = function (res) {
            expect(typeof res).toBe("object");
            expect(res).not.toBeNull();
            expect(res).toEqual({ name: "test" });
            done();
        };

        var options = {
            type: "GET",
            url: "test.json",
            dataType: "json"
        };

        util.ajax(options).then(onDone);
    });
    
    it("should recieve a 404 status", function (done) {
        var onFail = function (res) {
            expect(res.status).toBe(404);
            done();
        };

        var options = {
            type: "GET",
            url: "404.json",
            dataType: "json"
        };

        util.ajax(options).catch(onFail);
    });

    it("should post a JSON data", function (done) {
        var onDone = function (res) {
            expect(typeof (res)).toBe("string");
            expect(JSON.parse(res)).toEqual({ name: 'test' });
            done();
        };

        var options = {
            type: "POST",
            url: "test.json",
            data: JSON.stringify({ name: 123 }),
            contentType: "application/json; charset=UTF-8",
            withCredentials: true,
        };

        util.ajax(options).then(onDone);
    });
});