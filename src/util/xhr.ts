/// <reference path="../util/util.ts" />
/// <reference path="../promise/promise.ts" />

/**
 * @module drunk.util
 * @class util
 */
module drunk.util {

    export interface AjaxOptions {
        url: string;
        type?: string;
        data?: string | {};
        headers?: { [index: string]: string };
        xhrFields?: { withCredentials: boolean };
        withCredentials?: boolean;
        contentType?: string;
        dataType?: string;
    }

    /**
     * Ajax工具方法
     * 
     * @static
     * @method ajax
     * @param  {object}     	options                     配置参数
     * @param  {string}         options.url                 请求的url
     * @param  {string}         [options.type]              请求的类型(GET或POST)
     * @param  {string|object}  [options.data]              要发送的数据
     * @param  {object}         [options.headers]           请求头配置
     * @param  {object}         [options.xhrFields]         withCredentials配置
     * @param  {boolean}        [options.withCredentials]   withCredentials配置
     * @param  {string}         [options.contentType]       请求的content-type
     * @param  {string}         [options.dataType]          接受的数据类型(目前只支持json)
     * @return {Promise}                                    一个promise实例
     * @demo test/spec.js [ajax]
     */
    export function ajax<T>(options: AjaxOptions): Promise<T> {
        var xhr = new XMLHttpRequest();

        return new Promise<T>((resolve, reject) => {
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status >= 200 && xhr.status < 300 || xhr.status === 304) {
                        var res: any = xhr.responseText;
                        resolve(options.dataType === 'json' ? JSON.parse(res) : res);
                        xhr = null;
                    }
                }
            };

            xhr.onerror = () => {
                reject(xhr);
            };

            xhr.open((options.type || 'GET').toUpperCase(), options.url, true);

            if (options.withCredentials || (options.xhrFields && options.xhrFields.withCredentials)) {
                xhr.withCredentials = true;
            }

            var headers = options.headers || {};
            var data: any = options.data;
            var contentType: string = options.contentType || 'application/x-www-form-urlencoded; charset=UTF-8';

            xhr.setRequestHeader("Content-Type", contentType);

            Object.keys(headers).forEach(function(name) {
                xhr.setRequestHeader(name, headers[name]);
            });

            if (util.isObject(data)) {
                if (options.contentType && options.contentType.match(/^json$/i)) {
                    data = JSON.stringify(data);
                }
                else {
                    data = [];
                    Object.keys(options.data).forEach(function(key) {
                        data.push(key + '=' + encodeURIComponent((<any>options.data)[key]));
                    });
                    data = data.join("&");
                }
            }

            xhr.send(data);
        });
    }
}