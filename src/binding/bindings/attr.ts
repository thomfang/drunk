/// <reference path="../binding" />
/// <reference path="../../util/util" />
    
drunk.Binding.register('attr', {
    
    attrName: null,

    update(newValue: any) {
        if (this.attrName) {
            // 如果有提供指定的属性名
            this._setAttribute(this.attrName, newValue);
        }
        else if (drunk.util.isObject(newValue)) {
            Object.keys(newValue).forEach(name => {
                this._setAttribute(name, newValue[name]);
            });
        }
    },

    _setAttribute(name: string, value: any) {
        if (name === 'src' || name === 'href') {
            value = value == null ? '' : value;
        }
        this.element.setAttribute(name, value);
    }
});