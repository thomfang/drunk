/// <reference path="../util/util.ts" />

module drunk {
    
    export interface IEventListener {
        (...args: any[]): void;
    }
    
    let eventStore: {[id: number]: {[type: string]: IEventListener[]}} = {};
    
    function getStore(object: any) {
        let id = util.uuid(object);
        
        if (!eventStore[id]) {
            eventStore[id] = {};
        }
        
        return eventStore[id];
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
         * @param  {IEventListener}   listener   事件回调
         */
        addListener(type: string, listener: IEventListener): void {
            let store = getStore(this);
            
            if (!store[type]) {
                store[type] = [];
            }
            
            util.addArrayItem(store[type], listener);
        }
        
        /**
         * 移除指定类型的事件监听
         * 
         * @method removeListener
         * @param  {string}         type     事件类型
         * @param  {IEventListener}  listener 事件回调
         */
        removeListener(type: string, listener: IEventListener): void {
            let store = getStore(this);
            let listeners = store[type];
            
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
            let store = getStore(this);
            let listeners = store[type];
            
            if (!listeners || !listeners.length) {
                return;
            }
            
            listeners.slice().forEach((listener) => {
                listener(this, ...args);
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
            let store = getStore(object);
            
            if (!store[type]) {
                return 0;
            }
            
            return store[type].length;
        }
        
        /**
         * 移除对象的所有事件回调引用
         * @method cleanup
         * @static
         * @param  {object}  object  指定对象
         */
        static cleanup(object: any) {
            let id = util.uuid(object);
            eventStore[id] = null;
        };
    }
}