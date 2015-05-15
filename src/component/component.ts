/// <reference path="../viewmodel/viewmodel" />

module drunk {
    
    export class Component {
        
        private _children: Component[];
        
        model: Model;
        filters: {[name: string]: Function};
        handlers: {[name: string]: Function};
        
        templateUrl: string;
        
        parent: Component;
        
        /**
         * @class Component
         * @constructor
         */
        constructor(options) {
            
        }
        
        /**
         * 释放组件
         * @method release
         */
        release() {
            
        }
    }
    
    export module Component {
        
        /**
         * 自定义一个组件类
         * 
         * @method define
         * @static
         * @param  {string}
         */
        export function define(name: string, options) {
            
        }
        
        /**
         * 根据组件类的名字创建一个组件实例
         * 
         * @method create
         * @static
         * @param  {string}  name
         */
        export function create(name: string, parent?: Component | ViewModel, template?: any) {
            
        }
    }
}