/// <reference path="../binding" />
/// <reference path="../../util/dom" />

module drunk {

    Binding.register("class", {
        
        update(data: any) {
            let elem = this.element;

            if (Array.isArray(data)) {
                let classMap = {};
                let oldValue = this.oldValue;

                if (oldValue) {
                    oldValue.forEach(name => {
                        if (data.indexOf(name) === -1) {
                            dom.removeClass(elem, name);
                        }
                        else {
                            classMap[name] = true;
                        }
                    });
                }

                data.forEach(name => {
                    if (!classMap[name]) {
                        dom.addClass(elem, name);
                    }
                });

                this.oldValue = data;
            }
            else if (data && typeof data === 'object') {
                Object.keys(data).forEach(name => {
                    if (data[name]) {
                        dom.addClass(elem, name);
                    }
                    else {
                        dom.removeClass(elem, name);
                    }
                });
            }
            else if (typeof data === 'string' && (data = data.trim()) !== this.oldValue) {
                if (this.oldValue) {
                    dom.removeClass(elem, this.oldValue);
                }

                this.oldValue = data;

                if (data) {
                    dom.addClass(elem, data);
                }
            }
        }
    });
}