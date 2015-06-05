/// <reference path="../../build/drunk.d.ts" />
/// <reference path="../jasmine.d.ts" />

describe("querystring", function () {
    
    var qs = 'a=a&b=b&c=c&d=%25%5E%23';
    var qo = {
            a: 'a',
            b: 'b',
            c: 'c',
            d: '%^#'
        };
    
    it("should parse a querystring to a key-value pair object", function () {
        
        
        expect(drunk.querystring.parse(qs)).toEqual(qo);
    });
    
    it("should make a querystring object stringify", function () {
        expect(drunk.querystring.stringify(qo)).toBe(qs);
    });
});