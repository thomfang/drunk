/// <reference path="../util/util.ts" />

namespace drunk {

    import util = drunk.util;

    const UID_OF_NAN = util.uniqueId({});
    const UID_OF_NULL = util.uniqueId({});
    const UID_OF_TRUE = util.uniqueId({});
    const UID_OF_FALSE = util.uniqueId({});
    const UID_OF_UNDEFINED = util.uniqueId({});

    /**
     * Map类，可把任务类型的对象作为key
     */
    export class Map<T> {

        /**
         * 对应Key的数据
         */
        private _values: { [key: string]: T } = {};

        /**
         * 所有的key的列表
         */
        private _keys: any[] = [];

        /**
         * 所有的key生成的uid的列表
         */
        private _uids: any[] = [];

        /**
         * 获取指定key的uid
         */
        private _uidOf(key: any): number {
            if (key === null) {
                return UID_OF_NULL;
            }
            if (key === undefined) {
                return UID_OF_UNDEFINED;
            }
            if (key === true) {
                return UID_OF_TRUE;
            }
            if (key === false) {
                return UID_OF_FALSE;
            }

            let type = typeof key;
            
            if (type === 'object') {
                return util.uniqueId(key);
            }
            if (type === 'string') {
                return <any>('"' + key + '"');
            }
            if (isNaN(key)) {
                return UID_OF_NAN;
            }
            if (type === 'number') {
                return <any>('-' + key + '-');
            }
            throw new Error(`不支持的数据类型: ${type}`);
        }

        /**
         * 设值
         * @param   key  键,可为任意类型
         * @param  value 值 
         */
        set(key: any, value: T): Map<T> {
            let uid = this._uidOf(key);

            if (this._uids.indexOf(uid) < 0) {
                this._uids.push(uid);
                this._keys.push(key);
            }

            this._values[uid] = value;
            return this;
        }

        /**
         * 取值
         * @param key  键名
         */
        get(key: any) {
            let uid = this._uidOf(key);
            return this._values[uid];
        }

        /**
         * 是否有对应键的值
         * @param  key 键名
         */
        has(key: any): boolean {
            let uid = this._uidOf(key);
            return this._uids.indexOf(uid) > -1;
        }

        /**
         * 删除指定键的记录
         * @param   key 键名
         */
        delete(key: any): boolean {
            let uid = this._uidOf(key);
            let index = this._uids.indexOf(uid);
            if (index > -1) {
                this._uids.splice(index, 1);
                this._keys.splice(index, 1);
                delete this._values[uid];
                return true;
            }
            return false;
        }

        /**
         * 清除所有的成员
         */
        clear() {
            this._keys = [];
            this._uids = [];
            this._values = {};
        }

        /**
         * 遍历
         * @param   callback  回调
         * @param   context   上下文,回调里的this参数
         */
        forEach(callback: (value: T, key: any, map: Map<T>) => any, context?: any) {
            let uids = this._uids.slice();

            this.keys().forEach((key, index) => {
                let uid = uids[index];
                callback.call(context, this._values[uid], key, this);
            });
        }

        /**
         * 获取所有的key
         */
        keys() {
            return this._keys.slice();
        }

        /**
         * 获取所有的值
         */
        values() {
            return this._uids.map(uid => this._values[uid]);
        }

        /**
         * map的成员个数
         */
        get size() {
            return this._keys.length;
        }
    }
}