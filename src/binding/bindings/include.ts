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

        let promiseList = [];

        if (this._elements) {
            promiseList.push(drunk.dom.remove(this._elements).then(this._removeBind.bind(this)));
        }

        if (url) {
            promiseList.push(drunk.Template.renderFragment(url, null, true).then(this._createBinding.bind(this)));
        }
        
        if (promiseList.length) {
            return drunk.Promise.all(promiseList);
        }
    },

    _createBinding(fragment: Node) {
        this._elements = drunk.util.toArray(fragment.childNodes);
        this._elements.forEach(el => this.element.appendChild(el));
        
        let result = drunk.Template.compile(this._elements)(this.viewModel, this._elements);
        this._unbind = result.unbind;
        
        return result.promise;
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
