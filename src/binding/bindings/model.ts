/// <reference path="../binding.ts" />
/// <reference path="../../util/dom.ts" />

namespace drunk {

    import dom = drunk.dom;
    import util = drunk.util;

    @binding("model")
    class ModelBinding extends Binding implements IBindingDefinition {

        private _changedEvent: string;
        private _updateView: Function;
        private _getValue: Function;

        init() {
            let tag = this.element.tagName.toLowerCase();
            switch (tag) {
                case "input":
                    this.initAsInput();
                    break;
                case "select":
                    this.initAsSelect();
                    break;
                case "textarea":
                    this.initAsTextarea();
                    break;
            }

            this._changedHandler = this._changedHandler.bind(this);
            dom.on(this.element, this._changedEvent, this._changedHandler);
        }

        initAsInput() {
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
                case "url":
                case "password":
                case "search":
                    this.initAsTextarea();
                    break;
                default:
                    this.initCommon();
            }
        }

        initCheckbox() {
            this._changedEvent = "change";
            this._updateView = this._setCheckboxValue;
            this._getValue = this._getCheckboxValue;
        }

        initRadio() {
            this._changedEvent = "change";
            this._updateView = this._setRadioValue;
            this._getValue = this._getCommonControlValue;
        }

        initAsSelect() {
            this._changedEvent = "change";
            this._updateView = this._setSelectValue;
            this._getValue = this._getSelectValue;
        }

        initAsTextarea() {
            this._changedEvent = "input";
            this._updateView = this._setCommonControlValue;
            this._getValue = this._getCommonControlValue;
        }

        initCommon() {
            this._changedEvent = "change";
            this._updateView = this._setCommonControlValue;
            this._getValue = this._getCommonControlValue;
        }

        update(newValue, oldValue) {
            this._updateView(newValue);
        }

        release() {
            this._changedHandler = null;
            dom.off(this.element, this._changedEvent, this._changedHandler);
        }

        private _changedHandler() {
            this.$setValue(this._getValue());
        }

        private _setCheckboxValue(newValue: any) {
            this.element.checked = !!newValue;
        }

        private _getCheckboxValue() {
            return !!this.element.checked;
        }

        private _setRadioValue(newValue: any) {
            this.element.checked = this.element.value == newValue;
        }

        private _getSelectValue() {
            if (this.element.options) {
                for (let i = 0, option; option = this.element.options[i]; i++) {
                    if (option.selected) {
                        return option.value;
                    }
                }
            }
            return this.element.value;
        }

        private _setSelectValue(newValue: string) {
            if (newValue == null) {
                this.element.value = '';
                util.toArray(this.element.options).forEach(option => option.selected = false);
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

        private _setCommonControlValue(newValue: any) {
            newValue = newValue == null ? '' : newValue;
            this.element.value = newValue;
        }
        
        private _getCommonControlValue() {
            return this.element.value;
        }
    }
}