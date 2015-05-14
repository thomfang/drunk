/// <reference path="../promise/promise.ts" />
/// <reference path="../viewmodel/viewModel.ts" />
/// <reference path="../template/compiler.ts" />
/// <reference path="../util/dom.ts" />
/// <reference path="../util/util.ts" />
/// <reference path="../config/config.ts" />

module drunk {
    
    export interface BindingUpdateAction {
        (newValue: any, oldValue: any): any;
    }
    
    export interface BindingDefiniation {
        name?: string;
        deep?: boolean;
        twoway?: boolean;
        expression?: string;
        retainAttribute?: boolean;
        init?(): void;
        update?(newValue: any, oldValue: any): void;
        release?(): void;
    }
    
    export interface BindingExecutor {
        (viewModel: ViewModel, element: any): void;
        isEnding?: boolean;
    }
    
    export class Binding {
        
        deep: boolean;
        twoway: boolean;
        expression: string;
        
        watcher: Watcher;
        
        init: () => void;
        update: BindingUpdateAction;
        release: () => void;
        
        /**
         * 根据绑定的定义创建一个绑定实例，根据定义进行viewModel与DOM元素绑定的初始化、视图渲染和释放
         * 
         * @class Binding
         * @constructor
         * @param  {ViewModel}          viewModel  ViewModel实例
         * @param  {HTMLElement}        element    绑定元素
         * @param  {BindingDefinition}  definition 绑定定义
         * @param  {boolean} [descriptor.deep]   是否深度监听
         * @param  {boolean} [descriptor.twoway] 是否双向绑定
         */
        constructor(public viewModel: ViewModel, public element: any, descriptor) {
            util.extend(this, descriptor);
        }
        
        initialize() {
            if (this.init) {
                this.init();
            }
            
            if (!this.update) {
                return;
            }
            
            this._update = this._update.bind(this);
        }
        
        unbindAndRelease() {
            if (this.release) {
                this.release();
            }
            
            this.element = null;
            this.viewModel = null;
            this.expression = null;
            
            util.removeArrayItem(this.viewModel._bindings, this);
        }
        
        private _update(newValue: any, oldValue: any) {
            this.update(newValue, oldValue);
        }
    }
    
    export module Binding {
    
        var endingList: {name: string; priority: number}[] = [];
        var definitionMap: {[name: string]: BindingDefiniation} = {};
        
        /**
         * 自定义一个binding指令
         * 
         * @method define
         * @static
         * @param  {string}          name  指令名
         * @param  {function|Object} def   binding实现的定义对象或绑定的更新函数
         */
        export function define(name: string, def: BindingDefiniation | BindingUpdateAction):void {
            var definition: BindingDefiniation;
            
            if (typeof def === 'function') {
                definition = {
                    update: (<BindingUpdateAction>def)
                };
            }
            else {
                definition = def;
            }
            
            if (definitionMap[name] && config.debug) {
                console.warn(name, "绑定已定义，原定义为：", definitionMap[name]);
                console.warn("替换为", def);
            }
            
            definitionMap[name] = definition;
        }
        
        /**
         * 根据绑定名获取绑定的定义
         * 
         * @method getDefinitionByName
         * @static
         * @param  {string}  name      绑定的名称
         * @return {BindingDefinition} 具有绑定定义信息的对象
         */
        export function getDefinintionByName(name: string): BindingDefiniation {
            return definitionMap[name];
        }
        
        /**
         * 设置终止型的绑定，根据提供的优先级对终止型绑定列表进行排序，优先级高的绑定会先于优先级的绑定创建
         * 
         * @method setEnding
         * @static
         * @param  {string}  name      绑定的名称
         * @param  {number}  priority  绑定的优先级
         */
        export function setEnding(name: string, priority: number): void {
            // 检测是否已经存在该绑定
            for (var i = 0, item; item = endingList[i]; i++) {
                if (item.name === name) {
                    return;
                }
            }
            
            // 添加到列表中
            endingList.push({
                name: name,
                priority: priority
            });
            
            // 重新根据优先级排序
            endingList.sort((a, b) => {
                return a.priority - b.priority;
            });
        }
        
        /**
         * 获取已经根据优先级排序的终止型绑定的名称列表
         * 
         * @method getEndingNames
         * @static
         * @return {array}  返回绑定名称列表
         */
        export function getEndingNames() {
            return endingList.map((item) => {
                return item.name;
            });
        }
        
        /**
         * 创建viewModel与模板元素的绑定
         * 
         * @method create
         * @static
         * @param  {ViewModel}   viewModel  ViewModel实例
         * @param  {HTMLElement} element    元素
         * @return {Promise}                返回promise对象
         */
        export function create(viewModel: ViewModel, element: any, descriptor: BindingDefiniation) {
            var binding: Binding = new Binding(viewModel, element, descriptor);
            
            util.addArrayItem(viewModel._bindings, binding);
            
            return Promise.resolve(binding.initialize());
        }
    }
}