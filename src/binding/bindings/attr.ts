/// <reference path="../binding" />
/// <reference path="../../util/util" />

/**
 * 元素属性绑定,可以设置元素的attribute类型
 * @class drunk-attr
 * @constructor
 * @show
 * @example
 *       <html>
 *       <div drunk-attr="{style: customStyle}"></div>
 *       </html>
 *       <script>
 *       var myView = new drunk.Component();
 *       myView.mount(document.body);
 *       myView.customStyle = "background:red;width:200px;height:100px;";
 *       </script>
 */
module drunk {
    
    function setAttribute(element: HTMLElement, name: string, value: any) {
        if (name === 'src' || name === 'href') {
            value = value == null ? '' : value;
        }
        element.setAttribute(name, value);
    }
    
    Binding.define('attr', {
        
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