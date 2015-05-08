/// <reference path="../util/util.ts" />
/// <reference path="../promise/promise.ts" />

module drunk.util {

    import Promise = promise.Promise;
    
    export interface AjaxOptions {
        url: string;
        type?: string;
        data?: string | {};
        headers?: {[index: string]: string};
        xhrFields?: { withCredentials: boolean };
        withCredentials?: boolean;
        contentType?: string;
        dataType?: string;
    }
    
    export function ajax(options: AjaxOptions): Promise<string | Object> {
        var xhr = new XMLHttpRequest();
        
        return new Promise<string | Object>((resolve, reject) => {
            xhr.onreadystatechange = function () {
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
    
            Object.keys(headers).forEach(function (name) {
                xhr.setRequestHeader(name, headers[name]);
            });
    
            if (util.isObject(data)) {
                if (options.contentType && options.contentType.match(/json/i)) {
                    data = JSON.stringify(data);
                } else {
                    data = [];
                    Object.keys(options.data).forEach(function (key) {
                        data.push(key + '=' + encodeURIComponent((<any>options.data)[key]));
                    });
                    data = data.join("&");
                }
            }
    
            xhr.send(data);
        });
    }
}