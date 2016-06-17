/// <reference path="../../build/drunk.d.ts" />

/**
 * <body>
 *   <list-view item-data-source="{{list}} scroll-to-item="{{locatedItemIndex}}">
 *     <list-view-item>
 *       <div>
 *         <p>Name: {{$item.name}}</p>
 *         <p>Age: {{$item.age}}</p>
 *         <p>No.: {{$index}}</p>
 *       </div>
 *     </list-view-item>
 *   </list-view>
 * </body>
 * 
 * var view = new drunk.Component({
 *   list: [{name: Todd, age: 27}, {name: Fon, age: 20}, {name: Jim, age: 29}, {name: Tom, age: 22}],
 *   locatedItemIndex: 1
 * });
 * view.$mount(document.body);
 */

namespace drunk {

    import dom = drunk.dom;
    import Map = drunk.Map;
    import util = drunk.util;
    import Component = drunk.Component;
    import RepeatItem = drunk.RepeatItem;
    import Template = drunk.Template;
    import Promise = drunk.Promise;

    type ItemDeclaration = {
        viewmodel: RepeatItem;
        placeholder: HTMLElement;
        renderred: boolean;
        isUsed?: boolean;
        isBinded?: boolean;
    };

    var templateString = `<div class="list-view"><div class="header-container"></div><div class="item-container"></div><div class="footer-container"></div></div>`;

    /**
     * ListView
     */
    @drunk.component('list-view')
    export class ListView extends Component {

        static Layout = {
            virtical: 'virtical',
            horizental: 'horizental'
        }

        template = templateString;

        /** 布局方向 */
        layout = ListView.Layout.virtical;

        /** 渲染的数据源 */
        itemDataSource: any[];

        /** 定位到第几个item */
        scrollToItem: number;

        private _owner: Component;

        private _inited: boolean;
        private _isFirstRender: boolean = true;

        private _items: ItemDeclaration[] = [];
        private _itemsMap = new Map<ItemDeclaration[]>();
        private _bind: drunk.IBindingGenerator;
        private _unbinds: Function[] = [];
        private _itemSize: { width: number; height: number; };
        private _itemContainer: HTMLElement;
        private _itemTemplate: HTMLElement;
        private _itemContainerSize: { width: number; height: number };
        private _headerSize: { width: number; height: number; };
        private _footerSize: { width: number; height: number; };
        private _headerContainer: HTMLElement;
        private _footerContainer: HTMLElement;

        private _unloadedImages: { img: HTMLImageElement; src: string }[] = [];

        private _beginOffset: number; // 开始渲染的item的下标
        private _renderCount: number; // 可以渲染的item个数
        private _visibleItemCount: number; // 可视的item个数
        private _prefetchCount: number; // 预渲染的个数
        private _prefetchPage: number = 3;

        private _currScrollPosition = 0;
        private _lastScrollPosition: number;
        private _isScrollForward: boolean;
        private _pendingScroll: number;
        private _onScrollHandler: (e) => any;
        private _onResizeHandler: (e) => any;

        private _renderVisibleItemsJob: Scheduler.IJob;
        private _renderHiddenItemsPromise: Promise<any>;

        constructor() {
            super();

            this.$watch('itemDataSource', (newValue, oldValue) => {
                if (!this._itemContainer || oldValue === undefined) {
                    return;
                }
                this._updateItems();
                this._renderItems();
            }, true);

            this.$watch('scrollToItem', () => {
                this._updateScrollPosition();
            });
        }

