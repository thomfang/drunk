/// <reference path="../binding" />
/// <reference path="../../util/dom" />

module drunk {
    drunk.Binding.register("class", {

        _oldValue: null,

        update(data: any) {
            let elem = this.element;

            if (Array.isArray(data)) {
                let classMap = {};
                let oldValue = this._oldValue;

                if (oldValue) {
                    oldValue.forEach(name => {
                        if (data.indexOf(name) === -1) {
                            drunk.dom.removeClass(elem, name);
                        }
                        else {
                            classMap[name] = true;
                        }
                    });
                }

                data.forEach(name => {
                    if (!classMap[name]) {
                        drunk.dom.addClass(elem, name);
                    }
                });

                this._oldValue = data;
            }
            else if (data && typeof data === 'object') {
                Object.keys(data).forEach(name => {
                    if (data[name]) {
                        drunk.dom.addClass(elem, name);
                    }
                    else {
                        drunk.dom.removeClass(elem, name);
                    }
                });
            }
            else if (typeof data === 'string' && (data = data.trim()) !== this._oldValue) {
                if (this._oldValue) {
                    drunk.dom.removeClass(elem, this._oldValue);
                }

                this._oldValue = data;

                if (data) {
                    drunk.dom.addClass(elem, data);
                }
            }
        },

        release() {
            this._oldValue = null;
        }
    });
}
