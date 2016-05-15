/// <reference path="../binding.ts" />
/// <reference path="../../template/loader.ts" />
/// <reference path="../../template/compiler.ts" />
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

        private _url: string;
        private _unbind: Function;
        private _elements: HTMLElement[];
        private _bindPromise: Promise<any>;

        update(url: string) {
            if (!this._isActived || (url && url === this._url)) {
                return;
            }

            this._url = url;
            this._removeBind();

            if (url) {
                return this._bindPromise = Template.renderFragment(url, null, true).then(fragment => {
                    this._createBinding(fragment);
                });
            }
        }

        release() {
            this._removeBind();
            this._url = this._unbind = null;
        }

        private _createBinding(fragment: Node) {
            this._bindPromise = null;
            this._elements = util.toArray(fragment.childNodes);
            this._elements.forEach(el => this.element.appendChild(el));
            this._unbind = Template.compile(this._elements)(this.viewModel, this._elements);
        }

        private _removeBind() {
            if (this._bindPromise) {
                this._bindPromise.cancel();
                this._bindPromise = null;
            }
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
