/// <reference path="../binding.ts" />
/// <reference path="../../util/dom.ts" />

drunk.Binding.register("bind", {

    update(newValue: any) {
        newValue = newValue == null ? '' : newValue;

        let el = this.element;

        if (el.nodeType === 3) {
            el.nodeValue = newValue;
        }
        else if (el.nodeType === 1) {
            switch (el.tagName.toLowerCase()) {
                case "input":
                case "textarea":
                case "select":
                    el.value = newValue;
                    break;
                default:
                    drunk.dom.html(el, newValue);
            }
        }
    }
});

