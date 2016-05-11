/// <reference path="../binding.ts" />
/// <reference path="../../util/dom.ts" />
/// <reference path="../../template/compiler.ts" />

namespace drunk {

    import dom = drunk.dom;
    import Template = drunk.Template;
    import Binding = drunk.Binding;

    @binding("if")
    class IfBinding extends Binding implements IBindingDefinition {

        static isTerminal = true;
        static priority = Binding.Priority.aboveNormal + 2;

        private _flagNode: Comment;
        private _bind: Function;
        private _unbind: Function;
        private _inDocument: boolean;
        private _clonedElement: HTMLElement;

        init() {
            this._flagNode = document.createComment("<if: " + this.expression + ' />');
            this._bind = Template.compile(this.element);
            this._inDocument = false;

            dom.replace(this._flagNode, this.element);
            Binding.setWeakRef(this._flagNode, this);
        }

        update(value) {
            if (!!value) {
                return this.addToDocument();
            }
            else {
                this.removeFromDocument();
            }
        }

        addToDocument() {
            if (this._inDocument) {
                return;
            }

            this._clonedElement = this.element.cloneNode(true);
            dom.after(this._clonedElement, this._flagNode);
            Binding.setWeakRef(this._clonedElement, this);

            this._unbind = this._bind(this.viewModel, this._clonedElement);
            this._inDocument = true;
        }

        removeFromDocument() {
            if (!this._inDocument || !this._unbind) {
                return;
            }

            this._unbind();

            dom.remove(this._clonedElement);
            Binding.removeWeakRef(this._clonedElement, this);

            this._unbind = null;
            this._clonedElement = null;
            this._inDocument = false;

        }

        release() {
            this.removeFromDocument();
            dom.remove(this._flagNode);
            Binding.removeWeakRef(this._flagNode, this);
            this._flagNode = this._bind = null;
        }
    }
}
