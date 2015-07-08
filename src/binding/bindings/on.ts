/// <reference path="../binding" />
/// <reference path="../../template/compiler" />
/// <reference path="../../util/dom" />
/// <reference path="../../config/config" />

module drunk {

    let reg = {
        semic: /\s*;\s*/,
        statement: /(\w+):\s*(.+)/
    };

    Binding.register("on", {

        init() {
            let exp = this.expression;
            this.events = exp.split(reg.semic).map(str => this.parseEvent(str));
        },

        parseEvent(str: string) {
            let matches = str.match(reg.statement);
            let prefix = config.prefix;

            console.assert(matches !== null,
                "非法的 " + prefix + 'on 绑定表达式, ', str ,'正确的用法如下:\n',
                prefix + 'on="eventType: expression"\n',
                prefix + 'on="eventType: expression; eventType2: callback()"\n',
                prefix + 'on="eventType: callback($event, $el)"\n'
            );

            let self = this;
            let type = matches[1];
            let expr = matches[2];
            let func = parser.parse(expr.trim());

            function handler(e: Event) {
                if (config.debug) {
                    console.log(type + ': ' + expr);
                }
                func.call(null, self.viewModel, e, self.element);
            }

            dom.on(this.element, type, handler);

            return {type,  handler};
        },

        release() {
            this.events.forEach((event) => {
                dom.off(this.element, event.type, event.handler);
            });
            this.events = null;
        }
    });
}