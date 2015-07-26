/// <reference path="../promise/promise" />
/// <reference path="../util/util" />
/// <reference path="../viewmodel/viewmodel" />

module drunk {

    /**
     * 更新函数接口
     */
    export interface IBindingUpdateAction {
        (newValue: any, oldValue: any): any;
    }

    /**
     * 绑定声明接口
     */
    export interface IBindingDefinition {
        name?: string;
        isDeepWatch?: boolean;
        isTerminal?: boolean;
        priority?: number;
        retainAttribute?: boolean;

        init?(parentViewModel?: ViewModel, placeholder?: HTMLElement): void;
        update?(newValue: any, oldValue: any): void;
        release?(): void;
    }

    /**
     * 绑定构建函数接口
     */
    export interface IBindExecutor {
        (viewModel: ViewModel, element: any, parentViewModel?: ViewModel, placeHolder?: HTMLElement): any;
        isTerminal?: boolean;
        priority?: number;
    }

    /**
     * 绑定类
     */
    export class Binding {
        
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
         * 绑定初始化方法
         */
        init: (parentViewModel?: ViewModel, placeholder?: HTMLElement) => void;
        
        /**
         * 绑定更新方法
         */
        update: IBindingUpdateAction;
        
        /**
         * 绑定释放方法
         */
        release: () => void;

        /**
         * 是否已经不可用
         */
        private _isActived: boolean = true;
        
        /**
         * 数据更新锁
         */
        private _isLocked: boolean = false;
        
        /**
         * 移除watcher方法
         */
        private _unwatch: () => void;
        
        /**
         * 内置的update包装方法
         */
        private _update: (newValue: any, oldValue: any) => void;
        
        /**
         * 根据绑定的定义创建一个绑定实例，根据定义进行viewModel与DOM元素绑定的初始化、视图渲染和释放
         * @param  viewModel       ViewModel实例
         * @param  element         绑定元素
         * @param  definition      绑定定义
         */
        constructor(public viewModel: ViewModel, public element: any, descriptor: IBindingDefinition) {
            util.extend(this, descriptor);
        }
        
        /**
         * 初始化绑定
         */
        initialize(parentViewModel, placeholder?: HTMLElement) {
            if (this.init) {
                this.init(parentViewModel, placeholder);
            }

            this._isActived = true;

            if (!this.update) {
                return;
            }

            let expression = this.expression;
            let isInterpolate = this.isInterpolate;
            let viewModel = this.viewModel;
            let getter = parser.parseGetter(expression, isInterpolate);

            if (!getter.dynamic) {
                // 如果只是一个静态表达式直接取值更新
                return this.update(viewModel.$eval(expression, isInterpolate), undefined);
            }

            this._update = (newValue, oldValue) => {
                if (!this._isActived || this._isLocked) {
                    this._isLocked = false;
                    return;
                }
                this.update(newValue, oldValue);
            }

            this._unwatch = viewModel.$watch(expression, this._update, this.isDeepWatch, true);
        }
        
        /**
         * 移除绑定并销毁
         */
        dispose(): void {
            if (!this._isActived) {
                return;
            }
            if (this.release) {
                this.release();
            }

            if (this._unwatch) {
                this._unwatch();
            }
            
            Binding.removeWeakRef(this.element, this);

            this._unwatch = null;
            this._update = null;
            this._isActived = false;

            this.element = null;
            this.expression = null;
            this.viewModel = null;
        }
        
        /**
         * 设置表达式的值到viewModel上,因为值更新会触发视图更新,会返回来触发当前绑定的update方法,所以为了避免不必要的
         * 性能消耗,这里提供加锁操作,在当前帧内设置锁定状态,发现是锁定的情况就不再调用update方法,下一帧的时候再把锁定状态取消
         * @param  value    要设置的值
         * @param  isLocked 是否加锁
         */
        setValue(value: any, isLocked?: boolean): void {
            this._isLocked = !!isLocked;
            this.viewModel.$setValue(this.expression, value);
        }
    }

