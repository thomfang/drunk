/// <reference path="../promise/promise.ts" />
/// <reference path="../util/xhr.ts" />
/// <reference path="../cache/cache" />

/**
 * @module drunk.Template
 * @class Template
 */
module drunk.Template {
    
    let cacheStore = new Cache<any>(50);
    
    /**
     * 加载模板，先尝试从script标签上查找，找不到再发送ajax请求，
     * 加载到的模板字符串会进行缓存
     * @static
     * @method loadTemplate
     * @param   {string}  urlOrId  script模板标签的id或模板的url地址 
     * @returns {Promise}           一个 promise 对象promise的返回值为模板字符串
     */
    export function load(urlOrId: string): Promise<string> {
        let template = cacheStore.get(urlOrId);

        if (template != null) {
            return Promise.resolve(template);
        }
        
        let node = document.getElementById(urlOrId);
        if (node && node.innerHTML) {
            template = node.innerHTML;
            cacheStore.set(urlOrId, template);
            return Promise.resolve(template);
        }
        
        let promise: Promise<string> = util.ajax<string>({url: urlOrId});
        cacheStore.set(urlOrId, promise);
        
        return promise;
    }
}