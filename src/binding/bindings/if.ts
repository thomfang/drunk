/// <reference path="../binding.ts" />
/// <reference path="../../util/dom.ts" />
/// <reference path="../../template/compiler.ts" />

drunk.Binding.register("if", {

    isTerminal: true,
    priority: drunk.Binding.Priority.aboveNormal + 2,

    init() {
        this._flagNode = document.createComment("<if: " + this.expression + ' />');
        this._bind = drunk.Template.compile(this.element);
        this._inDocument = false;

        drunk.dom.replace(this._flagNode, this.element);
        drunk.Binding.setWeakRef(this._flagNode, this);
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

        this._clonedElement = this.element.cloneNode(true);
        drunk.dom.replace(this._clonedElement, this._flagNode);
        drunk.Binding.setWeakRef(this._clonedElement, this);

        this._unbind = this._bind(this.viewModel, this._clonedElement);
        this._inDocument = true;
    },

    removeFromDocument() {
        if (!this._inDocument || !this._unbind) {
            return;
        }

        this._unbind();

        drunk.dom.after(this._flagNode, this._clonedElement);
        drunk.dom.remove(this._clonedElement);
        drunk.Binding.removeWeakRef(this._clonedElement, this);

        this._unbind = null;
        this._clonedElement = null;
        this._inDocument = false;

    },

    release() {
        this.removeFromDocument();
        drunk.dom.remove(this._flagNode);
        drunk.Binding.removeWeakRef(this._flagNode, this);
        this._flagNode = this._bind = null;
    }
});
