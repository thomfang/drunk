/// <reference path="./util" />
/// <reference path="./querystring" />
/// <reference path="../promise/promise" />

/**
 * @module drunk.util
 * @class util
 */
module drunk {

    export interface IAjaxOptions {
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
     * XMLHTTP request工具方法
     * @static
     * @method xhr
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
     */
    export function xhr<T>(options: IAjaxOptions): Promise<T> {
        var xhr = new XMLHttpRequest();
        
        if (typeof options.url !== 'string') {
            throw new Error('发送ajax请求失败:url未提供');
        }

        return new Promise<T>((resolve, reject) => {
            var url = options.url;
            var type = (options.type || 'GET').toUpperCase();
            var headers = options.headers || {};
            var data: any = options.data;
            var contentType: string = options.contentType || 'application/x-www-form-urlencoded; charset=UTF-8';

            if (util.isObject(data)) {
                if (options.contentType && options.contentType.match(/^json$/i)) {
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
            
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status >= 200 && xhr.status < 300 || xhr.status === 304) {
                        var res: any = xhr.responseText;
                        xhr = null;
                        resolve(options.dataType === 'json' ? JSON.parse(res) : res);
                    }
                    else {
                        reject(xhr);
                    }
                }
            };

            xhr.onerror = () => {
                reject(xhr);
            };

            xhr.open((type).toUpperCase(), url, true);

            if (options.withCredentials || (options.xhrFields && options.xhrFields.withCredentials)) {
                xhr.withCredentials = true;
            }

            xhr.setRequestHeader("Content-Type", contentType);

            Object.keys(headers).forEach(function(name) {
                xhr.setRequestHeader(name, headers[name]);
            });

            xhr.send(data);
        });
    }
    
}