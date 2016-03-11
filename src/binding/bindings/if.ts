/// <reference path="../binding.ts" />
/// <reference path="../../util/dom.ts" />
/// <reference path="../../template/compiler.ts" />

drunk.Binding.register("if", {

    isTerminal: true,
    priority: drunk.Binding.Priority.aboveNormal + 2,

    init() {
        this._headNode = document.createComment("<if>: " + this.expression);
        this._tailNode = document.createComment("</if>: " + this.expression);
        this._bind = drunk.Template.compile(this.element);
        this._inDocument = false;

        drunk.dom.replace(this._headNode, this.element);
        drunk.dom.after(this._tailNode, this._headNode);

        drunk.Binding.setWeakRef(this._headNode, this);
        drunk.Binding.setWeakRef(this._tailNode, this);
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
        drunk.dom.after(this._tmpElement, this._headNode);
        drunk.Binding.setWeakRef(this._tmpElement, this);

        this._unbind = this._bind(this.viewModel, this._tmpElement);
        this._inDocument = true;
    },

    removeFromDocument() {
        if (!this._inDocument || !this._unbind) {
            return;
        }

        this._unbind();

        drunk.dom.remove(this._tmpElement);
        drunk.Binding.removeWeakRef(this._tmpElement, this);

        this._unbind = null;
        this._tmpElement = null;
        this._inDocument = false;

    },

    release() {
        this.removeFromDocument();

        this._headNode.parentNode.removeChild(this._headNode);
        this._tailNode.parentNode.removeChild(this._tailNode);
        
        drunk.Binding.removeWeakRef(this._headNode, this);
        drunk.Binding.removeWeakRef(this._tailNode, this);

        this._headNode = null;
        this._tailNode = null;
        this._bind = null;
    }
});