    export module Binding {

        /**
         * 终止型绑定信息列表,每个绑定信息包含了name(名字)和priority(优先级)信息
         */
        let terminalBindingDescriptors: { name: string; priority: number }[] = [];
        
        /**
         * 终止型绑定的名称
         */
        let terminalBindings: string[] = [];
        
        /**
         * 缓存的所有绑定声明的表
         */
        let definitions: { [name: string]: IBindingDefinition } = {};

        /**
         * Binding实例与元素的弱引用关系表
         */
        let weakRefMap: { [id: number]: Array<Binding> } = {};
        
        /**
         * 获取元素的所有绑定实例
         * @param  element  元素节点
         */
        export function getAllBindingsByElement(element: Node) {
            let id = util.uuid(element);
            let bindings = weakRefMap[id];
            
            if (bindings) {
                return bindings.slice();
            }
        }
        
        /**
         * 添加引用
         * @param  element  元素节点
         * @param  binding  绑定实例
         */
        export function setWeakRef(element: Node, binding: Binding) {
            let id = util.uuid(element);
            
            if (!weakRefMap[id]) {
                weakRefMap[id] = [];
            }
            
            util.addArrayItem(weakRefMap[id], binding);
        }
        
        /**
         * 移除引用
         * @param   element  元素节点
         * @param   binding  绑定实例
         */
        export function removeWeakRef(element: Node, binding: Binding) {
            let id = util.uuid(element);
            let bindings = weakRefMap[id];
            
            if (!bindings) {
                return;
            }
            
            util.removeArrayItem(bindings, binding);
            
            if (bindings.length === 0) {
                weakRefMap[id] = null;
                Component.removeWeakRef(element);
            }
        }
        
        /**
         * 绑定创建的优先级
         */
        export enum Priority {
            low = -100,
            high = 100,
            normal = 0,
            aboveNormal = 50,
            belowNormal = -50
        };
        
        /**
         * 根据一个绑定原型对象注册一个binding指令
         * @param   name  指令名
         * @param   def   binding实现的定义对象或绑定的更新函数
         */
        export function register<T extends IBindingDefinition>(name: string, definition: T): void {
            definition.priority = definition.priority || Priority.normal;

            if (definition.isTerminal) {
                setTernimalBinding(name, definition.priority);
            }

            if (definitions[name]) {
                console.warn(name, "绑定原已定义为：", definitions[name]);
                console.warn("替换为", definition);
            }

            definitions[name] = definition;
        }
        
        /**
         * 根据绑定名获取绑定的定义
         * @param   name      绑定的名称
         * @return            具有绑定定义信息的对象
         */
        export function getByName(name: string): IBindingDefinition {
            return definitions[name];
        }
        
        /**
         * 获取已经根据优先级排序的终止型绑定的名称列表
         * @return 返回绑定名称列表
         */
        export function getTerminalBindings() {
            return terminalBindings.slice();
        }
        
        /**
         * 创建viewModel与模板元素的绑定
         * @param   viewModel  ViewModel实例
         * @param   element    元素
         */
        export function create(viewModel, element: any, descriptor: IBindingDefinition, parentViewModel?, placeholder?: HTMLElement) {
            let binding: Binding = new Binding(viewModel, element, descriptor);

            util.addArrayItem(viewModel._bindings, binding);
            Binding.setWeakRef(element, binding);
            Component.setWeakRef(element, viewModel);

            return binding.initialize(parentViewModel, placeholder);
        }
        
        /**
         * 设置终止型的绑定，根据提供的优先级对终止型绑定列表进行排序，优先级高的绑定会先于优先级的绑定创建
         * @param   name      绑定的名称
         * @param   priority  绑定的优先级
         */
        function setTernimalBinding(name: string, priority: number): void {
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
    }
}