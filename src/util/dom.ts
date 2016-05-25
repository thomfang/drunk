/// <reference path="../promise/promise.ts" />
/// <reference path="./util.ts" />
/// <reference path="../binding/bindings/action.ts" />

/**
 * DOM操作的工具方法模块
 */
namespace drunk.dom {
    
    import config = drunk.config;

    /**
     * 根据提供的html字符串创建html元素
     * @param   html  html字符串
     * @return        创建好的html元素或元素列表数组
     */
    export function create(htmlString: string): Node | Node[] {
        var div = document.createElement("div");
        var str = htmlString.trim();

        console.assert(str.length > 0, `HTML不能为空`);

        html(div, str);

        return div.childNodes.length === 1 ? div.firstChild : util.toArray(div.childNodes);
    }

    /**
     * 设置元素的innerHTML
     * @param   container  元素
     * @param   value      值
     */
    export function html(container: HTMLElement, value: string) {
        if (typeof MSApp !== 'undefined' && MSApp['execUnsafeLocalFunction']) {
            MSApp['execUnsafeLocalFunction'](() => {
                container.innerHTML = value;
            });
        }
        else {
            container.innerHTML = value;
        }
    }
    
    /**
     * 创建标记节点，如果开启debug模式，则创建comment节点，发布版本则用textNode
     */
    export function createFlagNode(content: string): Node {
        let node = config.debug ? document.createComment(content) : document.createTextNode(' ');
        node['flag'] = content;
        // if (config.debug) {
        //     return document.createComment(content);
        // }
        // return document.createTextNode(' ');
        return node;
    }

    /**
     * 在旧的元素节点前插入新的元素节点
     * @param  newNode  新的节点
     * @param  oldNode  旧的节点
     */
    export function before(newNode: any, oldNode: Node): void {
        let parent = oldNode.parentNode;
        if (!parent) {
            return;
        }

        if (Array.isArray(newNode)) {
            newNode.forEach((node) => parent.insertBefore(node, oldNode));
        }
        else {
            parent.insertBefore(newNode, oldNode);
        }
    }

    /**
     * 在旧的元素节点后插入新的元素节点
     * @param  newNode  新的节点
     * @param  oldNode  旧的节点
     */
    export function after(newNode: any, oldNode: Node): void {
        if (!oldNode.parentNode) {
            return;
        }

        if (!Array.isArray(newNode)) {
            newNode = [newNode];
        }
        if (oldNode.nextSibling) {
            before(newNode, oldNode.nextSibling);
        }
        else {
            let parent = oldNode.parentNode;
            newNode.forEach((node) => {
                parent.appendChild(node);
            });
        }
    }

    /**
     * 移除元素节点
     * @param  target  节点
     */
    export function remove(target: any): Promise<any> {
        if (Array.isArray(target)) {
            return Promise.all(target.map(node => removeAfterActionEnd(node)));
        }
        return Promise.resolve(removeAfterActionEnd(target));
    }

    function removeAfterActionEnd(node: any) {
        if (node.parentNode) {
            let currentAction = Action.getCurrentAction(node);
            if (currentAction && currentAction.promise) {
                return currentAction.promise.then(() => {
                    node.parentNode.removeChild(node);
                });
            }
            else {
                node.parentNode.removeChild(node);
            }
        }
    }

    /**
     * 新的节点替换旧的节点
     * @param  newNode  新的节点
     * @param  oldNode  旧的节点
     */
    export function replace(newNode: any, oldNode: Node): void {
        if (!oldNode.parentNode) {
            return;
        }

        if (!Array.isArray(newNode)) {
            newNode = [newNode];
        }

        let parent = oldNode.parentNode;
        newNode.forEach((node) => {
            parent.insertBefore(node, oldNode);
        });
        parent.removeChild(oldNode);
    }

    /**
     * 为节点注册事件监听
     * @param  element  元素
     * @param  type     事件名
     * @param  listener 事件处理函数
     */
    export function on(element: HTMLElement, type: string, listener: (ev: Event) => void): void {
        element.addEventListener(type, listener, false);
    }

    /**
     * 移除节点的事件监听
     * @param  element  元素
     * @param  type     事件名
     * @param  listener 事件处理函数
     */
    export function off(element: HTMLElement, type: string, listener: (ev: Event) => void): void {
        element.removeEventListener(type, listener, false);
    }

    /**
     * 添加样式
     * @param   element    元素
     * @param   token      样式名
     */
    export function addClass(element: HTMLElement, token: string): void {
        var list = token.trim().split(/\s+/);
        element.classList.add.apply(element.classList, list);
    }

    /**
     * 移除样式
     * @param  element    元素
     * @param  token      样式名
     */
    export function removeClass(element: HTMLElement, token: string): void {
        var list = token.trim().split(/\s+/);
        element.classList.remove.apply(element.classList, list);
    }

    let styleSheet: CSSStyleSheet;
    export function addCSSRule(rules: { [selector: string]: { [property: string]: string } }) {
        if (!styleSheet) {
            let styleElement = document.createElement('style');
            document.head.appendChild(styleElement);
            styleSheet = <CSSStyleSheet>styleElement.sheet;
        }

        Object.keys(rules).forEach(selector => {
            let rule = rules[selector];
            let content = Object.keys(rule).map(property => `${property}:${rule[property]}`).join(';');
            styleSheet.insertRule(`${selector} {${content}}`, styleSheet.cssRules.length);
        });
    }
}