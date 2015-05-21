/// <reference path="../promise/promise.ts" />
/// <reference path="../viewmodel/viewModel.ts" />
/// <reference path="../template/compiler.ts" />
/// <reference path="../parser/parser.ts" />
/// <reference path="../watcher/watcher.ts" />
/// <reference path="../util/dom.ts" />
/// <reference path="../util/util.ts" />
/// <reference path="../config/config.ts" />

module drunk {

    export interface BindingUpdateAction {
        (newValue: any, oldValue: any): any;
    }

    export interface BindingDefiniation {
        name?: string;
        isDeepWatch?: boolean;
        isTwowayBinding?: boolean;
        isEnding?: boolean;
        priority?: number;
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
        
        /**
         * 是否深度监听表达式
         * @property isDeepWatch
         * @type boolean
         */
        isDeepWatch: boolean;
        
        /**
         * 是否双向绑定
         * @property isTwowayBinding
         * @type boolean
         */
        isTwowayBinding: boolean;
        
        /**
         * 绑定的表达式
         * @property expression
         * @type string
         */
        expression: string;

        init: () => void;
        update: BindingUpdateAction;
        release: () => void;

        private _watcher: Watcher;
        private _getter: parser.Getter;
        private _isActived: boolean;
        private _isLocked: boolean;
        
        /**
         * 根据绑定的定义创建一个绑定实例，根据定义进行viewModel与DOM元素绑定的初始化、视图渲染和释放
         * 
         * @class Binding
         * @constructor
         * @param  {ViewModel}          viewModel       ViewModel实例
         * @param  {HTMLElement}        element         绑定元素
         * @param  {BindingDefinition}  definition      绑定定义
         * @param  {boolean} [descriptor.isDeepWatch]   是否深度监听
         * @param  {boolean} [descriptor.isTwowayBinding] 是否双向绑定
         */
        constructor(public viewModel: ViewModel, public element: any, descriptor) {
            util.extend(this, descriptor);
        }
        
        /**
         * 初始化绑定
         * @method initialize
         */
        initialize(): void {
            if (this.init) {
                this.init();
            }
            this._isActived = true;

            if (!this.update) {
                return;
            }

            var getter = parser.parse(this.expression);
            if (!getter.dynamic) {
                // 如果表达式不包含任何变量
                return this.update(this.viewModel.eval(this.expression), undefined);
            }

            this._createWatcher();
        }
        
        /**
         * 移除绑定并销毁
         * @method teardown
         */
        dispose(): void {
            if (this.release) {
                this.release();
            }

            if (this._watcher && this._watcher.isActived) {
                this._watcher.removeAction(this._update);
                this._watcher = null;
            }

            this.element = null;
            this.viewModel = null;
            this.expression = null;

            util.removeArrayItem(this.viewModel._bindings, this);
        }
        
        /**
         * 设置表达式的值到viewModel上,因为值更新会触发视图更新,会返回来触发当前绑定的update方法,所以为了避免不必要的
         * 性能消耗,这里提供加锁操作,在当前帧内设置锁定状态,发现是锁定的情况就不再调用update方法,下一帧的时候再把锁定状态取消
         * @method setValue
         * @param  {any}     value    要设置的值
         * @param  {boolean} [isLocked] 是否加锁
         */
        setValue(value: any, isLocked?: boolean): void {
            if (!this._watcher) {
                throw new Error(this.expression + ': 该表达式不能赋值');
            }
            this._isLocked = !!isLocked;
            this._watcher.setValue(value);
        }
        
        // 创建对应表达式的watcher
        private _createWatcher() {
            var key: string = Watcher.getReferKey(this.expression, this.isDeepWatch);
            var watcher: Watcher = this.viewModel._watchers[key];

            if (!watcher) {
                watcher = new Watcher(this.viewModel, this.expression, this.isDeepWatch);
                this.viewModel._watchers[key] = watcher;
            }

            this._update = this._update.bind(this);
            watcher.addAction(this._update);

            if (watcher.initialized) {
                // 如果watcher已经初始化得到值,立即调用update方法
                this.update(watcher.value, undefined);
            }
        }
        
        // 包装后的update方法
        private _update(newValue: any, oldValue: any) {
            if (!this._isActived || this._isLocked) {
                this._isLocked = false;
                return;
            }
            this.update(newValue, oldValue);
        }
    }

    export module Binding {

        var endingList: { name: string; priority: number }[] = [];
        var definitionMap: { [name: string]: BindingDefiniation } = {};
        
        /**
         * 自定义一个binding指令
         * 
         * @method define
         * @static
         * @param  {string}          name  指令名
         * @param  {function|Object} def   binding实现的定义对象或绑定的更新函数
         */
        export function define(name: string, def: BindingDefiniation): void {
            var definition: BindingDefiniation;

            if (definition.isEnding) {
                Binding.setEnding(name, definition.priority || 0);
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
                    item.priority = priority;
                    break;
                }
            }
            
            // 添加到列表中
            endingList.push({
                name: name,
                priority: priority
            });
            
            // 重新根据优先级排序
            endingList.sort((a, b) => {
                return b.priority - a.priority;
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