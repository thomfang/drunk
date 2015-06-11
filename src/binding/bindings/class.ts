/// <reference path="../binding" />
/// <reference path="../../util/elem" />

/**
 * 元素样式类名绑定
 * @class drunk-class
 * @constructor
 * @show
 * @example
 *       <html>
 *       <style>
 *          .strike {
 *              text-decoration: line-through;
 *           }
 *           .bold {
 *               font-weight: bold;
 *           }
 *           .red {
 *               color: red;
 *           }
 *           .orange {
 *              color: orange;
 *           }
 *       </style>
 *        <section>
 *          <p drunk-class="{strike: deleted, bold: important, red: error}">Map 形式的语法示例</p>
 *          <label>
 *             <input type="checkbox" drunk-model="deleted">
 *             deleted (使用 "strike" 样式)
 *          </label><br>
 *          <label>
 *             <input type="checkbox" drunk-model="important">
 *              important (使用 "bold" 样式)
 *           </label><br>
 *           <label>
 *              <input type="checkbox" drunk-model="error">
 *              error (使用 "red" 样式)
 *           </label>
 *           <hr>
 *           <p drunk-class="style">字符串语法示例</p>
 *           <input type="text" drunk-model="style"
 *                  placeholder="输入: bold strike red" aria-label="输入: bold strike red">
 *           <hr>
 *           <p drunk-class="[style1, style2, style3]">使用数组语法示例</p>
 *           <input drunk-model="style1"
 *                  placeholder="输入: bold, strike or red" aria-label="输入: bold, strike or red"><br>
 *           <input drunk-model="style2"
 *                  placeholder="输入: bold, strike or red" aria-label="输入: bold, strike or red 2"><br>
 *           <input drunk-model="style3"
 *                  placeholder="输入: bold, strike or red" aria-label="输入: bold, strike or red 3"><br>
 *           <hr>
 *        </section>
 *       </html>
 *       <script>
 *       new drunk.Component().mount(document.querySelector("section"));
 *       </script>
 */
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