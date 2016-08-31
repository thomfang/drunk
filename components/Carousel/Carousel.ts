/// <reference path="../../build/drunk.d.ts" />

/**
 * <carousel-view item-data-source="{{list}}" interval="2" layout="virtical" auto-slide="false" forward="false">
 *      <img drunk-attr="{src: $item}">
 * </carousel-view>
 */

namespace drunk {

    import dom = drunk.dom;
    import util = drunk.util;

    const HORIZENTAL = 'horizental';
    const VIRTICAL = 'virtical';

    var isInitialized = false;

    @component('carousel-view')
    export class CarouselView extends Component {

        public static Layout = {
            virtical: VIRTICAL,
            horizental: HORIZENTAL
        }

        private static initStyle() {
            if (isInitialized) {
                return;
            }

            dom.addCSSRule({
                '.carousel-view .scroller': {
                    'position': 'relative',
                    'width': '100%',
                    'height': '100%'
                },
                '.carousel-view .container': {
                    'position': 'absolute',
                    'width': '100%',
                    'height': '100%'
                },
                '.carousel-view .container.transition': {
                    'transition': 'all 0.4s cubic-bezier(0, 0.99, 0.58, 1)'
                }
            });

            isInitialized = true;
        }

        template = `<div class="carousel-view" ${config.prefix}on="touchstart:touchBegin($event);touchmove:touchMove($event);touchend:touchEnd($event)">
                      <div class="scroller">
                        <div class="container"
                             style="{{layout == 'virtical' ? 'top' : 'left'}}:{{($index - 1) * 100}}%;
                             -webkit-transform:translate({{$x}}%,{{$y}}%);
                             transform:translate({{$x}}%,{{$y}}%);"
                             ${config.prefix}repeat="$item,$index in $renderList"
                             ${config.prefix}on="transitionend:transitionEnd($el); webkitTransitionEnd:transitionEnd($el)">
                        </div>
                      </div>
                    </div>`

        private $renderList: any[];
        private $x: number = 0;
        private $y: number = 0;

        itemDataSource: any[];
        interval: number = 3;
        index: number = 0;
        layout = HORIZENTAL;
        autoSlide: boolean = true;
        forward: boolean = true;

        // 容器的大小
        private _size: { width: number; height: number };

        private _maxTranslatePercent: number;
        private _minTranslatePerncet: number;

        private _startPoint: { x: number; y: number };
        private _moveOffset: number;
        private _startTranslateX: number;
        private _startTranslateY: number;
        private _slideIndex: number = 0;

        private _isLocked: boolean;
        private _initialized: boolean;

        private _autoSlideTimer: number;

        init() {
            this.$watch('itemDataSource', (list: any[]) => {
                list = list || [];
                if (list && list.length > 1) {
                    this.$renderList = [list[list.length - 1], ...list, list[0]];
                    this._maxTranslatePercent = 100;
                    this._minTranslatePerncet = list.length * -100;
                }
                else {
                    this.$renderList = list.slice();
                    this._maxTranslatePercent = this._minTranslatePerncet = 0;
                }

                if (!this._initialized) {
                    this._translate(this.index);
                }
            });

            this.$watch('index', (newIndex: number, oldIndex: number) => {
                if (this._minTranslatePerncet != null && this._maxTranslatePercent != null && !this._isLocked) {
                    this._slideIndex = newIndex;
                    this._translate(newIndex);
                }
                else {
                    this._isLocked = false;
                }
            });

            this.$watch('autoSlide', (autoSlide: boolean) => {
                if (autoSlide) {
                    this._startAutoSlide();
                }
                else {
                    clearTimeout(this._autoSlideTimer);
                    this._autoSlideTimer = null;
                }
            });

            CarouselView.initStyle();

            let onResize = () => {
                let element = this.element as HTMLElement;
                this._size = {
                    width: element.offsetWidth,
                    height: element.offsetHeight
                };
            };
            window.addEventListener('resize', onResize);

            this.$on(Component.Event.release, () => {
                window.removeEventListener('resize', onResize);
                clearTimeout(this._autoSlideTimer);
                this._autoSlideTimer = null;
            });
        }

