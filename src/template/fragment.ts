/// <reference path="./loader.ts" />
/// <reference path="../util/dom.ts" />
/// <reference path="../cache/cache.ts" />
/// <reference path="../promise/promise.ts" />

namespace drunk.Template {
    
    let cacheStore = new Cache<Promise<DocumentFragment>>(50);
    let styleRecord = {};
    let linkRecord = {};
    let scriptRecord = {};
    
    /**
     * 把模块连接渲染为documentFragment,会对样式和脚本进行处理,避免重复加载,如果提供宿主容器元素,则会把
     * 模板渲染到改容器中
     * @param   url               模板连接
     * @param   hostedElement     容器元素
     * @param   useCache          是否使用缓存还是重新加载
     * @return                    返回一个Promise对象
     */
    export function renderFragment(url: string, hostedElement?: HTMLElement, useCache?: boolean) {
        let fragmentId = url.toLowerCase();
        let fragmentPromise = cacheStore.get(fragmentId);
        
        if (!useCache || !fragmentPromise) {
            fragmentPromise = populateDocument(url);
            cacheStore.set(fragmentId, fragmentPromise);
        }
        
        return fragmentPromise.then((fragment) => {
            let newFragment = fragment.cloneNode(true);
            
            if (hostedElement) {
                hostedElement.appendChild(newFragment);
                return hostedElement;
            }
            return newFragment;
        });
    }
    
    /**
     * 创建一个htmlDocument并加载模板
     */
    function populateDocument(href: string) {
        initialize();
        
        let htmlDoc = document.implementation.createHTMLDocument("frag");
        let base = htmlDoc.createElement("base");
        let anchor = htmlDoc.createElement("a");
        
        htmlDoc.head.appendChild(base);
        htmlDoc.body.appendChild(anchor);
        
        base.href = document.location.href;
        anchor.setAttribute("href", href);
        base.href = anchor.href;
        
        return load(href).then((template) => {
            dom.html(htmlDoc.documentElement, template);
            htmlDoc.head.appendChild(base);
        }).then(() => {
            return processDocument(htmlDoc, href);
        });
    }
    
    /**
     * 处理模板的资源
     */
    function processDocument(htmlDoc: Document, href: string) {
        let body = htmlDoc.body;
        let lastNonInlineScriptPromise = Promise.resolve();
        let promiseList = [];
        
        util.toArray(htmlDoc.querySelectorAll('link[type="text/css"], link[rel="stylesheet"]')).forEach(addLink);
        
        util.toArray(htmlDoc.getElementsByTagName('style')).forEach((styleTag, index) => addStyle(styleTag, href, index));
        
        util.toArray(htmlDoc.getElementsByTagName('script')).forEach((scriptTag, index) => {
            let result = addScript(scriptTag, href, index, lastNonInlineScriptPromise);
            if (result) {
                if (!result.inline) {
                    lastNonInlineScriptPromise = result.promise;
                }
                promiseList.push(result.promise);
            }
        });
        
        util.toArray(htmlDoc.getElementsByTagName('img')).forEach(img => img.src = img.src);
        util.toArray(htmlDoc.getElementsByTagName('a')).forEach(a => {
            // href为#开头的不用去更新属性
            if (a.href !== '') {
                let href = a.getAttribute('href');
                if (href && href[0] !== '#') {
                    a.href = href;
                }
            }
        });
        
        return Promise.all(promiseList).then(() => {
            let fragment = document.createDocumentFragment();
            let imported = document.importNode(body, true);
            while (imported.childNodes.length > 0) {
                fragment.appendChild(imported.firstChild);
            }
            return fragment;
        });
    }
    
    /**
     * 添加外链样式
     */
    function addLink(tag: HTMLLinkElement) {
        let tagUid = tag.href.toLowerCase();
        
        if (!linkRecord[tagUid]) {
            linkRecord[tagUid] = true;
            
            let newLink: any = tag.cloneNode(false);
            newLink.href = tag.href;
            document.head.appendChild(newLink);
        }
        
        tag.parentNode.removeChild(tag);
    }
    
    /**
     * 添加内链样式
     */
    function addStyle(tag: HTMLStyleElement, fragmentHref: string, position: number) {
        let tagUid = (fragmentHref + '  style[' + position + ']').toLowerCase();
        
        if (!styleRecord[tagUid]) {
            let newStyle: any = tag.cloneNode(true);
            styleRecord[tagUid] = true;
            newStyle.setAttribute('__', tagUid);
            document.head.appendChild(newStyle);
        }
        
        tag.parentNode.removeChild(tag);
    }
    
    /**
     * 添加脚本
     */
    function addScript(tag: HTMLScriptElement, fragmentHref: string, position: number, lastNonInlineScriptPromise: Promise<any>) {
        let tagUid = tag.src;
        let inline = !tagUid;
        
        if (inline) {
            tagUid = fragmentHref + '  script[' + position + ']';
        }
        tagUid = tagUid.toLowerCase();
        tag.parentNode.removeChild(tag);
        
        if (!scriptRecord[tagUid]) {
            let newScript = document.createElement('script');
            let promise: Promise<any>;
            
            scriptRecord[tagUid] = true;
            
            newScript.setAttribute('type', tag.type || 'text/javascript');
            newScript.setAttribute('async', 'false');
            
            if (tag.id) {
                newScript.setAttribute('id', tag.id);
            }
            if (inline) {
                let text = tag.text;
                promise = lastNonInlineScriptPromise.then(() => {
                    newScript.text = text;
                }).catch((e) => {
                    // console.warn('脚本加载错误:', e);
                });
                newScript.setAttribute('__', tagUid);
            }
            else {
                promise = new Promise((resolve) => {
                    newScript.onload = newScript.onerror = () => {
                        resolve();
                    };
                    newScript.setAttribute('src', tag.src);
                });
            }
            
            document.head.appendChild(newScript);
            
            return {
                promise: promise,
                inline: inline
            };
        }
    }
    
    let initialized = false;
    
    /**
     * 标记已经存在于页面上的脚本和样式
     */
    function initialize() {
        if (initialized) {
            return;
        }
        
        util.toArray(document.getElementsByTagName('script')).forEach(e => {
            scriptRecord[e.src.toLowerCase()] = true;
        });
        util.toArray(document.querySelectorAll('link[rel="stylesheet"], link[type="text/css"]')).forEach(e => {
            linkRecord[e.href.toLowerCase()] = true;
        });
        
        initialized = true;
    }
}