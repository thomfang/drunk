/// <reference path="../promise/promise.ts" />
/// <reference path="./xhr.ts" />

module drunk.util {

    import Promise = promise.Promise;

    var templateCache: { [index: string]: string } = {};
    
    /**
     * 加载模板，先尝试从 script 标签上查找，找不到在发送 ajax 请求
     * 
     * @param  templateUrlOrId  script 模板标签的 id 或模板的 url 地址 
     * @returns 一个 promise 对象，promise 的返回值为模板字符串
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