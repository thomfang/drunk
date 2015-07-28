/// <reference path="../util/util" />

module drunk {
    
    const uuidOfNaN = util.uuid({});
    const uuidOfNull = util.uuid({});
    const uuidOfUndefined = util.uuid({});
    const uuidOfTrue = util.uuid({});
    const uuidOfFalse = util.uuid({});
    
    /**
     * Map类，可把任务类型的对象作为key
     */
    export class Map<T> {
        
        /**
         * 对应Key的数据
         */
        private _store: {[key: string]: T} = {};
        
        /**
         * 所有的key的列表
         */
        private _keys: any[] = [];
        
        /**
         * 所有的key生成的uuid的列表
         */
        private _uuids: any[] = [];
        
        /**
         * 获取指定key的uuid
         */
        private _uuidOf(key: any): number {
            let type = typeof key;
            let uuid: any;
            
            if (type !== 'object') {
                if (isNaN(key)) {
                    uuid = uuidOfNaN;
                }
                else if (key === null) {
                    uuid = uuidOfNull;
                }
                else if (key === undefined) {
                    uuid = uuidOfUndefined;
                }
                else if (key === true) {
                    uuid = uuidOfTrue;
                }
                else if (key === false) {
                    uuid = uuidOfFalse;
                }
                else if (type === 'string') {
                    uuid = '"' + key + '"';
                }
                else if (type === 'number') {
                    uuid = '-' + key + '-';
                }
                else {
                    throw new Error('Not support type');
                }
            }
            else {
                uuid = util.uuid(key);
            }
            
            return uuid;
        }
        
        /**
         * 设值
         * @param   key  键,可为任意类型
         * @param  value 值 
         */
        set(key: any, value: T): Map<T> {
            let uuid = this._uuidOf(key);
            
            if (this._uuids.indexOf(uuid) < 0) {
                this._uuids.push(uuid);
                this._keys.push(key);
            }
            
            this._store[uuid] = value;
            return this;
        }
        
        /**
         * 取值
         * @param key  键名
         */
        get(key: any) {
            let uuid = this._uuidOf(key);
            return this._store[uuid];
        }
        
        /**
         * 是否有对应键的值
         * @param  key 键名
         */
        has(key: any): boolean {
            let uuid = this._uuidOf(key);
            return this._uuids.indexOf(uuid) > -1;
        }
        
        /**
         * 删除指定键的记录
         * @param   key 键名
         */
        delete(key: any): boolean {
            let uuid = this._uuidOf(key);
            let index = this._uuids.indexOf(uuid);
            if (index > -1) {
                this._uuids.splice(index, 1);
                this._keys.splice(index, 1);
                delete this._store[uuid];
                return true;
            }
            return false;
        }
        
        /**
         * 清除所有的成员
         */
        clear() {
            this._keys = [];
            this._uuids = [];
            this._store = {};
        }
        
        /**
         * 遍历
         * @param   callback  回调
         * @param   context   上下文,回调里的this参数
         */
        forEach(callback: (value: T, key: any, map: Map<T>) => any, context?: any) {
            let uuids = this._uuids.slice();
            
            this.keys().forEach((key, index) => {
                let uuid = uuids[index];
                callback.call(context, this._store[uuid], key, this);
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
            return this._uuids.map(uuid => this._store[uuid]);
        }
        
        /**
         * map的成员个数
         */
        get size() {
            return this._keys.length;
        }
    }
}