/// <reference path="../promise/promise" />

/**
 * DOM操作的工具方法模块
 * 
 * @module drunk.elementUtil
 * @main
 * @class ElementUtil
 */
module drunk.elementUtil {

    /**
     * 根据提供的html字符串创建html元素
     * @static
     * @method create
     * @param  {string}  html  html字符串
     * @return {Node|Node[]}          创建好的html元素
     */
    export function create(html: string): Node | Node[] {
        var div = document.createElement("div");
        var str = html.trim();

        console.assert(str.length > 0, "HTML是空的");

        div.innerHTML = str;

        return div.childNodes.length === 1 ? div.firstChild : util.toArray(div.childNodes);
    }

    /**
     * 在旧的元素节点前插入新的元素节点
     * @static
     * @method insertBefore
     * @param  {Node}  newNode  新的节点
     * @param  {Node}  oldNode  旧的节点
     */
    export function insertBefore(newNode: Node, oldNode: Node): void {
        if (oldNode.parentNode) {
            oldNode.parentNode.insertBefore(newNode, oldNode);
        }
    }

    /**
     * 在旧的元素节点后插入新的元素节点
     * @static
     * @method insertAfter
     * @param  {Node}  newNode  新的节点
     * @param  {Node}  oldNode  旧的节点
     */
    export function insertAfter(newNode: Node, oldNode: Node): void {
        if (oldNode.nextSibling) {
            insertBefore(newNode, oldNode.nextSibling);
        } else {
            oldNode.parentNode.appendChild(newNode);
        }
    }

    /**
     * 移除元素节点
     * @static
     * @method remove
     * @param  {Node|Node[]}  target  节点
     */
    export function remove(target: Node | Node[]): Promise<any> {
        if (Array.isArray(target)) {
            return Promise.all((<Array<Node>>target).map(node => {
                return removeAfterActionEnd(node);
            }));
        }
        else if ((<Node>target).parentNode) {
            return removeAfterActionEnd(target);
        }
    }
    
    function removeAfterActionEnd(node: any) {
        if (node.parentNode) {
            return Action.processAll(node).then(() => {
                node.parentNode.removeChild(node);
            });
        }
    }

    /**
     * 新的节点替换旧的节点
     * @static
     * @method replace
     * @param  {Node}  newNode  新的节点
     * @param  {Node}  oldNode  旧的节点
     */
    export function replace(newNode: Node | Node[], oldNode: Node): void {
        var parent = oldNode.parentNode;
            
        if (!parent) {
            return;
        }
        
        if (Array.isArray(newNode)) {
            (<Array<Node>>newNode).forEach(function (node) {
                parent.insertBefore(node, oldNode);
            });
            parent.removeChild(oldNode);
        }
        else {
            parent.replaceChild((<Node>newNode), oldNode);
        }
    }
    
    /**
     * 为节点注册事件监听
     * @static
     * @method addListener
     * @param  {HTMLElement} element  元素
     * @param  {string}      type     事件名
     * @param  {function}    listener 事件处理函数
     */
    export function addListener(element: HTMLElement, type: string, listener: (ev: Event) => void): void {
        element.addEventListener(type, listener, false);
    }
    
    /**
     * 移除节点的事件监听
     * @static
     * @method removeListener
     * @param  {HTMLElement} element  元素
     * @param  {string}      type     事件名
     * @param  {function}    listener 事件处理函数
     */
    export function removeListener(element: HTMLElement, type: string, listener: (ev: Event) => void): void {
        element.removeEventListener(type, listener, false);
    }
    
    /**
     * 添加样式
     * @static
     * @method addClass
     * @param  {HTMLElement}  element    元素
     * @param  {string}       token      样式名
     */
    export function addClass(element: HTMLElement, token: string): void {
        var list = token.trim().split(/\s+/);
        element.classList.add.apply(element.classList, list);
    }
    
    /**
     * 移除样式
     * @static
     * @method removeClass
     * @param  {HTMLElement}  element    元素
     * @param  {string}       token      样式名
     */
    export function removeClass(element: HTMLElement, token: string): void {
        var list = token.trim().split(/\s+/);
        element.classList.remove.apply(element.classList, list);
    }
}