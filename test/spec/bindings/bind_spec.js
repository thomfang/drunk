/// <reference path="../../jasmine.d.ts" />
/// <reference path="../../../build/drunk.d.ts" />

describe("Binding.bind", function () {
    var Ctor = drunk.Binding.getByName('bind');
    var binding;
    
    it("bind element", function () {
        binding = new Ctor(new drunk.Component(), drunk.dom.create("<div></div>"), {})
        binding.update("123");
        
        expect(binding.element.innerHTML).toBe("123");
    });
    
    it("bind input element", function () {
        binding = new Ctor(new drunk.Component(), drunk.dom.create("<input type=text>"), {})
        binding.update("123");

        expect(binding.element.value).toBe("123");
    });
});