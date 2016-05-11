/// <reference path="../util/util.ts" />
/// <reference path="../viewmodel/viewmodel.ts" />

namespace drunk {

    import util = drunk.util;

    /**
     * 绑定声明接口
     */
    export interface IBindingDefinition {
        name?: string;
        isDeepWatch?: boolean;
        isTerminal?: boolean;
        isInterpolate?: boolean;
        priority?: number;
        retainAttribute?: boolean;
        expression?: string;
        attrName?: string;

        init?(parentViewModel?: ViewModel, placeholder?: HTMLElement): void;
        update?(newValue: any, oldValue: any): void;
        release?(): void;
    }

    export interface BindingConstructor {
        new (...args: any[]): Binding;
        isDeepWatch?: boolean;
        isTerminal?: boolean;
        priority?: number;
        retainAttribute?: boolean;
    }

    /**
     * 绑定实例构建函数接口
     */
    export interface IBindingExecutor {
        (viewModel: ViewModel, element: any, parentViewModel?: ViewModel, placeHolder?: HTMLElement);
        isTerminal?: boolean;
        priority?: number;
    }

    /**
     * 元素与viewModel绑定创建的函数接口
     */
    export interface IBindingGenerator {
        (viewModel: ViewModel, element: any, parentViewModel?: ViewModel, placeHolder?: HTMLElement): Function;
    }

    /**
     * 更新函数接口
     */
    export interface IBindingUpdateAction {
        (newValue: any, oldValue: any): any;
    }

    let refKey = 'DRUNK-BINDING-ID-LIST';

    /** 终止型绑定信息列表,每个绑定信息包含了name(名字)和priority(优先级)信息 */
    let terminalBindingDescriptors: { name: string; priority: number }[] = [];

    /** 终止型绑定的名称 */
    let terminalBindings: string[] = [];

    export function binding(name: string) {
        return function (constructor: BindingConstructor) {
            Binding.register(name, constructor);
        };
    }

    /**
     * 绑定类
     */
    export class Binding {

        /** 实例 */
        static instancesById: { [id: number]: Binding } = {};

        /**
         * 缓存的所有绑定声明的表
         */
        static definitions: { [name: string]: BindingConstructor } = {};

        /**
         * 获取元素的所有绑定实例
         * @param  element  元素节点
         */
        static getByElement(element: Node): Binding[] {
            if (!element[refKey]) {
                return [];
            }
            return element[refKey].map(id => Binding.instancesById[id]);
        }

        /**
         * 添加引用
         * @param  element  元素节点
         * @param  binding  绑定实例
         */
        static setWeakRef(element: Node, binding: Binding) {
            if (!element[refKey]) {
                element[refKey] = [];
            }

            util.addArrayItem(element[refKey], util.uniqueId(binding));
        }

        /**
         * 移除引用
         * @param   element  元素节点
         * @param   binding  绑定实例
         */
        static removeWeakRef(element: Node, binding: Binding) {
            if (element[refKey]) {
                util.removeArrayItem(element[refKey], util.uniqueId(binding));
            }
        }

        /**
         * 根据一个绑定原型对象注册一个binding指令
         * @param   name  指令名
         * @param   def   binding实现的定义对象或绑定的更新函数
         */
        static register<T extends IBindingDefinition>(name: string, definition: T | BindingConstructor): void {
            definition.priority = definition.priority || Binding.Priority.normal;

            if (definition.isTerminal) {
                Binding._setTernimalBinding(name, definition.priority);
            }

            if (util.isObject(definition)) {
                let ctor: BindingConstructor = <any>function (...args: any[]) {
                    Binding.apply(this, args);
                };
                ctor.isTerminal = definition.isTerminal;
                ctor.priority = definition.priority;
                ctor.retainAttribute = definition.retainAttribute;
                ctor.isDeepWatch = definition.isDeepWatch;
                util.extend(ctor.prototype, Binding.prototype, definition);
                definition = ctor;
            }

            if (Binding.definitions[name]) {
                console.warn(name, `绑定原已定义为：`, Binding.definitions[name]);
                console.warn(`替换为`, definition);
            }

            Binding.definitions[name] = <BindingConstructor>definition;
        }

        /**
         * 根据绑定名获取绑定的定义
         * @param   name      绑定的名称
         * @return            具有绑定定义信息的对象
         */
        static getByName(name: string) {
            return Binding.definitions[name];
        }

        /**
         * 获取已经根据优先级排序的终止型绑定的名称列表
         * @return 返回绑定名称列表
         */
        static getTerminalBindings() {
            return terminalBindings.slice();
        }

