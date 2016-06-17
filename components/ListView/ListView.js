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
var drunk;
(function (drunk) {
    var dom = drunk.dom;
    var Map = drunk.Map;
    var util = drunk.util;
    var Component = drunk.Component;
    var RepeatItem = drunk.RepeatItem;
    var Template = drunk.Template;
    var Promise = drunk.Promise;
    var templateString = "<div class=\"list-view\"><div class=\"header-container\"></div><div class=\"item-container\"></div><div class=\"footer-container\"></div></div>";
    /**
     * ListView
     */
    var ListView = (function (_super) {
        __extends(ListView, _super);
        function ListView() {
            var _this = this;
            _super.call(this);
            this.template = templateString;
            /** 布局方向 */
            this.layout = ListView.Layout.virtical;
            this._isFirstRender = true;
            this._items = [];
            this._itemsMap = new Map();
            this._unbinds = [];
            this._unloadedImages = [];
            this._prefetchPage = 3;
            this._currScrollPosition = 0;
            this.$watch('itemDataSource', function (newValue, oldValue) {
                if (!_this._itemContainer || oldValue === undefined) {
                    return;
                }
                _this._updateItems();
                _this._renderItems();
            }, true);
            this.$watch('scrollToItem', function () {
                _this._updateScrollPosition();
            });
        }
        /**
         * @override
         */
        ListView.prototype.$mount = function (viewportElement, owner, placeholder) {
            var _this = this;
            var header;
            var footer;
            _super.prototype.$mount.call(this, viewportElement, owner, placeholder);
            var wrap = function (nodeList) {
                var wrapper = document.createElement('div');
                util.toArray(nodeList).forEach(function (node) {
                    wrapper.appendChild(node);
                });
                return wrapper;
            };
            util.toArray(placeholder.children).forEach(function (child) {
                var tagName = child.tagName.toLowerCase();
                switch (tagName) {
                    case 'list-view-header':
                        header = wrap(child.childNodes);
                        break;
                    case 'list-view-footer':
                        footer = wrap(child.childNodes);
                        break;
                    case 'list-view-item':
                        _this._itemTemplate = child.firstElementChild;
                        break;
                    default:
                        throw new Error("list-view\u4E2D\u5B58\u5728\u65E0\u6CD5\u8BC6\u522B\u7684\u6807\u7B7E:  " + child.tagName.toLowerCase());
                }
            });
            if (!this._itemTemplate) {
                throw new Error("list-view: \u672A\u627E\u5230list-view-item\u6A21\u677F\u6807\u7B7E");
            }
            this._owner = owner;
            this._bind = Template.compile(this._itemTemplate);
            this._headerContainer = viewportElement.querySelector('.header-container');
            this._itemContainer = viewportElement.querySelector('.item-container');
            this._footerContainer = viewportElement.querySelector('.footer-container');
            if (!this._itemContainer) {
                throw new Error("<list-view>: div.item-container\u5BB9\u5668\u672A\u5728\u6A21\u677F\u4E2D\u63D0\u4F9B");
            }
            if (header) {
                if (!this._headerContainer) {
                    throw new Error("<list-view>: div.header-container\u5BB9\u5668\u672A\u5728\u6A21\u677F\u4E2D\u63D0\u4F9B");
                }
                this._unbinds.push(Template.compile(header)(owner, header));
                this._headerContainer.appendChild(header);
            }
            if (footer) {
                if (!this._footerContainer) {
                    throw new Error("<list-view>: div.footer-container\u5BB9\u5668\u672A\u5728\u6A21\u677F\u4E2D\u63D0\u4F9B");
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
        };
        /**
         * @override
         */
        ListView.prototype.$release = function () {
            this._renderHiddenItemsPromise && this._renderHiddenItemsPromise.cancel();
            this._renderVisibleItemsJob && this._renderVisibleItemsJob.cancel();
            this._detachEvents();
            this._releaseItems(this._items);
            this._unbinds.forEach(function (unbind) { return unbind(); });
            this._itemsMap.clear();
            this._renderHiddenItemsPromise = this._renderVisibleItemsJob = null;
            this._itemTemplate = this._itemContainer = this._headerContainer = this._footerContainer = this._unbinds = this._bind = this._owner = this._itemsMap = null;
            this._onResizeHandler = this._onScrollHandler = this._unloadedImages = null;
            _super.prototype.$release.call(this);
        };
        /**
         * 滚动到指定位置
         */
        ListView.prototype._updateScrollPosition = function () {
            var itemIndex = this.scrollToItem;
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
        };
        /**
         * 计算Listview和每个item的宽高
         */
        ListView.prototype._measureSize = function () {
            var viewport = this.element;
            var itemContainer = this._itemContainer;
            var itemTemplate = this._itemTemplate;
            var uuid = util.uniqueId(this);
            var itemContainerCSSRule;
            var placeholderCSSRule;
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
            var templateStyle = getComputedStyle(itemTemplate, null);
            var itemSize = this._itemSize = {
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
            dom.addCSSRule((_a = {},
                _a[".list-view-" + uuid + " .item-container"] = itemContainerCSSRule,
                _a[".list-view-" + uuid + " .item-container .placeholder"] = placeholderCSSRule,
                _a
            ));
            var _a;
        };
        /**
         * 为一个item创建点位标签
         */
        ListView.prototype._createItemPlaceholder = function () {
            var placeholder = document.createElement('div');
            dom.addClass(placeholder, 'placeholder');
            return placeholder;
        };
        /**
         * 更新item
         */
        ListView.prototype._updateItems = function () {
            var _this = this;
            var itemDataSource = this.itemDataSource;
            var items = this._items;
            if (itemDataSource && itemDataSource.length) {
                this._items = itemDataSource.map(function (itemData, index) {
                    return _this._getItem({
                        $index: index,
                        $item: itemData,
                        $first: index === 0,
                        $last: index === itemDataSource.length - 1,
                        $odd: index % 2 === 0,
                        $even: index % 2 !== 0
                    });
                });
                this._releaseItems(items.filter(function (item) { return !item.isUsed; }));
                this._items.forEach(function (item) { return item.isUsed = false; });
            }
            else {
                this._releaseItems(this._items);
                this._items.length = 0;
            }
        };
        ListView.prototype._getItem = function (itemData) {
            var items = this._itemsMap.get(itemData.$item);
            var item;
            if (items) {
                for (var i = 0; item = items[i]; i++) {
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
                Object.keys(itemData).forEach(function (key) { return item.viewmodel[key] = itemData[key]; });
            }
            item.isUsed = true;
            return item;
        };
        ListView.prototype._releaseItems = function (unrealizedItems) {
            var _this = this;
            unrealizedItems.forEach(function (item) {
                var items = _this._itemsMap.get(item.viewmodel['$item']);
                util.removeArrayItem(items, item);
                if (item.renderred) {
                    dom.remove(item.viewmodel.element);
                }
                if (item.placeholder) {
                    dom.remove(item.placeholder);
                }
                item.viewmodel.$release();
            });
        };
        ListView.prototype._renderItems = function () {
            var _this = this;
            if (!this._itemSize || !this._items.length) {
                return;
            }
            var items = this._items;
            if (!this._inited) {
                var itemElems = this._itemContainer.children;
                var elem_1 = itemElems[0];
                items.forEach(function (item) {
                    if (!elem_1) {
                        _this._itemContainer.appendChild(item.renderred ? item.viewmodel.element : item.placeholder);
                    }
                    else if (elem_1 != item.placeholder && elem_1 != item.viewmodel.element) {
                        dom.before(item.renderred ? item.viewmodel.element : item.placeholder, elem_1);
                    }
                    else if (elem_1) {
                        elem_1 = elem_1.nextElementSibling;
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
                var beginOffset = void 0;
                var prefectch = this._prefetchCount;
                var lastIndex = items.length - 1;
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
        };
        ListView.prototype._renderVisibleItems = function () {
            var _this = this;
            var work = function (jobInfo) {
                var endTime = Date.now() + 100;
                var step = _this._isScrollForward ? -1 : 1;
                for (var index = _this._beginOffset, j = 0; j < _this._renderCount; j++, index += step) {
                    _this._renderVisibleItemImpl(_this._items[index]);
                    if (Date.now() >= endTime && j >= _this._visibleItemCount) {
                        return jobInfo.setWork(work);
                    }
                }
                step = -step;
                for (var index = _this._beginOffset, j = 0; j < _this._visibleItemCount && (_this._isScrollForward ? index < _this._items.length : index >= 0); j++, index += step) {
                    _this._renderVisibleItemImpl(_this._items[index]);
                    if (jobInfo.shouldYield) {
                        return jobInfo.setWork(work);
                    }
                }
                _this._renderVisibleItemsJob = null;
            };
            this._renderVisibleItemsJob = drunk.Scheduler.schedule(work, drunk.Scheduler.Priority.aboveNormal);
        };
        ListView.prototype._renderHiddenItems = function () {
            var _this = this;
            this._renderHiddenItemsPromise = Promise.timeout(500);
            this._renderHiddenItemsPromise.done(function () {
                if (_this._isScrollForward) {
                    for (var i = _this._beginOffset + _this._visibleItemCount + 1, lastIndex = _this._items.length; i < lastIndex; i++) {
                        _this._renderHiddenItemImpl(_this._items[i]);
                    }
                }
                else {
                    for (var i = _this._beginOffset - _this._visibleItemCount - 1; i >= 0; i--) {
                        _this._renderHiddenItemImpl(_this._items[i]);
                    }
                }
                _this._renderHiddenItemsPromise = null;
            });
        };
        ListView.prototype._renderVisibleItemImpl = function (item) {
            var _this = this;
            if (!item.renderred) {
                if (!item.isBinded) {
                    this._bind(item.viewmodel, item.viewmodel.element);
                    util.toArray(item.viewmodel.element.querySelectorAll('img[src]')).forEach(function (img) {
                        if (img.src && img.src.indexOf('#') === -1) {
                            _this._unloadedImages.push({ img: img, src: img.src });
                            img.removeAttribute('src');
                        }
                    });
                    item.isBinded = true;
                }
                dom.replace(item.viewmodel.element, item.placeholder);
                item.renderred = true;
            }
        };
        ListView.prototype._renderHiddenItemImpl = function (item) {
            if (item.renderred) {
                var element = item.viewmodel.element;
                if (element && element.parentNode) {
                    dom.replace(item.placeholder, element);
                }
                item.renderred = false;
            }
        };
        ListView.prototype._renderImages = function () {
            var _this = this;
            drunk.Scheduler.schedule(function () {
                _this._unloadedImages.slice().forEach(function (options) {
                    if (_this._shouldRenderImage(options)) {
                        util.removeArrayItem(_this._unloadedImages, options);
                    }
                });
            });
        };
        ListView.prototype._shouldRenderImage = function (options) {
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
        };
        ListView.prototype._checkScroller = function () {
            var _this = this;
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
                this._pendingScroll = util.requestAnimationFrame(function () { return _this._checkScroller(); });
                this._isScrollForward = this._lastScrollPosition > this._currScrollPosition;
                this._lastScrollPosition = this._currScrollPosition;
                this._renderItems();
                this.$emit('scroll', this._currScrollPosition);
            }
            else {
                this._pendingScroll = null;
            }
        };
        ListView.prototype._attachEvents = function () {
            var _this = this;
            this._onScrollHandler = function (e) {
                if (!_this._pendingScroll) {
                    _this._checkScroller();
                }
            };
            this._onResizeHandler = function (e) {
                _this._measureSize();
                _this._renderItems();
            };
            this._itemContainer.addEventListener('scroll', this._onScrollHandler, false);
            this._itemContainer.addEventListener('touchmove', this._onScrollHandler, false);
            window.addEventListener('resize', this._onResizeHandler, false);
        };
        ListView.prototype._detachEvents = function () {
            this._itemContainer.removeEventListener('scroll', this._onScrollHandler, false);
            this._itemContainer.removeEventListener('touchmove', this._onScrollHandler, false);
            window.removeEventListener('resize', this._onResizeHandler, false);
        };
        ListView.Layout = {
            virtical: 'virtical',
            horizental: 'horizental'
        };
        ListView = __decorate([
            drunk.component('list-view')
        ], ListView);
        return ListView;
    }(Component));
    drunk.ListView = ListView;
    var initialized;
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
})(drunk || (drunk = {}));
//# sourceMappingURL=ListView.js.map