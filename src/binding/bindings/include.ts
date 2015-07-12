/// <reference path="../binding" />
/// <reference path="../../template/loader" />
/// <reference path="../../template/compiler" />

drunk.Binding.register("include", {

    _unbindExecutor: null,
    _url: null,

    update(url: string) {
        if (!this._isActived || (url && url === this._url)) {
            return;
        }

        this._unbind();
        this._url = url;

        drunk.dom.remove(drunk.util.toArray(this.element.childNodes));

        if (url) {
            drunk.Template.load(url).then(this._createBinding.bind(this));
        }
    },

    _createBinding(template: string) {
        if (!this._isActived) {
            return;
        }

        drunk.dom.html(this.element, template);

        let nodes = drunk.util.toArray(this.element.childNodes);
        this._unbindExecutor = drunk.Template.compile(nodes)(this.viewModel, nodes);
    },

    _unbind() {
        if (this._unbindExecutor) {
            this._unbindExecutor();
            this._unbindExecutor = null;
        }
    },

    release() {
        this._unbind();
        this._url = null;
    }
});