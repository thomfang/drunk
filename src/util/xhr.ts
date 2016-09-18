/// <reference path="./util.ts" />
/// <reference path="./querystring.ts" />
/// <reference path="../promise/promise.ts" />

namespace drunk.util {

    import Promise = drunk.Promise;
    import querystring = drunk.querystring;

    /**
     * ajax方法参数接口
     */
    export interface IAjaxOptions {
        /**
         * 请求的url
         */
        url: string;

        /**
         * 请求的类型(GET|POST|PUT|DELETE等)
         */
        type?: string;

        /**
         * 要发送的数据
         */
        data?: string | {};

        /**
         * 请求头配置
         */
        headers?: { [index: string]: string };

        /**
         * withCredentials配置
         */
        xhrFields?: { withCredentials: boolean };

        /**
         * withCredentials快捷配置
         */
        withCredentials?: boolean;

        /**
         * 请求的content-type
         */
        contentType?: string;

        /**
         * deprecated,请使用responseType
         */
        dataType?: string;

        /** 相应的数据类型 */
        responseType?: string;

        /**
         * 请求超时时间
         */
        timeout?: number;

        user?: string;
        password?: string;
    }

    // const FORM_DATA_CONTENT_TYPE = 'application/x-www-form-urlencoded; charset=UTF-8';

    var schemeRegex = /^(\w+)\:\/\//;

    /**
     * XMLHTTP request工具方法
     * @param   options  配置参数
     */
    export function ajax<T>(options: IAjaxOptions): Promise<T> {
        var xhr = new XMLHttpRequest();

        if (typeof options.url !== 'string' || !options.url) {
            throw new Error(`ajax(options):options.url未提供或不合法`);
        }

        return new Promise<T>((resolve, reject) => {
            var url = options.url;
            var type = (options.type || 'GET').toUpperCase();
            var headers = options.headers || {};
            var data: any = options.data;
            var contentType: string = options.contentType;// || FORM_DATA_CONTENT_TYPE;
            var isLocalRequest = false;
            var schemeMatch = schemeRegex.exec(options.url.toLowerCase());

            if (schemeMatch) {
                if (schemeMatch[1] === 'file') {
                    isLocalRequest = true;
                }
            }
            else if (location.protocol === 'file:') {
                isLocalRequest = true;
            }

            if (Object.prototype.toString.call(data) === '[object Object]') {
                if (contentType && contentType.match(/json/i)) {
                    data = JSON.stringify(data);
                }
                else {
                    data = querystring.stringify(data);

                    if (type === 'GET') {
                        url += (url.indexOf('?') === -1 ? '?' : '&') + data;
                        data = null;
                    }
                }
            }

            xhr.onload = () => {
                if (xhr.readyState === 4) {
                    if ((xhr.status >= 200 && xhr.status < 300) || (isLocalRequest && xhr.status === 0)) {
                        let result = (options.responseType || options.dataType) == 'json' ? JSON.parse(xhr.responseText) : xhr.response;
                        resolve(result);
                    }
                    else {
                        let contentType = xhr.getResponseHeader('Content-Type');
                        reject({
                            res: contentType.match(/json/i) ? JSON.parse(xhr.responseText) : xhr.responseText,
                            xhr: xhr
                        });
                    }
                    xhr = null;
                }
            };

            xhr.open(type, url, true, options.user, options.password);

            if (options.withCredentials || (options.xhrFields && options.xhrFields.withCredentials)) {
                xhr.withCredentials = true;
            }

            if (typeof options.timeout === 'number' && options.timeout > 0) {
                xhr.timeout = options.timeout;
                xhr.ontimeout = () => {
                    if (xhr) {
                        xhr.abort();
                        reject(xhr);
                        xhr = null;
                    }
                };
            }
            if (contentType) {
                xhr.setRequestHeader("Content-Type", contentType);
            }

            Object.keys(headers).forEach(function (name) {
                xhr.setRequestHeader(name, headers[name]);
            });

            xhr.send(data);
        });
    }

}