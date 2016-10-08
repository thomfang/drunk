/// <reference path="../viewmodel/viewModel.ts" />
/// <reference path="../util/xhr.ts" />
/// <reference path="../util/dom.ts" />
/// <reference path="../config/config.ts" />
/// <reference path="../parser/parser.ts" />

namespace drunk.Template {

    import dom = drunk.dom;
    import util = drunk.util;
    import config = drunk.config;
    import Parser = drunk.Parser;
    import Binding = drunk.Binding;

    export type BindingNode = {
        name: string;
        expression: string;
        priority: number;
        attribute?: string;
        isInterpolate?: boolean;
    }

    export type BindingDescriptor = {
        bindings?: BindingNode[];
        children?: BindingDescriptor[];
        fragment?: DocumentFragment;
        isTerminal?: boolean;
        isTextNode?: boolean;
    }

    const noop = () => { };
    const reValidAttrName = /^[a-zA-Z-]+(:\w+)?$/;

    export function compile(node: Node | Node[]) {
        var isArray = Array.isArray(node);
        var bindingDesc: BindingDescriptor;
        if (isArray) {
            bindingDesc = createBindingDescriptorList(node as Node[]);
        } else {
            bindingDesc = createBindingDescriptor(node as Node);
        }

        return (viewModel: ViewModel, node: Node | Node[], owner?: ViewModel, placeholder?: HTMLElement) => {
            if (!bindingDesc) {
                return noop;
            }

            let allBindings = viewModel._bindings;
            let beginOffset = allBindings.length;
            let newBindings: Binding[];
            if (isArray) {
                bindNodeList(viewModel, node as Node[], bindingDesc as BindingDescriptor[], owner, placeholder);
            } else if (bindingDesc) {
                bindNode(viewModel, node as HTMLElement, bindingDesc, owner, placeholder);
            }
            newBindings = viewModel._bindings.slice(beginOffset);
            newBindings.forEach(binding => binding.$execute());

            return () => {
                newBindings.forEach((binding) => binding.$dispose());
                beginOffset = allBindings.indexOf(newBindings[0]);
                allBindings.splice(beginOffset, newBindings.length);
            };
        };
    }

    export function createBindingDescriptor(node: Node) {
        var nodeType = node.nodeType;
        var bindingDesc: BindingDescriptor;

        if (nodeType === 1) {
            bindingDesc = createElementBindingDescriptor(node as HTMLElement);
        } else if (nodeType === 3) {
            bindingDesc = createTextBindingDescriptor(node as Text);
        }

        if (!(bindingDesc && bindingDesc.isTerminal) && isNeedCompileChildNodes(node as HTMLElement)) {
            let children = createBindingDescriptorList(util.toArray(node.childNodes));
            if (children) {
                bindingDesc = bindingDesc || {};
                bindingDesc.children = children;
            }
        }
        return bindingDesc;
    }

    export function createBindingDescriptorList(nodeList: Node[]) {
        var hasDescriptor = false;
        var descriptorList = nodeList.map(node => {
            let bindingDesc = createBindingDescriptor(node);
            if (bindingDesc != null) {
                hasDescriptor = true;
            }
            return bindingDesc;
        });
        return hasDescriptor ? descriptorList : undefined;
    }

    function createElementBindingDescriptor(element: HTMLElement) {
        if (element.tagName.toLowerCase().indexOf('-') > 0) {
            element.setAttribute(config.prefix + 'component', element.tagName.toLowerCase());
        }
        return createTerminalBindingDescriptor(element) || createNormalBindingDescriptor(element);
    }

    function createTextBindingDescriptor(node: Text) {
        var content = node.textContent;
        if (!Parser.hasInterpolation(content)) {
            return;
        }

        var tokens: any[] = Parser.parseInterpolate(content, true);
        var fragment = document.createDocumentFragment();
        var bindings: Array<BindingNode | string> = [];

        tokens.forEach((token, i) => {
            if (typeof token === 'string') {
                fragment.appendChild(document.createTextNode(token));
            } else {
                fragment.appendChild(document.createTextNode(' '));
                bindings[i] = {
                    name: "bind",
                    priority: Binding.getByName('bind').priority,
                    expression: token.expression
                };
            }
        });
        return { bindings: bindings as BindingNode[], fragment, isTextNode: true };
    }