        /**
         * 创建viewModel与模板元素的绑定
         * @param   viewModel  ViewModel实例
         * @param   element    元素
         */
        static create(viewModel, element: any, descriptor: IBindingDefinition, parentViewModel?, placeholder?: HTMLElement) {
            let Ctor = Binding.definitions[descriptor.name];
            let binding: Binding = new Ctor(viewModel, element, descriptor);

            util.addArrayItem(viewModel._bindings, binding);
            Binding.setWeakRef(element, binding);
            Component.setWeakRef(element, viewModel);

            binding.$initialize(parentViewModel, placeholder);
        }

        /**
         * 设置终止型的绑定，根据提供的优先级对终止型绑定列表进行排序，优先级高的绑定会先于优先级的绑定创建
         * @param   name      绑定的名称
         * @param   priority  绑定的优先级
         */
        private static _setTernimalBinding(name: string, priority: number): void {
            // 检测是否已经存在该绑定
            for (let i = 0, item; item = terminalBindingDescriptors[i]; i++) {
                if (item.name === name) {
                    item.priority = priority;
                    break;
                }
            }

            // 添加到列表中
            terminalBindingDescriptors.push({
                name: name,
                priority: priority
            });

            // 重新根据优先级排序
            terminalBindingDescriptors.sort((a, b) => b.priority - a.priority);

            // 更新名字列表
            terminalBindings = terminalBindingDescriptors.map(item => item.name);
        }

        /**
         * binding名称
         */
        name: string;

        /**
         * 是否深度监听表达式
         */
        isDeepWatch: boolean;

        /**
         * 是否是绑定在一个插值表达式
         */
        isInterpolate: boolean;

        /**
         * 绑定的表达式
         */
        expression: string;

        /**
         * 是否已经不可用
         */
        protected _isActived: boolean = true;

        /**
         * 移除watcher方法
         */
        protected _unwatch: () => void;

        /**
         * 内置的update包装方法
         */
        protected _update: (newValue: any, oldValue: any) => void;

        protected _isDynamic: boolean;

        /**
         * 根据绑定的定义创建一个绑定实例，根据定义进行viewModel与DOM元素绑定的初始化、视图渲染和释放
         * @param  viewModel       ViewModel实例
         * @param  element         绑定元素
         * @param  definition      绑定定义
         */
        constructor(public viewModel: Component, public element: any, descriptor: IBindingDefinition) {
            Binding.instancesById[util.uniqueId(this)] = this;
            util.extend(this, descriptor);
        }

        /**
         * 初始化绑定
         */
        $initialize(ownerViewModel, placeholder?: HTMLElement) {
            if (typeof this["init"] === 'function') {
                this["init"](ownerViewModel, placeholder);
            }

            this._isActived = true;

            if (typeof this["update"] !== 'function') {
                return;
            }

            let expression = this.expression;
            let isInterpolate = this.isInterpolate;
            let viewModel = this.viewModel;
            let getter = parser.parseGetter(expression, isInterpolate);

            if (!getter.dynamic) {
                // 如果只是一个静态表达式直接取值更新
                return this["update"](viewModel.$eval(expression, isInterpolate), undefined);
            }

            this._update = (newValue, oldValue) => {
                if (!this._isActived) {
                    return;
                }

                this["update"](newValue, oldValue);
            }

            this._unwatch = viewModel.$watch(expression, this._update, this.isDeepWatch, false);
            this._isDynamic = true;
        }

        /**
         * 移除绑定并销毁
         */
        $dispose(): void {
            if (!this._isActived) {
                return;
            }
            if (typeof this["release"] === "function") {
                this["release"]();
            }

            if (this._unwatch) {
                this._unwatch();
            }

            Binding.removeWeakRef(this.element, this);
            delete Binding.instancesById[util.uniqueId(this)];

            this._unwatch = this._update = this.element = this.expression = this.viewModel = null;

            this._isActived = false;
        }

        /**
         * 设置表达式的值到viewModel上
         * @param  value    要设置的值
         */
        $setValue(value: any): void {
            this.viewModel.$setValue(this.expression, value);
        }

        $execute() {
            if (!this._isDynamic) {
                return;
            }
            let key = Watcher.getNameOfKey(this.expression, this.isDeepWatch);
            let watcher = this.viewModel._watchers[key];
            if (watcher) {
                this._update(watcher.value, undefined);
            }
        }
    }

    export module Binding {

        /**
         * 优先级(没办法啊，枚举类型不能在类里面定义)
         */
        export enum Priority {
            low = -100,
            high = 100,
            normal = 0,
            aboveNormal = 50,
            belowNormal = -50
        }
    }
}