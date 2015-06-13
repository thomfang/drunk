/// <reference path="../jasmine.d.ts" />
/// <reference path="../../build/drunk.d.ts" />

describe("Component", function () {

    var view, elem, spy;

    var filters = {
        'add': function (a, b) {
            return a + b;
        }
    };
    var watchers = {
        'a': function (newValue, oldValue) {

        }
    };
    var handlers = {
        fn: jasmine.createSpy()
    };

    beforeEach(function () {
        spy = jasmine.createSpy('component init');
        
        var Class = drunk.Component.extend({
            data: {
                b: 3
            },
            init: function () {
                this.a = 2;
                spy();
            },
            watchers: watchers,
            handlers: handlers,
            filters: filters,
        });
        view = new Class();
        elem = drunk.elementUtil.create("<div>{{a|add:2}}</div>");
    });

    it("common", function () {
        view.mount(elem);

        expect(view._watchers.a).toBeDefined();
        expect(view.filter.add).toBeDefined();
        expect(view.fn).toBeDefined();
        expect(spy).toHaveBeenCalled();
        expect(view.element.nodeType).toBe(1);
    });

    it("named component", function () {
        var MyView = drunk.Component.define('my-view', {
        });

        expect(MyView.prototype.name).toBe('my-view');
        expect(drunk.Component.getComponentByName('my-view')).toBe(MyView);
    });

    it("mount element", function (done) {
        view.mount(elem);

        expect(view.element).toBe(elem);
        expect(view._isMounted).toBe(true);
        expect(drunk.Component.getByElement(elem)).toBe(view);


        var spy = jasmine.createSpy();

        view.watch("a", function (n, o) {
            spy(n, o);
        });

        view.a = 4;
        drunk.util.nextTick(function () {
            expect(elem.innerHTML).toBe("6");
            expect(spy).toHaveBeenCalledWith(4, 2);
            done();
        });
    });

    it("mount by template", function (done) {
        var MyComponent = drunk.Component.extend({
            init: function () {
                this.a = 2;
            },
            template: "<div>{{a|default:0|add:2}}</div>",

            filters: filters,
            watchers: watchers,
            handlers: handlers
        });
        view = new MyComponent();

        view.processTemplate().then(view.mount.bind(view)).then(function () {
            expect(view.element.nodeType).toBe(1);
            expect(view.element.innerHTML).toBe("4");

            view.a = 4;
            drunk.util.nextTick(function () {
                expect(view.element.innerHTML).toBe("6");
                done();
            });
        });
    });

    it("dispose", function () {

        view.mount(elem);

        expect(elem).toBe(view.element);

        view.dispose();


        expect(view.element).toBeNull();
        expect(drunk.Component.getByElement(elem)).toBeUndefined();
    });

});
