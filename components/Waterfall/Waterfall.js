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
 * <div class='container' drunk-waterfall>
 *      <div class="scroller">
 *          <div drunk-repeat="img in imgList" class="item" drunk-waterfall-item waterfall-item-span="10">
 *              <img drunk-attr="{src: img}">
 *          </div>
 *      </div>
 * </div>
 */
var drunk;
(function (drunk) {
    var viewModelName = 'waterfallViewModel';
    var scrollEventName = 'waterfall-scroll';
    var scrollEndedEventName = 'waterfall-scroll-end';
    var visibleClassName = 'visible';
    var itemSpanName = 'waterfall-item-span';
    var Waterfall = (function (_super) {
        __extends(Waterfall, _super);
        function Waterfall() {
            _super.apply(this, arguments);
        }
        Waterfall.prototype.init = function () {
            var viewModel = this.viewModel;
            this._onScroll = function () {
                viewModel.$emit('waterfall:scroll');
            };
            this.element.addEventListener('scroll', this._onScroll);
            this.element[viewModelName] = viewModel;
        };
        Waterfall.prototype.release = function () {
            this.element.removeEventListener('scroll', this._onScroll);
            this.element[viewModelName] = this._onScroll = null;
        };
        Waterfall = __decorate([
            drunk.binding('waterfall')
        ], Waterfall);
        return Waterfall;
    }(drunk.Binding));
    var WaterfallItem = (function (_super) {
        __extends(WaterfallItem, _super);
        function WaterfallItem() {
            _super.apply(this, arguments);
        }
        WaterfallItem.prototype.init = function () {
            var _this = this;
            var element = this.element;
            var viewModel = this.viewModel;
            this._context = this._getWaterfallViewModel();
            if (viewModel.$last) {
                this._onScroll = function () {
                    var elements = drunk.util.toArray(element.parentNode.children);
                    var tail = elements.length - 1;
                    elements.forEach(function (itemElement, index) {
                        if (itemVisible(itemElement) && index === tail) {
                            _this._context && _this._context.$emit(scrollEndedEventName);
                        }
                    });
                };
                this._onResize = function () {
                    _this.updateLayout();
                };
                // 监听$last属性的变化，如果变化了就表明当前元素已经不是最末尾的那个元素了
                viewModel.$watch('$last', function (value) {
                    if (!value) {
                        _this.dettachEvent();
                    }
                });
                if (this._context) {
                    this._context.$on('waterfall:scroll', this._onScroll);
                }
                else {
                    window.addEventListener('scroll', this._onScroll);
                }
                window.addEventListener('resize', this._onResize);
                this.itemWidth = element.offsetWidth;
                this.itemSpan = parseFloat(element.getAttribute(itemSpanName));
                this.updateLayout();
            }
        };
        WaterfallItem.prototype.updateLayout = function () {
            var scroller = this.element.parentNode;
            var itemWidth = this.itemWidth;
            var parentWidth = scroller.offsetWidth;
            var amount = parentWidth / itemWidth | 0;
            var span = (parentWidth - amount * itemWidth) / (amount + 1);
            var spanY = this.itemSpan || span;
            var elements = drunk.util.toArray(scroller.children);
            var colsHeight = [];
            var minIndex = 0;
            var minHeight = null;
            elements.forEach(function (itemElement, index) {
                if (index < amount) {
                    itemElement.style.left = ((index + 1) * span + itemWidth * index) + 'px';
                    itemElement.style.top = '0';
                    colsHeight[index] = itemElement.offsetHeight;
                    itemVisible(itemElement);
                    return;
                }
                for (var i = 0; i < amount; i++) {
                    if (minHeight == null) {
                        minHeight = colsHeight[i];
                        minIndex = i;
                    }
                    else if (minHeight > colsHeight[i]) {
                        minHeight = colsHeight[i];
                        minIndex = i;
                    }
                }
                itemElement.style.left = ((minIndex + 1) * span + minIndex * itemWidth) + 'px';
                itemElement.style.top = minHeight + spanY + 'px';
                colsHeight[minIndex] = minHeight = minHeight + spanY + itemElement.offsetHeight;
                itemVisible(itemElement);
            });
            scroller.style.height = Math.max.apply(Math, colsHeight) + 'px';
        };
        WaterfallItem.prototype.dettachEvent = function () {
            if (this._onResize && this._onScroll) {
                window.removeEventListener('resize', this._onResize);
                if (this._context) {
                    this._context.$removeListener(scrollEventName, this._onScroll);
                }
                else {
                    window.removeEventListener('scroll', this._onScroll);
                }
                this._onResize = this._onScroll = this._context = null;
            }
        };
        WaterfallItem.prototype.release = function () {
            this.dettachEvent();
        };
        WaterfallItem.prototype._getWaterfallViewModel = function () {
            var element = this.element;
            var viewModel;
            while (element.parentNode) {
                if (viewModel = element.parentNode[viewModelName]) {
                    return viewModel;
                }
                element = element.parentNode;
            }
        };
        WaterfallItem = __decorate([
            drunk.binding('waterfall-item')
        ], WaterfallItem);
        return WaterfallItem;
    }(drunk.Binding));
    function itemVisible(element) {
        var client = element.getBoundingClientRect();
        // var containerRect = element.parentNode.parentNode.getBoundingClientRect();
        var containerRect = document.body.getBoundingClientRect();
        var visible = client.top <= containerRect.height;
        if (visible) {
            element.classList.add(visibleClassName);
        }
        return visible;
    }
})(drunk || (drunk = {}));
//# sourceMappingURL=Waterfall.js.map