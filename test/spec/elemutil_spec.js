/// <reference path="../../build/drunk.d.ts" />
/// <reference path="../jasmine.d.ts" />

describe("elementUtil", function () {

    var elementUtil = drunk.elementUtil;

    it("create node", function () {
        var tpl = "<div id='test'></div>";
        var res = elementUtil.create(tpl);

        expect(res.nodeType).toBe(1);
        expect(res.tagName).toBe("DIV");
        expect(res.hasChildNodes()).toBe(false);
        expect(res.id).toBe("test");
    });
    
    it("create node list", function () {
        var tpl = '<div></div><div></div>';
        var res = elementUtil.create(tpl);
        
        expect(Array.isArray(res)).toBe(true);
        expect(res.length).toBe(2);
    });

    it("add newNode before oldNode", function () {
        var a = elementUtil.create("<div id='a'></div>");
        var b = elementUtil.create("<div id='b'></div>");

        document.body.appendChild(a);

        elementUtil.insertBefore(b, a);

        expect(b.parentNode).toBe(document.body);
        expect(b.nextSibling).toBe(a);
    });

    it("add newNode after oldNode", function () {
        var a = elementUtil.create("<div id='a'></div>");
        var b = elementUtil.create("<div id='b'></div>");

        document.body.appendChild(a);

        elementUtil.insertAfter(b, a);

        expect(b.parentNode).toBe(document.body);
        expect(a.nextSibling).toBe(b);
    });

    it("replace node", function () {
        var a = elementUtil.create("<div id='a'></div>");
        var b = elementUtil.create("<div id='b'></div>");

        document.body.appendChild(a);

        elementUtil.replace(b, a);

        expect(b.parentNode).toBe(document.body);
        expect(a.parentNode).toBeNull();

        elementUtil.remove(b);
    });

    it("replace node list", function () {
        var a = elementUtil.create("<div id='a'></div>");
        var list = elementUtil.create("<div id='b'></div><div id='c'></div>");

        document.body.appendChild(a);

        elementUtil.replace(list, a);

        expect(a.parentNode).toBeNull();
        
        list.forEach(function (node) {
            expect(node.parentNode).toBe(document.body);
        });

        elementUtil.remove(list);
    });

    it("remove node", function () {
        var elem = elementUtil.create("<div></div>")
        document.body.appendChild(elem);

        expect(elem.parentNode).toBe(document.body);

        elementUtil.remove(elem);
        expect(elem.parentNode).toBeNull();
    });

    it("remove node list", function () {
        var nodes = elementUtil.create("<div></div><div></div>");

        nodes.forEach(function (node) {
            document.body.appendChild(node);
        });

        elementUtil.remove(nodes);

        nodes.forEach(function (node) {
            expect(node.parentNode).toBeNull();
        });
    });

    it("addClass", function () {
        var elem = elementUtil.create("<div></div>");

        expect(elem.className).toBe('');

        elementUtil.addClass(elem, "item");
        expect(elem.className).toBe("item");

        elementUtil.addClass(elem, "red");
        elementUtil.addClass(elem, "red");
        expect(elem.className).toBe("item red");

        elementUtil.addClass(elem, 'a b');
        expect(elem.className).toBe('item red a b');
    });

    it("removeClass", function () {
        var elem = elementUtil.create("<div class='a b c d e'></div>");

        elementUtil.removeClass(elem, 'a d');
        expect(elem.className).toBe("b c e");

        elem.className = "a b c";

        elementUtil.removeClass(elem, 'b');
        expect(elem.className).toBe("a c");

        elementUtil.removeClass(elem, 'c a');
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

                elementUtil.removeListener(document.body, "click", spy);
                trigger();
                expect(spy.calls.count()).toBe(1);

                elementUtil.removeListener(document.body, "click", handler);

                done();
            }
        }

        elementUtil.addListener(document.body, 'click', spy);
        elementUtil.addListener(document.body, 'click', handler);

        trigger();
    });
});