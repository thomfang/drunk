/// <reference path="../binding.ts" />
/// <reference path="../../template/loader.ts" />
/// <reference path="../../template/compiler.ts" />
/// <reference path="../../config/config.ts" />
/// <reference path="../../promise/promise.ts" />
/// <reference path="../../util/dom.ts" />

drunk.Binding.register("include", {

    _unbind: null,
    _url: null,
    _elements: null,

    update(url: string) {
        if (!this._isActived || (url && url === this._url)) {
            return;
        }

        this._url = url;
        this._removeBind();

        if (url) {
            drunk.Template.renderFragment(url, null, true).then((fragment) => this._createBinding(fragment));
        }
    },

    _createBinding(fragment: Node) {
        this._elements = drunk.util.toArray(fragment.childNodes);
        this._elements.forEach(el => this.element.appendChild(el));

        this._unbind = drunk.Template.compile(this._elements)(this.viewModel, this._elements);
    },

    _removeBind() {
        if (this._elements) {
            let unbind = this._unbind;
            drunk.dom.remove(this._elements).then(() => {
                unbind();
            });
            this._elements = null;
        }
    },

    release() {
        this._removeBind();
        this._url = this._unbind = null;
    }
});
