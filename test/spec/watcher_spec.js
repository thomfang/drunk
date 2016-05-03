/// <reference path="../../build/drunk.d.ts" />
/// <reference path="../jasmine.d.ts" />

describe("Watcher", function () {

    var util = drunk.util;
    var execAsyncWork = util.execAsyncWork;
    var viewModel, spy;

    beforeEach(function () {
        viewModel = new drunk.ViewModel({
            a: 1,
            b: {
                c: 2,
                d: 3
            },
            c: 'c'
        });

        viewModel.$filter.mul = function (a) {
            var args = util.toArray(arguments).slice(1);
            args.forEach(function (n) {
                a *= n;
            });
            return a;
        };
        viewModel.$filter.add = function (a) {
            var args = util.toArray(arguments).slice(1);
            args.forEach(function (n) {
                a += n;
            });
            return a;
        };

        spy = jasmine.createSpy("watcher");

    });


    it("add action", function (done) {
        var watcher = new drunk.Watcher(viewModel, "a");
        var spy2 = jasmine.createSpy();

        watcher.addAction(spy);
        watcher.addAction(spy2);

        expect(watcher._actions.length).toBe(2);

        viewModel.a = 23;

        execAsyncWork(function () {
            expect(spy).toHaveBeenCalledWith(23, 1);
            expect(spy2).toHaveBeenCalledWith(23, 1);

            done();
        });
    });

    it("remove action", function (done) {
        var test = function () { };
        var watcher = new drunk.Watcher(viewModel, 'a');

        watcher.addAction(test);
        watcher.removeAction(test);

        expect(watcher._isActived).toBe(false);
        expect(watcher.viewModel).toBe(null);
        expect(watcher._actions).toBe(null);

        watcher = new drunk.Watcher(viewModel, 'a');

        watcher.addAction(spy);

        var spy2 = jasmine.createSpy();

        watcher.addAction(spy2);
        watcher.removeAction(spy);

        viewModel.a = 1234;

        execAsyncWork(function () {
            expect(spy).not.toHaveBeenCalled();
            expect(spy2).toHaveBeenCalledWith(1234, 1);

            done();
        });
    });

    it("simple path", function (done) {
        var watcher = new drunk.Watcher(viewModel, "b.c");

        watcher.addAction(spy);
        
        expect(watcher.value).toBe(2);
        
        viewModel.b.c = 3;

        // Because watcher update has a buffer time,
        // so the new value would active in the next tick.
        execAsyncWork(function () {
            expect(watcher.value).toBe(3);
            expect(spy).toHaveBeenCalledWith(3, 2);

            viewModel.b = { c: 4 };

            execAsyncWork(function () {
                expect(watcher.value).toBe(4);
                expect(spy).toHaveBeenCalledWith(4, 3);

                done();
            });
        });
    });

    it("path with bracket", function (done) {
        var watcher = new drunk.Watcher(viewModel, "b['c']");

        watcher.addAction(spy);
        expect(watcher.value).toBe(2);

        viewModel.b.c = 3;

        execAsyncWork(function () {
            expect(watcher.value).toBe(3);
            expect(spy).toHaveBeenCalledWith(3, 2);

            viewModel.b = { c: 4 };

            execAsyncWork(function () {
                expect(watcher.value).toBe(4);
                expect(spy).toHaveBeenCalledWith(4, 3);

                done();
            });
        });
    });

    it("path with dynamic variable", function (done) {
        var watcher = new drunk.Watcher(viewModel, "b[c]");

        watcher.addAction(spy);
        expect(watcher.value).toBe(2);

        viewModel.b.c = 3;

        execAsyncWork(function () {
            expect(watcher.value).toBe(3);
            expect(spy).toHaveBeenCalledWith(3, 2);

            viewModel.b = { c: 4 };

            execAsyncWork(function () {
                expect(watcher.value).toBe(4);
                expect(spy).toHaveBeenCalledWith(4, 3);

                done();
            });
        });
    });

    it("simple expression", function (done) {
        var watcher = new drunk.Watcher(viewModel, 'a + b.c');

        watcher.addAction(spy);

        expect(watcher.value).toBe(3);

        viewModel.b.c = 3;

        execAsyncWork(function () {
            expect(watcher.value).toBe(4);
            expect(spy.calls.count()).toBe(1);
            expect(spy).toHaveBeenCalledWith(4, 3);

            viewModel.a = 2;
            viewModel.b.c = 4;

            execAsyncWork(function () {
                expect(watcher.value).toBe(6);
                // should called only once, because of the buffer time
                expect(spy.calls.count()).toBe(2);
                expect(spy).toHaveBeenCalledWith(6, 4);

                done();
            });
        });
    });

    it("ternary expression", function (done) {
        var watcher = new drunk.Watcher(viewModel, "a > 1 ? b.c : b.d");

        watcher.addAction(spy);

        expect(watcher.value).toBe(3);

        viewModel.a = 2;

        execAsyncWork(function () {
            expect(watcher.value).toBe(2);
            expect(spy).toHaveBeenCalledWith(2, 3);

            viewModel.b.c = 4;

            execAsyncWork(function () {
                expect(watcher.value).toBe(4);
                expect(spy).toHaveBeenCalledWith(4, 2);
                expect(spy.calls.count()).toBe(2);

                viewModel.a = 1;
                viewModel.b.d = 4;

                execAsyncWork(function () {
                    expect(watcher.value).toBe(4);
                    // value not changed, so had not been called
                    expect(spy.calls.count()).toBe(2);

                    done();
                });
            });
        });
    });

    it("set property non-existent path", function (done) {
        var sub1 = new drunk.Watcher(viewModel, 'd.e');
        var sub2 = new drunk.Watcher(viewModel, 'b.e');

        sub1.addAction(spy);
        sub2.addAction(spy);

        expect(sub1.value).toBeUndefined();
        expect(sub2.value).toBeUndefined();

        viewModel.d = { e: 123 };
        viewModel.b.$set('e', 3);

        execAsyncWork(function () {
            expect(sub1.value).toBe(123);
            expect(spy).toHaveBeenCalledWith(123, undefined);

            expect(sub2.value).toBe(3);
            expect(spy).toHaveBeenCalledWith(3, undefined);

            done();
        });
    });

    it("remove property", function (done) {
        var sub1 = new drunk.Watcher(viewModel, 'b.c');

        sub1.addAction(spy);

        expect(sub1.value).toBe(2);

        viewModel.b.$remove('c');

        execAsyncWork(function () {
            expect(sub1.value).toBeUndefined();
            expect(spy).toHaveBeenCalledWith(undefined, 2);

            done();
        });
    });

    it("expression with filters", function (done) {

        var watcher = new drunk.Watcher(viewModel, "b.c|mul:2,b.d,4|add:1,2,3");
        watcher.addAction(spy);

        expect(watcher.value).toBe((2 * 2 * 3 * 4) + (1 + 2 + 3));

        viewModel.b.c = 5;

        execAsyncWork(function () {
            expect(watcher.value).toBe((5 * 2 * 3 * 4) + (1 + 2 + 3));

            done();
        });
    });

    it("interpolate expression", function (done) {
        var watcher = new drunk.Watcher(viewModel, "{{a}}");
        watcher.addAction(spy);

        expect(watcher.value).toBe(1);

        viewModel.a = 23;

        execAsyncWork(function () {
            expect(watcher.value).toBe(23);
            expect(spy).toHaveBeenCalledWith(23, 1);

            done();
        });
    });

    it('interpolate expression with filter', function (done) {
        var watcher = new drunk.Watcher(viewModel, "result:{{b.c|mul:2,b.d,4|add:1,2,3}}");
        watcher.addAction(spy);

        expect(watcher.value).toBe('result:' + ((2 * 2 * 3 * 4) + (1 + 2 + 3)));

        viewModel.b.c = 5;

        execAsyncWork(function () {
            expect(watcher.value).toBe('result:' + ((5 * 2 * 3 * 4) + (1 + 2 + 3)));

            done();
        });
    });

    it("normal expression deep watch", function (done) {
        var watcher = new drunk.Watcher(viewModel, "b", true);
        watcher.addAction(function (a, b) {
            spy(a, b);
        });

        expect(watcher.value).toEqual({ c: 2, d: 3 });

        expect(watcher._properties[drunk.util.uniqueId(viewModel._model.__observer__)]).toEqual({'b': true});
        expect(watcher._properties[drunk.util.uniqueId(watcher.value.__observer__)]).toEqual({'c': true, 'd': true});

        viewModel.b.d = 4;

        execAsyncWork(function () {
            expect(spy).toHaveBeenCalledWith(viewModel.b, viewModel.b);

            var oldB = viewModel.b;

            viewModel.b = { c: [{ e: 23 }] };

            execAsyncWork(function () {
                expect(spy).toHaveBeenCalledWith(viewModel.b, oldB);

                viewModel.b.c[0].e = 343;

                execAsyncWork(function () {
                    expect(spy).toHaveBeenCalledWith(viewModel.b, viewModel.b);
                    expect(spy.calls.count()).toBe(3);

                    done();
                });
            });
        });
    });

    it("interpolate expression deep watch", function (done) {
        var watcher = new drunk.Watcher(viewModel, "{{b}}", true);
        watcher.addAction(spy);

        expect(watcher.value).toBe(viewModel.b);

        var tmp = {};
        tmp[drunk.util.uniqueId(viewModel._model.__observer__)] = {b: true};

        expect(watcher._properties[drunk.util.uniqueId(viewModel._model.__observer__)]).toEqual({b: true});
        expect(watcher._properties[drunk.util.uniqueId(viewModel.b.__observer__)]).toEqual({c: true, d:true});

        viewModel.b = 3;

        execAsyncWork(function () {
            expect(spy.calls.count()).toBe(1);
            expect(watcher._properties).toEqual(tmp);

            viewModel.b = { c: 4, e: 3 };
            execAsyncWork(function () {
                expect(spy).toHaveBeenCalledWith(watcher.value, 3);

                viewModel.b = { c: [{ e: 23 }] };

                execAsyncWork(function () {
                    expect(spy.calls.count()).toBe(3);

                    viewModel.b.c[0].e = 343;

                    execAsyncWork(function () {
                        expect(spy.calls.count()).toBe(4);

                        done();
                    });
                });
            });
        });
    });

    it("have a action that remove itself when trigger", function (done) {
        var test = function () {
            watcher.removeAction(test);
        };
        var watcher = new drunk.Watcher(viewModel, "b.c");

        watcher.addAction(test);

        watcher.addAction(spy);

        viewModel.b.c = 23;

        execAsyncWork(function () {
            expect(watcher._actions.length).toBe(1);
            expect(spy).toHaveBeenCalled();

            done();
        });
    });

    it("dispose", function (done) {
        var watcher = new drunk.Watcher(viewModel, 'b.d');
        watcher.addAction(spy);

        watcher.dispose();

        viewModel.b.d = 23;

        execAsyncWork(function () {
            expect(watcher._isActived).toBe(false);
            expect(watcher.viewModel).toBe(null);
            expect(watcher._actions).toBe(null);
            expect(spy).not.toHaveBeenCalled();

            done();
        });
    });
});
