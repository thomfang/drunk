/// <reference path="../binding" />
/// <reference path="../../template/compiler" />
/// <reference path="../../util/elem" />
/// <reference path="../../config/config" />


/**
 * 事件绑定,语法:
 *     * 单个事件
 *              'eventType: expression'  如 'click: visible = !visible'
 *              'eventType: callback()'  如 'click: onclick()'
 *     * 多个事件,使用分号隔开
 *              'eventType: expression; eventType2: callback()' 如  'mousedown: visible = true; mouseup: visible = false'
 *     * 一个事件里多个表达式,使用逗号隔开
 *              'eventType: expression1, callback()' 如 'click: visible = true, onclick()'
 * @class drunk-on
 * @constructor
 * @show
 * @example
         <html>
            <style>
                .over {color: red;}
            </style>
            <section>
                <p drunk-bind="num"></p>
                <!-- 单个事件 -->
                <button drunk-on="click:add()">点我加1</button>
                <!-- 多个事件 -->
                <button
                    drunk-class="{over: isOver}"
                    drunk-on="mouseover: isOver = true; mouseout: mouseleave()">
                    鼠标移动到我身上
                </button>
            </section>
        </html>
        
        <script>
            var myView = new drunk.Component();
            
            myView.add = function () {
                ++this.num;
            };
            myView.mouseleave = function () {
                this.isOver = false;
            };
            
            myView.num = 0;
            myView.mount(document.querySelector("section"));
        </script>
 */
module drunk {

    var reg = {
        semic: /\s*;\s*/,
        statement: /(\w+):\s*(.+)/
    };

    Binding.register("on", {

        init() {
            var exp = this.expression;
            this.events = exp.split(reg.semic).map(str => this.parseEvent(str));
        },

        parseEvent(str: string) {
            var matches = str.match(reg.statement);
            var prefix = config.prefix;

            console.assert(matches !== null,
                "非法的 " + prefix + 'on 绑定表达式, ', str ,'正确的用法如下:\n',
                prefix + 'on="eventType: expression"\n',
                prefix + 'on="eventType: expression; eventType2: callback()"\n',
                prefix + 'on="eventType: callback($event, $el)"\n'
            );

            var self = this;
            var type = matches[1];
            var expr = matches[2];
            var func = parser.parse(expr.trim());

            function handler(e: Event) {
                func.call(null, self.viewModel, e, self.element);
                if (config.debug) {
                    console.log(type + ': ' + expr);
                }
            }

            elementUtil.addListener(this.element, type, handler);

            return {type,  handler};
        },

        release() {
            this.events.forEach((event) => {
                elementUtil.addListener(this.element, event.type, event.handler);
            });
            this.events = null;
        }
    });
}