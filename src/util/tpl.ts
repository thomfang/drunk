/// <reference path="../promise/promise.ts" />
/// <reference path="./xhr.ts" />

/**
 * @module drunk.util
 * @class util
 */
module drunk.util {

    import Promise = promise.Promise;

    var templateCache: { [index: string]: string } = {};
    
    /**
     * 加载模板，先尝试从script标签上查找，找不到再发送ajax请求
     * 
     * @static
     * @method loadTemplate
     * @param   {string}  templateUrlOrId script模板标签的id或模板的url地址 
     * @returns {Promise}                 一个 promise 对象promise的返回值为模板字符串
     */
    export function loadTemplate(templateUrlOrID: string): Promise<string> {
        var template: string = templateCache[templateUrlOrID];
        var node: HTMLElement;

        if (template != null) {
            return promise.Promise.resolve(template);
        }
        if ((node = document.getElementById(templateUrlOrID)) && node.innerHTML) {
            templateCache[templateUrlOrID] = template = node.innerHTML;
            return promise.Promise.resolve(template);
        }

        return ajax({ url: templateUrlOrID }).then((template) => {
            (<any>templateCache)[templateUrlOrID] = template;
            return template;
        });
    }
}