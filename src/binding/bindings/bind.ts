/// <reference path="../binding" />

/**
 * 数据单向绑定,根据标签替换其innerHTML|innerText|value等
 * @class drunk-bind
 * @constructor
 * @show
 * @example
        <html>
            <section>
                <p>
                    输入绑定的内容:<input type="text" drunk-model="text" />
                </p>
                <p>
                    绑定在span标签上:<span drunk-bind="text"></span>
                </p>
                <p>
                    绑定在textarea标签上:<textarea drunk-bind="text"></textarea>
                </p>
            </section>
        </html>
        
        <script>
            var drunk = esun.use("drunk");
            new drunk.Component().$mount(document.querySelector("section"));
        </script>
 */
module drunk {

    Binding.register("bind", {

        update(newValue: any) {
            newValue = newValue == null ? '' : newValue;

            var el = this.element;

            if (el.nodeType === 3) {
                el.nodeValue = newValue;
            }
            else if (el.nodeType === 1) {
                switch (el.tagName.toLowerCase()) {
                    case "input":
                    case "textarea":
                    case "select":
                        el.value = newValue;
                        break;
                    default:
                        el.innerHTML = newValue;
                }
            }
        }
    });
}
