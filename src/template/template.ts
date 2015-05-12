/// <reference path="../viewmodel/viewModel.ts" />
/// <reference path="../promise/promise.ts" />
/// <reference path="../util/xhr.ts" />

module drunk.Template {
    
    export interface BindingExecutor {
        (viewModel: ViewModel, element: HTMLElement | NodeList): () => void;
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
        if ((node = document.getElementById(template)) && node.innerHTML) {
            cache[template] = html = node.innerHTML;
            return Promise.resolve(html);
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
     * @param  {boolean}      skipRootElement 是否跳过模板元素的根元素
     * @return {function}                     绑定元素与viewModel的方法
     */
    export function parse(template: HTMLElement, skipRootElement?: boolean): BindingExecutor {
        var rootExecutor = template.nodeType === 11 ? null : parseNode(template);
        
        return (viewModel: ViewModel, template: HTMLElement | NodeList) => {
            return () => {};
        }
    }
    
    // 判断元素是什么类型,调用相应的类型解析方法
    function parseNode(node: HTMLElement): any {
        var nodeType: number = node.nodeType;
        
        if (nodeType === 1 && node.tagName !== "SCRIPT") {
            // 如果是元素节点
            return parseElement(node);
        }
        else if (nodeType === 3) {
            // 如果是textNode
            return parseTextNode(node);
        }
    }
    
    function parseNodeList(nodeList: NodeList): any {
        
    }
    
    function parseElement(element: HTMLElement): any {
        
    }
    
    // 解释textNode， 先调用插值解析方法解析出所有的token， 如果
    function parseTextNode(node: Node): any {
        
    }
}