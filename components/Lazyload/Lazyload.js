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
 * <div drunk-lazy-load-scroller>
 *      <img drunk-repeat="img in imgs" drunk-lazy-load="img" lazy-load-default="http://www.aaa.com/a.jpg">
 * </div>
 */
var drunk;
(function (drunk) {
    var util = drunk.util;
    var binding = drunk.binding;
    var Binding = drunk.Binding;
    var unloadedImages = [];
    var LazyLoadScroller = (function (_super) {
        __extends(LazyLoadScroller, _super);
        function LazyLoadScroller() {
            _super.apply(this, arguments);
        }
        LazyLoadScroller.prototype.init = function () {
            this.element.addEventListener('scroll', scrollHandler);
        };
        LazyLoadScroller.prototype.release = function () {
            this.element.removeEventListener('scroll', scrollHandler);
        };
        LazyLoadScroller = __decorate([
            binding('lazy-load-scroller')
        ], LazyLoadScroller);
        return LazyLoadScroller;
    }(Binding));
    var LazyLoad = (function (_super) {
        __extends(LazyLoad, _super);
        function LazyLoad() {
            _super.apply(this, arguments);
        }
        LazyLoad.prototype.getDefaultUrl = function () {
            return this.element.getAttribute('lazy-load-default');
        };
        LazyLoad.prototype.init = function () {
            var _this = this;
            this._onerror = function () {
                if (!_this.element) {
                    return;
                }
                var defaultUrl = _this.getDefaultUrl();
                if (defaultUrl) {
                    _this.element.setAttribute('src', defaultUrl);
                }
            };
            this.element.addEventListener('error', this._onerror);
        };
        LazyLoad.prototype.update = function (src) {
            if (!src) {
                // 只有src为空字符串时取默认图片路径
                src = this.getDefaultUrl();
            }
            if (src) {
                var options = { src: src, img: this.element };
                // 如果该图片没有在屏幕中可见，把它添加到等待加载的图片队列中
                if (!showImage(options)) {
                    this._imgOptions = options;
                    util.addArrayItem(unloadedImages, options);
                }
            }
            else if (this._imgOptions) {
                // 如果src已经变为空，把原来的添加在队列里的移除
                util.removeArrayItem(unloadedImages, this._imgOptions);
                this._imgOptions = null;
            }
        };
        LazyLoad.prototype.release = function () {
            if (this._imgOptions) {
                // 从队列中移除
                util.removeArrayItem(unloadedImages, this._imgOptions);
            }
            this.element.removeEventListener('error', this._onerror);
            this._onerror = this._imgOptions = null;
        };
        LazyLoad.priority = Binding.Priority.low;
        LazyLoad = __decorate([
            binding('lazy-load')
        ], LazyLoad);
        return LazyLoad;
    }(Binding));
    function showImage(_a) {
        var img = _a.img, src = _a.src;
        if (!document.body.contains(img)) {
            return false;
        }
        var bodyRect = document.body.getBoundingClientRect();
        var imgRect = img.getBoundingClientRect();
        if (bodyRect.height < imgRect.top || bodyRect.width < imgRect.left) {
            return false;
        }
        img.setAttribute('src', src);
        return true;
    }
    function scrollHandler() {
        if (!unloadedImages.length) {
            return;
        }
        unloadedImages.slice().forEach(function (img) {
            if (showImage(img)) {
                util.removeArrayItem(unloadedImages, img);
            }
        });
    }
    window.addEventListener('scroll', scrollHandler);
})(drunk || (drunk = {}));
//# sourceMappingURL=Lazyload.js.map