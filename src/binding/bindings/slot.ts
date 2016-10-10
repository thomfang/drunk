/// <reference path="../binding.ts" />
/// <reference path="../../component/component.ts" />
/// <reference path="../../util/dom.ts" />
/// <reference path="../../template/compiler.ts" />

namespace drunk {

    import dom = drunk.dom;
    import util = drunk.util;
    import Template = drunk.Template;
    import Component = drunk.Component;

    @binding("slot")
    class SlotBinding extends Binding {

        static isTerminal = true;

        private _nodes: Node[];
        private _unbinds: Function[];

        init(owner: Component, placeholder: HTMLElement) {
            if (!owner || !placeholder) {
                throw new Error(`$mount(element, owner, placeholder): owner和placeholder未提供`);
            }

            let nodes = [];
            let unbinds = [];
            let fragment = document.createDocumentFragment();
            let viewModel = owner;

            if (this.expression && /\S/.test(this.expression)) {
                let element = placeholder.querySelector(`[slot="${this.expression}"]`);
                if (element) {
                    element.removeAttribute('slot');
                    nodes.push(element);
                    fragment.appendChild(element);
                }
            } else {
                util.toArray(placeholder.childNodes).forEach((node: Node) => {
                    if (node.nodeType === 3 || !(node as HTMLElement).hasAttribute('slot')) {
                        nodes.push(node);
                        fragment.appendChild(node);
                    }
                });
            }

            if (this.element.tagName.toLowerCase() === 'slot' && !nodes.length && this.element.childNodes.length) {
                util.toArray(this.element.childNodes).forEach((node: Node) => {
                    nodes.push(node);
                    fragment.appendChild(node);
                });
                viewModel = this.viewModel;
            }

            // 换掉节点
            dom.replace(fragment, this.element);

            nodes.forEach((node) => {
                // 编译模板并获取绑定创建函数
                // 保存解绑函数
                let bind = Template.compile(node);
                unbinds.push(bind(viewModel, node));
            });

            this._nodes = nodes;
            this._unbinds = unbinds;
        }

        /**
         * 释放绑定
         */
        release() {
            this._unbinds.forEach(unbind => unbind());
            this._nodes.forEach(node => dom.remove(node));
            this._unbinds = this._nodes = null;
        }
    }
}

