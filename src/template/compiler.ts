/// <reference path="../viewmodel/viewModel.ts" />
/// <reference path="../promise/promise.ts" />
/// <reference path="../util/xhr.ts" />
/// <reference path="../util/dom" />
/// <reference path="../config/config.ts" />
/// <reference path="../parser/parser.ts" />

/**
 * 模板工具模块， 提供编译创建绑定，模板加载的工具方法
 */
module drunk.Template {
    
    /**
     * 编译模板元素生成绑定方法
     * @param   node        模板元素
     * @param   isRootNode  是否是根元素
     * @return              绑定元素与viewModel的方法
     */
    export function compile(node: any): IBindingGenerator {
        let isArray: boolean = Array.isArray(node);
        let executor: IBindingExecutor = isArray || node.nodeType === 11 ? null : compileNode(node);
        let isTerminal: boolean = executor && executor.isTerminal;
        let childExecutor: IBindingExecutor;

        if (isArray) {
            executor = compileNodeList(node);
        }
        else if (!isTerminal && isNeedCompileChild(node)) {
            childExecutor = compileNodeList(node.childNodes);
        }

        return (viewModel: ViewModel, element: any, ownerViewModel?: Component, placeholder?: HTMLElement) => {
            let allBindings = viewModel._bindings;
            let startIndex: number = allBindings.length;
            let bindingList: Binding[];
            let promiseList: Promise<any>[] = [];

            if (executor) {
                promiseList.push(executor(viewModel, element, ownerViewModel, placeholder));
            }
            if (childExecutor) {
                promiseList.push(childExecutor(viewModel, element.childNodes, ownerViewModel, placeholder));
            }

            bindingList = viewModel._bindings.slice(startIndex);
            
            return {
                promise: Promise.all(promiseList),
                unbind: () => {
                    bindingList.forEach((binding) => {
                        binding.dispose();
                    });

                    startIndex = allBindings.indexOf(bindingList[0]);
                    allBindings.splice(startIndex, bindingList.length);
                }
            };
        };
    }
    
    /**
     *  判断元素是什么类型,调用相应的类型编译方法
     */
    function compileNode(node: any): IBindingExecutor {
        let nodeType: number = node.nodeType;

        if (nodeType === 1 && node.tagName !== "SCRIPT") {
            // 如果是元素节点
            return compileElement(node);
        }
        if (nodeType === 3) {
            // 如果是textNode
            return compileTextNode(node);
        }
    }
    
    /**
     *  编译NodeList
     */
    function compileNodeList(nodeList: any[]): IBindingExecutor {
        let executors: any = [];

        util.toArray(nodeList).forEach((node) => {
            let executor: IBindingExecutor;
            let childExecutor: IBindingExecutor;

            executor = compileNode(node);

            if (!(executor && executor.isTerminal) && isNeedCompileChild(node)) {
                childExecutor = compileNodeList(node.childNodes);
            }

            executors.push(executor, childExecutor);
        });

        if (executors.length > 1) {
            return (viewModel: ViewModel, nodes: any, ownerViewModel?: Component, placeholder?: HTMLElement) => {
                if (nodes.length * 2 !== executors.length) {
                    throw new Error("创建绑定之前,节点已经被动态修改");
                }

                let i = 0;
                let nodeExecutor: IBindingExecutor;
                let childExecutor: IBindingExecutor;
                let promiseList: Promise<any>[] = [];

                util.toArray(nodes).forEach((node) => {
                    nodeExecutor = executors[i++];
                    childExecutor = executors[i++];

                    if (nodeExecutor) {
                        promiseList.push(nodeExecutor(viewModel, node, ownerViewModel, placeholder));
                    }
                    if (childExecutor) {
                        promiseList.push(childExecutor(viewModel, node.childNodes, ownerViewModel, placeholder));
                    }
                });
                
                return Promise.all(promiseList);
            };
        }
    }
    
    /**
     *  判断是否可以编译childNodes
     */
    function isNeedCompileChild(node: any) {
        return node.tagName !== 'SCRIPT' && node.hasChildNodes();
    }
    
