/// <reference path="../promise/promise.ts" />
/// <reference path="../viewmodel/viewModel.ts" />
/// <reference path="../template/template.ts" />
/// <reference path="../util/dom.ts" />

module drunk {
    
    export interface BindingUpdateHandler {
        (newValue: any, oldValue: any): void;
    }
    
    export interface BindingDefiniation {
        init?(): void;
        update?(newValue: any, oldValue: any): void;
        release?(): void;
    }
    
    export interface BindingResult {
        executor: Template.BindingExecutor;
        template:HTMLElement;
    }
    
    var definitions: {[name: string]: BindingDefiniation} = {};
    
    /**
     * @module drunk.Binding
     * @class Binding
     */
    export class Binding {
        
        static Ending: string[];
        
        /**
         * 自定义一个binding指令
         * 
         * @method define
         * @static
         * @param  {string}          name  指令名
         * @param  {function|Object} def   binding实现的定义对象或绑定的更新函数
         */
        static define(name: string, def: BindingDefiniation | BindingUpdateHandler):void {
            
        }
        
        static getDefinintionByName(name: string): BindingDefiniation {
            return definitions[name];
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
        static process(viewModel: ViewModel, template: string | HTMLElement): Promise<BindingResult> {
            var promise: Promise<HTMLElement>;
            
            if (typeof template === 'string') {
                promise = Template.load(template).then(dom.create);
            }
            else {
                promise = Promise.resolve(template);
            }
            
            return promise.then<BindingResult>((template) => {
                var executor = Template.parse(template);
                
                executor(viewModel, template);
                
                return {
                    executor: executor,
                    template: template
                };
            });
        }
    }
}