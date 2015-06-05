/// <reference path="../parser/parser" />
/// <reference path="../viewmodel/viewModel" />

/**
 * 数据过滤器模块
 * @module drunk.filter
 */
module drunk.filter {
    
    /**
     * Filter声明
     * @class Filter
     * @constructor
     * @param  {any}  input         输入
     * @param  {any[]} [...arggs]   其他参数
     * @return {any}                返回值
     */
    export interface IFilter {
        (...args: any[]): any;
    }

    export interface FilterDef {
        name: string;
        param?: parser.IGetter;
    }
    
    /**
     * 使用提供的filter列表处理数据
     * 
     * @method applyFilters
     * @static
     * @param  {any}            value       输入
     * @param  {FilterDef[]}    filterDefs  filter定义集合
     * @param  {ViewModel}      viewModel   ViewModel实例
     * @param  {any[]}          ...args     其他参数
     * @return {any}                        过滤后得到的值
     */
    export function applyFilters(value: any, filterDefs: any, filterMap: { [name: string]: IFilter }, isInterpolate: boolean, ...args: any[]): any {
        if (!filterDefs) {
            return isInterpolate ? getInterpolateValue(value) : value;
        }

        if (isInterpolate) {
            // 如果是插值表达式,插值表达式的每个token对应自己的filter,需要一个个进行处理,
            // 如果某个token没有filter说明那个token只是普通的字符串,直接返回
            value = value.map(function(item, i) {
                if (!filterDefs[i]) {
                    return item;
                }
                return filter.applyFilters(item, filterDefs[i], filterMap, false, ...args);
            });
                
            // 对所有token求值得到的结果做处理,如果是undefined或null类型直接转成空字符串,避免页面显示出undefined或null
            return getInterpolateValue(value);
        }

        let name;
        let param;
        let method;
    
        // 应用于所有的filter
        filterDefs.forEach(def => {
            name = def.name;
            method = filterMap[name];

            if (typeof method !== 'function') {
                throw new Error('Filter "' + name + '" not found');
            }

            param = def.param ? def.param(...args) : [];
            value = method(...[value].concat(param));
        });

        return value;
    }
    
    // 判断插值表达式的值个数,如果只有一个,则返回该值,如果有多个,则返回所有值的字符串相加
    function getInterpolateValue(values: any[]): any {
        if (values.length === 1) {
            return values[0];
        }

        return values.map(item => {
            if (item == null) {
                return '';
            }
            return typeof item === 'object' ? JSON.stringify(item) : item;
        }).join('');
    }

    var reg = {
        escape: /[<>& "']/gm,
        unescape: /&.+?;/g,
        striptags: /(<([^>]+)>)/ig,
        format: /(YY|M|D|H|m|s)(\1)*/g
    };

    var escapeChars = {
        '&': "&amp;",
        ' ': "&nbsp;",
        '"': "&quot;",
        "'": "&#x27;",
        "<": "&lt;",
        ">": "&gt;"
    };

    var unescapeChars = {
        '&amp;': "&",
        "&nbsp;": " ",
        "&quot;": '"',
        "&#x27;": "'",
        "&lt;": "<",
        "&gt;": ">"
    };

    export var filters: { [name: string]: IFilter } = {
        
        /**
         * 对输入的字符串进行编码
         * @method escape
         * @param  {string}  input  输入
         * @return {string}         输出
         */
        escape(input: string): string {
            return input.replace(reg.escape, function(x) {
                return escapeChars[x];
            });
        },

        /**
         * 对输入的字符串进行解码
         * @method unescape
         * @param  {string}  input  输入
         * @return {string}         输出
         */
        unescape(input: string): string {
            return input.replace(reg.unescape, function(a) {
                return unescapeChars[a];
            });
        },

        /**
         * 对输入的字符串进行截断
         * @method truncate
         * @param  {string}  input  输入
         * @param  {number}  length 保留的最大长度
         * @param  {string}  [tail] 结尾的字符串,默认为'...'
         * @return {string}         输出
         */
        truncate(input: string, length: number, tail?: string): string {
            if (input.length <= length) {
                return input;
            }
            return input.slice(0, length) + (tail != null ? tail : "...");
        },

        /**
         * 为特殊字符添加斜杠
         * @method addslashes
         * @param  {string}  input  输入
         * @return {string}         输出
         */
        addslashes(input: string): string {
            return input.replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
        },

        /**
         * 移除特殊字符的斜杠
         * @method stripslashes
         * @param  {string}  input  输入
         * @return {string}         输出
         */
        stripslashes(input: string): string {
            return input.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\0/g, '\0').replace(/\\\\/g, '\\');
        },

        /**
         * 计算输入的长度，支持字符串、数组和对象
         * @method length
         * @param  {string|array|object}  input 输入
         * @return {number}  长度
         */
        length(input: any): number {
            if (input == null) {
                return 0;
            }
            if (input.length != null) {
                return input.length;
            }
            if (typeof input === 'object') {
                var length = 0;
                for (var k in input) {
                    if (input.hasOwnProperty(k)) {
                        length += 1;
                    }
                }
                return length;
            }
        },

        /**
         * JSON.stringify的别名
         * @method json
         * @param  {any}  input     输入
         * @param  {number} [ident] 缩进
         * @return {string}         格式化后的字符串
         */
        json(input: any, ident?: number): string {
            return JSON.stringify(input, null, ident || 4);
        },

        /**
         * 移除所有tag标签字符串,比如"<div>123</div>" => "123"
         * @method striptags
         * @param  {string}  input  输入
         * @return {string}         输出
         */
        striptags(input: string): string {
            return input.replace(reg.striptags, "");
        },

        /**
         * 当输入为undefined或null是返回默认值
         * @method default
         * @param  {any}  input        输入
         * @param  {any}  defaultValue 默认值
         * @return {any}               根据输入返回的值
         */
        default(input: any, defaltValue: any): any {
            return input == null ? defaltValue : input;
        },

        /**
         * 根据输入的时间戳返回指定格式的日期字符串
         * @method date
         * @param  {number|string} input  时间戳
         * @param  {string}        format 要返回的时间格式
         * @return {string}               格式化后的时间字符串
         */
        date(input: number | string, format: string) {
            return formatDate(input, format);
        },

        /**
         * 在控制台上打印输入
         * @method debug
         * @param  {any}  input  输入
         * @return {any}         返回输入的值
         */
        debug<T>(input: T): T {
            console.log("Current data: ", input);
            return input;
        }
    };

    function formatDate(time, format) {
        if (!time) {
            return '';
        }
        if (typeof time === 'string') {
            time = time.replace(/-/g, "/");
        }

        var t = new Date(time);
        var y = String(t.getFullYear());
        var M = t.getMonth() + 1;
        var d = t.getDate();
        var H = t.getHours();
        var m = t.getMinutes();
        var s = t.getSeconds();

        return format.replace(reg.format, function(x) {
            switch (x) {
                case "YYYY":
                    return y;
                case "YY":
                    return y.slice(2);
                case "MM":
                    return padded(M);
                case "M":
                    return M;
                case "DD":
                    return padded(d);
                case "D":
                    return d;
                case "H":
                    return H;
                case "HH":
                    return padded(H);
                case "mm":
                    return padded(m);
                case "m":
                    return m;
                case "s":
                    return s;
                case "ss":
                    return padded(s);
            }
        });
    }

    function padded(n) {
        return n < 10 ? '0' + n : n;
    }
}