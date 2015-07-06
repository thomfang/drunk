/// <reference path="../binding" />
/// <reference path="../../util/elem" />

module drunk {

    Binding.define("class", {
        
        update(data: any) {
            let elem = this.element;

            if (Array.isArray(data)) {
                let classMap = {};
                let oldValue = this.oldValue;

                if (oldValue) {
                    oldValue.forEach(name => {
                        if (data.indexOf(name) === -1) {
                            elementUtil.removeClass(elem, name);
                        }
                        else {
                            classMap[name] = true;
                        }
                    });
                }

                data.forEach(name => {
                    if (!classMap[name]) {
                        elementUtil.addClass(elem, name);
                    }
                });

                this.oldValue = data;
            }
            else if (data && typeof data === 'object') {
                Object.keys(data).forEach(name => {
                    if (data[name]) {
                        elementUtil.addClass(elem, name);
                    }
                    else {
                        elementUtil.removeClass(elem, name);
                    }
                });
            }
            else if (typeof data === 'string' && (data = data.trim()) !== this.oldValue) {
                if (this.oldValue) {
                    elementUtil.removeClass(elem, this.oldValue);
                }

                this.oldValue = data;

                if (data) {
                    elementUtil.addClass(elem, data);
                }
            }
        }
    });
}