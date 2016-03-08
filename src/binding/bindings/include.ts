/// <reference path="../binding" />
/// <reference path="../../template/loader" />
/// <reference path="../../template/compiler" />
/// <reference path="../../config/config" />
/// <reference path="../../promise/promise" />

drunk.Binding.register("include", {

    _unbind: null,
    _url: null,
    _elements: null,

    update(url: string) {
        if (!this._isActived || (url && url === this._url)) {
            return;
        }

        this._url = url;

        if (this._elements) {
            drunk.dom.remove(this._elements).then(this._removeBind.bind(this));
        }

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
        if (this._unbind) {
            this._unbind();
            this._unbind = null;
        }
        this._elements = null;
    },

    release() {
        this._unbind();
        this._url = null;
    }
});
