/// <reference path="../viewmodel/viewmodel" />
/// <reference path="../template/loader" />

module drunk {
    
    export interface IComponent {
        name?: string;
        init?: () => void;
        data?: {[name: string]: any};
        filters?: { [name: string]: filter.IFilter };
        watchers?: { [expression: string]: (newValue: any, oldValue: any) => void};
        handlers?: {[name: string]: (...args: any[]) => any};
        element?: Node | Node[];
        template?: string;
        templateUrl?: string;
    }
    
    export interface IComponentContructor<T extends IComponent> {
        extend?<T extends IComponent>(name: string | T, members?: T): IComponentContructor<T>;
        (...args: any[]): T;
    }

    export class Component extends ViewModel {
        
        /**
         * 获取组件所属的上级的viewModel和组件标签(组件标签类似于:<my-view></my-view>)
         * @event GET_COMPONENT_CONTEXT
         * @param {string}  eventName  需要响应的事件名
         */
        static GET_COMPONENT_CONTEXT = "get:component:contenxt";
        
        /**
         * 子组件被创建时触发的事件
         * @event SUB_COMPONENT_CREATED
         * @param  {Component}  component 触发的回调中得到的组件实例参数
         */
        static SUB_COMPONENT_CREATED = "new:sub:component";
        
        /**
         * 子组件的与视图挂载并创建绑定之后触发的事件
         * @event SUB_COMPONENT_MOUNTED
         * @param  {Component}  component 触发的回调中得到的组件实例参数
         */
        static SUB_COMPONENT_MOUNTED = "sub:component:mounted";
        
        /**
         * 子组件即将被销毁触发的事件
         * @event SUB_COMPONENT_BEFORE_RELEASE
         * @param  {Component}  component 触发的回调中得到的组件实例参数
         */
        static SUB_COMPONENT_BEFORE_RELEASE = "sub:component:before:release";
        
        /**
         * 子组件已经释放完毕触发的事件
         * @event SUB_COMPONENT_RELEASED
         * @param  {Component}  component 触发的回调中得到的组件实例参数
         */
        static SUB_COMPONENT_RELEASED = "sub:component:released";
        
        /**
         * 当前实例挂载到dom上时
         * @event MOUNTED
         */
        static MOUNTED = "component:mounted";
        
        /**
         * 组件是否已经挂在到元素上
         * @property _isMounted
         * @private
         * @type boolean
         */
        private _isMounted: boolean;
        
        /**
         * 组件被定义的名字
         * @property name
         * @type string
         */
        name: string;
        
        /**
         * 作为模板并与数据进行绑定的元素,可以创建一个组件类是指定该属性用于与视图进行绑定
         * @property element
         * @type HTMLElement
         */
        element: Node | Node[];
        
        /**
         * 组件的模板字符串,如果提供该属性,在未提供element属性的情况下会创建为模板元素
         * @property template
         * @type string
         */
        template: string;
        
        /**
         * 组件的模板路径,可以是页面上某个标签的id,默认先尝试当成标签的id进行查找,找到的话使用该标签的innerHTML作为模板字符串,
         * 未找到则作为一个服务端的链接发送ajax请求获取
         * @property templateUrl
         * @type string
         */
        templateUrl: string;
        
        /**
         * 组件的数据,会被初始化到Model中,可以为一个函数,函数可以直接返回值或一个处理值的Promise对象
         * @property data
         * @type {[name: string]: any}
         */
        data: {[name: string]: any};
        
        /**
         * 该组件作用域下的数据过滤器表
         * @property filters
         * @type {[name]: Filter}
         */
        filters: { [name: string]: filter.IFilter };
        
        /**
         * 该组件作用域下的事件处理方法
         * @property handlers
         * @type {[name]: Function}
         */
        handlers: { [name: string]: (...args) => void };
        
        /**
         * 监控器描述,key表示表达式,值为监控回调
         * @property watchers
         * @type object
         */
        watchers: { [expression: string]: (newValue: any, oldValue: any) => void };
        
        /**
         * 实例创建时会调用的初始化方法
         * @property init
         * @type function
         */
        init: () => void;
        
        /**
         * 组件类，继承ViewModel类，实现了模板的准备和数据的绑定
         * 
         * @class Component
         * @constructor
         */
        constructor(model?: IModel) {
            super(model);
        }

