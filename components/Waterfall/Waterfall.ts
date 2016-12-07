/// <reference path="../../build/drunk.d.ts" />

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

namespace drunk {

    import util = drunk.util;
    import Promise = drunk.Promise;
    import binding = drunk.binding;
    import Binding = drunk.Binding;

    var visibleClassName = 'visible';
    var waterfallSrcName = 'waterfall-src';
    var waterfallInstances: { [id: string]: Waterfall } = {};

    type WaterfallOptions = { onScroll?: Function; onScrollEnd?: Function; itemSpan?: number };

    function noop() { }

    @binding('waterfall')
    class Waterfall extends Binding {

        private _options: WaterfallOptions;
        private _items: WaterfallItem[];
        private _itemAmountOfOneRow: number;
        private _itemWidth: number;
        private _itemSpan: number;
        private _itemsHeight: { [index: number]: number };
        private _minHeightItemIndex: number;
        private _minHeight: number;
        private _changedIndex: number;
        private _layoutMeasured: boolean;
        private _renderJob: util.IAsyncJob;
        private _updateAfterRemoveJob: util.IAsyncJob;
        private _renderList: WaterfallItem[];

        private _onScroll = () => {
            if (!this._items.length) {
                return;
            }

            this._items.forEach(item => {
                if (!item.visible) {
                    item.visible = this._isElementVisible(item.element);
                }
            });

            this._options.onScroll.call(this.viewModel);

            if (this._items[this._items.length - 1].visible) {
                this._options.onScrollEnd.call(this.viewModel);
            }
        };

        init() {
            if (this.attribute == null) {
                throw new Error(`waterfall指令错误，请设置一个指令名，格式如:'drunk-waterfall:name'`);
            }

            this.element.addEventListener('scroll', this._onScroll);
            document.body.addEventListener('scroll', this._onScroll);

            waterfallInstances[this.attribute] = this;

            this._items = [];
            this._renderList = [];
        }

        update(options: WaterfallOptions) {
            this._options = util.extend({ itemSpan: 0, onScroll: noop, onScrollEnd: noop }, options);
        }

        release() {
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
        }

        addItem(item: WaterfallItem) {
            var index = this._items.indexOf(item);
            if (index > -1) {
                return;
            }

            this._items.push(item);
            this._renderList.push(item);

            if (!this._renderJob) {
                this._renderJob = util.execAsyncWork(() => {
                    this._renderJob = null;
                    this._renderList.forEach((item, index) => this._updatePosition(item, this._items.indexOf(item)));
                    this._renderList.length = 0;
                });
            }
        }

        removeItem(item: WaterfallItem) {
            let index = this._items.indexOf(item);
            if (index == -1) {
                return;
            }
            if (this._changedIndex == null || index < this._changedIndex) {
                this._changedIndex = index;
            }
            if (!this._updateAfterRemoveJob) {
                this._updateAfterRemoveJob = util.execAsyncWork(() => {
                    this._updateAfterRemoveJob = null;
                    this._items.slice(this._changedIndex).forEach((item, index) => {
                        this._updatePosition(item, index);
                    });
                    this._changedIndex = null;
                });
            }
            this._items.splice(index, 1);
            util.removeArrayItem(this._renderList, item);
        }

        updateLayout() {
            if (!this._items.length) {
                return;
            }
            if (this._updateAfterRemoveJob) {
                this._updateAfterRemoveJob.cancel();
                this._updateAfterRemoveJob = null;
            }

            this._layoutMeasured = false;
            this._items.forEach((item, index) => this._updatePosition(item, index));
        }

        private _measureLayout() {
            if (this._layoutMeasured) {
                return;
            }

            var item = this._items[0];
            var itemWidth = this._itemWidth = item.element.offsetWidth;
            var surfaceWidth = (item.element.parentNode as HTMLElement).offsetWidth;
            var amount = this._itemAmountOfOneRow = surfaceWidth / itemWidth | 0;

            this._itemSpan = (surfaceWidth - amount * itemWidth) / (amount + 1);
            this._itemsHeight = {};
            this._minHeight = null;
            this._minHeightItemIndex = null;
            this._layoutMeasured = true;
        }

        private _updatePosition(item: WaterfallItem, index: number) {
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
                for (let i = 0; i < amount; i++) {
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

            element.style.visibility = '';
            this._isElementVisible(element);
        }

        private _isElementVisible(element) {
            var client = element.getBoundingClientRect();
            var containerRect = document.body.getBoundingClientRect();
            var visible = client.top <= containerRect.height;
            if (visible) {
                element.classList.add(visibleClassName);
                if (element.tagName === 'IMG') {
                    this._loadImage(element);
                }
                else {
                    util.toArray(element.querySelectorAll('img')).forEach(img => this._loadImage(img));
                }
            }
            return visible;
        }

        private _loadImage(img) {
            var src = img.getAttribute(waterfallSrcName);
            if (src && src.indexOf('{{') < 0) {
                img.setAttribute('src', src);
                img.removeAttribute(waterfallSrcName);
            }
        }
    }

    @binding('waterfall-item')
    class WaterfallItem extends Binding {

        element: HTMLElement;
        visible: boolean;

        init() {
            if (this.attribute == null) {
                throw new Error(`waterfall-item指令错误，请设置一个与waterfall指令一样的指令名，格式如:'drunk-waterfall-item:name'`);
            }
            this.element.style.visibility = 'hidden';
            waterfallInstances[this.attribute].addItem(this);
        }

        release() {
            if (waterfallInstances[this.attribute]) {
                waterfallInstances[this.attribute].removeItem(this);
            }
        }
    }

    window.addEventListener('resize', () => {
        Object.keys(waterfallInstances).forEach(id => {
            let waterfall = waterfallInstances[id];
            if (waterfall) {
                waterfall.updateLayout();
            }
        });
    });
}