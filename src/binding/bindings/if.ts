/// <reference path="../binding" />
/// <reference path="../../util/dom" />
/// <reference path="../../template/compiler" />

drunk.Binding.register("if", {

    isTerminal: true,
    priority: drunk.Binding.Priority.aboveNormal + 2,

    init() {
        this._startNode = document.createComment("if: " + this.expression);
        this._endedNode = document.createComment("/if: " + this.expression);
        this._bindExecutor = drunk.Template.compile(this.element);
        this._inDocument = false;

        drunk.dom.replace(this._startNode, this.element);
        drunk.dom.after(this._endedNode, this._startNode);
    },

    update(value) {
        if (!!value) {
            this.addToDocument();
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

        this._unbindExecutor = this._bindExecutor(this.viewModel, this._tmpElement);
        this._inDocument = true;

    },

    removeFromDocument() {
        if (!this._inDocument) {
            return;
        }

        this._unbindExecutor();

        drunk.dom.remove(this._tmpElement);

        this._unbindExecutor = null;
        this._tmpElement = null;
        this._inDocument = false;

    },

    release() {
        this.removeFromDocument();

        drunk.dom.remove(this._startNode);
        drunk.dom.remove(this._endedNode);

        this._startNode = null;
        this._endedNode = null;
        this._bindExecutor = null;
    }
});