        protected __init(model?: IModel) {
            super.__init.call(this, model);

            if (this.filters) {
                // 如果配置了过滤器
                util.extend(this.filter, this.filters);
            }
            if (this.handlers) {
                // 如果配置了事件处理函数
                util.extend(this, this.handlers);
            }
            if (this.init) {
                this.init();
            }
            if (this.watchers) {
                // 如果配置了监控器
                Object.keys(this.watchers).forEach((expression) => {
                    this.watch(expression, this.watchers[expression]);
                });
            }
            if (this.data) {
                // 如果有配置数据源,类似: {
                //     "matchlist": function () { return drunk.xhr('matchlist.json');  }
                //     "counter": 0
                // }

                Object.keys(this.data).forEach(name => {
                    var data = this.data[name];

                    if (typeof data === 'function') {
                        // 如果是一个函数,直接调用该函数
                        data = data();
                    }
                
                    // 代理该数据字段
                    this.proxy(name);
                
                    // 不论返回的是什么值,使用promise进行处理
                    Promise.resolve(data).then(result => {
                        this[name] = result;
                    }, (reason) => {
                        console.warn("数据准备失败:", reason);
                    });
                });
            }
        }
        
        /**
         * 处理模板，并返回模板元素
         * 
         * @method processTemplate
         * @return {Promise}
         */
        processTemplate(templateUrl?: string): Promise<any> {
            function onFailed(reason) {
                console.warn("模板加载失败: " + templateUrl, reason);
            }
            
            if (typeof templateUrl === 'string') {
                return Template.load(templateUrl).then(dom.create).catch(onFailed);
            }
            
            if (this.element) {
                return Promise.resolve(this.element);
            }
            
            if (typeof this.template === 'string') {
                return Promise.resolve(dom.create(this.template));
            }
            
            templateUrl = this.templateUrl;
            
            if (typeof templateUrl === 'string') {
                return Template.load(templateUrl).then(dom.create).catch(onFailed);
            }
            
            throw new Error((this.name || (<any>this.constructor).name) + "组件模板未指定");
        }
        
        /**
         * 把组件挂载到元素上
         * @method mount
         */
        mount(element: Node | Node[]) {
            console.assert(!this._isMounted, "该组件已有挂载到", this.element);
        
            if (element['__viewModel']) {
                return console.error("Component.$mount(element): 尝试挂载到一个已经挂载过组件实例的元素节点", element);
            }
    
            Template.compile(element)(this, element);
            
            element['__viewModel'] = this;
            
            this.element = element;
            this._isMounted = true;
            
            this.dispatchEvent(Component.MOUNTED);
        }
        
        /**
         * 释放组件
         * @method dispose
         */
        dispose() {
            super.dispose();
            
            if (this._isMounted) {
                this.element['__viewModel'] = null;
                this._isMounted = false;
            }
            this.element = null;
        }
    }

    export module Component {
    
        export var defined = {};
        
        /**
         * 自定义一个组件类
         * 
         * @method define
         * @static
         * @param  {string}
         */
        export function define<T extends IComponent>(name: string, members: T) {
            members.name = name;
            return;
        }
        
        export function extend<T extends IComponent>(name: string | T, members?: T) {
            if (arguments.length === 1 && util.isObject(name)) {
                members = arguments[0];
                name = members.name;
            }
            else {
                members.name = arguments[0];
            }
            
            var _super = this;
            var prototype = Object.create(_super.prototype);
            
            var component: IComponentContructor<T> = function (...args: any[]) {
                return _super(this, ...args);
            };
    
            util.extend(prototype, members);
    
            component.prototype = prototype;
            prototype.constructor = component;
    
            if (name) {
                Component.register((<string>name), component);
            }
            else {
                component.extend = Component.extend;
            }
    
            return component;
        }
        
        export function register<T>(name: string, componentContructor: IComponentContructor<T>) {
            console.assert(name.indexOf('-') > -1, "非法组件名:" + name + '组件明必须带"-"字符,如"custom-view".');
            
            if (defined[name] != null) {
                console.warn('组件 "' + name + '" 已被覆盖,请确认该操作');
            }
            
            componentContructor.extend = Component.extend;
            defined[name] = componentContructor;
        }
    }
}