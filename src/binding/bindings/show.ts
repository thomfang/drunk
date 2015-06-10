/// <reference path="../binding" />
/// <reference path="./action" />

/**
 * 切换元素显示隐藏,和drunk-if的效果相似,只是在具有多个绑定的情况下if的性能更好,反之是show的性能更好
 * @class drunk-show
 * @constructor
 * @show
 * @example
 *      <html>
 *          <section>
 *               <p drunk-show="currtab === 'a'">A</p>
 *               <p drunk-show="currtab === 'b'">B</p>
 *               <p drunk-show="currtab === 'c'">C</p>
 * 
 *               <p>选中显示某个元素</p>
 *               <select drunk-model="currtab">
 *                  <option value="a">A</option>
 *                  <option value="b">B</option>
 *                  <option value="c">C</option>
 *               </select>
 *          </section>
 *      </html>
 *      <script>
 *       var myView = new drunk.Component();
 *       myView.mount(document.querySelector("section"));
 *      </script>
 */
module drunk {

    Binding.register("show", {

        update(isVisible: boolean) {
            var style = this.element.style;

            if (!isVisible && style.display !== 'none') {
                style.display = 'none';
            }
            else if (isVisible && style.display === 'none') {
                style.display = '';
            }
        }
    });

}