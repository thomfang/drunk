/// <reference path="../promise/promise.ts" />
/// <reference path="../viewmodel/viewModel.ts" />
/// <reference path="../template/template.ts" />
/// <reference path="../util/dom.ts" />
/// <reference path="../util/util.ts" />
/// <reference path="../config/config.ts" />

module drunk {
    
    export interface BindingUpdateHandler {
        (newValue: any, oldValue: any): void;
    }
    
    export interface BindingDefiniation {
        expression?: string;
        element?: HTMLElement;
        viewModel?: ViewModel;
        init?(): void;
        update?(newValue: any, oldValue: any): void;
        release?(): void;
    }
    
    export interface BindingResult {
        executor: Template.BindingExecutor;
        template:HTMLElement;
    }
    
    var definitionMap: {[name: string]: BindingDefiniation} = {};
    var endingList: {name: string; priority: number}[];
    
    /**
     * @module drunk.Binding
     * @class Binding
     */
    export class Binding {
        
        /**
         * 自定义一个binding指令
         * 
         * @method define
         * @static
         * @param  {string}          name  指令名
         * @param  {function|Object} def   binding实现的定义对象或绑定的更新函数
         */
        static define(name: string, def: BindingDefiniation | BindingUpdateHandler):void {
            var definition: BindingDefiniation;
            
            if (typeof def === 'function') {
                definition = {
                    update: (<BindingUpdateHandler>def)
                };
            }
            else {
                definition = def;
            }
            
            if (definitionMap[name] && config.debug) {
                console.warn(name, "绑定已经存在，原定义为：", definitionMap[name]);
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
        static getDefinintionByName(name: string): BindingDefiniation {
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
        static setEnding(name: string, priority: number): void {
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
        static getEndingNames() {
            return endingList.map((item) => {
                return item.name;
            });
        }
        
        /**
         * 绑定viewModel与模板元素
         * 如果提供元素节点,解析元素上的绑定指令生成绑定方法,再创建绑定
         * 如果提供的是模板链接,先加载链接生成HTML元素在进行绑定操作
         * 
         * @method process
         * @static
         * @param  {ViewModel}          viewModel  ViewModel实例
         * @param  {HTMLElement|string} template   模板元素或模板链接
         * @return {Promise}                       返回promise对象
         */
        static process(viewModel: ViewModel, template: HTMLElement) {
            var executor = Template.parse(template, true);
                
            executor(viewModel, template);
            
            return {
                executor: executor,
                template: template
            };
        }
        
        init: () => void;
        update: BindingUpdateHandler;
        release: () => void;
        
        /**
         * @class Binding
         * @constructor
         * @param  {ViewModel}          viewModel  ViewModel实例
         * @param  {HTMLElement}        element    绑定元素
         * @param  {BindingDefinition}  definition 绑定定义
         */
        constructor(public viewModel: ViewModel, public element: HTMLElement, definition: BindingDefiniation) {
            this.init = definition.init;
            this.update = definition.update;
            this.release = definition.release;
//            this.expression = definition.expression;
            this._init();
        }
        
        private _init() {
            if (this.init) {
                this.init();
            }
            
            if (!this.update) {
                return;
            }
        }
        
        private _update(newValue: any, oldValue: any) {
            this.update(newValue, oldValue);
        }
    }
}