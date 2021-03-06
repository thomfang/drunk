/// <reference path="../promise/promise.ts" />
/// <reference path="../util/xhr.ts" />
/// <reference path="../cache/cache.ts" />

namespace drunk.Template {
    
    import Cache = drunk.Cache;
    import Promise = drunk.Promise;
    
    let cacheStore = new Cache<any>(50);
    
    /**
     * 加载模板，先尝试从指定ID的标签上查找，找不到再作为url发送ajax请求，
     * 加载到的模板字符串会进行缓存
     * @param    urlOrId  script模板标签的id或模板的url地址 
     * @returns           Promise 对象,Promise的返回值为模板字符串
     */
    export function load(urlOrId: string, useCache: boolean = true): Promise<string> {
        var template = cacheStore.get(urlOrId);

        if (template != null && useCache) {
            return Promise.resolve(template);
        }
        
        var node = document.getElementById(urlOrId);
        if (node && node.innerHTML) {
            template = node.innerHTML;
            cacheStore.set(urlOrId, template);
            return Promise.resolve(template);
        }
        
        var promise: Promise<string> = util.ajax<string>({url: urlOrId});
        promise.done(result => {
            cacheStore.set(urlOrId, result);
        });
        cacheStore.set(urlOrId, promise);
        
        return promise;
    }
}