        $mount(element: HTMLDivElement, viewModel: Component, placehodler: HTMLElement) {
            var itemTemplate = placehodler.firstElementChild;
            if (!itemTemplate) {
                return console.error('carousel-view: 缺少item模板');
            }

            var container = element.querySelector('.container');
            itemTemplate = itemTemplate.cloneNode(true) as HTMLElement;
            container.appendChild(itemTemplate);

            this._size = { width: element.offsetWidth, height: element.offsetHeight };

            super.$mount(element, viewModel, placehodler);
        }

        touchBegin(event: TouchEvent) {
            if (!this.$renderList || !this.$renderList.length) {
                return;
            }

            if (this._autoSlideTimer) {
                clearTimeout(this._autoSlideTimer);
                this._autoSlideTimer = null;
            }

            let touch = event.touches[0];
            this._startPoint = { x: touch.clientX, y: touch.clientY };
            this._startTranslateX = this.$x;
            this._startTranslateY = this.$y;
        }

        touchMove(event: TouchEvent) {
            if (!this._startPoint) {
                return;
            }

            let touch = event.touches[0];

            if (this.layout === HORIZENTAL) {
                let x = this._moveOffset = touch.clientX - this._startPoint.x;
                let value = this._startTranslateX + (x / this._size.width * 100);
                this.$x = this._clamp(value);
            }
            else if (this.layout === VIRTICAL) {
                let y = this._moveOffset = touch.clientY - this._startPoint.y;
                let value = this._startTranslateY + (y / this._size.height * 100);
                this.$y = this._clamp(value);
            }

            event.preventDefault();
        }

        touchEnd(event: TouchEvent) {
            if (this._moveOffset != null) {
                let abs = Math.abs(this._moveOffset);

                if (abs >= this._size.width * 0.3) {
                    this._translateNext(this._moveOffset < 0);
                }
                else {
                    this._translate(this.index);
                }
            }
            this._startPoint = this._startTranslateX = this._startTranslateY = this._moveOffset = null;
            event.preventDefault();
        }

        transitionEnd(element: HTMLElement) {
            dom.removeClass(element, 'transition');

            if (this._slideIndex !== this.index) {
                this._slideIndex = this.index;
                this._translate(this.index, false);
            }

            if (this.autoSlide) {
                this._startAutoSlide();
            }
        }

        private _translate(index: number, transition: boolean = true) {
            this._initialized = true;

            if (this._autoSlideTimer) {
                clearTimeout(this._autoSlideTimer);
                this._autoSlideTimer = null;
            }

            if (this.layout === HORIZENTAL) {
                this.$y = 0;
                this.$x = this._clamp(index * -100);
            }
            else if (this.layout === VIRTICAL) {
                this.$x = 0;
                this.$y = this._clamp(index * -100);
            }

            if (transition) {
                util.toArray((this.element as HTMLElement).querySelectorAll('.container')).forEach(element => {
                    dom.addClass(element, 'transition');
                });
            }
        }

        private _startAutoSlide() {
            if (this._autoSlideTimer) {
                return;
            }

            this._autoSlideTimer = setTimeout(() => {
                this._autoSlideTimer = null;
                this._translateNext(this.forward);
            }, this.interval * 1000);
        }

        private _translateNext(forward: boolean) {
            this._isLocked = true;

            if (forward) {
                this._slideIndex += 1;
                if (this.index === this.itemDataSource.length - 1) {
                    this.index = 0;
                }
                else {
                    this.index += 1;
                }
            }
            else {
                this._slideIndex -= 1;
                if (this.index === 0) {
                    this.index = this.itemDataSource.length - 1;
                }
                else {
                    this.index -= 1;
                }
            }
            this._translate(this._slideIndex);
        }

        private _clamp(value: number) {
            return Math.max(this._minTranslatePerncet, Math.min(value, this._maxTranslatePercent));
        }

    }
}