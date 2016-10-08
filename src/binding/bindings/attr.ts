/// <reference path="../binding.ts" />
/// <reference path="../../util/util.ts" />

namespace drunk {

    import util = drunk.util;
    import Binding = drunk.Binding;

    @binding('attr')
    class AttributeBinding extends Binding implements IBindingDefinition {

        attribute: string;

        update(attributes: string | { [name: string]: any }) {
            if (this.attribute) {
                // 如果有提供指定的属性名
                this._setAttribute(this.attribute, attributes);
            }
            else if (Object.prototype.toString.call(attributes) === '[object Object]') {
                Object.keys(attributes).forEach(name => {
                    this._setAttribute(name, attributes[name]);
                });
            }
        }

        private _setAttribute(name: string, value: string | { [name: string]: any }) {
            if (name === 'style' && value && typeof value != 'string') {
                let props = Object.keys(value).map(prop => `${prop}:${value[prop]}`);
                return this.element.setAttribute('style', props.join(';'));
            }
            if (name === 'src' || name === 'href') {
                value = value == null ? '' : value;
            }
            this.element.setAttribute(name, value);
        }
    }
}

