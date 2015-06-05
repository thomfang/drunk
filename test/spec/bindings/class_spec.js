/// <reference path="../../jasmine.d.ts" />
/// <reference path="../../../build/drunk.d.ts" />

describe("Binding.class", function () {
    var update = drunk.Binding.getDefinintionByName('class').update;
    var binding;
    
    beforeEach(function () {
        binding = {
            update:  update,
            element: drunk.elementUtil.create("<div></div>")
        };
    });
    
    it("simple varaible literal", function () {
        expect(binding.element.className).toBe("");
        
        binding.update("a");
        expect(binding.element.className).toBe("a");
        
        binding.update("b");
        expect(binding.element.className).toBe("b");
        
        binding.update('b   c');
        expect(binding.element.className).toBe('b c');
    });
    
    it("class list", function () {
        binding.update(["a", "b"]);
        expect(binding.element.className).toBe("a b");
        
        binding.update(["b", "c"]);
        expect(binding.element.className).toBe("b c");
        
        binding.update([]);
        expect(binding.element.className).toBe('');
    });
    
    it("class map", function () {
        binding.update({a: true, b: true, c: false});
        expect(binding.element.className).toBe("a b");
        
        binding.update({a: false, b: true, c: true});
        expect(binding.element.className).toBe("b c");
        
        binding.update({a: false, b: false, c: false});
        expect(binding.element.className).toBe("");
        
        binding.update({a: true, b: true, c: true});
        expect(binding.element.className).toBe("a b c");
    });
})