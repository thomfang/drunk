/// <reference path="../../jasmine.d.ts" />
/// <reference path="../../../build/drunk.d.ts" />

describe("Binding.component", function () {
    var definition = drunk.Binding.getDefinintionByName('component');
    
    var binding, vm, container;
    
    var tpl1 = drunk.elementUtil.create("<script id='tpl1.html' type='text/template'><div id='component'></div></script>");
    var tpl2 = drunk.elementUtil.create("<script id='tpl2.html' type='text/template'><div><div drunk-transclude></div></div></script>");
    
    document.body.appendChild(tpl1);
    document.body.appendChild(tpl2);
    
    var MyComponent = drunk.Component.extend({
        name: "my-component"
    });
    
    beforeEach(function () {
        vm = new drunk.ViewModel({
            a: 'a',
            b: {
                c: 'c'
            },
            d: 'd',
            visible: true
        });
        container = drunk.elementUtil.create("<div></div>");
        
        binding = Object.create(definition);
        binding.expression = "my-component";
        binding.viewModel = vm;
    });
    
    it("component context", function () {
        binding.component = new MyComponent();
        binding.element = {};
        binding.processComponentContextEvent();
        
        var spy = jasmine.createSpy("component context callback");
        binding.component.addListener("test a", spy);
        binding.component.emit(drunk.Component.GET_COMPONENT_CONTEXT, 'test a');
        
        expect(spy).toHaveBeenCalledWith(vm, binding.element);
    });
    
    it("component attributes", function (done) {
        binding.element = drunk.elementUtil.create("<my-component template-url='tpl1.html' title='{{a}}' on-click='visible = !visible'></my-component>");
        container.appendChild(binding.element);
        
        binding.component = new MyComponent();
        binding.unwatches = [];
        
        binding.processComponentAttributes();
        
        expect(binding.component.templateUrl).toBe('tpl1.html');
        expect(binding.component.title).toBe('a');
        expect(binding.unwatches.length).toBe(1);
        
        drunk.util.nextTick(function () {
            binding.component.emit("click");
            expect(vm.visible).toBe(false);
            
            done();
        });
    });
    
    it("component binding", function (done) {
        binding.element = document.createComment('test');
        container.appendChild(binding.element);
        
        binding.component = new MyComponent();
        binding.component.element = drunk.elementUtil.create('<div id="test"></div>');
        
        binding.processComponentBinding();
        
        drunk.util.nextTick(function () {
            expect(binding.component.element.id).toBe('test');
            done();
        });
    });

    it("component with transclude", function (done) {
        binding.element = drunk.elementUtil.create("<my-component template-url='tpl2.html'>{{a}}{{d}}</my-component>");
        container.appendChild(binding.element);
        
        binding.init().then(function () {
            expect(binding.component.element.innerHTML).toBe('ad');
            done();
        });
    });
    
    it("release", function () {
        binding.element = drunk.elementUtil.create("<my-component template-url='tpl1.html' b='{{b}}' on-click='visible = !visible'></my-component>");
        container.appendChild(binding.element);
        
        binding.init();
        
        expect(vm._watchers['{{b}}<deep>']).toBeDefined();
        expect(binding.component.b).toEqual({c: 'c'});
        expect(binding.unwatches.length).toBe(1);
        
        binding.release();
        
        expect(binding.component).toBeNull();
        expect(binding.unwatches).toBeNull();
        expect(binding.isDisposed).toBe(true);
        expect(vm._watchers['{{b}}<deep>']).toBeNull();
    });
});
