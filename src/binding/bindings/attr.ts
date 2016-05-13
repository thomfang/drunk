/// <reference path="../binding.ts" />
/// <reference path="../../util/util.ts" />

namespace drunk {

    import util = drunk.util;
    import Binding = drunk.Binding;

    @binding('attr')
    class AttributeBinding extends Binding implements IBindingDefinition {

        attrName: string;

        update(newValue: any) {
            if (this.attrName) {
                // 如果有提供指定的属性名
                this._setAttribute(this.attrName, newValue);
            }
            else if (util.isObject(newValue)) {
                Object.keys(newValue).forEach(name => {
                    this._setAttribute(name, newValue[name]);
                });
            }
        }

        private _setAttribute(name: string, value: any) {
            if (name === 'src' || name === 'href') {
                value = value == null ? '' : value;
            }
            this.element.setAttribute(name, value);
        }
    }
}