    function createTerminalBindingDescriptor(element: HTMLElement) {
        var terminalBindings = Binding.getTerminalBindings();

        for (let i = 0, name; name = terminalBindings[i]; i++) {
            let attrValue = element.getAttribute(config.prefix + name);
            if (attrValue != null) {
                return {
                    bindings: [{
                        name: name,
                        expression: attrValue,
                        priority: Binding.getByName(name).priority
                    }],
                    isTerminal: true,
                    execute: bindElement
                };
            }
        }
    }

    function createNormalBindingDescriptor(element: HTMLElement): BindingDescriptor {
        var bindingNodes: BindingNode[];
        var shouldTerminate: boolean;

        if (!element.hasAttributes()) {
            return;
        }

        util.toArray(element.attributes).forEach(attrNode => {
            let attrName: string = attrNode.name;
            let expression: string = attrNode.value;
            let index = attrName.indexOf(config.prefix);
            let attribute: string;
            let bindingNode: BindingNode;

            if (index > -1 && index < attrName.length - 1) {
                let name = attrName.slice(index + config.prefix.length);
                if (!reValidAttrName.test(name)) {
                    throw new Error(`不合法的绑定指令：${attrName}`);
                }

                let i = name.indexOf(':');
                if (i > -1) {
                    attribute = name.slice(i + 1);
                    name = name.slice(0, i);
                }
                else {
                    attribute = null;
                }

                let bindDef = Binding.getByName(name);
                if (!bindDef) {
                    throw new Error(`${config.prefix + attrName}: 未定义`);
                }
                if (attrName === 'include') {
                    shouldTerminate = true;
                }
                bindingNode = {
                    name,
                    expression,
                    attribute,
                    priority: bindDef.priority
                };
            } else if (Parser.hasInterpolation(expression)) {
                bindingNode = {
                    name: 'attr',
                    attribute: attrName,
                    expression,
                    priority: Binding.getByName('attr').priority,
                    isInterpolate: true
                };
            }

            if (bindingNode) {
                if (!bindingNodes) {
                    bindingNodes = [];
                }
                bindingNodes.push(bindingNode);
            }
        });

        if (bindingNodes) {
            bindingNodes.sort((a, b) => b.priority - a.priority);
            return { bindings: bindingNodes, isTerminal: shouldTerminate };
        }
    }

    function bindNode(viewModel: ViewModel, node: Node, desc: BindingDescriptor, owner?: ViewModel, placeholder?: HTMLElement) {
        if (desc.bindings) {
            if (desc.isTextNode) {
                bindTextNode(viewModel, node as Text, desc);
            } else {
                bindElement(viewModel, node as HTMLElement, desc, owner, placeholder);
            }
        }
        if (desc.children) {
            bindNodeList(viewModel, util.toArray(node.childNodes), desc.children, owner, placeholder);
        }
    }

    function bindNodeList(viewModel: ViewModel, nodeList: Node[], descList: BindingDescriptor[], owner?: ViewModel, placeholder?: HTMLElement) {
        descList.forEach((desc, i) => {
            if (desc) {
                bindNode(viewModel, nodeList[i] as HTMLElement, desc, owner, placeholder);
            }
        });
    }

    function bindElement(viewModel: ViewModel, element: HTMLElement, desc: BindingDescriptor, owner?: ViewModel, placeholder?: HTMLElement) {
        desc.bindings.forEach(descriptor => {
            Binding.create(viewModel, element, descriptor, owner, placeholder);
        });
    }

    function bindTextNode(viewModel: ViewModel, node: Text, desc: BindingDescriptor) {
        var fragment = desc.fragment.cloneNode(true);
        util.toArray(fragment.childNodes).forEach((node, i) => {
            if (desc.bindings[i]) {
                Binding.create(viewModel, node, desc.bindings[i]);
            }
        });
        dom.replace(fragment, node);
    }

    function isNeedCompileChildNodes(node: HTMLElement) {
        return node.tagName && node.tagName.toLowerCase() !== 'script' && node.childNodes.length > 0;
    }
}