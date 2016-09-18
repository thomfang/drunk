/// <reference path="../../build/drunk.d.ts" />

/**
 * <div drunk-lazy-load-scroller>
 *      <img drunk-repeat="img in imgs" drunk-lazy-load="img" lazy-load-default="http://www.aaa.com/a.jpg">
 * </div>
 */
namespace drunk {

    import util = drunk.util;
    import binding = drunk.binding;
    import Binding = drunk.Binding;

    var unloadedImages: { img: HTMLImageElement; src: string }[] = [];

    @binding('lazy-load-scroller')
    class LazyLoadScroller extends Binding {

        init() {
            this.element.addEventListener('scroll', scrollHandler);
        }

        release() {
            this.element.removeEventListener('scroll', scrollHandler);
        }
    }

    @binding('lazy-load')
    class LazyLoad extends Binding {

        static priority = Binding.Priority.low;

        private _onerror: IEventListener;
        private _imgOptions: { src: string; img: HTMLImageElement };

        private getDefaultUrl() {
            return this.element.getAttribute('lazy-load-default');
        }

        init() {
            this._onerror = () => {
                if (!this.element) {
                    return;
                }
                let defaultUrl = this.getDefaultUrl();
                if (defaultUrl) {
                    this.element.setAttribute('src', defaultUrl);
                }
            };
            this.element.addEventListener('error', this._onerror);
        }

        update(src: string) {
            if (!src) {
                // 只有src为空字符串时取默认图片路径
                src = this.getDefaultUrl();
            }
            if (src) {
                let options = { src: src, img: this.element };
                // 如果该图片没有在屏幕中可见，把它添加到等待加载的图片队列中
                if (!showImage(options)) {
                    this._imgOptions = options;
                    util.addArrayItem(unloadedImages, options);
                }
            }
            else if (this._imgOptions) {
                // 如果src已经变为空，把原来的添加在队列里的移除
                util.removeArrayItem(unloadedImages, this._imgOptions);
                this._imgOptions = null;
            }
        }

        release() {
            if (this._imgOptions) {
                // 从队列中移除
                util.removeArrayItem(unloadedImages, this._imgOptions);
            }
            this.element.removeEventListener('error', this._onerror);
            this._onerror = this._imgOptions = null;
        }
    }

    function showImage({img, src}: { img: HTMLImageElement; src: string; }) {
        if (!document.body.contains(img)) {
            return false;
        }

        let bodyRect = document.body.getBoundingClientRect();
        let imgRect = img.getBoundingClientRect();

        if (bodyRect.height < imgRect.top || bodyRect.width < imgRect.left) {
            return false;
        }

        img.setAttribute('src', src);
        return true;
    }

    function scrollHandler() {
        if (!unloadedImages.length) {
            return;
        }

        unloadedImages.slice().forEach(img => {
            if (showImage(img)) {
                util.removeArrayItem(unloadedImages, img);
            }
        });
    }

    window.addEventListener('scroll', scrollHandler);
}