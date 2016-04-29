/// <reference path="../../build/drunk.d.ts" />
/// <reference path="../jasmine.d.ts" />

describe("ViewModel", function () {

    var vm = new drunk.ViewModel();

    beforeEach(function () {
        vm = new drunk.ViewModel({ a: 123 });

        vm.$filter.add = function (a, b) {
            return a + b;
        };
    })

    it("common", function () {
        expect(vm.$filter).toBeDefined();
        expect(vm._model).toEqual({ a: 123 });
        expect(vm._watchers).toBeDefined();
        expect(vm._bindings).toBeDefined();
    });

    it("proxy model property", function () {
        vm.$proxy('b');
        vm.b = '123';

        expect(vm._model.b).toBe('123');

        var des = Object.getOwnPropertyDescriptor(vm, 'b');
        expect(des.get).toBe(des.set);
    });

    it("call method", function () {
        vm.fn = jasmine.createSpy("vm.fn");

        var wrappedFn = vm.__getHandler("fn");
        expect(typeof wrappedFn).toBe("function");

        wrappedFn(1);
        expect(vm.fn).toHaveBeenCalledWith(1);
    });

    it("get model value by getter", function () {
        var getter1 = drunk.parser.parseGetter("a");
        var result1 = vm.__execGetter(getter1);

        expect(result1).toBe(123);

        var getter2 = drunk.parser.parseGetter("a|add:27");
        var result2 = vm.__execGetter(getter2);

        expect(result2).toBe(150);
    });

    it("eval normal expression", function () {
        var val = vm.$eval("a|add:2");

        expect(val).toBe(125);
    });

    it("parse interpolate expression", function () {
        var val = vm.$eval("{{a|add:2}}", true);

        expect(val).toBe(125);

        expect(vm.$eval('{{a}}', true)).toBe(123)
    });

    it("watch an expression", function (done) {
        var spy = jasmine.createSpy();

        vm.$watch("a", spy);
        vm.$watch("a", function () {
            expect(spy).toHaveBeenCalledWith(2, 123);
            done();
        });

        vm.a = 2;
    });

    it("watch an interpolate expression", function (done) {
        var spy = jasmine.createSpy();

        vm.$watch("{{a}}", spy);
        vm.$watch("{{a}}", function () {
            expect(spy).toHaveBeenCalledWith(2, 123);
            done();
        });

        vm.a = 2;
    });

    it('computed property create by getter', function () {
        vm.firstname = 'Jim';
        vm.lastname = 'Green';
        vm.$computed('fullname', function () {
            return this.firstname + ' ' + this.lastname;
        });
        expect(vm.fullname).toBe('Jim Green');
    });

    it('computed property create by setter', function () {
        vm.$computed('fullname', {
            set: function (value) {
                value = value.split(/\s+/);
                this.firstname = value[0];
                this.lastname = value[1];
            }
        });
        vm.fullname = 'Jim Green';
        expect(vm.firstname).toBe('Jim');
        expect(vm.lastname).toBe('Green');
    });

    it('computed property create by getter and setter', function (done) {
        vm.firstname = 'Todd';
        vm.lastname = 'Fon';

        vm.$computed('fullname', {
            set: function (value) {
                value = value.split(/\s+/);
                this.firstname = value[0];
                this.lastname = value[1];
            },
            get: function () {
                return this.firstname + ' ' + this.lastname;
            }
        });
        expect(vm.fullname).toBe('Todd Fon');

        vm.fullname = 'Jim Green';

        drunk.util.execAsyncWork(function () {
            expect(vm.firstname).toBe('Jim');
            expect(vm.lastname).toBe('Green');
            done();
        });
    });
    
    it('watch computed property before it defined', function (done) {
        var spy = jasmine.createSpy();
        vm.$watch('fullname', spy);
        vm.$computed('fullname', {
            set: function (value) {
                value = value.split(/\s+/);
                this.firstname = value[0];
                this.lastname = value[1];
            },
            get: function () {
                return this.firstname + ' ' + this.lastname;
            }
        });
        drunk.util.execAsyncWork(function () {
            expect(spy).toHaveBeenCalled();
            done();
        })
    });
    
    it('watch computed property after it defined', function (done) {
        var spy = jasmine.createSpy();
        vm.$computed('fullname', {
            set: function (value) {
                value = value.split(/\s+/);
                this.firstname = value[0];
                this.lastname = value[1];
            },
            get: function () {
                return this.firstname + ' ' + this.lastname;
            }
        });
        vm.$watch('fullname', spy);
        vm.firstname = 'Jim';
        vm.lastname = 'Green';
        drunk.util.execAsyncWork(function () {
            expect(spy).toHaveBeenCalledWith('Jim Green', undefined + ' ' + undefined);
            done();
        })
    });

    it("release", function () {
        vm.$proxy('b');
        vm.b = 1;

        var model = vm._model;
        vm.$release();

        expect(vm.$filter).toBeNull();
        expect(vm._bindings).toBeNull();
        expect(vm._watchers).toBeNull();

        expect(model.a).toBe(123);
        expect(model.b).toBe(1);

        expect(vm.a).toBeUndefined();
        expect(vm.b).toBeUndefined();
    });
});
