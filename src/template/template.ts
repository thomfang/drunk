/// <reference path="../viewmodel/viewModel.ts" />
/// <reference path="../promise/promise.ts" />
/// <reference path="../util/xhr.ts" />
/// <reference path="../config/config.ts" />

module drunk.Template {
    
    export interface BindingExecutor {
        (viewModel: ViewModel, element: HTMLElement | NodeList): any;
    }
    
    var cache: {[index: string]: string} = {};
    
    /**
     * 加载模板，先尝试从script标签上查找，找不到再发送ajax请求
     * 
     * @static
     * @method loadTemplate
     * @param   {string}  template  script模板标签的id或模板的url地址 
     * @returns {Promise}           一个 promise 对象promise的返回值为模板字符串
     */
    export function load(template: string): Promise<string> {
        var html: string = cache[template];
        var node: HTMLElement;

        if (html != null) {
            return Promise.resolve(html);
        }
        
        node = document.getElementById(template);
        
        if (node) {
            cache[template] = node.innerHTML;
            return Promise.resolve(cache[template]);
        }

        return util.ajax({ url: template }).then((html) => {
            (<any>cache)[template] = html;
            return html;
        });
    }
    
    /**
     * 解析模板元素生成绑定方法
     * 
     * @param  {HTMLElement}  template        模板元素
     * @param  {boolean}      isRootElement   是否是根元素
     * @return {function}                     绑定元素与viewModel的方法
     */
    export function parse(template: HTMLElement, isRootElement: boolean): BindingExecutor {
        var rootExecutor = template.nodeType === 11 ? null : parseNode(template, isRootElement);
        
        return (viewModel: ViewModel, template: HTMLElement | NodeList) => {
            return () => {};
        }
    }
    
    // 判断元素是什么类型,调用相应的类型解析方法
    function parseNode(node: HTMLElement, isRootElement: boolean): any {
        var nodeType: number = node.nodeType;
        
        if (nodeType === 1 && node.tagName !== "SCRIPT") {
            // 如果是元素节点
            return parseElement(node, isRootElement);
        }
        
        if (nodeType === 3) {
            // 如果是textNode
            return parseTextNode(node);
        }
    }
    
    function parseNodeList(nodeList: NodeList): any {
        
    }
    
    // 解析元素的绑定并创建绑定执行器
    function parseElement(element: HTMLElement, isRootElement: boolean): any {
        if (!isRootElement) {
            var tagName: string = element.tagName;
            
            if (tagName.indexOf("-") > 0) {
                // 如果标签名有破折号，则当成是自定义标签
                // 把为起添加component的指令属性
                element.setAttribute(config.prefix + "component", tagName.toLowerCase());
            }
        }
        
        var executor: any;
        
        if (element.hasAttributes()) {
            executor = checkEndingBinding(element) || createNormalBinding(element);
        }
    }
    
    // 解释textNode， 先调用插值解析方法解析出所有的token， 如果
    function parseTextNode(node: Node): any {
        
    }
    
    // 检测是否存在终止解析的绑定，比如component指令会终止当前解析过程，如果有创建绑定执行器
    function checkEndingBinding(element: HTMLElement): any {
        var endings: string[] = Binding.getEndingNames();
        var name: string;
        var expression: string;
        
        for (var i = 0; name = endings[i]; i++) {
            if (expression = element.getAttribute(config.prefix + name)) {
                // 如果存在该绑定
                return createEndingBinding(element, name, expression);
            }
        }
    }
    
    function createEndingBinding(element: HTMLElement, name: string, expression: string): any {
        var descriptor = createDescriptor(name, expression, Binding.getDefinintionByName(name));
        
        return (viewModel: ViewModel, element: HTMLElement) => {
            var binding = new Binding(viewModel, element, descriptor);
        };
    }
    
    function createNormalBinding(element) {
        
    }
    
    function createDescriptor(name: string, expression: string, definition: BindingDefiniation) {
        if (!definition && config.debug) {
            return console.warn(name, "绑定不存在");
        }
    }
}