        /**
         * @override
         */
        $mount(viewportElement: HTMLElement, owner: Component, placeholder: HTMLElement) {
            let header: HTMLElement;
            let footer: HTMLElement;

            super.$mount(viewportElement, owner, placeholder);

            let wrap = (nodeList: any) => {
                let wrapper = document.createElement('div');
                util.toArray(nodeList).forEach(node => {
                    wrapper.appendChild(node);
                });
                return wrapper;
            }

            util.toArray(placeholder.children).forEach((child) => {
                let tagName = child.tagName.toLowerCase();

                switch (tagName) {
                    case 'list-view-header':
                        header = wrap(child.childNodes);
                        break;
                    case 'list-view-footer':
                        footer = wrap(child.childNodes);
                        break;
                    case 'list-view-item':
                        this._itemTemplate = child.firstElementChild;
                        break;
                    default:
                        throw new Error(`list-view中存在无法识别的标签:  ${child.tagName.toLowerCase()}`);
                }
            });

            if (!this._itemTemplate) {
                throw new Error(`list-view: 未找到list-view-item模板标签`);
            }

            this._owner = owner;
            this._bind = Template.compile(this._itemTemplate);
            this._headerContainer = <HTMLElement>viewportElement.querySelector('.header-container');
            this._itemContainer = <HTMLElement>viewportElement.querySelector('.item-container');
            this._footerContainer = <HTMLElement>viewportElement.querySelector('.footer-container');

            if (!this._itemContainer) {
                throw new Error(`<list-view>: div.item-container容器未在模板中提供`);
            }

            if (header) {
                if (!this._headerContainer) {
                    throw new Error(`<list-view>: div.header-container容器未在模板中提供`);
                }
                this._unbinds.push(Template.compile(header)(owner, header));
                this._headerContainer.appendChild(header);
            }

            if (footer) {
                if (!this._footerContainer) {
                    throw new Error(`<list-view>: div.footer-container容器未在模板中提供`);
                }
                this._unbinds.push(Template.compile(footer)(owner, footer));
                this._footerContainer.appendChild(footer);
            }

            dom.addClass(viewportElement, 'list-view-' + util.uniqueId(this));
            if (this.layout === ListView.Layout.horizental) {
                dom.addClass(viewportElement, 'list-view-horizental');
            }
            else if (this.layout === ListView.Layout.virtical) {
                dom.addClass(viewportElement, 'list-view-virtical');
            }
            initListViewLayoutClass();

            this._attachEvents();
            this._measureSize();
            this._updateItems();
            this._renderItems();
        }

        /**
         * @override
         */
        $release() {
            this._renderHiddenItemsPromise && this._renderHiddenItemsPromise.cancel();
            this._renderVisibleItemsJob && this._renderVisibleItemsJob.cancel();
            this._detachEvents();
            this._releaseItems(this._items);
            this._unbinds.forEach(unbind => unbind());
            this._itemsMap.clear();
            this._renderHiddenItemsPromise = this._renderVisibleItemsJob = null;
            this._itemTemplate = this._itemContainer = this._headerContainer = this._footerContainer = this._unbinds = this._bind = this._owner = this._itemsMap = null;
            this._onResizeHandler = this._onScrollHandler = this._unloadedImages = null;
            super.$release();
        }

        /**
         * 滚动到指定位置
         */
        private _updateScrollPosition() {
            let itemIndex = this.scrollToItem;
            if (itemIndex == null || !this._itemContainer) {
                return;
            }

            this.scrollToItem = null;
            if (this.layout === ListView.Layout.horizental) {
                this._itemContainer.scrollLeft = itemIndex * this._itemSize.width;
            }
            else if (this.layout === ListView.Layout.virtical) {
                this._itemContainer.scrollTop = itemIndex * this._itemSize.height;
            }
        }

