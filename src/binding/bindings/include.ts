/// <reference path="../binding.ts" />
/// <reference path="../../template/loader.ts" />
/// <reference path="../../template/compiler.ts" />
/// <reference path="../../config/config.ts" />
/// <reference path="../../promise/promise.ts" />
/// <reference path="../../util/dom.ts" />

namespace drunk {
    
    import dom = drunk.dom;
    import util = drunk.util;
    import Template = drunk.Template;
    import Binding = drunk.Binding;

    @binding("include")
    class IncludeBinding extends Binding implements IBindingDefinition {

        static priority = Binding.Priority.low + 1;

        _url: string;
        _unbind: Function;
        _elements: HTMLElement[];

        update(url: string) {
            if (!this._isActived || (url && url === this._url)) {
                return;
            }

            this._url = url;
            this._removeBind();

            if (url) {
                return Template.renderFragment(url, null, true).then((fragment) => this._createBinding(fragment));
            }
        }

        release() {
            this._removeBind();
            this._url = this._unbind = null;
        }

        private _createBinding(fragment: Node) {
            this._elements = util.toArray(fragment.childNodes);
            this._elements.forEach(el => this.element.appendChild(el));
            this._unbind = Template.compile(this._elements)(this.viewModel, this._elements);
        }

        private _removeBind() {
            if (this._elements) {
                let unbind = this._unbind;
                dom.remove(this._elements).then(() => {
                    unbind();
                });
                this._elements = null;
            }
        }
    }
}
