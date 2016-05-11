/// <reference path="../binding.ts" />
/// <reference path="../../util/dom.ts" />

namespace drunk {

    @binding("model")
    class ModelBinding extends Binding implements IBindingDefinition {
        
        private _changedEvent: string;
        private _updateView: Function;
        private _getValue: Function;

        init() {
            let tag = this.element.tagName.toLowerCase();
            switch (tag) {
                case "input":
                    this.initInput();
                    break;
                case "select":
                    this.initSelect();
                    break;
                case "textarea":
                    this.initTextarea();
                    break;
            }

            this._changedHandler = this._changedHandler.bind(this);
            dom.on(this.element, this._changedEvent, this._changedHandler);
        }

        initInput() {
            let type = this.element.type;
            switch (type) {
                case "checkbox":
                    this.initCheckbox();
                    break;
                case "radio":
                    this.initRadio();
                    break;
                case "text":
                case "tel":
                case "email":
                case "password":
                case "search":
                    this.initTextarea();
                    break;
                default:
                    this.initCommon();
            }
        }

        initCheckbox() {
            this._changedEvent = "change";
            this._updateView = setCheckboxValue;
            this._getValue = getCheckboxValue;
        }

        initRadio() {
            this._changedEvent = "change";
            this._updateView = setRadioValue;
            this._getValue = getCommonValue;
        }

        initSelect() {
            this._changedEvent = "change";
            this._updateView = setSelectValue;
            this._getValue = getSelectValue;
        }

        initTextarea() {
            this._changedEvent = "input";
            this._updateView = setCommonValue;
            this._getValue = getCommonValue;
        }

        initCommon() {
            this._changedEvent = "change";
            this._updateView = setCommonValue;
            this._getValue = getCommonValue;
        }

        update(newValue, oldValue) {
            this._updateView(newValue);
        }

        release() {
            this._changedHandler = null;
            dom.off(this.element, this._changedEvent, this._changedHandler);
        }

        _changedHandler() {
            this.$setValue(this._getValue());
        }

    }

    function setCheckboxValue(newValue) {
        this.element.checked = !!newValue;
    }

    function getCheckboxValue() {
        return !!this.element.checked;
    }

    function setRadioValue(newValue) {
        this.element.checked = this.element.value == newValue;
    }

    function getSelectValue() {
        if (this.element.options) {
            for (let i = 0, option; option = this.element.options[i]; i++) {
                if (option.selected) {
                    return option.value;
                }
            }
        }
        return this.element.value;
    }

    function setSelectValue(newValue) {
        if (newValue == null) {
            this.element.value = '';
            drunk.util.toArray(this.element.options).forEach(option => option.selected = false);
        }
        else {
            for (let i = 0, option; option = this.element.options[i]; i++) {
                if (option.value == newValue) {
                    option.selected = true;
                    return;
                }
            }

            let option = document.createElement('option');
            option.textContent = option.value = newValue;
            this.element.add(option);
            option.selected = true;
        }
    }

    function setCommonValue(newValue) {
        newValue = newValue == null ? '' : newValue;
        this.element.value = newValue;
    }

    function getCommonValue() {
        return this.element.value;
    }
}