        /**
         * 计算Listview和每个item的宽高
         */
        private _measureSize() {
            let viewport = <any>this.element;
            let itemContainer = this._itemContainer;
            let itemTemplate = this._itemTemplate;
            let uuid = util.uniqueId(this);
            let itemContainerCSSRule: any;
            let placeholderCSSRule: any;

            this._headerSize = { width: this._headerContainer.offsetWidth, height: this._headerContainer.offsetHeight };
            this._footerSize = { width: this._footerContainer.offsetWidth, height: this._footerContainer.offsetHeight };
            this._itemContainerSize = {
                width: viewport.offsetWidth - this._headerSize.width - this._footerSize.width,
                height: viewport.offsetHeight - this._headerSize.height - this._footerSize.height
            };
            itemContainerCSSRule = {
                width: this._itemContainerSize.width + 'px',
                height: this._itemContainerSize.height + 'px'
            };

            itemTemplate.style.visibility = 'hidden';
            itemContainer.appendChild(itemTemplate);

            let templateStyle = getComputedStyle(itemTemplate, null);
            let itemSize = this._itemSize = {
                width: itemTemplate.offsetWidth + Math.max((parseFloat(templateStyle.marginLeft) || 0), (parseFloat(templateStyle.marginRight) || 0)),
                height: itemTemplate.offsetHeight + Math.max((parseFloat(templateStyle.marginTop) || 0), (parseFloat(templateStyle.marginBottom) || 0)),
            };

            placeholderCSSRule = {
                width: templateStyle.width,
                height: templateStyle.height,
                margin: templateStyle.margin,
                padding: templateStyle.padding,
                border: templateStyle.border
            };

            if (this.layout === ListView.Layout.horizental) {
                this._visibleItemCount = Math.ceil(this._itemContainerSize.width / itemSize.width);
            }
            else if (this.layout === ListView.Layout.virtical) {
                this._visibleItemCount = Math.ceil(this._itemContainerSize.height / itemSize.height);
            }
            this._prefetchCount = this._visibleItemCount * this._prefetchPage;

            itemContainer.removeChild(itemTemplate);
            itemTemplate.style.visibility = '';

            dom.addCSSRule({
                [`.list-view-${uuid} .item-container`]: itemContainerCSSRule,
                [`.list-view-${uuid} .item-container .placeholder`]: placeholderCSSRule
            });
        }

        /**
         * 为一个item创建点位标签
         */
        private _createItemPlaceholder() {
            let placeholder = document.createElement('div');
            dom.addClass(placeholder, 'placeholder');
            return placeholder;
        }

        /**
         * 更新item
         */
        private _updateItems() {
            let itemDataSource = this.itemDataSource;
            let items = this._items;

            if (itemDataSource && itemDataSource.length) {
                this._items = itemDataSource.map((itemData, index) => {
                    return this._getItem({
                        $index: index,
                        $item: itemData,
                        $first: index === 0,
                        $last: index === itemDataSource.length - 1,
                        $odd: index % 2 === 0,
                        $even: index % 2 !== 0
                    });
                });

                this._releaseItems(items.filter(item => !item.isUsed));
                this._items.forEach(item => item.isUsed = false);
            }
            else {
                this._releaseItems(this._items);
                this._items.length = 0;
            }
        }

        private _getItem(itemData: { $index: number; $item: any; $first: boolean; $last: boolean; $odd: boolean; $even: boolean }) {
            let items = this._itemsMap.get(itemData.$item);
            let item: ItemDeclaration;

            if (items) {
                for (let i = 0; item = items[i]; i++) {
                    if (!item.isUsed) {
                        break;
                    }
                }
            }

            if (!item) {
                item = {
                    viewmodel: new RepeatItem(this._owner, itemData),
                    placeholder: this._createItemPlaceholder(),
                    renderred: false
                };

                item.viewmodel.element = this._itemTemplate.cloneNode(true);

                if (!items) {
                    items = [];
                    this._itemsMap.set(itemData.$item, items);
                }

                items.push(item);
            }
            else {
                Object.keys(itemData).forEach(key => item.viewmodel[key] = itemData[key]);
            }

            item.isUsed = true;
            return item;
        }

        private _releaseItems(unrealizedItems: ItemDeclaration[]) {
            unrealizedItems.forEach(item => {
                let items = this._itemsMap.get(item.viewmodel['$item']);
                util.removeArrayItem(items, item);

                if (item.renderred) {
                    dom.remove(item.viewmodel.element);
                }
                if (item.placeholder) {
                    dom.remove(item.placeholder);
                }
                item.viewmodel.$release();
            });
        }

