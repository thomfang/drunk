/// <reference path="../binding.ts" />
/// <reference path="../../util/dom.ts" />

namespace drunk {

    import dom = drunk.dom;
    import Binding = drunk.Binding;

    type ClassMap = { [name: string]: boolean };

    @binding("class")
    class ClassBinding extends Binding implements IBindingDefinition {

        private _oldClass: any;

        update(data: string | ClassMap | string[]) {
            let elem = this.element;

            if (Array.isArray(data)) {
                this._toggleClassList(data as string[]);
            }
            else if (data && typeof data === 'object') {
                this._toggleClassMap(data as ClassMap);
            }
            else if (typeof data === 'string' && (data = (data as string).trim()) !== this._oldClass) {
                this._toggleClassString(data as string);
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

        private _toggleClassMap(classMap: { [name: string]: boolean }) {
            Object.keys(classMap).forEach(name => {
                if (classMap[name]) {
                    dom.addClass(this.element, name);
                }
                else {
                    dom.removeClass(this.element, name);
                }
            });
        }

        private _toggleClassString(newClass: string) {
            if (this._oldClass) {
                dom.removeClass(this.element, this._oldClass);
            }

            this._oldClass = newClass;

            if (newClass) {
                dom.addClass(this.element, newClass);
            }
        }
    }
}
