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
declare namespace drunk {
    import Component = drunk.Component;
    /**
     * ListView
     */
    class ListView extends Component {
        static Layout: {
            virtical: string;
            horizental: string;
        };
        template: string;
        /** 布局方向 */
        layout: string;
        /** 渲染的数据源 */
        itemDataSource: any[];
        /** 定位到第几个item */
        scrollToItem: number;
        private _owner;
        private _inited;
        private _isFirstRender;
        private _items;
        private _itemsMap;
        private _bind;
        private _unbinds;
        private _itemSize;
        private _itemContainer;
        private _itemTemplate;
        private _itemContainerSize;
        private _headerSize;
        private _footerSize;
        private _headerContainer;
        private _footerContainer;
        private _unloadedImages;
        private _beginOffset;
        private _renderCount;
        private _visibleItemCount;
        private _prefetchCount;
        private _prefetchPage;
        private _currScrollPosition;
        private _lastScrollPosition;
        private _isScrollForward;
        private _pendingScroll;
        private _onScrollHandler;
        private _onResizeHandler;
        private _renderImageJob;
        private _renderVisibleItemsJob;
        private _renderHiddenItemsPromise;
        constructor();
        /**
         * @override
         */
        $mount(viewportElement: HTMLElement, owner: Component, placeholder: HTMLElement): void;
        /**
         * @override
         */
        $release(): void;
        /**
         * 滚动到指定位置
         */
        private _updateScrollPosition();
        /**
         * 计算Listview和每个item的宽高
         */
        private _measureSize();
        /**
         * 为一个item创建点位标签
         */
        private _createItemPlaceholder();
        /**
         * 更新item
         */
        private _updateItems();
        private _getItem(itemData);
        private _releaseItems(unrealizedItems);
        private _renderItems();
        private _renderVisibleItems();
        private _renderHiddenItems();
        private _renderVisibleItemImpl(item);
        private _renderHiddenItemImpl(item);
        private _renderImages();
        private _shouldRenderImage(options);
        private _checkScroller();
        private _attachEvents();
        private _detachEvents();
    }
}
