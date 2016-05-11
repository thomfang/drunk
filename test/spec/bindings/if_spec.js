/// <reference path="../../../build/drunk.d.ts" />
/// <reference path="../../jasmine.d.ts" />

describe("Binding.if", function () {
    var Ctor = drunk.Binding.getByName('if');
    
    var binding, container;
    
    beforeEach(function () {
        container = drunk.dom.create("<div></div>");
        binding = new Ctor(new drunk.Component(), drunk.dom.create("<div drunk-class='a'></div>"), {})
        
        container.appendChild(binding.element);
        binding.init();
    });
    
    it("should create the properties", function () {
        expect(binding._flagNode).toBeDefined();
        expect(binding._inDocument).toBe(false);
        expect(binding.element.parentNode).toBeNull();
        expect(binding._flagNode.parentNode).toBe(container);
    });
    
    it("should update with correct action", function () {
        spyOn(binding, "addToDocument");
        spyOn(binding, "removeFromDocument");
        
        binding.update(true);
        expect(binding.addToDocument).toHaveBeenCalled();

        binding.update(false);
        expect(binding.removeFromDocument).toHaveBeenCalled();
    });
    
    it("should compile and add element to document", function () {
        binding.addToDocument();
        
        expect(binding._inDocument).toBe(true);
        expect(binding._bind).toBeDefined();
        expect(binding._unbind).toBeDefined();
        expect(binding._clonedElement.parentNode).toBe(container);
    });
    
    it("should call unbind and remove the unused element from document", function () {
        binding.addToDocument();
        binding.removeFromDocument();

        expect(binding._inDocument).toBe(false);
        expect(binding._unbind).toBeNull();
        expect(binding._flagNode.parentNode).toBe(container);
    });
    
    it("should release the binding and remove all the references", function () {
        binding.addToDocument();
        binding.release();

        expect(binding._inDocument).toBe(false);
        expect(binding._bind).toBeNull();
        expect(binding._unbind).toBeNull();
        expect(binding._flagNode).toBeNull();
    });
});
