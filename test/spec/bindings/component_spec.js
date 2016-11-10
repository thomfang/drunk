/// <reference path="../../jasmine.d.ts" />
/// <reference path="../../../build/drunk.d.ts" />

describe("Binding.component", function () {
    var Ctor = drunk.Binding.getByName('component');

    var binding, vm, container;

    var tpl1 = drunk.dom.create("<script id='tpl1.html' type='text/template'><div id='component'></div></script>");
    var tpl2 = drunk.dom.create("<script id='tpl2.html' type='text/template'><div><div drunk-slot></div></div></script>");

    document.body.appendChild(tpl1);
    document.body.appendChild(tpl2);

    var MyComponent = drunk.Component.define("my-component", {});

    beforeEach(function () {
        vm = new drunk.ViewModel({
            a: 'a',
            b: {
                c: 'c'
            },
            d: 'd',
            visible: true
        });
        container = drunk.dom.create("<div></div>");

        binding = new Ctor(vm, null, { expression: "my-component" })
    });

    it("component attributes", function (done) {
        binding.element = drunk.dom.create("<my-component template-url='tpl1.html' title='{{a}}' on-click='visible = !visible'></my-component>");
        container.appendChild(binding.element);

        binding.component = new MyComponent();
        binding.unwatches = [];
        binding.properties = {};
        binding.events = {};

        binding._processComponentAttributes();

        expect(binding.component.templateUrl).toBe('tpl1.html');
        expect(binding.component.title).toBe('a');
        expect(binding.unwatches.length).toBe(1);

        drunk.util.execAsyncWork(function () {
            binding.component.$emit("click");
            expect(vm.visible).toBe(false);

            done();
        });
    });

    it("component binding", function (done) {
        binding.element = document.createComment('test');
        container.appendChild(binding.element);

        binding.component = new MyComponent();
        binding.component.element = drunk.dom.create('<div id="test"></div>');

        binding._realizeComponent();

        drunk.util.execAsyncWork(function () {
            expect(binding.component.element.id).toBe('test');
            done();
        });
    });

    it("component with transclude", function (done) {
        binding.element = drunk.dom.create("<my-component template-url='tpl2.html'>{{a}}{{d}}</my-component>");
        container.appendChild(binding.element);

        binding.init().then(function () {
            expect(binding.component.element[0].innerHTML).toBe('ad');
            done();
        });
    });

    it("release", function () {
        binding.element = drunk.dom.create("<my-component template-url='tpl1.html' b='{{b}}' on-click='visible = !visible'></my-component>");
        container.appendChild(binding.element);

        binding.init();


        expect(vm._watchers['{{b}}']).toBeDefined();
        expect(binding.component.b).toEqual({ c: 'c' });
        expect(binding.unwatches.length).toBe(1);

        binding.release();

        expect(binding.component).toBeNull();
        expect(binding.unwatches).toBeNull();
        expect(binding.isDisposed).toBe(true);
        expect(vm._watchers['{{b}}']).toBeNull();
    });
});
