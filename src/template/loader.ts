/// <reference path="../promise/promise.ts" />
/// <reference path="../util/xhr.ts" />

/**
 * @module drunk.template
 * @class template
 */
module drunk.template {
    
    var cache: {[index: string]: string} = {};
    
    /**
     * 加载模板，先尝试从script标签上查找，找不到再发送ajax请求，
     * 加载到的模板字符串会进行缓存
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
}