/// <reference path="../../jasmine.d.ts" />
/// <reference path="../../../build/drunk.d.ts" />

describe("Binding.repeat", function () {

    var Ctor = drunk.Binding.getByName('repeat');
    var binding;

    beforeEach(function () {
        binding = new Ctor(new drunk.Component(), drunk.dom.create("<div></div>"), {});
    });

    it("should create the common properties", function () {
        binding.expression = "item in list";

        spyOn(binding, "_parseExpression").and.callThrough();
        binding.init();
        expect(binding._headNode).toBeDefined();
        expect(binding._tailNode).toBeDefined();
        expect(binding._map).toBeDefined();
        expect(binding._items).toBeDefined();
        expect(binding._parseExpression).toHaveBeenCalled();
        expect(binding._param).toEqual({ key: undefined, val: "item" });
    });

    describe("parseDefinition", function () {
        it("item,index in list", function () {
            binding.expression = "item,index in list";
            binding.init();

            expect(binding._param).toEqual({ key: "index", val: "item" });
            expect(binding.expression).toBe("list");
        });

        it("item in list|filter1", function () {
            binding.expression = "item in list|filter1";
            binding.init();

            expect(binding._param).toEqual({ key: undefined, val: "item" });
            expect(binding.expression).toBe("list|filter1");
        });
    });

    it("should create item view model", function () {
        binding.expression = "item in list";
        binding.init();

        var item0 = {
            key: 0,
            idx: 0,
            val: {}
        };
        binding._items.push(item0);
        var vm0 = binding._realizeItem(item0);

        expect(vm0._models.length).toBe(1);
        var model = JSON.parse(JSON.stringify(vm0._models[0]));
        expect(model).toEqual({
            $odd: true,
            $first: true,
            $last: true,
            $even: false,
            item: item0.val,
        });
        expect(vm0._parent).toBe(binding.viewModel);
        expect(binding._map.get(item0.val)[0]).toBe(vm0);
        expect(vm0._flagNode).toBeDefined();

        var item1 = {
            key: 1,
            idx: 1,
            val: 0
        };
        binding._items.push(item1);
        var vm1 = binding._realizeItem(item1);

        expect(vm1._models.length).toBe(1);
        model = JSON.parse(JSON.stringify(vm1._models[0]));
        expect(model).toEqual({
            $odd: false,
            $even: true,
            $first: false,
            $last: true,
            item: item1.val,
        });
        expect(binding._map.get(item1.val).length).toBe(1);
    });

    it("should get the existense item view model", function () {
        binding.expression = "item in list";
        binding.init();

        var item = {
            key: 1,
            idx: 1,
            val: 0
        };

        var vm = binding._realizeItem(item);
        vm._isUsing = false;

        expect(binding._getRepeatItem(item)).toBe(vm);
    });

    it("should update item view model with new model", function () {
        binding.expression = "item, idx in list";
        binding.init();

        var vm = {};
        var item = {
            key: 1,
            idx: 1,
            val: 0
        };

        binding._items.push(null);
        binding._items.push(item);
        binding._updateItemModel(vm, item, true);

        expect(vm.$first).toBe(false);
        expect(vm.$last).toBe(true);
        expect(vm.$odd).toBe(false);
        expect(vm.$even).toBe(true);
        expect(vm.idx).toBe(1);
        expect(vm.item).toBe(0);
    });

    describe("update", function () {
        it("array model", function (done) {
            binding.expression = "item, index in array";
            binding._isActived = true;
            binding.element = drunk.dom.create("<div id='{{index}}'>{{item}}</div>");
            document.body.appendChild(binding.element);
            binding.init();

            binding.update(["a", "b"]);

            drunk.util.requestAnimationFrame(function () {
                expect(binding._itemVms[0].element.id).toBe('0');
                expect(binding._itemVms[0].element.innerHTML).toBe('a');
                expect(binding._itemVms[1].element.id).toBe('1');
                expect(binding._itemVms[1].element.innerHTML).toBe('b');

                binding.release();
                done();
            });
        });

        it("object model", function (done) {
            binding.expression = "val, key in object";
            binding.element = drunk.dom.create("<div id='{{key}}'>{{val}}</div>");
            binding._isActived = true;
            binding.init();

            binding.update({ name: 'test', age: 13 });

            drunk.util.requestAnimationFrame(function () {
                expect(binding._itemVms[0].element.id).toBe('name');
                expect(binding._itemVms[0].element.innerHTML).toBe('test');
                expect(binding._itemVms[1].element.id).toBe('age');
                expect(binding._itemVms[1].element.innerHTML).toBe('13');
                
                binding.release();
                done();
            });
        });

        it("empty array model", function () {
            binding.expression = "item, index in array";
            binding.element = drunk.dom.create("<div id='{{index}}'>{{item}}</div>");
            binding.init();

            binding.update(["a", "b"]);
            spyOn(binding, "_unrealizeItems").and.callThrough();
            binding.update([]);

            expect(binding._itemVms.length).toBe(0);
            expect(binding._unrealizeItems.calls.count()).toBe(1);
        });

        it("empty object model", function () {
            binding.expression = "val, key in object";
            binding.element = drunk.dom.create("<div id='{{key}}'>{{val}}</div>");
            binding.init();

            binding.update({ name: 'test', age: 13 });
            spyOn(binding, "_getRepeatItem").and.callThrough();
            binding.update({});

            expect(binding._itemVms.length).toBe(0);
            expect(binding._getRepeatItem.calls.count()).toBe(0);

            binding.update();
            expect(binding._getRepeatItem.calls.count()).toBe(0);
        });
    });

    it("release", function () {
        binding.expression = "val, key in object";
        binding.element = drunk.dom.create("<div id='{{key}}'>{{val}}</div>");
        binding.init();

        binding.update({ name: 'test', age: 13 });

        var vms = binding._itemVms;

        binding.release();

        expect(binding._itemVms).toBeNull();
        expect(binding._items).toBeNull();
        expect(binding._headNode).toBeNull();
        expect(binding._tailNode).toBeNull();
        expect(binding._map).toBeNull();

        vms.forEach(function (vm) {
            expect(vm._isActived).toBe(false);
        });
    });
});
