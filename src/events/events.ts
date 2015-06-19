/// <reference path="../util/util.ts" />

module drunk {
    
    export interface IEventListener {
        (...args: any[]): void;
        __isOnce?: boolean;
    }
    
    let eventStore: {[id: number]: {[type: string]: IEventListener[]}} = {};
    
    function getStore(emitter: EventEmitter) {
        let id = util.uuid(emitter);
        
        if (!eventStore[id]) {
            eventStore[id] = {};
        }
        
        return eventStore[id];
    }
    
    /**
     * 事件管理类
     * 
     * @class EventEmitter
     */
    export class EventEmitter {
        
        /**
         * 注册事件
         * @method addListener
         * @param  {string}          type       事件类型
         * @param  {IEventListener}   listener   事件回调
         * @return {EventEmitter}
         */
        addListener(type: string, listener: IEventListener) {
            let store = getStore(this);
            
            if (!store[type]) {
                store[type] = [];
            }
            
            util.addArrayItem(store[type], listener);
            return this;
        }
        
        /**
         * 注册事件,addListener方法的别名
         * @method on
         * @param  {string}           type       事件类型
         * @param  {IEventListener}   listener   事件回调
         * @return {EventEmitter}
         */
        on(type: string, listener: IEventListener) {
            return this.addListener(type, listener);
        }
        
        /**
         * 注册一次性事件
         * @method once
         * @param  {string}         type      事件类型
         * @param  {IEventListener} listener  事件回调
         * @return {EventEmitter}
         */
        once(type: string, listener: IEventListener) {
            listener.__isOnce = true;
            this.addListener(type, listener);
            return this;
        }
        
        /**
         * 移除指定类型的事件监听
         * @method removeListener
         * @param  {string}         type     事件类型
         * @param  {IEventListener}  listener 事件回调
         * @return {EventEmitter}
         */
        removeListener(type: string, listener: IEventListener) {
            let store = getStore(this);
            let listeners = store[type];
            
            if (!listeners || !listeners.length) {
                return;
            }
            
            util.removeArrayItem(listeners, listener);
            return this;
        }
        
        /**
         * 移除所有指定类型的事件,或当事件类型未提供时,移除所有该实例上所有的事件
         * @method removeAllListeners
         * @param  {string}  [type]  事件类型
         * @return {EventEmitter}
         */
        removeAllListeners(type?: string) {
            if (!type) {
                EventEmitter.cleanup(this);
            }
            else {
                getStore(this)[type] = null;
            }
            return this;
        }
        
        /**
         * 派发指定类型事件
         * 
         * @method emit
         * @param  {string}  type        事件类型
         * @param  {any[]}   [...args]    其他参数
         * @return {EventEmitter}
         */
        emit(type: string, ...args: any[]) {
            let store = getStore(this);
            let listeners = store[type];
            
            if (!listeners || !listeners.length) {
                return;
            }
            
            listeners.slice().forEach((listener) => {
                listener.apply(this, args);
                
                if (listener.__isOnce) {
                    util.removeArrayItem(listeners, listener);
                }
            });
            
            return this;
        }
        
        /**
         * 获取指定事件类型的所有listener回调
         * @method listeners
         * @param  {string}  type  事件类型
         * @return {Array<IEventListener>}
         */
        listeners(type: string): IEventListener[] {
            var listeners: IEventListener[] = getStore(this)[type];
            return listeners ? listeners.slice() : [];
        }
        
        /**
         * 获取事件实例的指定事件类型的回调技术
         * @method listenerCount
         * @static
         * @param  {EventEmitter} emitter  事件类实例
         * @param  {string} type            事件类型
         * @return {number}
         */
        static listenerCount(emitter: EventEmitter, type: string): number {
            let store = getStore(emitter);
            
            if (!store[type]) {
                return 0;
            }
            
            return store[type].length;
        }
        
        /**
         * 移除对象的所有事件回调引用
         * @method cleanup
         * @static
         * @param  {EventEmitter}  emitter  事件发射器实例
         */
        static cleanup(emitter: EventEmitter) {
            let id = util.uuid(emitter);
            eventStore[id] = null;
        };
    }
}