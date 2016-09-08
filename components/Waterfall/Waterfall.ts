/// <reference path="../../build/drunk.d.ts" />

/**
 * <div class='container' drunk-waterfall>
 *      <div class="scroller">
 *          <div drunk-repeat="img in imgList" class="item" drunk-waterfall-item waterfall-item-span="10">
 *              <img drunk-attr="{src: img}">
 *          </div>
 *      </div>
 * </div>
 */

namespace drunk {

    @binding('waterfall')
    class Waterfall extends Binding {

        private _scrollHandler: Function;

        init() {
            var viewModel = this.viewModel;

            this._scrollHandler = () => {
                viewModel.$emit('waterfall:scroll');
            };
            this.element.addEventListener('scroll', this._scrollHandler);
        }

        release() {
            this.element.removeEventListener('scroll', this._scrollHandler);
        }
    }

    @binding('waterfall-item')
    class WaterfallItem extends Binding {

        itemWidth: number;
        itemSpan: number;

        private _onScroll: IEventListener;
        private _onResize: IEventListener;

        init() {
            var element = this.element;
            var viewModel = this.viewModel as RepeatItem;
            var parentVm = viewModel['_parent'] as Component;

            if (viewModel['$last']) {
                this._onScroll = () => {
                    var elements = util.toArray(element.parentNode.children);
                    var tail = elements.length - 1;

                    elements.forEach((itemElement, index) => {
                        if (itemVisible(itemElement) && index === tail) {
                            parentVm.$emit('waterfall-scroll-end');
                        }
                    });
                };
                this._onResize = () => {
                    this.updateLayout();
                };

                viewModel.$watch('$last', (value: boolean) => {
                    if (!value) {
                        this.dettachEvent();
                    }
                });
                parentVm.$on('waterfall:scroll', this._onScroll);
                window.addEventListener('resize', this._onResize);

                this.itemWidth = element.offsetWidth;
                this.itemSpan = parseFloat(element.getAttribute('waterfall-item-span'));
                this.updateLayout();
            }
        }

        updateLayout() {
            var scroller = this.element.parentNode;
            var itemWidth = this.itemWidth;
            var parentWidth = scroller.offsetWidth;
            var amount = parentWidth / itemWidth | 0;
            var span = (parentWidth - amount * itemWidth) / (amount + 1);
            var spanY = this.itemSpan || span;

            var elements = util.toArray(scroller.children);
            var colsHeight = [];
            var minIndex = 0;
            var minHeight = null;

            elements.forEach((itemElement, index) => {
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
        }

        dettachEvent() {
            if (this._onResize && this._onScroll) {
                this.viewModel['_parent'].$removeListener('waterfall:scroll', this._onScroll);
                window.removeEventListener('resize', this._onResize);
                this._onResize = this._onScroll = null;
            }
        }

        release() {
            this.dettachEvent();
        }
    }

    function itemVisible(element) {
        var client = element.getBoundingClientRect();
        var containerRect = element.parentNode.parentNode.getBoundingClientRect();
        var visible = client.top <= containerRect.height;
        if (visible) {
            element.classList.add('visible');
        }
        return visible;
    }
}