/// <reference path="./loader.ts" />
/// <reference path="../util/dom.ts" />
/// <reference path="../cache/cache.ts" />
/// <reference path="../promise/promise.ts" />

namespace drunk.Template {

    import dom = drunk.dom;
    import util = drunk.util;
    import Cache = drunk.Cache;
    import Promise = drunk.Promise;

    let fragCache = new Cache<Promise<DocumentFragment>>(50);
    let styleRecord = {};
    let linkRecord = {};
    let scriptRecord = {};
    let scopedClassRecord = {};
    let scopedClassCounter = 0;
    let scopedClassNamePrefix = 'drunk-scoped-';

    let initialized = false;
    let cachedDocument: Document;

    /**
     * 把模块连接渲染为documentFragment,会对样式和脚本进行处理,避免重复加载,如果提供宿主容器元素,则会把
     * 模板渲染到改容器中
     * @param   url               模板连接
     * @param   hostedElement     容器元素
     * @param   useCache          是否使用缓存还是重新加载
     * @return                    返回一个Promise对象
     */
    export function renderFragment(url: string, hostedElement?: HTMLElement, useCache?: boolean) {
        let fragmentId = url;
        let fragmentPromise = fragCache.get(fragmentId);

        if (!useCache || !fragmentPromise) {
            fragmentPromise = populateDocument(url);
            fragCache.set(fragmentId, fragmentPromise);
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
    function populateDocument(url: string) {
        initialize();

        let htmlDoc = document.implementation.createHTMLDocument("frag");
        let base = htmlDoc.createElement("base");
        let anchor = htmlDoc.createElement("a");

        htmlDoc.head.appendChild(base);
        htmlDoc.body.appendChild(anchor);

        base.href = document.location.href;
        anchor.setAttribute("href", url);
        base.href = anchor.href;

        return load(url, false).then((template) => {
            dom.html(htmlDoc.documentElement, template);
            htmlDoc.head.appendChild(base);
            return processDocument(htmlDoc, base.href);
        });
    }

    /**
     * 处理模板的资源
     */
    function processDocument(htmlDoc: Document, url: string) {
        let body = htmlDoc.body;
        let lastNonInlineScriptPromise = Promise.resolve();
        let scopedClassList: string[] = [];
        let promiseList = [];

        util.toArray(htmlDoc.querySelectorAll('link[type="text/css"], link[rel="stylesheet"]')).forEach(e => addLink(e, scopedClassList));
        util.toArray(htmlDoc.getElementsByTagName('style')).forEach((styleTag, index) => addStyle(styleTag, url, index, scopedClassList));

        util.toArray(htmlDoc.getElementsByTagName('script')).forEach((scriptTag, index) => {
            let result = addScript(scriptTag, url, index, lastNonInlineScriptPromise);
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
                let node: any = imported.firstChild;
                fragment.appendChild(node);
                addScopedClassList(node, scopedClassList);
            }
            return fragment;
        });
    }

    /**
     * 为节点添加作用域样式
     */
    function addScopedClassList(node: HTMLElement, classList: string[]) {
        if (!node.classList || !classList.length) {
            return;
        }

        classList.forEach(className => node.classList.add(className));

        if (node.hasChildNodes()) {
            util.toArray(node.childNodes).forEach(child => addScopedClassList(child, classList));
        }
    }

    /**
     * 添加外链样式
     */
    function addLink(link: HTMLLinkElement, scopedClassList: string[]) {
        let href = link.href;
        let tagUid = href;
        let scoped = link.hasAttribute('scoped');
        let scopedClassName: string;

        if (scoped) {
            tagUid += '<scoped>';
            scopedClassName = scopedClassRecord[tagUid] || (scopedClassRecord[tagUid] = scopedClassNamePrefix + scopedClassCounter++);
            util.addArrayItem(scopedClassList, scopedClassName);
        }

        if (!linkRecord[tagUid]) {
            linkRecord[tagUid] = true;

            if (scoped) {
                loadCssAndCreateStyle(href).done((styleElement) => {
                    let style = generateScopedStyle(styleElement.sheet['cssRules'], scopedClassName);
                    style.setAttribute('drunk:link:href', href);
                    document.head.appendChild(style);
                    styleElement.parentNode.removeChild(styleElement);
                }, err => {
                    console.error(href, `样式加载失败:\n`, err);
                });
            }
            else {
                let newLink = link.cloneNode(false) as HTMLLinkElement;
                newLink.setAttribute('rel', 'stylesheet');
                newLink.setAttribute('type', 'text/css');
                newLink.href = href;
                document.head.appendChild(newLink);
            }
        }

        link.parentNode.removeChild(link);
    }

    /**
     * 添加内链样式
     */
    function addStyle(styleElement: HTMLStyleElement, fragmentHref: string, position: number, scopedClassList: string[]) {
        let tagUid = fragmentHref + ' style[' + position + ']';
        let scoped = styleElement.hasAttribute('scoped');
        let scopedClassName: string;

        if (scoped) {
            tagUid += '<scoped>';
            scopedClassName = scopedClassRecord[tagUid] || (scopedClassRecord[tagUid] = scopedClassNamePrefix + scopedClassCounter++);
            util.addArrayItem(scopedClassList, scopedClassName);
        }
        if (!styleRecord[tagUid]) {
            styleRecord[tagUid] = true;
            let newStyle: HTMLStyleElement;

            if (scoped) {
                newStyle = generateScopedStyle(styleElement.sheet['cssRules'], scopedClassName);
            } else {
                newStyle = styleElement.cloneNode(true) as HTMLStyleElement;
            }

            newStyle.setAttribute('drunk:style:uid', tagUid);
            document.head.appendChild(newStyle);
        }

        styleElement.parentNode.removeChild(styleElement);
    }

    /**
     * 修改样式的作用域
     */
    function generateScopedStyle(cssRules: CSSStyleRule[], scopedClassName: string) {
        let style = document.createElement('style');
        let rules = [];

        util.toArray(cssRules).forEach(rule => {
            rules.push(rule.cssText.replace(rule.selectorText, '.' + scopedClassName + rule.selectorText));
        });

        // console.log((rules.join('\n')));
        style.textContent = rules.join('\n');
        style.setAttribute('drunk:scoped:style', '');
        return style;
    }

    /**
     * 添加脚本
     */
    function addScript(tag: HTMLScriptElement, fragmentHref: string, position: number, lastNonInlineScriptPromise: Promise<any>) {
        let tagUid = tag.src;
        let inline = !tagUid;

        if (inline) {
            tagUid = fragmentHref + ' script[' + position + ']';
        }
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
                newScript.setAttribute('drunk:script:uid', tagUid);
            } else {
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

    /**
     * 标记已经存在于页面上的脚本和样式
     */
    function initialize() {
        if (initialized) {
            return;
        }

        util.toArray(document.getElementsByTagName('script')).forEach(e => {
            scriptRecord[e.src] = true;
        });
        util.toArray(document.querySelectorAll('link[rel="stylesheet"], link[type="text/css"]')).forEach(e => {
            linkRecord[e.href] = true;
        });

        cachedDocument = document.implementation.createHTMLDocument("cached document");
        initialized = true;
    }

    /**
     * 加载css文件并创建style标签
     */
    function loadCssAndCreateStyle(href: string) {
        return load(href).then((cssContent: string) => {
            let style = document.createElement('style');
            style.textContent = cssContent;
            cachedDocument.head.appendChild(style);
            return style;
        });
    }
}