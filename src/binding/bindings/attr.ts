/// <reference path="../binding" />
/// <reference path="../../util/util" />

module drunk {
    
    function setAttribute(element: HTMLElement, name: string, value: any) {
        if (name === 'src' || name === 'href') {
            value = value == null ? '' : value;
        }
        element.setAttribute(name, value);
    }
    
    Binding.register('attr', {
        
        update(newValue: any) {
            if (this.attrName) {
                // 如果有提供指定的属性名
                setAttribute(this.element, this.attrName, newValue);
            }
            else if (util.isObject(newValue)) {
                Object.keys(newValue).forEach(name => {
                    setAttribute(this.element, name, newValue[name]);
                });
            }
        }
    });
}