    /**
     *  编译元素的绑定并创建绑定描述符
     */
    function compileElement(element: any): IBindingExecutor {
        let executor;
        let tagName: string = element.tagName.toLowerCase();

        if (tagName.indexOf('-') > 0) {
            element.setAttribute(config.prefix + 'component', tagName);
        }

        if (element.hasAttributes()) {
            // 如果元素上有属性， 先判断是否存在终止型绑定指令
            // 如果不存在则判断是否有普通的绑定指令
            executor = processTerminalBinding(element) || processNormalBinding(element);
        }

        if (element.tagName === 'TEXTAREA') {
            // 如果是textarea， 它的值有可能存在插值表达式， 比如 "the textarea value with {{some_let}}"
            // 第一次进行绑定先换成插值表达式
            let originExecutor = executor;

            executor = (viewModel: ViewModel, textarea: HTMLTextAreaElement) => {
                textarea.value = viewModel.$eval(textarea.value, true);

                if (originExecutor) {
                    return originExecutor(viewModel, textarea);
                }
            };
        }

        return executor;
    }
    
    /**
     *  编译文本节点
     */
    function compileTextNode(node: any): IBindingExecutor {
        let content: string = node.textContent;

        if (!parser.hasInterpolation(content)) {
            return;
        }

        let tokens: any[] = parser.parseInterpolate(content, true);
        let fragment = document.createDocumentFragment();
        let executors = [];

        tokens.forEach((token, i) => {
            if (typeof token === 'string') {
                fragment.appendChild(document.createTextNode(token));
                executors[i] = null;
            }
            else {
                fragment.appendChild(document.createTextNode(' '));
                executors[i] = createExecutor(node, {
                    name: "bind",
                    expression: token.expression
                });
            }
        });

        return (viewModel, element) => {
            let frag = fragment.cloneNode(true);

            util.toArray(frag.childNodes).forEach((node, i) => {
                if (executors[i]) {
                    executors[i](viewModel, node);
                }
            });

            dom.replace(frag, element);
        };
    }
    
    /**
     *  检测是否存在终止编译的绑定，比如component指令会终止当前编译过程，如果有创建绑定描述符
     */
    function processTerminalBinding(element: any): IBindingExecutor {
        let terminals: string[] = Binding.getTerminalBindings();
        let name: string;
        let expression: string;

        for (let i = 0; name = terminals[i]; i++) {
            if (expression = element.getAttribute(config.prefix + name)) {
                // 如果存在该绑定
                return createExecutor(element, {
                    name: name,
                    expression: expression
                });
            }
        }
    }
    
    /**
     *  查找并创建通常的绑定
     */
    function processNormalBinding(element: any): IBindingExecutor {
        let executors: IBindingExecutor[] = [];

        util.toArray(element.attributes).forEach((attr) => {
            let name: string = attr.name;
            let index: number = name.indexOf(config.prefix);
            let expression: string = attr.value;
            let executor;

            if (index > -1 && index < name.length - 1) {
                // 已经注册的绑定
                name = name.slice(index + config.prefix.length);
                executor = createExecutor(element, {
                    name: name,
                    expression: expression
                });
            }
            else if (parser.hasInterpolation(expression)) {
                // 如果是在某个属性上进行插值创建一个attr的绑定
                executor = createExecutor(element, {
                    name: "attr",
                    attrName: name,
                    expression: expression,
                    isInterpolate: true
                });
            }

            if (executor) {
                executors.push(executor);
            }
        });

        if (executors.length) {
            executors.sort((a, b) => {
                return b.priority - a.priority;
            });
            // 存在绑定
            return (viewModel: ViewModel, element: any, ownerViewModel?: ViewModel, placeholder?: HTMLElement) => {
                return Promise.all(executors.map((executor) => {
                    return executor(viewModel, element, ownerViewModel, placeholder);
                }));
            };
        }
    }
    
    /**
     *  生成绑定描述符方法
     */
    function createExecutor(element: any, descriptor: IBindingDefinition): IBindingExecutor {
        let definition = Binding.getByName(descriptor.name);
        let executor: IBindingExecutor;

        if (!definition && config.debug) {
            console.warn(descriptor.name, "没有找到该绑定的定义");
            return;
        }

        if (!definition.retainAttribute && element.removeAttribute) {
            // 如果未声明保留这个绑定属性，则把它移除
            element.removeAttribute(config.prefix + descriptor.name);
        }

        util.extend(descriptor, definition);

        executor = (viewModel, element, ownerViewModel?: ViewModel, placeholder?: HTMLElement) => {
            return Binding.create(viewModel, element, descriptor, ownerViewModel, placeholder);
        };
        executor.isTerminal = definition.isTerminal;
        executor.priority = definition.priority;

        return executor;
    }
}