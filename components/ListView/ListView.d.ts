/// <reference path="../../build/drunk.d.ts" />
declare namespace drunk {
    import Component = drunk.Component;
    class ListView extends Component {
        static Layout: {
            virtical: string;
            horizental: string;
        };
        template: string;
        layout: string;
        itemDataSource: any[];
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
        private _renderVisibleItemsJob;
        private _hideItemsJob;
        private _hideTimerId;
        constructor();
        $mount(viewportElement: HTMLElement, owner: Component, placeholder: HTMLElement): void;
        $release(): void;
        private _updateScrollPosition();
        private _measureSize();
        private _createItemPlaceholder();
        private _updateItems();
        private _getItem(itemData);
        private _releaseItems(unrealizedItems);
        private _renderItems();
        private _renderVisibleItems();
        private _renderHiddenItems();
        private _showItemElement(item);
        private _showItemPlaceholder(item);
        private _checkScroller();
        private _attachEvents();
        private _detachEvents();
    }
}
