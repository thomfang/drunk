/// <reference path="../binding.ts" />
/// <reference path="../../util/dom.ts" />

namespace drunk {

    import dom = drunk.dom;
    import Binding = drunk.Binding;

    @binding("class")
    class ClassBinding extends Binding implements IBindingDefinition {

        private _oldClass: any;

        update(data: any) {
            let elem = this.element;

            if (Array.isArray(data)) {
                this._toggleClassList(data);
            }
            else if (data && typeof data === 'object') {
                this._setClassByMap(data);
            }
            else if (typeof data === 'string' && (data = data.trim()) !== this._oldClass) {
                this._toggleClassString(data);
            }
        }

        release() {
            this._oldClass = null;
        }

        private _toggleClassList(classList: string[]) {
            let classMap = {};
            let oldClass = this._oldClass;

            if (oldClass) {
                oldClass.forEach(name => {
                    if (classList.indexOf(name) === -1) {
                        dom.removeClass(this.element, name);
                    }
                    else {
                        classMap[name] = true;
                    }
                });
            }

            classList.forEach(name => {
                if (!classMap[name]) {
                    dom.addClass(this.element, name);
                }
            });

            this._oldClass = classList;
        }

        private _setClassByMap(classMap: { [name: string]: boolean }) {
            Object.keys(classMap).forEach(name => {
                if (classMap[name]) {
                    dom.addClass(this.element, name);
                }
                else {
                    dom.removeClass(this.element, name);
                }
            });
        }

        private _toggleClassString(str: string) {
            if (this._oldClass) {
                dom.removeClass(this.element, this._oldClass);
            }

            this._oldClass = str;

            if (str) {
                dom.addClass(this.element, str);
            }
        }
    }
}
