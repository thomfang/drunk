/// <reference path="../../jasmine.d.ts" />
/// <reference path="../../../build/drunk.d.ts" />

describe("Binding.attr", function () {
    
    var Ctor = drunk.Binding.getByName('attr');
    var binding;
    
    beforeEach(function () {
        binding = new Ctor(new drunk.Component(), drunk.dom.create("<div></div>"), {});
    });
    
    it("simple variable literal", function () {
        expect(binding.element.style.color).toBe("");
        
        binding.attribute = "style";
        binding.update("color:red;");
        
        expect(binding.element.style.color).toBe("red");
        
        binding.attribute = "class";
        binding.update("a b");
        
        expect(binding.element.className).toBe("a b");
    });
    
    it("json literal", function () {
        binding.update({'class': 'a', id: 'test'});
        
        expect(binding.element.className).toBe('a');
        expect(binding.element.id).toBe('test');
    });
});