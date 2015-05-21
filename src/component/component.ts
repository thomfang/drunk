/// <reference path="../viewmodel/viewmodel" />
/// <reference path="../template/loader" />


module drunk {
    
    export interface ComponentOptions {
        model?: IModel;
        template?: string | HTMLElement;
        filters?: {[name: string]: filter.Filter};
        handlers?: {[name: string]:  (...args: any[]) => any};
        options?: {[key: string]: any};
        init?(): any;
    }
    
    export class Component extends ViewModel {
        
        private _children: Component[];
        
        element: Node;
        
        /**
         * 组件类，继承ViewModel类，实现了模板的准备和数据的绑定
         * 
         * @class Component
         * @constructor
         */
        constructor(private _options: ComponentOptions = {}) {
            super(_options.model);
        }
        
        /**
         * 初始化模板，解析模板的所有绑定
         * 
         * @method _initTemplate
         * @private
         * @return {Promise}
         */
        private _initTemplate(): Promise<{element: HTMLElement; executor: BindingExecutor}> {
            var template = this._options.template;
            
            if (!template) {
                return Promise.reject();
            }
            
            if (typeof template === 'string') {
                return Template.load(template).then(dom.create).then((element) => {
                    return {
                        element: element,
                        executor: Template.compile(element)
                    };
                });
            }
            
            if (template instanceof HTMLElement) {
                return Promise.resolve({
                    element: template,
                    executor: Template.compile(template)
                });
            }
            
            console.error(template, "非法的模板元素或模板链接");
        }
        
        /**
         * 组件初始化
         * @method initialize
         */
        initialize() {
            return this._initTemplate().then((context) => {
                if (this._options.init) {
                    this._options.init.call(this, context.element, context.executor);
                }
                context.executor(this, context.element);
            }, () => {
                if (this._options.init) {
                    this._options.init.call(this);
                }
            });
        }
        
        /**
         * 释放组件
         * @method dispose
         */
        dispose() {
            super.dispose();
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
        export function define(name: string, options: ComponentOptions) {
            
        }
        
        /**
         * 根据组件类的名字创建一个组件实例
         * 
         * @method create
         * @static
         * @param  {string}  name
         */
        export function create(name: string, parent?: Component, template?: any) {
            
        }
    }
}