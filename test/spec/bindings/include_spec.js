/// <reference path="../../../build/drunk.d.ts" />
/// <reference path="../../jasmine.d.ts" />

describe("Binding.include", function () {

    var includeBinding = drunk.Binding.getDefinintionByName('include');

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
        binding = Object.create(includeBinding);
        binding.viewModel = new drunk.ViewModel();
        binding.element = drunk.elementUtil.create("<div></div>");
    });

    it("should toggle template when url variable changed", function (done) {
        drunk.Promise.resolve(binding.update("a.html")).then(function () {
            expect(binding.element.firstElementChild.id).toBe("a.html");
            expect(binding._unbindExecutor).toBeDefined();

            drunk.Promise.resolve(binding.update("b.html")).then(function () {
                expect(binding.element.firstElementChild.id).toBe("b.html");
                done();
            });
        }).catch(function (e) {
            console.log(e);
        });
    });

    it("should remove important references", function () {
        binding.update("a.html");
        binding.release();
        expect(binding.isActived).toBe(false);
        expect(binding._unbindExecutor).toBeNull();
        expect(binding.element.innerHTML).toBe("");
    });

//    tplNodeList.forEach(function (node) {
//        document.body.removeChild(node);
//    });
});