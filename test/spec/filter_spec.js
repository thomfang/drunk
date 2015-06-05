describe("Filter", function () {
    var filter = drunk.filter.filters;

    it("escape", function () {
        expect(filter.escape(" & \"'<>")).toEqual("&nbsp;&amp;&nbsp;&quot;&#x27;&lt;&gt;");
    });

    it("unescape", function () {
        expect(filter.unescape("&nbsp;&amp;&nbsp;&quot;&#x27;&lt;&gt;")).toEqual(" & \"'<>");
    });

    it("truncate", function () {
        var str = "0123456789";
        expect(filter.truncate(str, 2)).toEqual("01...");
        expect(filter.truncate(str, 3, '**')).toEqual("012**");
    });

    it("addslashes", function () {
        expect(filter.addslashes("\\'\"")).toEqual("\\\\\\'\\\"");
    });

    it("stripslashes", function () {
        expect(filter.stripslashes("\\\\\'\\\"")).toEqual("\\'\"");
    });

    it("length", function () {
        expect(filter.length({})).toBe(0);
        expect(filter.length({a:23})).toBe(1);

        expect(filter.length([])).toBe(0);
        expect(filter.length([1,2,3])).toBe(3);

        expect(filter.length("")).toBe(0);
        expect(filter.length("1234")).toBe(4);

        expect(filter.length(null)).toBe(0);
    });

    it("striptags", function () {
        expect(filter.striptags("<div>123</div>")).toEqual("123");
        expect(filter.striptags("<img/>title here")).toEqual("title here");
    });

    it("default", function () {
        var defaultValue = '123';
        var emptyString  = '';
        var emptyArray   = [];
        var emptyObject  = {};

        expect(filter.default(null,        defaultValue)).toBe(defaultValue);
        expect(filter.default(undefined,   defaultValue)).toBe(defaultValue);
        expect(filter.default(emptyString, defaultValue)).toBe(emptyString);
        expect(filter.default(emptyArray,  defaultValue)).toBe(emptyArray);
        expect(filter.default(emptyObject, defaultValue)).toBe(emptyObject);
    });

    it("date", function () {
        var time1  = 1421051645040;
        var time2  = "2015-01-12 16:34";
        var format = "YYYY/MM/DD HH:mm";
        var result = "2015/01/12 16:34";

        expect(filter.date(time1, format)).toEqual(result);
        expect(filter.date(time2, format)).toEqual(result);
    });
});

