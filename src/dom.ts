///<reference path="../definition/drunk.d.ts" />
module drunk.dom {

    var div: HTMLElement = document.createElement("div");

    export function create(html: string): Node {
        var str = html.trim();

        console.assert(str.length > 0, "HTML string is empty");

        div.innerHTML = str;

        if (div.childNodes.length > 1) {
            throw new Error("A nodelist html given, please wrap it by a container element:\n\n" + html);
        }

        return div.firstChild;
    }

    export function addClass(element: HTMLElement, className: string): void {
        element.classList.add(className);
    }

    export function removeClass(element: HTMLElement, className: string): void {
        element.classList.remove(className);
    }

    export function insertBefore(newNode: Node, oldNode: Node): void {
        if (oldNode.parentNode) {
            oldNode.parentNode.insertBefore(newNode, oldNode);
        }
    }

    export function insertAfter(newNode: Node, oldNode: Node): void {
        if (oldNode.nextSibling) {
            insertBefore(newNode, oldNode.nextSibling);
        } else {
            oldNode.parentNode.appendChild(newNode);
        }
    }

    export function remove(element: Node): void {
        if (element.parentNode) {
            element.parentNode.removeChild(element);
        }
    }
    export function replace(newNode: Node, oldNode: Node): void {
        if (oldNode.parentNode) {
            oldNode.parentNode.replaceChild(newNode, oldNode);
        }
    }

    export function getBindingExpression(elem: HTMLElement, name: string): any {
        if (!elem.getAttribute) {
            return;
        }

        return elem.getAttribute(config.prefix + name);
    }
}