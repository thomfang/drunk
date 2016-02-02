/// <reference path="../binding" />
/// <reference path="../../util/dom" />
/// <reference path="../../template/compiler" />

drunk.Binding.register("if", {

    isTerminal: true,
    priority: drunk.Binding.Priority.aboveNormal + 2,

    init() {
        this._startNode = document.createComment("<if>: " + this.expression);
        this._endedNode = document.createComment("</if>: " + this.expression);
        this._bind = drunk.Template.compile(this.element);
        this._inDocument = false;

        drunk.dom.replace(this._startNode, this.element);
        drunk.dom.after(this._endedNode, this._startNode);
    },

    update(value) {
        if (!!value) {
            return this.addToDocument();
        }
        else {
            this.removeFromDocument();
        }
    },

    addToDocument() {
        if (this._inDocument) {
            return;
        }

        this._tmpElement = this.element.cloneNode(true);
        drunk.dom.after(this._tmpElement, this._startNode);

        let res = this._bind(this.viewModel, this._tmpElement);
        this._unbind = res.unbind;
        this._inDocument = true;
        
        return res.promise;

    },

    removeFromDocument() {
        if (!this._inDocument || !this._unbind) {
            return;
        }

        this._unbind();

        drunk.dom.remove(this._tmpElement);

        this._unbind = null;
        this._tmpElement = null;
        this._inDocument = false;

    },

    release() {
        this.removeFromDocument();

        this._startNode.parentNode.removeChild(this._startNode);
        this._endedNode.parentNode.removeChild(this._endedNode);

        this._startNode = null;
        this._endedNode = null;
        this._bind = null;
    }
});
