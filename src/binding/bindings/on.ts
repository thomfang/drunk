/// <reference path="../binding.ts" />
/// <reference path="../../template/compiler.ts" />
/// <reference path="../../util/dom.ts" />
/// <reference path="../../config/config.ts" />

namespace drunk {
    
    import dom = drunk.dom;

    let reg = {
        semic: /\s*;\s*/,
        statement: /(\w+):\s*(.+)/,
        breakword: /\n+/g
    };

    @binding("on")
    class EventBinding extends Binding implements IBindingDefinition {

        private _events: { type: string; handler: (ev) => void; }[];

        init() {
            this._events = this.expression.replace(reg.breakword, ' ').split(reg.semic).map(str => this._parseEvent(str));
        }

        _parseEvent(str: string) {
            let matches = str.match(reg.statement);
            let prefix = config.prefix;

            console.assert(matches !== null,
                `不合法的"${prefix}on"表达式 ${str}, 正确的用法如下:
                ${prefix}on="click: expression"
                ${prefix}on="mousedown: expression; mouseup: callback()"
                ${prefix}on="click: callback($event, $el)"`
            );

            let type = matches[1];
            let expr = matches[2];
            let func = Parser.parse(expr.trim());

            let handler = (e: Event) => {
                if (config.debug) {
                    console.log(type + ': ' + expr);
                }
                func.call(this.viewModel, e, this.element);
            }

            dom.on(this.element, type, handler);

            return { type, handler };
        }

        release() {
            this._events.forEach((event) => {
                dom.off(this.element, event.type, event.handler);
            });
            this._events = null;
        }
    }
}