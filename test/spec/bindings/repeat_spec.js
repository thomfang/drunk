/// <reference path="../../jasmine.d.ts" />
/// <reference path="../../../build/drunk.d.ts" />

describe("Binding.repeat", function () {
    
    var binding;
    
    beforeEach(function () {
        binding = Object.create(drunk.Binding.getDefinintionByName('repeat'));
        binding.element = drunk.elementUtil.create("<div></div>");
        binding.viewModel = new drunk.ViewModel();
    });
    
    it("should create the common properties", function () {
        binding.expression = "item in list";
        
        spyOn(binding, "parseDefinition").and.callThrough();
        binding.init();
        expect(binding.startNode).toBeDefined();
        expect(binding.endedNode).toBeDefined();
        expect(binding._cache).toBeDefined();
        expect(binding._nameOfRef).toBeDefined();
        expect(binding.parseDefinition).toHaveBeenCalled();
        expect(binding.param).toEqual({key: undefined, val: "item"});
    });
    
    describe("parseDefinition", function () {
        it("item,index in list", function () {
            binding.expression = "item,index in list";
            binding.init();

            expect(binding.param).toEqual({key: "index", val: "item"});
            expect(binding.expression).toBe("list");
        });

        it("item in list|filter1", function () {
            binding.expression = "item in list|filter1";
            binding.init();

            expect(binding.param).toEqual({key: undefined, val: "item"});
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
        var vm0 = binding._realizeRepeatItem(item0, false, true);
        
        expect(vm0._models.length).toBe(1);
        expect(vm0._models[0]).toEqual({
            $odd   : true,
            $first : true,
            $last  : false,
            $even  : false,
            item   : item0.val,
        });
        expect(vm0.parent).toBe(binding.viewModel);
        expect(item0.val[binding._nameOfRef][0]).toBe(vm0);
        expect(vm0.element).toBeDefined();

        var item1 = {
            key: 1,
            idx: 1,
            val: 0
        };
        var vm1 = binding._realizeRepeatItem(item1, true, false);
        
        expect(vm1._models.length).toBe(1);
        expect(vm1._models[0]).toEqual({
            $odd   : false,
            $even  : true,
            $first : false,
            $last  : true,
            item   : item1.val,
        });
        expect(binding._cache[item1.val].length).toBe(1);
    });
    
    it("should get the existense item view model", function () {
        binding.expression = "item in list";
        binding.init();
        
        var item = {
            key: 1,
            idx: 1,
            val: 0
        };

        var vm = binding._realizeRepeatItem(item);
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

        binding._updateItemModel(vm, item, true);
        
        expect(vm.$first).toBe(false);
        expect(vm.$last).toBe(true);
        expect(vm.$odd).toBe(false);
        expect(vm.$even).toBe(true);
        expect(vm.idx).toBe(1);
        expect(vm.item).toBe(0);
    });

    describe("update", function () {
        it("array model", function () {
            binding.expression = "item, index in array";
            binding.element = drunk.elementUtil.create("<div id='{{index}}'>{{item}}</div>");
            binding.init();
            
            binding.update(["a", "b"]);
            
            expect(binding._itemVms[0].element.id).toBe('0');
            expect(binding._itemVms[0].element.innerHTML).toBe('a');
            expect(binding._itemVms[1].element.id).toBe('1');
            expect(binding._itemVms[1].element.innerHTML).toBe('b');
        });
        
        it("object model", function () {
            binding.expression = "val, key in object";
            binding.element = drunk.elementUtil.create("<div id='{{key}}'>{{val}}</div>");
            binding.init();
            
            binding.update({name: 'test', age: 13});
            
            expect(binding._itemVms[0].element.id).toBe('name');
            expect(binding._itemVms[0].element.innerHTML).toBe('test');
            expect(binding._itemVms[1].element.id).toBe('age');
            expect(binding._itemVms[1].element.innerHTML).toBe('13');
        });
        
        it("empty array model", function () {
            binding.expression = "item, index in array";
            binding.element = drunk.elementUtil.create("<div id='{{index}}'>{{item}}</div>");
            binding.init();
            
            binding.update(["a", "b"]);
            spyOn(binding, "_unrealizeUnusedItems").and.callThrough();
            binding.update([]);
            
            expect(binding._itemVms.length).toBe(0);
            expect(binding._unrealizeUnusedItems.calls.count()).toBe(1);
        });
        
        it("empty object model", function () {
            binding.expression = "val, key in object";
            binding.element = drunk.elementUtil.create("<div id='{{key}}'>{{val}}</div>");
            binding.init();
            
            binding.update({name: 'test', age: 13});
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
        binding.element = drunk.elementUtil.create("<div id='{{key}}'>{{val}}</div>");
        binding.init();
        
        binding.update({name: 'test', age: 13});

        var vms = binding._itemVms;

        binding.release();

        expect(binding._itemVms).toBeNull();
        expect(binding.element).toBeNull();
        expect(binding.startNode).toBeNull();
        expect(binding.endedNode).toBeNull();
        expect(binding._cache).toBeNull();

        vms.forEach(function (vm) {
            expect(vm._isActived).toBe(false);
        });
    });
});
