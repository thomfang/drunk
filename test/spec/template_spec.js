/// <reference path="../../build/drunk.d.ts" />
/// <reference path="../jasmine.d.ts" />

describe("Template", function () {

    describe("Compiler", function () {

        var compile = drunk.Template.compile;
        var dom = drunk.dom;

        var vm;

        beforeEach(function () {
            vm = new drunk.ViewModel();
        });

        it("compile blank node", function () {
            var element = dom.create("<div></div>");

            var bindExecutor = compile(element);

            expect(typeof bindExecutor).toBe("function");

            bindExecutor(vm, element);

            expect(vm._bindings.length).toBe(0);
        });

        it("compile a node with one binding", function () {
            var element = dom.create("<div drunk-repeat='item in list'></div>");

            var bindExecutor = compile(element);

            expect(typeof bindExecutor).toBe("function");

            bindExecutor(vm, element);

            expect(vm._bindings.length).toBe(1);
            expect(vm._bindings[0].name).toBe("repeat");
        });

        it("compile a node contains interpolate binding", function (done) {
            var element = dom.create("<div class='item {{color}}'></div>");

            var bindExecutor = compile(element);

            expect(typeof bindExecutor).toBe("function");

            bindExecutor(vm, element);

            expect(vm._bindings.length).toBe(1);
            expect(vm._bindings[0].name).toBe("attr");
            expect(vm._bindings[0].attrName).toBe("class");

            vm.color = "black";

            drunk.util.execAsyncWork(function () {
                console.log(element, vm);
                expect(element.className).toBe("item black");
                done();
            });
        });

        it("compile nodeList", function () {
            var nodeList = document.createDocumentFragment();

            for (var i = 0; i < 5; i++) {
                nodeList.appendChild(dom.create("<div id='" + i + "' drunk-class='a'></div>"));
            }

            var bindExecutor = compile(nodeList);
            var releaseFnc = bindExecutor(vm, nodeList);

            expect(typeof releaseFnc).toBe('function');
            expect(vm._bindings.length).toBe(5);
        });

        it("compile a textNode with interpolate", function () {
            var element = dom.create("this is a string with {{a}}");

            var bindExecutor = compile(element);

            expect(typeof bindExecutor).toBe("function");

            bindExecutor(vm, element);

            expect(vm._bindings.length).toBe(1);
            expect(vm._bindings[0].name).toBe("bind");
        });
        
        it("compile a custom component", function () {
            drunk.Component.define('todo-app', {});
            var element = dom.create("<todo-app template='<div></div>'></todo-app>");

            var bindExecutor = compile(element);

            expect(typeof bindExecutor).toBe("function");

            bindExecutor(vm, element);

            expect(vm._bindings.length).toBe(1);
            expect(vm._bindings[0].name).toBe("component");
        });
        
        it("should only compile one terminal binding when two terminal bindings exist", function () {
            var element = dom.create("<todo-app drunk-repeat='i in 5' template='<div></div>'></todo-app>");

            var bindExecutor = compile(element);

            expect(typeof bindExecutor).toBe("function");

            bindExecutor(vm, element);

            expect(vm._bindings.length).toBe(1);
            expect(vm._bindings[0].name).toBe("repeat");
        });

        it("should return unbind bindings function", function () {
            var element = dom.create("<div drunk-class='item' style='color:{{color}};' drunk-on='click:a++'></div>");

            var bindExecutor = compile(element);
            var releaseFnc = bindExecutor(vm, element);

            expect(typeof bindExecutor).toBe("function");
            expect(typeof releaseFnc).toBe("function");

            expect(vm._bindings.length).toBe(3);

            releaseFnc();

            expect(vm._bindings.length).toBe(0);
        });

        it("release multiple if binings", function (done) {
            var element = dom.create([
                "<div><div drunk-if='a' drunk-class='a'>{{a}}</div>",
                "<div drunk-if='b' drunk-class='b'>{{b}}</div>",
                "<div drunk-if='c' drunk-class='c'>{{c}}</div></div>"
            ].join(''));

            var bindExecutor = compile(element);

            expect(typeof bindExecutor).toBe("function");

            bindExecutor(vm, element);

            expect(vm._bindings.length).toBe(3);
            expect(vm._bindings[0].name).toBe("if");

            vm.a = 'a';
            vm.b = 'b';
            vm.c = 'c';

            drunk.util.execAsyncWork(function () {
                expect(vm._bindings.length).toBe(9);

                vm.a = null;

                drunk.util.execAsyncWork(function () {
                    expect(vm._bindings.length).toBe(7);
                    vm.b = null;

                    drunk.util.execAsyncWork(function () {
                        expect(vm._bindings.length).toBe(5);
                        //expect(vm._bindings[3].expression).toBe('c');

                        done();
                    });
                });
            });
        });
    });

    describe("Loader", function () {

        it("should load from a script node", function (done) {
            var url = 'tpl/test.html';
            var content = "<div></div>";
            var tplNode = document.createElement("script");

            tplNode.id = url;
            tplNode.type = "text/template";
            tplNode.innerHTML = content;

            document.body.appendChild(tplNode);

            drunk.Template.load(url).then(function (str) {
                expect(str).toEqual(content);

                document.body.removeChild(tplNode);
                done();
            });
        });

        it("should load by ajax", function (done) {
            drunk.Template.load("runner.html").then(function (str) {
                expect(str).not.toEqual(null);
                done();
            });
        });
    });

});
