/// <reference path="../../../build/drunk.d.ts" />
/// <reference path="../../jasmine.d.ts" />

describe("Binding.if", function () {
    var ifBinding = drunk.Binding.getDefinintionByName('if');
    
    var binding, container;
    
    beforeEach(function () {
        container = drunk.elementUtil.create("<div></div>");
        binding = Object.create(ifBinding);
        binding.element = drunk.elementUtil.create("<div drunk-class='a'></div>");
        binding.viewModel = new drunk.ViewModel();
        
        container.appendChild(binding.element);
        binding.init();
    });
    
    it("should create the properties", function () {
        expect(binding.startNode).toBeDefined();
        expect(binding.endedNode).toBeDefined();
        expect(binding.inDocument).toBe(false);
        expect(binding.element.parentNode).toBeNull();
        expect(binding.startNode.parentNode).toBe(container);
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
        
        expect(binding.inDocument).toBe(true);
        expect(binding.bindingExecutor).toBeDefined();
        expect(binding.unbindExecutor).toBeDefined();
        expect(binding.tmpElement.parentNode).toBe(container);
    });
    
    it("should call unbind and remove the unused element from document", function () {
        binding.addToDocument();
        binding.removeFromDocument();

        expect(binding.inDocument).toBe(false);
        expect(binding.unbindExecutor).toBeNull();
        expect(binding.startNode.parentNode).toBe(container);
    });
    
    it("should release the binding and remove all the references", function () {
        binding.addToDocument();
        binding.release();

        expect(binding.inDocument).toBe(false);
        expect(binding.bindingExecutor).toBeNull();
        expect(binding.unbindExecutor).toBeNull();
        expect(binding.startNode).toBeNull();
        expect(binding.endedNode).toBeNull();
    });
});
