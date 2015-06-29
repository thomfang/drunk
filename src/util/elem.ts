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
    export function create(htmlString: string): Node | Node[] {
        var div = document.createElement("div");
        var str = htmlString.trim();

        console.assert(str.length > 0, "HTML是空的");

        html(div, str);

        return div.childNodes.length === 1 ? div.firstChild : util.toArray(div.childNodes);
    }
    
    /**
     * 设置元素的innerHTML
     * @static
     * @method html
     * @param  {HTMLElement}  container  元素
     * @param  {string}       value      值
     */
    export function html(container: HTMLElement, value: string) {
        container.innerHTML = value;
    }

    /**
     * 在旧的元素节点前插入新的元素节点
     * @static
     * @method insertBefore
     * @param  {Node}  newNode  新的节点
     * @param  {Node}  oldNode  旧的节点
     */
    export function insertBefore(newNode: any, oldNode: Node): void {
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
    }

    /**
     * 在旧的元素节点后插入新的元素节点
     * @static
     * @method insertAfter
     * @param  {Node}  newNode  新的节点
     * @param  {Node}  oldNode  旧的节点
     */
    export function insertAfter(newNode: any, oldNode: Node): void {
        if (!oldNode.parentNode) {
            return;
        }
        
        if (!Array.isArray(newNode)) {
            newNode = [newNode];
        }
        if (oldNode.nextSibling) {
            insertBefore(newNode, oldNode.nextSibling);
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
     * @static
     * @method remove
     * @param  {Node|Node[]}  target  节点
     */
    export function remove(target: any): Promise<any> {
        if (!Array.isArray(target)) {
            target = [target];
        }
        return Promise.all(target.map(node => {
            return removeAfterActionEnd(node);
        }));
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
     * @static
     * @method replace
     * @param  {Node}  newNode  新的节点
     * @param  {Node}  oldNode  旧的节点
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