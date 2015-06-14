/// <reference path="../promise/promise.ts" />
/// <reference path="../util/xhr.ts" />
/// <reference path="../cache/cache" />

/**
 * @module drunk.Template
 * @class Template
 */
module drunk.Template {
    
    var cache = new Cache<string>(50);
    var loading: {[key: string]: Promise<string>} = {};
    
    /**
     * 加载模板，先尝试从script标签上查找，找不到再发送ajax请求，
     * 加载到的模板字符串会进行缓存
     * @static
     * @method loadTemplate
     * @param   {string}  urlOrId  script模板标签的id或模板的url地址 
     * @returns {Promise}           一个 promise 对象promise的返回值为模板字符串
     */
    export function load(urlOrId: string): Promise<string> {
        var template = cache.get(urlOrId);
        var node;

        if (template != null) {
            return Promise.resolve(template);
        }
        
        if ((node = document.getElementById(urlOrId)) && node.innerHTML) {
            template = node.innerHTML;
            cache.set(urlOrId, template);
            return Promise.resolve(template);
        }
        
        var promise = loading[urlOrId];
        
        if (!promise) {
            promise = util.ajax<string>({url: urlOrId}).then(template => {
                cache.set(urlOrId, template);
                delete loading[urlOrId];
                return template;
            });
            loading[urlOrId] = promise;
        }
        
        return promise;
    }
}