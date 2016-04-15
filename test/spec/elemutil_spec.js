/// <reference path="../../build/drunk.d.ts" />
/// <reference path="../jasmine.d.ts" />

describe("dom", function () {

    var dom = drunk.dom;

    it("create node", function () {
        var tpl = "<div id='test'></div>";
        var res = dom.create(tpl);

        expect(res.nodeType).toBe(1);
        expect(res.tagName).toBe("DIV");
        expect(res.hasChildNodes()).toBe(false);
        expect(res.id).toBe("test");
    });
    
    it("create node list", function () {
        var tpl = '<div></div><div></div>';
        var res = dom.create(tpl);
        
        expect(Array.isArray(res)).toBe(true);
        expect(res.length).toBe(2);
    });

    it("add newNode before oldNode", function () {
        var a = dom.create("<div id='a'></div>");
        var b = dom.create("<div id='b'></div>");

        document.body.appendChild(a);

        dom.before(b, a);

        expect(b.parentNode).toBe(document.body);
        expect(b.nextSibling).toBe(a);
    });

    it("add newNode after oldNode", function () {
        var a = dom.create("<div id='a'></div>");
        var b = dom.create("<div id='b'></div>");

        document.body.appendChild(a);

        dom.after(b, a);

        expect(b.parentNode).toBe(document.body);
        expect(a.nextSibling).toBe(b);
    });

    it("replace node", function () {
        var a = dom.create("<div id='a'></div>");
        var b = dom.create("<div id='b'></div>");

        document.body.appendChild(a);

        dom.replace(b, a);

        expect(b.parentNode).toBe(document.body);
        expect(a.parentNode).toBeNull();

        dom.remove(b);
    });

    it("replace node list", function () {
        var a = dom.create("<div id='a'></div>");
        var list = dom.create("<div id='b'></div><div id='c'></div>");

        document.body.appendChild(a);

        dom.replace(list, a);

        expect(a.parentNode).toBeNull();
        
        list.forEach(function (node) {
            expect(node.parentNode).toBe(document.body);
        });

        dom.remove(list);
    });

    it("remove node", function (done) {
        var elem = dom.create("<div></div>")
        document.body.appendChild(elem);

        expect(elem.parentNode).toBe(document.body);

        dom.remove(elem).then(function () {
            expect(elem.parentNode).toBeNull();
            done();
        });
    });

    it("remove node list", function (done) {
        var nodes = dom.create("<div></div><div></div>");

        nodes.forEach(function (node) {
            document.body.appendChild(node);
        });

        dom.remove(nodes).then(function () {
            nodes.forEach(function (node) {
                expect(node.parentNode).toBeNull();
            });
            
            done();
        });
    });

    it("addClass", function () {
        var elem = dom.create("<div></div>");

        expect(elem.className).toBe('');

        dom.addClass(elem, "item");
        expect(elem.className).toBe("item");

        dom.addClass(elem, "red");
        dom.addClass(elem, "red");
        expect(elem.className).toBe("item red");

        dom.addClass(elem, 'a b');
        expect(elem.className).toBe('item red a b');
    });

    it("removeClass", function () {
        var elem = dom.create("<div class='a b c d e'></div>");

        dom.removeClass(elem, 'a d');
        expect(elem.className).toBe("b c e");

        elem.className = "a b c";

        dom.removeClass(elem, 'b');
        expect(elem.className).toBe("a c");

        dom.removeClass(elem, 'c a');
        expect(elem.className).toBe("");
    });

    it("event listener", function (done) {
        var spy = jasmine.createSpy("on");
        var triggered = false;

        function trigger() {
            var e = document.createEvent("MouseEvent");
            e.initEvent('click');
            document.body.dispatchEvent(e);
        }

        function handler(e) {
            expect(spy.calls.count()).toBe(1);

            if (!triggered) {
                triggered = true;

                dom.off(document.body, "click", spy);
                trigger();
                expect(spy.calls.count()).toBe(1);

                dom.off(document.body, "click", handler);

                done();
            }
        }

        dom.on(document.body, 'click', spy);
        dom.on(document.body, 'click', handler);

        trigger();
    });
});