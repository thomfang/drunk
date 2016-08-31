/// <reference path="../../build/drunk.d.ts" />
/**
 * <carousel-view item-data-source="{{list}}" interval="2" layout="virtical" auto-slide="false" forward="false">
 *      <img drunk-attr="{src: $item}">
 * </carousel-view>
 */
declare namespace drunk {
    class CarouselView extends Component {
        static Layout: {
            virtical: string;
            horizental: string;
        };
        private static initStyle();
        template: string;
        private $renderList;
        private $x;
        private $y;
        itemDataSource: any[];
        interval: number;
        index: number;
        layout: string;
        autoSlide: boolean;
        forward: boolean;
        private _size;
        private _maxTranslatePercent;
        private _minTranslatePerncet;
        private _startPoint;
        private _moveOffset;
        private _startTranslateX;
        private _startTranslateY;
        private _slideIndex;
        private _isLocked;
        private _initialized;
        private _autoSlideTimer;
        init(): void;
        $mount(element: HTMLDivElement, viewModel: Component, placehodler: HTMLElement): void;
        touchBegin(event: TouchEvent): void;
        touchMove(event: TouchEvent): void;
        touchEnd(event: TouchEvent): void;
        transitionEnd(element: HTMLElement): void;
        private _translate(index, transition?);
        private _startAutoSlide();
        private _translateNext(forward);
        private _clamp(value);
    }
}
