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
 * 1. drunk-waterfall       添加在会触发滚动的容器上
 * 2. drunk-waterfall-item  添加在drunk-repeat的元素上
 * 3. waterfall-item-span   表示每个item间的垂直间隙
 *
 * example:
 *
 * <div class='container' drunk-waterfall:001="{onScroll: scrollHandler, onScrollEnd: scrollEndHandler, itemSpan: 10}">
 *      <div class="scroller">
 *          <div drunk-repeat="img in imgList" class="item" drunk-waterfall-item:001>
 *              <img >
 *          </div>
 *      </div>
 * </div>
 */
var drunk;
(function (drunk) {
    var util = drunk.util;
    var binding = drunk.binding;
    var Binding = drunk.Binding;
    var visibleClassName = 'visible';
    var waterfallSrcName = 'waterfall-src';
    var waterfallInstances = {};
    function noop() { }
    var Waterfall = (function (_super) {
        __extends(Waterfall, _super);
        function Waterfall() {
            var _this = this;
            _super.apply(this, arguments);
            this._onScroll = function () {
                if (!_this._items.length) {
                    return;
                }
                _this._items.forEach(function (item) {
                    if (!item.visible) {
                        item.visible = _this._isElementVisible(item.element);
                    }
                });
                _this._options.onScroll.call(_this.viewModel);
                if (_this._items[_this._items.length - 1].visible) {
                    _this._options.onScrollEnd.call(_this.viewModel);
                }
            };
        }
        Waterfall.prototype.init = function () {
            if (this.attribute == null) {
                throw new Error("waterfall\u6307\u4EE4\u9519\u8BEF\uFF0C\u8BF7\u8BBE\u7F6E\u4E00\u4E2A\u6307\u4EE4\u540D\uFF0C\u683C\u5F0F\u5982:'drunk-waterfall:name'");
            }
            this.element.addEventListener('scroll', this._onScroll);
            document.body.addEventListener('scroll', this._onScroll);
            waterfallInstances[this.attribute] = this;
            this._items = [];
            this._renderList = [];
        };
        Waterfall.prototype.update = function (options) {
            this._options = util.extend({ itemSpan: 0, onScroll: noop, onScrollEnd: noop }, options);
        };
        Waterfall.prototype.release = function () {
            this.element.removeEventListener('scroll', this._onScroll);
            document.body.removeEventListener('scroll', this._onScroll);
            if (this._renderJob) {
                this._renderJob.cancel();
            }
            if (this._updateAfterRemoveJob) {
                this._updateAfterRemoveJob.cancel();
            }
            this._onScroll = this._options = this._items = this._itemsHeight = this._renderList = this._renderJob = this._updateAfterRemoveJob = null;
            delete waterfallInstances[this.attribute];
        };
        Waterfall.prototype.addItem = function (item) {
            var _this = this;
            var index = this._items.indexOf(item);
            if (index > -1) {
                return;
            }
            this._items.push(item);
            this._renderList.push(item);
            if (!this._renderJob) {
                this._renderJob = util.execAsyncWork(function () {
                    _this._renderJob = null;
                    _this._renderList.forEach(function (item, index) { return _this._updatePosition(item, _this._items.indexOf(item)); });
                    _this._renderList.length = 0;
                });
            }
        };
        Waterfall.prototype.removeItem = function (item) {
            var _this = this;
            var index = this._items.indexOf(item);
            if (index == -1) {
                return;
            }
            if (this._changedIndex == null || index < this._changedIndex) {
                this._changedIndex = index;
            }
            if (!this._updateAfterRemoveJob) {
                this._updateAfterRemoveJob = util.execAsyncWork(function () {
                    _this._updateAfterRemoveJob = null;
                    _this._items.slice(_this._changedIndex).forEach(function (item, index) {
                        _this._updatePosition(item, index);
                    });
                    _this._changedIndex = null;
                });
            }
            this._items.splice(index, 1);
            util.removeArrayItem(this._renderList, item);
        };
        Waterfall.prototype.updateLayout = function () {
            var _this = this;
            if (!this._items.length) {
                return;
            }
            if (this._updateAfterRemoveJob) {
                this._updateAfterRemoveJob.cancel();
                this._updateAfterRemoveJob = null;
            }
            this._layoutMeasured = false;
            this._items.forEach(function (item, index) { return _this._updatePosition(item, index); });
        };
        Waterfall.prototype._measureLayout = function () {
            if (this._layoutMeasured) {
                return;
            }
            var item = this._items[0];
            var itemWidth = this._itemWidth = item.element.offsetWidth;
            var surfaceWidth = item.element.parentNode.offsetWidth;
            var amount = this._itemAmountOfOneRow = surfaceWidth / itemWidth | 0;
            this._itemSpan = (surfaceWidth - amount * itemWidth) / (amount + 1);
            this._itemsHeight = {};
            this._minHeight = null;
            this._minHeightItemIndex = null;
            this._layoutMeasured = true;
        };
        Waterfall.prototype._updatePosition = function (item, index) {
            if (index < 0) {
                return;
            }
            this._measureLayout();
            var element = item.element;
            var amount = this._itemAmountOfOneRow;
            var itemWidth = this._itemWidth;
            var itemSpan = this._itemSpan;
            var options = this._options;
            var itemsHeight = this._itemsHeight;
            if (index < amount) {
                element.style.left = ((index + 1) * itemSpan + itemWidth * index) + 'px';
                element.style.top = '0';
                itemsHeight[index] = element.offsetHeight;
            }
            else {
                for (var i = 0; i < amount; i++) {
                    if (this._minHeight == null) {
                        this._minHeight = itemsHeight[i];
                        this._minHeightItemIndex = i;
                    }
                    else if (this._minHeight > itemsHeight[i]) {
                        this._minHeight = itemsHeight[i];
                        this._minHeightItemIndex = i;
                    }
                }
                element.style.left = ((this._minHeightItemIndex + 1) * itemSpan + this._minHeightItemIndex * itemWidth) + 'px';
                element.style.top = this._minHeight + options.itemSpan + 'px';
                itemsHeight[this._minHeightItemIndex] = this._minHeight = this._minHeight + options.itemSpan + element.offsetHeight;
            }
            this._isElementVisible(element);
        };
        Waterfall.prototype._isElementVisible = function (element) {
            var _this = this;
            var client = element.getBoundingClientRect();
            var containerRect = document.body.getBoundingClientRect();
            var visible = client.top <= containerRect.height;
            if (visible) {
                element.classList.add(visibleClassName);
                if (element.tagName === 'IMG') {
                    this._loadImage(element);
                }
                else {
                    util.toArray(element.querySelectorAll('img')).forEach(function (img) { return _this._loadImage(img); });
                }
            }
            return visible;
        };
        Waterfall.prototype._loadImage = function (img) {
            var src = img.getAttribute(waterfallSrcName);
            if (src && src.indexOf('{{') < 0) {
                img.setAttribute('src', src);
                img.removeAttribute(waterfallSrcName);
            }
        };
        Waterfall = __decorate([
            binding('waterfall')
        ], Waterfall);
        return Waterfall;
    }(Binding));
    var WaterfallItem = (function (_super) {
        __extends(WaterfallItem, _super);
        function WaterfallItem() {
            _super.apply(this, arguments);
        }
        WaterfallItem.prototype.init = function () {
            if (this.attribute == null) {
                throw new Error("waterfall-item\u6307\u4EE4\u9519\u8BEF\uFF0C\u8BF7\u8BBE\u7F6E\u4E00\u4E2A\u4E0Ewaterfall\u6307\u4EE4\u4E00\u6837\u7684\u6307\u4EE4\u540D\uFF0C\u683C\u5F0F\u5982:'drunk-waterfall-item:name'");
            }
            waterfallInstances[this.attribute].addItem(this);
        };
        WaterfallItem.prototype.release = function () {
            if (waterfallInstances[this.attribute]) {
                waterfallInstances[this.attribute].removeItem(this);
            }
        };
        WaterfallItem = __decorate([
            binding('waterfall-item')
        ], WaterfallItem);
        return WaterfallItem;
    }(Binding));
    window.addEventListener('resize', function () {
        Object.keys(waterfallInstances).forEach(function (id) {
            var waterfall = waterfallInstances[id];
            if (waterfall) {
                waterfall.updateLayout();
            }
        });
    });
})(drunk || (drunk = {}));
//# sourceMappingURL=Waterfall.js.map