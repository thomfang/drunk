/// <reference path="../../jasmine.d.ts" />
/// <reference path="../../../build/drunk.d.ts" />

describe("Binding.bind", function () {
    var definition = drunk.Binding.getDefinintionByName('bind');
    var binding;
    
    beforeEach(function () {
        binding = Object.create(definition);
    });
    
    it("bind element", function () {
        binding.element = drunk.elementUtil.create("<div></div>");
        
        binding.update("123");
        
        expect(binding.element.innerHTML).toBe("123");
    });
    
    it("bind input element", function () {
        binding.element = drunk.elementUtil.create("<input type=text>");

        binding.update("123");

        expect(binding.element.value).toBe("123");
    });
});