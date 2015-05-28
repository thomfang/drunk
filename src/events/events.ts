/// <reference path="../util/util.ts" />

module drunk {
    
    export interface EventListener {
        (...args: any[]): void;
    }
    
    var eventCache: {[id: number]: {[type: string]: EventListener[]}} = {};
    
    function getCache(object: any) {
        var id = util.uuid(object);
        
        if (!eventCache[id]) {
            eventCache[id] = {};
        }
        
        return eventCache[id];
    }
    
    /**
     * 事件管理类
     * 
     * @class Events
     */
    export class Events {
        
        /**
         * 注册事件
         * 
         * @method addListener
         * @param  {string}          type       事件类型
         * @param  {EventListener}   listener   事件回调
         */
        addListener(type: string, listener: EventListener): void {
            var cache = getCache(this);
            
            if (!cache[type]) {
                cache[type] = [];
            }
            
            util.addArrayItem(cache[type], listener);
        }
        
        /**
         * 移除指定类型的事件监听
         * 
         * @method removeListener
         * @param  {string}         type     事件类型
         * @param  {EventListener}  listener 事件回调
         */
        removeListener(type: string, listener: EventListener): void {
            var cache = getCache(this);
            var listeners = cache[type];
            
            if (!listeners || listeners.length) {
                return;
            }
            
            util.removeArrayItem(listeners, listener);
        }
        
        /**
         * 派发指定类型事件
         * 
         * @method dispatchEvent
         * @param  {string}  type       事件类型
         * @param  {any[]}   ...args    其他参数
         */
        dispatchEvent(type: string, ...args: any[]): void {
            var cache = getCache(this);
            var listeners = cache[type];
            
            if (!listeners || !listeners.length) {
                return;
            }
            
            listeners.slice().forEach((listener) => {
                listener.apply(this, args);
            });
        }
        
        /**
         * 获取事件实例的指定事件类型的回调技术
         * @method getListenerCount
         * @static
         * @param  {Events} instance  事件类实例
         * @param  {string} type      事件类型
         * @return {number}
         */
        static getListenerCount(object: any, type: string): number {
            var cache = getCache(object);
            
            if (!cache[type]) {
                return 0;
            }
            
            return cache[type].length;
        }
        
        /**
         * 移除对象的所有事件回调引用
         * @method cleanup
         * @static
         * @param  {object}  object  指定对象
         */
        static cleanup(object: any) {
            var id = util.uuid(object);
            eventCache[id] = null;
        };
    }
}