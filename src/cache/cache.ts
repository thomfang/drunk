module drunk {
    
    var cacheList: Cache<any>[] = [];
    
    /**
     * 简单缓存类,提供简单的设置获取移除和清空功能
     * @module drunk.cache
     * @class Cache
     */
    export class Cache<T> {
        
        /**
         * 清空所有缓存实例
         * @method cleanup
         * @static
         */
        static cleanup() {
            cacheList.forEach(cache => cache.cleanup());
        }
        
        /**
         * 存储中心
         * @property _store
         * @private
         * @type object
         */
        private _store: {[key: string]: T} = {};
        
        constructor() {
            cacheList.push(this);
        }
        
        /**
         * 根据key获取缓存的值
         * @method get
         * @param  {string}  key  要获取的字段
         * @return {T}
         */
        get(key: string): T {
            return this._store[key];
        }
        
        /**
         * 根据key和value设置缓存
         * @method  set
         * @param  {string}  key   要缓存的字段
         * @param  {any}     value 要缓存的值
         */
        set(key: string, value: T) {
            this._store[key] = value;
        }
        
        /**
         * 移除对应字段的缓存
         * @method remove
         * @param  {string}  key  要移除的字段
         */
        remove(key: string) {
            delete this._store[key];
        }
        
        /**
         * 清空该实例下所有的缓存
         * @method cleanup
         */
        cleanup() {
            Object.keys(this._store).forEach(key => {
                delete this._store[key];
            });
        }
    }
}