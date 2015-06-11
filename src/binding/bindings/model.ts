/// <reference path="../binding" />
/// <reference path="../../util/elem" />

/**
 * 数据双向绑定,只作用于输入控件,支持的控件有:
 *      * input (text|tel|number|checkbox|radio等)
 *      * textarea
 *      * select
 * @class drunk-model
 * @constructor
 * @show
 * @example
        <html>
            <section>
                <label for="exampleInput">选择一个日期:</label>
                <input type="date" id="exampleInput" name="input" drunk-model="time" placeholder="yyyy-MM-dd"
                min="2015-05-01" max="2015-12-31" />
                <p>选中的日期:<span drunk-bind="time|date:'YYYY-MM-DD'"></span></p>
            </section>
        </html>
        
        <script>
            var myView = new drunk.Component();
            myView.mount(document.querySelector("section"));
            myView.time = Date.now();
        </script>
 */
module drunk {

    Binding.define("model", {

        init() {
            var tag = this.element.tagName.toLowerCase();
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
            elementUtil.addListener(this.element, this._changedEvent, this._changedHandler);
        },

        initInput() {
            var type = this.element.type;
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
        },

        initCheckbox() {
            this._changedEvent = "change";
            this.__updateView = setCheckboxValue;
            this.__getValue = getCheckboxValue;
        },

        initRadio() {
            this._changedEvent = "change";
            this.__updateView = setRadioValue;
            this.__getValue = getCommonValue;
        },

        initSelect() {
            this._changedEvent = "change";
            this.__updateView = setCommonValue;
            this.__getValue = getCommonValue;
        },

        initTextarea() {
            this._changedEvent = "input";
            this.__updateView = setCommonValue;
            this.__getValue = getCommonValue;
        },

        initCommon() {
            this._changedEvent = "change";
            this.__updateView = setCommonValue;
            this.__getValue = getCommonValue;
        },

        update(value) {
            this.__updateView(value);
        },

        release() {
            elementUtil.removeListener(this.element, this._changedEvent, this._changedHandler);
            this.element = this._changedHandler = null;
        },

        _changedHandler() {
            this.setValue(this.__getValue(), true);
        }

    });

    function setCheckboxValue(newValue) {
        this.element.checked = !!newValue;
    }

    function getCheckboxValue() {
        return !!this.element.checked;
    }

    function setRadioValue(newValue) {
        this.element.checked = this.element.value == newValue;
    }

    function setCommonValue(newValue) {
        newValue = newValue == null ? '' : newValue;
        this.element.value = newValue;
    }

    function getCommonValue() {
        return this.element.value;
    }

}