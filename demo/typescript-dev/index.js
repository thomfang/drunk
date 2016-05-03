/// <reference path="../../build/drunk.d.ts" />
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
/**
 * MyApp
 */
var MyApp = (function (_super) {
    __extends(MyApp, _super);
    function MyApp() {
        _super.apply(this, arguments);
        this.firstName = "Jim";
        this.lastName = "Green";
    }
    Object.defineProperty(MyApp.prototype, "fullName", {
        get: function () {
            var firstName = this.firstName || '';
            var lastName = this.lastName || '';
            return lastName ? firstName + ' ' + lastName : firstName;
        },
        set: function (value) {
            var names = value.split(/\s+/) || [];
            console.log(value, names + '');
            this.firstName = names[0] || '';
            this.lastName = names[1] || '';
        },
        enumerable: true,
        configurable: true
    });
    __decorate([
        drunk.computed
    ], MyApp.prototype, "fullName", null);
    MyApp = __decorate([
        /// <reference path="../../build/drunk.d.ts" />
        drunk.component("my-app")
    ], MyApp);
    return MyApp;
}(drunk.Component));
new drunk.Component().$mount(document.body);
