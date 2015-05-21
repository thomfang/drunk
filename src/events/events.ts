/// <reference path="../util/util.ts" />

module drunk {
    
    export interface EventListener {
        (...args: any[]): void;
    }
    
    /**
     * 事件管理类
     * 
     * @class Events
     */
    export class Events {
        
        /**
         * 事件缓存
         * 
         * @property _events
         * @private
         */
        protected _events: {[type: string]: EventListener[]} = {};
        
        /**
         * 注册事件
         * 
         * @method addListener
         * @param  {string}          type       事件类型
         * @param  {EventListener}   listener   事件回调
         */
        addListener(type: string, listener: EventListener): void {
            if (!this._events[type]) {
                this._events[type] = [];
            }
            
            util.addArrayItem(this._events[type], listener);
        }
        
        /**
         * 移除指定类型的事件监听
         * 
         * @method removeListener
         * @param  {string}         type     事件类型
         * @param  {EventListener}  listener 事件回调
         */
        removeListener(type: string, listener: EventListener): void {
            var listeners = this._events[type];
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
            var listeners = this._events[type];
            if (!listeners || !listeners.length) {
                return;
            }
            
            listeners.slice().forEach((listener) => {
                listener.apply(this, args);
            });
        }
    }
}