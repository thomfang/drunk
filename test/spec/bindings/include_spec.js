/// <reference path="../../../build/drunk.d.ts" />
/// <reference path="../../jasmine.d.ts" />

describe("Binding.include", function () {

    var Ctor = drunk.Binding.getByName('include');

    var binding;

    var tplNodeList = [];

    function add(url) {
        var templateNode = document.createElement("script");
        templateNode.id = url;
        templateNode.type = "text/template";
        templateNode.innerHTML = "<div id='" + url + "'></div>";
        document.body.appendChild(templateNode);

        tplNodeList.push(templateNode);
    }

    add("a.html");
    add("b.html");

    beforeEach(function () {
        binding = new Ctor(new drunk.Component(), drunk.dom.create("<div></div>"), {})
    });

    it("should toggle template when url variable changed", function (done) {
        binding.update("a.html")
        
        drunk.util.execAsyncWork(function () {
            expect(binding._elements[0].id).toBe("a.html");
            expect(binding._unbind).toBeDefined();

            binding.update("b.html");
            drunk.util.execAsyncWork(function () {
                expect(binding._elements[0].id).toBe("b.html");
                done();
            });
        });
    });

    it("should remove important references", function () {
        binding.update("a.html");
        binding.release();
        expect(binding._unbind).toBeNull();
        expect(binding.element.innerHTML).toBe("");
    });

//    tplNodeList.forEach(function (node) {
//        document.body.removeChild(node);
//    });
});