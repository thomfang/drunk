/// <reference path="./util" />

/**
 * 搜索字符串解析模块
 * @module drunk.querystring
 * @class querystring
 */
module drunk.querystring {
    
    /**
     * 解析字符串生成一个键值对表
     * @method parse
     * @static
     * @param  {string}  str  搜索字符串
     * @return {Object}
     */
    export function parse(str: string) {
        str = decodeURIComponent(str);
        
        let ret: {[key: string]: string} = {};
        
        str.split('&').forEach((pair) => {
            let arr = pair.split('=');
            ret[arr[0]] = arr[1];
        });
        
        return ret;
    }
    
    /**
     * 把一个键值对表转化为搜索字符串
     * @method stringify
     * @static
     * @param  {Object} obj 键值对表
     * @return {string}
     */
    export function stringify(obj: Object) {
        return Object.keys(obj).map(key => key + '=' + encodeURIComponent(obj[key])).join('&');
    }
}