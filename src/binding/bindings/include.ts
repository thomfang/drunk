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
    _replaceNode: false,

    init() {
        this._replaceNode = this.element.getAttribute('replace-node') != null;
        this._headNode = document.createComment('<drunk-include>');
        this._tailNode = document.createComment('</drunk-include>');

        if (this._replaceNode) {
            this.element.appendChild(this._headNode);
            this.element.appendChild(this._tailNode);
            drunk.Binding.setWeakRef(this._headNode, this);
            drunk.Binding.setWeakRef(this._tailNode, this);
        }
        else {
            drunk.dom.replace([this._headNode, this._tailNode], this.element);
        }
    },

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
        this._elements.forEach(el => drunk.dom.before(el, this._tailNode));

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
        drunk.Binding.removeWeakRef(this._headNode, this);
        drunk.Binding.removeWeakRef(this._tailNode, this);

        this._headNode.parentNode.removeChild(this._headNode);
        this._tailNode.parentNode.removeChild(this._tailNode);

        this._removeBind();
        this._url = this._unbind = this._heaNode = this._tailNode = null;
    }
});
