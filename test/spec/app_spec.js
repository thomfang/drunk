describe("App", function () {
    var drunk = require("drunk");
    var App   = require("drunk.app");

    drunk.Component.extend({
        name: 'test-app'
    })

    var app = new App({
        index: '/main',
        route: {
            '/a:' : 'test-app'
        }
    });

    it("common", function () {
        expect(app._index).toBe("/main");
        expect(app._routes).toBeDefined();
        expect(app._views).toBeDefined();
        expect(app._running).toBe(false);

        expect(app._routes.length).toBe(1);
    });
});