        private _renderItems() {
            if (!this._itemSize || !this._items.length) {
                return;
            }

            let items = this._items;

            if (!this._inited) {
                let itemElems = this._itemContainer.children;
                let elem = itemElems[0];

                items.forEach(item => {
                    if (!elem) {
                        this._itemContainer.appendChild(item.renderred ? <Node>item.viewmodel.element : item.placeholder);
                    }
                    else if (elem != item.placeholder && elem != item.viewmodel.element) {
                        dom.before(item.renderred ? item.viewmodel.element : item.placeholder, elem);
                    }
                    else if (elem) {
                        elem = elem.nextElementSibling;
                    }
                });

                this._inited = true;
            }

            if (this._renderVisibleItemsJob) {
                this._renderVisibleItemsJob.cancel();
            }
            if (this._renderHiddenItemsPromise) {
                this._renderHiddenItemsPromise.cancel();
            }

            if (this.scrollToItem != null) {
                this._isFirstRender = false;
                return this._updateScrollPosition();
            }

            if (this._isFirstRender) {
                this._beginOffset = 0;
                this._renderCount = Math.min(this._visibleItemCount * 2, this._items.length);
                this._isFirstRender = false;
            }
            else {
                let beginOffset: number;
                let prefectch = this._prefetchCount;
                let lastIndex = items.length - 1;

                if (this.layout === ListView.Layout.horizental) {
                    beginOffset = Math.floor(this._currScrollPosition / this._itemSize.width);
                }
                else if (this.layout === ListView.Layout.virtical) {
                    beginOffset = Math.floor(this._currScrollPosition / this._itemSize.height);
                }

                if (this._isScrollForward) {
                    beginOffset = Math.min(lastIndex, beginOffset + this._visibleItemCount);
                    this._renderCount = beginOffset >= prefectch ? prefectch : beginOffset + 1;
                }
                else {
                    this._renderCount = lastIndex >= beginOffset + prefectch ? prefectch : lastIndex - beginOffset + 1;
                }

                this._beginOffset = beginOffset;
            }

            this._renderVisibleItems();
            this._renderImages();
            this._renderHiddenItems();
        }

        private _renderVisibleItems() {
            let work = (jobInfo: Scheduler.IJobInfo) => {
                let endTime = Date.now() + 100;
                let step = this._isScrollForward ? -1 : 1;

                for (let index = this._beginOffset, j = 0; j < this._renderCount; j++ , index += step) {
                    this._renderVisibleItemImpl(this._items[index]);
                    if (Date.now() >= endTime && j >= this._visibleItemCount) {
                        return jobInfo.setWork(work);
                    }
                }

                step = -step;
                for (let index = this._beginOffset, j = 0;
                    j < this._visibleItemCount && (this._isScrollForward ? index < this._items.length : index >= 0);
                    j++ , index += step
                ) {
                    this._renderVisibleItemImpl(this._items[index]);
                    if (jobInfo.shouldYield) {
                        return jobInfo.setWork(work);
                    }
                }
                this._renderVisibleItemsJob = null;
            };
            this._renderVisibleItemsJob = Scheduler.schedule(work, Scheduler.Priority.aboveNormal);
        }

        private _renderHiddenItems() {
            this._renderHiddenItemsPromise = Promise.timeout(500);
            this._renderHiddenItemsPromise.done(() => {
                if (this._isScrollForward) {
                    for (let i = this._beginOffset + this._visibleItemCount + 1, lastIndex = this._items.length; i < lastIndex; i++) {
                        this._renderHiddenItemImpl(this._items[i]);
                    }
                }
                else {
                    for (let i = this._beginOffset - this._visibleItemCount - 1; i >= 0; i--) {
                        this._renderHiddenItemImpl(this._items[i]);
                    }
                }
                this._renderHiddenItemsPromise = null;
            });
        }

