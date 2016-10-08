/// <reference path="../binding.ts" />
/// <reference path="../../util/dom.ts" />
/// <reference path="../../config/config.ts" />

namespace drunk {

    import dom = drunk.dom;
    import util = drunk.util;
    import config = drunk.config;

    const reSemic = /\s*;\s*/;
    const reStatement = /(\w+):\s*(.+)/;
    const reBreakword = /\n+/g;

    const getHelpMessage = () => `正确的用法如下:
        ${config.prefix}on="click: expression"
        ${config.prefix}on="mousedown: expression; mouseup: callback()"
        ${config.prefix}on="click: callback($event, $el)"`;

    @binding("on")
    class EventBinding extends Binding implements IBindingDefinition {

        private _events: { type: string; handler: (e: Event) => void; }[];

        init() {
            var events = [];

            if (this.attribute) {
                let type = this.attribute;
                let handler = this.createHandler(type, this.expression);
                events.push({ type, handler });
            }
            else {
                this.expression.replace(reBreakword, ' ').split(reSemic).forEach(str => {
                    if (str && /\S/.test(str)) {
                        events.push(this.parseEvent(str));
                    }
                });
            }

            this._events = events;
        }

        private parseEvent(str: string) {
            let matches = str.match(reStatement);
            let prefix = config.prefix;

            console.assert(matches !== null, `不合法的"${prefix}on"表达式 ${str}, ${getHelpMessage()}`);

            let type = matches[1];
            let expr = matches[2];
            let handler = this.createHandler(type, expr.trim());

            return { type, handler };
        }

        private createHandler(type: string, expression: string) {
            let func = Parser.parse(expression);
            let handler = (e: Event) => {
                if (config.debug) {
                    console.log(type + ': ' + expression);
                }
                func.call(this.viewModel, e, this.element, util.global);
            };

            dom.on(this.element, type, handler);

            return handler;
        }

        release() {
            this._events.forEach((event) => {
                dom.off(this.element, event.type, event.handler);
            });
            this._events = null;
        }
    }
}