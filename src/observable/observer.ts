/// <reference path="../util/util.ts" />
/// <reference path="./observableArray.ts" />
/// <reference path="./observableObject.ts" />

/**
 * @module drunk.observable
 */
module drunk.observable {
    
    var observableIdCounter: number = 0;
     
    /**
     * 监控对象类，为每个需要监控的对象和数组生成一个实例，用于代理监听事件
     * 
     * @class Observer
     * @constructor
     */
    export class Observer {

        private _action: { [property: string]: (() => void)[] };
        private _itemChangedActions: Array<() => void>;
        
        /**
         * observer实例的id
         * 
         * @property id
         * @type number
         */
        id: number = observableIdCounter++;
        
        /**
         * 根据property来添加绑定回调，如果property为null，则添加到数据的全局监听
         * 
         * @method bind
         * @param {string|null} property  要绑定的字段名
         * @param {function}    action    监听函数
         */
        bind(property: string | any, action: () => void): void {
            if (property == null && typeof action === 'function') {
                return this._addItemChangedAction(action);
            }

            if (!this._action) {
                this._action = {};
            }

            if (!this._action[property]) {
                this._action[property] = [];
            }

            var actions = this._action[property];

            util.addArrayItem(actions, action);
        }
          
        /**
         * 移除字段的绑定监听，如果property为null，则从全局监听的回调队列中移除
         * 
         * @method unbind
         * @param {string|null} property   字段名
         * @param {function}    action     要求绑定的回调
         */
        unbind(property: string | any, action: () => void): void {
            if (property == null && typeof action === 'function') {
                return this._removeItemChangedAction(action);
            }

            if (!this._action || !this._action[property] || !this._action[property].length) {
                return;
            }

            var actions = this._action[property];

            util.removeArrayItem(actions, action);
            
            if (action.length === 0) {
                this._action[property] = null;
            }
        }
          
        /**
         * 通知某字段已更新
         * 
         * @method notify
         * @param {string} [property] 字段名，如果字段为null，则通知全局更新
         */
        notify(property?: string): void {
            if (property == null) {
                return this._notifyItemChanged();
            }

            if (!this._action || !this._action[property] || !this._action[property].length) {
                return;
            }

            var actions = this._action[property];

            actions.forEach((action) => {
                action.call(null);
            });
        }

        private _addItemChangedAction(action: () => void) {
            if (!this._itemChangedActions) {
                this._itemChangedActions = [];
            }

            util.addArrayItem(this._itemChangedActions, action);
        }

        private _removeItemChangedAction(action: () => void) {
            if (!this._itemChangedActions || !this._itemChangedActions.length) {
                return;
            }

            util.removeArrayItem(this._itemChangedActions, action);
            
            if (this._itemChangedActions.length === 0) {
                this._itemChangedActions = null;
            }
        }

        private _notifyItemChanged() {
            if (!this._itemChangedActions || !this._itemChangedActions.length) {
                return;
            }

            this._itemChangedActions.forEach((action) => {
                action.call(null);
            });
        }
    }
}
