/// <reference path="../util/util.ts" />
/// <reference path="./observableArray.ts" />
/// <reference path="./observableObject.ts" />
/// <reference path="../events/eventemitter" />

namespace drunk.observable {
    
    /**
     * 监控对象类，为每个需要监控的对象和数组生成一个实例，用于代理监听事件
     */
    export class Observer extends EventEmitter {
        
        /**
         * 属性改变的回调函数列表
         */
        private _propertyChangedCallbackList: IEventListener[];
        
        /**
         * 添加任意属性改变的回调
         */
        addPropertyChangedCallback(callback: IEventListener) {
            if (!this._propertyChangedCallbackList) {
                this._propertyChangedCallbackList = [];
            }
            util.addArrayItem(this._propertyChangedCallbackList, callback);
        }
        
        /**
         * 移除任意属性改变的指定回调
         */
        removePropertyChangedCallback(callback: IEventListener) {
            if (!this._propertyChangedCallbackList) {
                return;
            }
            util.removeArrayItem(this._propertyChangedCallbackList, callback);
            
            if (this._propertyChangedCallbackList.length === 0) {
                this._propertyChangedCallbackList = null;
            }
        }
          
        /**
         * 发送任意属性改变的通知
         */
        notify() {
            if (!this._propertyChangedCallbackList) {
                return;
            }
            
            this._propertyChangedCallbackList.forEach(callback => callback());
        }
    }
}
