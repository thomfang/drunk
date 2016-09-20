/// <reference path="../../build/drunk.d.ts" />

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

namespace drunk {

    var viewModelName = 'waterfallViewModel';
    var scrollEventName = 'waterfall-scroll';
    var scrollEndedEventName = 'waterfall-scroll-end';
    var visibleClassName = 'visible';
    var itemSpanName = 'waterfall-item-span';

    @binding('waterfall')
    class Waterfall extends Binding {

        private _onScroll: Function;

        init() {
            var viewModel = this.viewModel;

            this._onScroll = () => {
                viewModel.$emit('waterfall:scroll');
            };
            this.element.addEventListener('scroll', this._onScroll);
            this.element[viewModelName] = viewModel;
        }

        release() {
            this.element.removeEventListener('scroll', this._onScroll);
            this.element[viewModelName] = this._onScroll = null;
        }
    }

    @binding('waterfall-item')
    class WaterfallItem extends Binding {

        itemWidth: number;
        itemSpan: number;

        private _onScroll: IEventListener;
        private _onResize: IEventListener;
        private _context: Component;

        init() {
            var element = this.element;
            var viewModel = this.viewModel as RepeatItem;

            this._context = this._getWaterfallViewModel();

            if (viewModel.$last) {
                this._onScroll = () => {
                    var elements = util.toArray(element.parentNode.children);
                    var tail = elements.length - 1;

                    elements.forEach((itemElement, index) => {
                        if (itemVisible(itemElement) && index === tail) {
                            this._context && this._context.$emit(scrollEndedEventName);
                        }
                    });
                };
                this._onResize = () => {
                    this.updateLayout();
                };

                // 监听$last属性的变化，如果变化了就表明当前元素已经不是最末尾的那个元素了
                viewModel.$watch('$last', (value: boolean) => {
                    if (!value) {
                        this.dettachEvent();
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
        }

        updateLayout() {
            var scroller: HTMLElement = this.element.parentNode;
            var itemWidth = this.itemWidth;
            var parentWidth = scroller.offsetWidth;
            var amount = parentWidth / itemWidth | 0;
            var span = (parentWidth - amount * itemWidth) / (amount + 1);
            var spanY = this.itemSpan || span;

            var elements: HTMLElement[] = util.toArray(scroller.children);
            var colsHeight: number[] = [];
            var minIndex = 0;
            var minHeight = null;

            elements.forEach((itemElement, index) => {
                if (index < amount) {
                    itemElement.style.left = ((index + 1) * span + itemWidth * index) + 'px';
                    itemElement.style.top = '0';
                    colsHeight[index] = itemElement.offsetHeight;
                    itemVisible(itemElement);
                    return;
                }

                for (let i = 0; i < amount; i++) {
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
        }

        dettachEvent() {
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
        }

        release() {
            this.dettachEvent();
        }

        private _getWaterfallViewModel() {
            var element: HTMLElement = this.element;
            var viewModel: Component;

            while (element.parentNode) {
                if (viewModel = element.parentNode[viewModelName]) {
                    return viewModel;
                }
                element = element.parentNode as HTMLElement;
            }
        }
    }

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
}