/// <reference path="../viewmodel/viewmodel" />
/// <reference path="../template/loader" />


module drunk {
    
    export interface ComponentOptions {
        model?: Model;
        filters?: {[name: string]: filter.Filter};
        handlers?: {[name: string]:  (...args: any[]) => any};
        options?: {[key: string]: any};
        init?(): any;
    }
    
    export class Component {
        
        private _children: Component[];
        
        parent: Component;
        viewModel: ViewModel;
        
        /**
         * @class Component
         * @constructor
         */
        constructor(private _options: ComponentOptions = {}) {
            
        }
        
        private _initViewModel() {
            this.viewModel = new ViewModel(this._options.model);
            this.viewModel.setFilter(this._options.filters);
        }
        
        private _initTemplate(template: HTMLElement | string): Promise<BindingExecutor> {
            if (!template) {
                return Promise.resolve();
            }
            if (typeof template === 'string') {
                return Template.load(template).then(Template.compile);
            }
            if (template instanceof HTMLElement) {
                return Promise.resolve(Template.compile(template));
            }
            console.error(template, "非法的模板元素或模板链接");
        }
        
        /**
         * 组件初始化
         * @method initialize
         * @param  {HTMLElement|string} [template]
         */
        initialize(template: HTMLElement | string): Promise<any> {
            this._initViewModel();
            return this._initTemplate(template);
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