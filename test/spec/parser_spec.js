/// <reference path="../../build/drunk.d.ts" />
/// <reference path="../jasmine.d.ts" />

describe("parser", function () {
    
    var parser  = drunk.parser;
    var viewModel;

    describe("parseGetter", function () {
        var str1 = '"this is a static literal"';
        var str2 = 'b.c';

        var result0, result1, result2, result3, result4, result5;

        beforeEach(function () {
            viewModel = new drunk.ViewModel({
                a: 1,
                b: {
                    c: 2
                },
                d: {
                    e: {
                        f: 3
                    }
                },
                c: 'c',
                e: 'e'
            });
        });

        it("static literal getter", function () {
            result0 = parser.parseGetter(str1);
            expect(result0.dynamic).toBe(false);
        });

        it("dynamic literal getter", function () {
            var testCases = [{
                expression : "b.c",
                expected   : 2
            },{
                expression : "b['c']",
                expected   : 2
            },{
                expression : "b[c]",
                expected   : 2
            }, {
                expression : "d.e.f",
                expected   : 3
            }, {
                expression : "d['e'].f",
                expected   : 3
            }, {
                expression : "d[e].f",
                expected   : 3
            }, {
                expression : "d[e]['f']",
                expected   : 3
            }, {
                expression : "d['e']['f'].g",
                expected   : undefined
            }];
            
            testCases.forEach(function (test) {
                result1 = parser.parseGetter(test.expression);
                expect(result1.dynamic).toBe(true);
                expect(result1.filters).toBeNull();
                expect(result1(viewModel)).toBe(test.expected);
            });
        });

        it("dynamic literal getter with filters", function () {
            viewModel.filter.add = function (a, b) {
                return a + b;
            };
            viewModel.filter.mul = function (a, b) {
                return a * b;
            };

            var testCases = [{
                expression : "b.c|add:a|mul:d.e.f",
                expected   : 9,
                value      : 2
            },{
                expression : "a|add:b[c]|mul:d['e'].f",
                expected   : 9,
                value      : 1
            },{
                expression : "a|add:b['c']|mul:d[e]['f']",
                expected   : 9,
                value      : 1
            }, {
                expression : "d.e.f|mul:a",
                expected   : 3,
                value      : 3
            }, {
                expression : "b['c']|add:d['e'].f",
                expected   : 5,
                value      : 2
            }, {
                expression : "(b['c'] + a)|add:d['e'].f",
                expected   : 6,
                value      : 3
            }, {
                expression : "b['c'] + a|add:d['e'].f",
                expected   : 6,
                value      : 3
            }, {
                expression : "['c', '|', '||add:12', 2][3] + a|add:d['e'].f",
                expected   : 6,
                value      : 3
            }];

            testCases.forEach(function (test) {
                result2 = parser.parseGetter(test.expression);
                var value = result2(viewModel);

                expect(value).toBe(test.value);
                
                value = drunk.filter.pipeFor(value, result2.filters, viewModel.filter, false, viewModel);
                expect(value).toBe(test.expected);
            });

        });

        it("dynamic literal setter", function () {
            result3 = parser.parseSetter(str2);
            expect(result3).toBeDefined();

            result3(viewModel, 5);
            expect(viewModel.b.c).toBe(5);
        });
    });

    describe("parseInterpolate", function () {
        var str1 = "no interpolate here";
        var str2 = "this has a {{ interpolate }}";

        var result2, result3, result4, result5;

        it("no interpolate value", function () {
            expect(parser.hasInterpolation(str1)).toBe(false);
        });

        it("parse to tokens", function () {
            result2 = parser.parseInterpolate(str2, true);
            expect(result2.length).toBe(2);
            expect(result2[0]).toEqual("this has a ");
            expect(result2[1]).toEqual({expression: "interpolate"});
        });

        it("resuse tokens cache", function () {
            result3 = parser.parseInterpolate(str2, true);
            expect(result3).toBe(result2); // reuse the cache
        });

        it("parse to getter", function () {
            result4 = parser.parseInterpolate(str2);
            var vm = new drunk.ViewModel();
            vm.proxy("interpolate");
            vm.interpolate = "123";
            expect(result4(vm)).toEqual(['this has a ', '123']);
        });

        it("resuse getter", function () {
            result5 = parser.parseInterpolate(str2);
            expect(result4).toBe(result5); // reuse the cache
        });
    });

    describe("parse statement", function () {

         beforeEach(function () {
            viewModel = new drunk.ViewModel();
            viewModel.a = 1;
         });

        it("function calling statement", function () {
            var str = "test($el, $event)";

            viewModel.test = jasmine.createSpy();

            var handler = parser.parse(str);

            var $event = {};
            var $el    = {};

            handler(viewModel, $event, $el);

            expect(viewModel.test).toHaveBeenCalledWith($el, $event);
        });

        it("assign value statement", function () {
            var str     = "a = a + 1";
            var handler = parser.parse(str);

            handler(viewModel);

            expect(viewModel.a).toBe(2);
        });

        it("single statement", function () {
            var str     = "a++";
            var handler = parser.parse(str);

            handler(viewModel);

            expect(viewModel.a).toBe(2);
        });

        it("multiple statement", function () {
            var str     = "a += 2, ++a";;
            var handler = parser.parse(str);

            handler(viewModel);

            expect(viewModel.a).toBe(4);
        });
    });
});
