/// <reference path="./util.ts" />
/// <reference path="./querystring.ts" />
/// <reference path="../promise/promise.ts" />

namespace drunk.util {

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
         * 接受的数据类型(目前只支持json)
         */
        dataType?: string;

        /**
         * 请求超时时间
         */
        timeout?: number;
    }

    const FORM_DATA_CONTENT_TYPE = 'application/x-www-form-urlencoded; charset=UTF-8';

    /**
     * XMLHTTP request工具方法
     * @param   options  配置参数
     */
    export function ajax<T>(options: IAjaxOptions): Promise<T> {
        var xhr = new XMLHttpRequest();

        if (typeof options.url !== 'string' || !options.url) {
            throw new Error('发送ajax请求失败:url未提供或不合法');
        }

        return new Promise<T>((resolve, reject) => {
            var url = options.url;
            var type = (options.type || 'GET').toUpperCase();
            var headers = options.headers || {};
            var data: any = options.data;
            var contentType: string = options.contentType || FORM_DATA_CONTENT_TYPE;
            var timerID: number;

            var rejectAndClearTimer = () => {
                clearTimeout(timerID);
                if (reject) {
                    reject(xhr);
                    reject = null;
                }
            };

            if (util.isObject(data)) {
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

            xhr.onreadystatechange = () => {
                if (xhr.readyState === 4) {
                    // status === 0 的情况在iOS平台使用cordova的页面中加载本地的文件得到的状态都是0，无解
                    if (xhr.status >= 200 && xhr.status < 300 || xhr.status === 304 || (xhr.status === 0 && xhr.responseText.length > 0)) {
                        var res: any = xhr.responseText;
                        xhr = null;
                        resolve(options.dataType === 'json' ? JSON.parse(res) : res);
                        clearTimeout(timerID);
                    }
                    else {
                        rejectAndClearTimer();
                    }
                }
            };

            xhr.onerror = () => {
                rejectAndClearTimer();
            };

            xhr.open(type, url, true);

            if (options.withCredentials || (options.xhrFields && options.xhrFields.withCredentials)) {
                xhr.withCredentials = true;
            }

            xhr.setRequestHeader("Content-Type", contentType);

            Object.keys(headers).forEach(function (name) {
                xhr.setRequestHeader(name, headers[name]);
            });

            xhr.send(data);

            if (typeof options.timeout === 'number') {
                timerID = setTimeout(() => {
                    xhr.abort();
                    rejectAndClearTimer();
                }, options.timeout);
            }
        });
    }

}