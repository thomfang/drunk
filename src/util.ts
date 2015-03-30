///<reference path="../definition/drunk.d.ts" />
module drunk.util {

    export function isObject(target: any): boolean {
        return Object.prototype.toString.call(target) === '[object Object]';
    }

    export function camelCase(str: string) {
        return str.replace(/[_-](\w)/g, ($1, $2) => {
            return $2.toUpperCase();
        });
    }

    export function extend<T>(destination: T, ...sources: any[]): T {
        sources.forEach((src) => {
            Object.keys(src).forEach((key) => {
                destination[key] = src[key];
            });
        });
        return destination;
    }

    export function toArray(arrayLike: any): any[] {
        return Array.prototype.slice.call(arrayLike);
    }

    export function ensureItem(array: any[], item: any): void {
        if (array.indexOf(item) < 0) {
            array.push(item);
        }
    }

    export function removeItem(array: any[], item: any): void {
        var index = array.indexOf(item);
        if (index > -1) {
            array.splice(index, 1);
        }
    }

    export function defineProperty(target: any, propertyName: string, propertyValue: any, enumerable?: boolean): void {
        Object.defineProperty(target, propertyName, {
            value: propertyValue,
            writable: true,
            configurable: true,
            enumerable: !!enumerable
        });
    }

    export function asap(callback: () => void, sender: any = null): number {
        return setTimeout(callback.bind(sender), 0);
    }
    
    export function proxy(target: any, propertyName: string, source: {}): boolean {
        var des = Object.getOwnPropertyDescriptor(target, propertyName);
        if (!des || typeof des.get !== 'function') {
            Object.defineProperty(target, propertyName, {
                set(value) {
                    source[propertyName] = value;
                },
                get() {
                    return source[propertyName];
                },
                configurable: true,
                enumerable: true
            });
            return true;
        }
        return false;
    }

    import Promise = promise.Promise;

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

            if (isObject(data)) {
                if (options.contentType && options.contentType.match(/json/i)) {
                    data = JSON.stringify(data);
                } else {
                    data = [];
                    Object.keys(options.data).forEach(function (key) {
                        data.push(key + '=' + encodeURIComponent(options.data[key]));
                    });
                    data = data.join("&");
                }
            }

            xhr.send(data);
        });
    }

    var templateCache: { [index: string]: string } = {};

    export function getTemplate(templateUrlOrID: string): Promise<string> {
        var template: string = templateCache[templateUrlOrID];
        var node: HTMLElement;

        return new Promise<string>((resolve, reject) => {
            if (template != null) {
                resolve(template);
            }
            else if ((node = document.getElementById(templateUrlOrID)) && node.innerHTML) {
                templateCache[templateUrlOrID] = template = node.innerHTML;
                resolve(template);
            }
            else {
                var onFullfill = (template: string) => {
                    templateCache[templateUrlOrID] = template;
                    resolve(template);
                };
                var onRejection = (xhr: XMLHttpRequest) => {
                    reject(xhr);
                };
                ajax({ url: templateUrlOrID }).then(onFullfill, onRejection);
            }
        });
    }
}