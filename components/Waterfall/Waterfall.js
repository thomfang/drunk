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
    var Waterfall = (function (_super) {
        __extends(Waterfall, _super);
        function Waterfall() {
            _super.apply(this, arguments);
        }
        Waterfall.prototype.init = function () {
            var viewModel = this.viewModel;
            this._scrollHandler = function () {
                viewModel.$emit('waterfall:scroll');
            };
            this.element.addEventListener('scroll', this._scrollHandler);
        };
        Waterfall.prototype.release = function () {
            this.element.removeEventListener('scroll', this._scrollHandler);
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
            var parentVm = viewModel['_parent'];
            if (viewModel['$last']) {
                var onScroll_1 = function () {
                    var elements = drunk.util.toArray(element.parentNode.children);
                    var tail = elements.length - 1;
                    elements.forEach(function (itemElement, index) {
                        if (itemVisible(itemElement) && index === tail) {
                            parentVm.$emit('waterfall-scroll-end');
                        }
                    });
                };
                var onResize_1 = function () {
                    _this.updateLayout();
                };
                viewModel.$watch('$last', function (value) {
                    if (!value) {
                        parentVm.$removeListener('waterfall:scroll', onScroll_1);
                        window.removeEventListener('resize', onResize_1);
                    }
                });
                parentVm.$on('waterfall:scroll', onScroll_1);
                window.addEventListener('resize', onResize_1);
                this.itemWidth = element.offsetWidth;
                this.itemSpan = parseFloat(element.getAttribute('waterfall-item-span'));
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
                    itemElement.style.top = 0;
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
                // console.log(index, minIndex, minHeight, minHeight + span + itemElement.offsetHeight)
                colsHeight[minIndex] = minHeight = minHeight + spanY + itemElement.offsetHeight;
                itemVisible(itemElement);
            });
            scroller.style.height = Math.max.apply(Math, colsHeight) + 'px';
        };
        WaterfallItem = __decorate([
            drunk.binding('waterfall-item')
        ], WaterfallItem);
        return WaterfallItem;
    }(drunk.Binding));
    function itemVisible(element) {
        var client = element.getBoundingClientRect();
        var containerRect = element.parentNode.parentNode.getBoundingClientRect();
        var visible = client.top <= containerRect.height;
        if (visible) {
            element.classList.add('visible');
        }
        return visible;
    }
})(drunk || (drunk = {}));
//# sourceMappingURL=Waterfall.js.map