/// <reference path="../viewmodel/viewmodel.ts" />
/// <reference path="../template/loader.ts" />
/// <reference path="../template/compiler.ts" />
/// <reference path="../config/config.ts" />
/// <reference path="../util/dom.ts" />
/// <reference path="../util/util.ts" />


namespace drunk {

    import dom = drunk.dom;
    import util = drunk.util;
    import config = drunk.config;
    import Template = drunk.Template;
    import ViewModel = drunk.ViewModel;

    let refKey = 'DRUNK-COMPONENT-ID';
    let record: { [name: string]: boolean } = {};
    let styleSheet: any;

    export interface IComponent {
        name?: string;
        init?: () => void;
        data?: { [name: string]: any };
        filters?: { [name: string]: filter.IFilter };
        watchers?: { [expression: string]: IBindingUpdateAction };
        handlers?: { [name: string]: Function };
        element?: Node | Node[];
        template?: string;
        templateUrl?: string;
    }

    export interface IComponentContructor<T extends IComponent> {
        extend?<T extends IComponent>(name: string | T, members?: T): IComponentContructor<T>;
        (...args: any[]): void;
    }

    export interface IComponentEvent {
        created: string;
        release: string;
        mounted: string;
    }

    export class Component extends ViewModel {

        /**
         * 组件是否已经挂在到元素上
         */
        private _isMounted: boolean;

        /**
         * 组件被定义的名字
         */
        name: string;

        /**
         * 作为模板并与数据进行绑定的元素,可以创建一个组件类是指定该属性用于与视图进行绑定
         */
        element: Node | Node[];

        /**
         * 组件的模板字符串,如果提供该属性,在未提供element属性的情况下会创建为模板元素
         */
        template: string;

        /**
         * 组件的模板路径,可以是页面上某个标签的id,默认先尝试当成标签的id进行查找,找到的话使用该标签的innerHTML作为模板字符串,
         * 未找到则作为一个服务端的链接发送ajax请求获取
         */
        templateUrl: string;

        /**
         * 组件的数据,会被初始化到Model中,可以为一个函数,函数可以直接返回值或一个处理值的Promise对象
         */
        data: { [name: string]: any };

        /**
         * 该组件作用域下的事件处理方法
         */
        handlers: { [name: string]: (...args) => void };

        /**
         * 监控器描述,key表示表达式,值为监控回调
         */
        watchers: { [expression: string]: (newValue: any, oldValue: any) => void };

        /**
         * 组件类，继承ViewModel类，实现了模板的准备和数据的绑定
         * @param  model  初始化的数据
         */
        constructor(model?: IModel) {
            super(model);
            Component.instancesById[util.uuid(this)] = this;
        }

        /**
         * 实例创建时会调用的初始化方法,派生类可覆盖该方法
         */
        init() {

        }

        /**
         * 该组件作用域下的数据过滤器表
         */
        private __filters: { [name: string]: filter.IFilter };

        set filters(newValue: { [name: string]: filter.IFilter }) {
            if (this.$filter) {
                util.extend(this.$filter, newValue);
            }
            this.__filters = newValue;
        }

        get filters() {
            return this.__filters;
        }

        /**
         * 属性初始化
         * @param  model 数据
         */
        protected __init(model?: IModel) {
            super.__init.call(this, model);

            util.defineProperty(this, '_isMounted', false);

            if (this.filters) {
                // 如果配置了过滤器
                util.extend(this.$filter, this.filters);
            }
            if (this.handlers) {
                // 如果配置了事件处理函数
                util.extend(this, this.handlers);
            }

            if (this.data) {
                Object.keys(this.data).forEach(name => {
                    var data = this.data[name];

                    if (typeof data === 'function') {
                        // 如果是一个函数,直接调用该函数
                        data = data.call(this);
                    }

                    // 代理该数据字段
                    this.$proxy(name);

                    // 不论返回的是什么值,使用promise进行处理
                    Promise.resolve(data).then(
                        result => {
                            this[name] = result;
                        },
                        reason => {
                            console.warn("数据准备失败:", reason);
                        });
                });
            }

            this.init();

            if (this.watchers) {
                // 如果配置了监控器
                Object.keys(this.watchers).forEach((expression) => {
                    this.$watch(expression, this.watchers[expression]);
                });
            }
        }

        /**
         * 处理模板，并返回模板元素
         */
        $processTemplate(templateUrl?: string): Promise<any> {
            function onFailed(reason) {
                console.warn("模板加载失败: " + templateUrl, reason);
            }

            if (typeof templateUrl === 'string') {
                return Template.renderFragment(templateUrl, null, true).then(fragment => util.toArray(fragment.childNodes)).catch(onFailed);
            }

            if (this.element) {
                return Promise.resolve(this.element);
            }

            if (typeof this.template === 'string') {
                return Promise.resolve(dom.create(this.template));
            }

            templateUrl = this.templateUrl;

            if (typeof templateUrl === 'string') {
                return Template.renderFragment(templateUrl, null, true).then(fragment => util.toArray(fragment.childNodes)).catch(onFailed);
            }

            throw new Error((this.name || (<any>this.constructor).name) + "组件的模板未指定");
        }