        private _renderVisibleItemImpl(item: ItemDeclaration) {
            if (!item.renderred) {
                if (!item.isBinded) {
                    this._bind(item.viewmodel, item.viewmodel.element);
                    util.toArray((item.viewmodel.element as HTMLElement).querySelectorAll('img[src]')).forEach((img: HTMLImageElement) => {
                        if (img.src && img.src.indexOf('#') === -1) {
                            this._unloadedImages.push({ img, src: img.src });
                            img.removeAttribute('src');
                        }
                    });
                    item.isBinded = true;
                }
                dom.replace(item.viewmodel.element, item.placeholder);
                item.renderred = true;
            }
        }

        private _renderHiddenItemImpl(item: ItemDeclaration) {
            if (item.renderred) {
                let element = <Node>item.viewmodel.element;
                if (element && element.parentNode) {
                    dom.replace(item.placeholder, element);
                }
                item.renderred = false;
            }
        }

        private _renderImages() {
            Scheduler.schedule(() => {
                this._unloadedImages.slice().forEach(options => {
                    if (this._shouldRenderImage(options)) {
                        util.removeArrayItem(this._unloadedImages, options);
                    }
                });
            });
        }

        private _shouldRenderImage(options: { img: HTMLImageElement; src: string }) {
            var img = options.img;
            var src = options.src;
            if (!document.body.contains(img)) {
                return false;
            }

            var imgRect = img.getBoundingClientRect();
            var bodyRect = document.body.getBoundingClientRect();
            if (imgRect.left >= 0 && imgRect.right <= bodyRect.width && imgRect.top >= 0 && imgRect.bottom <= bodyRect.height) {
                img.setAttribute('src', src);
                return true;
            }
            return false;
        }

        private _checkScroller() {
            if (this.layout === ListView.Layout.horizental) {
                this._currScrollPosition = this._itemContainer.scrollLeft;
            }
            else if (this.layout === ListView.Layout.virtical) {
                this._currScrollPosition = this._itemContainer.scrollTop;
            }
            else {
                return this._pendingScroll = null;
            }

            if (this._currScrollPosition !== this._lastScrollPosition) {
                this._pendingScroll = util.requestAnimationFrame(() => this._checkScroller());
                this._isScrollForward = this._lastScrollPosition > this._currScrollPosition;
                this._lastScrollPosition = this._currScrollPosition;

                this._renderItems();
                this.$emit('scroll', this._currScrollPosition);
            }
            else {
                this._pendingScroll = null;
            }
        }

        private _attachEvents() {
            this._onScrollHandler = (e: UIEvent) => {
                if (!this._pendingScroll) {
                    this._checkScroller();
                }
            };
            this._onResizeHandler = (e: UIEvent) => {
                this._measureSize();
                this._renderItems();
            };

            this._itemContainer.addEventListener('scroll', this._onScrollHandler, false);
            this._itemContainer.addEventListener('touchmove', this._onScrollHandler, false);
            window.addEventListener('resize', this._onResizeHandler, false);
        }

        private _detachEvents() {
            this._itemContainer.removeEventListener('scroll', this._onScrollHandler, false);
            this._itemContainer.removeEventListener('touchmove', this._onScrollHandler, false);
            window.removeEventListener('resize', this._onResizeHandler, false);
        }
    }

    var initialized: boolean;
    function initListViewLayoutClass() {
        if (initialized) {
            return;
        }

        dom.addCSSRule({
            '.list-view-virtical': {
                'display': '-webkit-flex',
                ' display': 'flex',
                'flex-direction': 'column'
            },
            '.list-view-horizental': {
                'display': '-webkit-flex',
                ' display': 'flex',
                'flex-direction': 'row'
            },
            '.list-view .item-container': {
                '-webkit-overflow-scrolling': 'touch'
            },
            '.list-view-virtical .item-container': {
                'overflow-x': 'hidden',
                'overflow-y': 'auto'
            },
            '.list-view-horizental .item-container': {
                'overflow-x': 'auto',
                'overflow-y': 'hidden'
            }
        });
        initialized = true;
    }
}
