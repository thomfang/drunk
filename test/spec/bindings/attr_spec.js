/// <reference path="../../jasmine.d.ts" />
/// <reference path="../../../build/drunk.d.ts" />

describe("Binding.attr", function () {
    
    var definition = drunk.Binding.getDefinintionByName('attr');
    var binding;
    
    beforeEach(function () {
        binding = drunk.util.extend({
            element: drunk.elementUtil.create("<div></div>")
        }, definition);
    });
    
    it("simple variable literal", function () {
        expect(binding.element.style.color).toBe("");
        
        binding.attrName = "style";
        binding.update("color:red;");
        
        expect(binding.element.style.color).toBe("red");
        
        binding.attrName = "class";
        binding.update("a b");
        
        expect(binding.element.className).toBe("a b");
    });
    
    it("json literal", function () {
        binding.update({'class': 'a', id: 'test'});
        
        expect(binding.element.className).toBe('a');
        expect(binding.element.id).toBe('test');
    });
});