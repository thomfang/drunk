/**
 * DOM util methods.
 */

module drunk.dom {

    var div: HTMLElement = document.createElement("div");

    // Create a node by html string.
    export function create(html: string): Node {
        var str = html.trim();

        console.assert(str.length > 0, "HTML string is empty");

        div.innerHTML = str;

        if (div.childNodes.length > 1) {
            throw new Error("A nodelist html given, please wrap it by a container element:\n\n" + html);
        }

        return div.firstChild;
    }

    // Add class for a node.
    export function addClass(element: HTMLElement, className: string): void {
        element.classList.add(className);
    }

    // Remove class for a node.
    export function removeClass(element: HTMLElement, className: string): void {
        element.classList.remove(className);
    }

    // Insert a new node before an old node.
    export function insertBefore(newNode: Node, oldNode: Node): void {
        if (oldNode.parentNode) {
            oldNode.parentNode.insertBefore(newNode, oldNode);
        }
    }

    // Insert a new node after an old node.
    export function insertAfter(newNode: Node, oldNode: Node): void {
        if (oldNode.nextSibling) {
            insertBefore(newNode, oldNode.nextSibling);
        } else {
            oldNode.parentNode.appendChild(newNode);
        }
    }

    // Remove a node from the DOM tree.
    export function remove(element: Node): void {
        if (element.parentNode) {
            element.parentNode.removeChild(element);
        }
    }

    // Replace the old node with a new node in the dom tree.
    export function replace(newNode: Node, oldNode: Node): void {
        if (oldNode.parentNode) {
            oldNode.parentNode.replaceChild(newNode, oldNode);
        }
    }
}