        /**
         * 把组件挂载到元素上
         * @param  element         要挂在的节点或节点数组
         * @param  ownerViewModel  父级viewModel实例
         * @param  placeholder     组件占位标签
         */
        $mount<T extends Component>(element: Node | Node[], ownerViewModel?: T, placeholder?: HTMLElement) {
            console.assert(!this._isMounted, "该组件已有挂载到", this.element);

            if (Component.getByElement(element)) {
                console.error("$mount(element): 尝试挂载到一个已经挂载过组件实例的元素节点", element);
                return;
            }

            Template.compile(element)(this, element, ownerViewModel, placeholder);

            this.element = element;
            this._isMounted = true;

            let nodeList: Node[] = Array.isArray(element) ? <Node[]>element : [element];
            nodeList.forEach(node => Component.setWeakRef(node, this));
        }

        /**
         * 释放组件
         */
        $release() {
            this.$emit(Component.Event.release, this);

            super.$release();

            if (this._isMounted) {
                this._isMounted = false;

                let nodeList: Node[] = Array.isArray(this.element) ? <Node[]>this.element : [<Node>this.element];
                nodeList.forEach(node => Component.removeWeakRef(node));
                dom.remove(this.element);
            }

            Component.instancesById[util.uuid(this)] = this.element = null;
        }

        /**
         * 定义的组件记录
         */
        static constructorsByName: { [name: string]: IComponentContructor<any> } = {};

        /** 组件实例 */
        static instancesById: { [id: number]: Component } = {};

        /**
         * 组件的事件名称
         */
        static Event: IComponentEvent = {
            created: 'created',
            release: 'release',
            mounted: 'mounted'
        }

        /**
         * 获取挂在在元素上的viewModel实例
         * @param   element 元素
         * @return  Component实例
         */
        static getByElement(element: any) {
            return element && Component.instancesById[element[refKey]];
        }

        /**
         * 设置element与viewModel的引用
         * @param   element    元素
         * @param   component  组件实例
         */
        static setWeakRef<T extends Component>(element: any, component: T) {
            element[refKey] = util.uuid(component);
        }

        /**
         * 移除挂载引用
         * @param  element  元素
         */
        static removeWeakRef(element: any) {
            delete element[refKey];
        }

        /**
         * 根据组件名字获取组件构造函数
         * @param  name  组件名
         * @return  组件类的构造函数
         */
        static getConstructorByName(name: string): IComponentContructor<any> {
            return Component.constructorsByName[name];
        }

        /**
         * 自定义一个组件类
         * @param  name     组件名，必然包含'-'在中间
         * @param  members  组件成员
         * @return          组件类的构造函数
         */
        static define<T extends IComponent>(members: T): IComponentContructor<T>;
        static define<T extends IComponent>(name: string, members: T): IComponentContructor<T>;
        static define<T extends IComponent>(...args: any[]) {
            let members: T;
            if (args.length === 2) {
                members = args[1];
                members.name = args[0];
            }
            else {
                members = args[0];
            }
            return Component.extend(members);
        }

        /**
         * 当前组件类拓展出一个子组件
         * @param    name       子组件名
         * @param    members    子组件的成员
         * @return              组件类的构造函数
         */
        static extend<T extends IComponent>(members: T): IComponentContructor<T>;
        static extend<T extends IComponent>(name: string, members: T): IComponentContructor<T>;
        static extend<T extends IComponent>(name: string | T, members?: T) {
            if (arguments.length === 1 && util.isObject(name)) {
                members = arguments[0];
                name = members.name;
            }
            else {
                members.name = arguments[0];
            }

            var superClass = this;
            var prototype = Object.create(superClass.prototype);

            var component: IComponentContructor<T> = function(...args: any[]) {
                superClass.apply(this, args);
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

        /**
         * 把一个继承了drunk.Component的组件类根据组件名字注册到组件系统中
         * @param  name          组件名
         * @param  componentCtor 组件类
         */
        static register(name: string, componentCtor: any) {
            console.assert(name.indexOf('-') > -1, name, '组件明必须在中间带"-"字符,如"custom-view"');

            if (Component.constructorsByName[name] != null) {
                console.warn('组件 "' + name + '" 已被覆盖,请确认该操作');
            }

            componentCtor.extend = Component.extend;
            Component.constructorsByName[name] = componentCtor;

            addHiddenStyleForComponent(name);
        }
    }

    /**
     * 设置样式
     */
    function addHiddenStyleForComponent(name: string) {
        if (record[name] || typeof document === 'undefined' || typeof document.head === 'undefined') {
            return;
        }

        if (!styleSheet) {
            let styleElement = document.createElement('style');
            document.head.appendChild(styleElement);
            styleSheet = styleElement.sheet;
        }

        styleSheet.insertRule(name + '{display:none}', styleSheet.cssRules.length);
    }

    // 注册内置的组件标签
    Component.register(config.prefix + 'view', Component);
}