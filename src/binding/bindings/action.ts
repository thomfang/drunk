/// <reference path="../binding.ts" />
/// <reference path="../../config/config.ts" />
/// <reference path="../../promise/promise.ts" />

namespace drunk {
    
    import util = drunk.util;
    import config = drunk.config;
    import Promise = drunk.Promise;

    export interface IActionExecutor {
        (element: HTMLElement, ondone: Function): () => void;
    }

    export interface IActionDefinition {
        created: IActionExecutor;
        removed: IActionExecutor;
    }

    export interface IActionType {
        created: string;
        removed: string;
    }

    export interface IAction {
        cancel?(): void;
        promise?: Promise<any>;
    }

    /**
     * 动画模块
     */
    export namespace Action {
        
        export const weakRefKey = 'drunk:action:binding';
        
        /**
         * action的类型
         */
        export const Type = {
            created: 'created',
            removed: 'removed'
        };
        
        /**
         * js动画定义
         */
        let definitionMap: { [name: string]: IActionDefinition } = {};
        
        /**
         * 动画状态
         */
        let actionMap: { [id: number]: IAction } = {};

        let propertyPrefix: string = null;
        let transitionEndEvent: string = null;
        let animationEndEvent: string = null;

        function getPropertyName(property: string) {
            if (propertyPrefix === null) {
                let style = document.body.style;

                if ('webkitAnimationDuration' in style) {
                    propertyPrefix = 'webkit';
                    transitionEndEvent = 'webkitTransitionEnd';
                    animationEndEvent = 'webkitAnimationEnd';
                }
                else if ('mozAnimationDuration' in style) {
                    propertyPrefix = 'moz';
                }
                else if ('msAnimationDuration' in style) {
                    propertyPrefix = 'ms';
                }
                else {
                    propertyPrefix = '';
                }

                if (!transitionEndEvent && !animationEndEvent) {
                    // 只有webkit的浏览器是用特定的事件,其他的浏览器统一用一下两个事件
                    transitionEndEvent = 'transitionend';
                    animationEndEvent = 'animationend';
                }
            }

            if (!propertyPrefix) {
                return property;
            }

            return propertyPrefix + (property.charAt(0).toUpperCase() + property.slice(1));
        }

        /**
         * 注册一个js action
         * @method register
         * @param  {string}              name        动画名称
         * @param  {IActionDefinition}   definition  动画定义
         */
        export function register<T extends IActionDefinition>(name: string, definition: T) {
            if (definitionMap[name] != null) {
                console.warn(name, "action的定义已经被覆盖为", definition);
            }

            definitionMap[name] = definition;
        }
        
        /**
         * 根据名称获取注册的action实现
         * @param   name  action名称
         */
        export function getByName(name: string) {
            return definitionMap[name];
        }

        /**
         * 设置当前正在执行的action
         * @param   element 元素节点
         * @param   action  action描述
         */
        export function setCurrentAction(element: HTMLElement, action: IAction) {
            let id = util.uniqueId(element);
            actionMap[id] = action;
        }
        
        /**
         * 获取元素当前的action对象
         * @param   element  元素节点
         */
        export function getCurrentAction(element: HTMLElement) {
            let id = util.uniqueId(element);
            return actionMap[id];
        }
        
        /**
         * 移除当前元素的action引用
         * @param  element
         */
        export function removeRef(element: HTMLElement) {
            let id = util.uniqueId(element);
            actionMap[id] = null;
        }
        
        /**
         * 执行单个action,优先判断是否存在js定义的action,再判断是否是css动画
         * @param   element    元素对象
         * @param   detail     action的信息,动画名或延迟时间
         * @param   type       action的类型(created或removed)
         */
        export function run(element: HTMLElement, detail: string, type: string) {
            if (isNumber(detail)) {
                // 如果是一个数字,则为延时等待操作
                return wait(<any>detail * 1000);
            }

            if (definitionMap[detail]) {
                // 如果有通过js注册的action,优先执行
                return runJavascriptAction(element, detail, type);
            }

            return runMaybeCSSAnimation(element, detail, type);
        }
        
        /**
         * 确认执行元素的所有action
         */
        export function process(target: HTMLElement): Promise<any>;
        export function process(target: HTMLElement[]): Promise<any>;
        export function process(target: any) {
            let elements: HTMLElement[];
            
            if (!Array.isArray(target)) {
                elements = [target];
            }
            else {
                elements = target;
            }
            
            return Promise.all(elements.map(el => {
                let action = getCurrentAction(el);
                return action && action.promise;
            }));
        }

        function wait(time: number) {
            let action: IAction = {};
            
            action.promise = new Promise((resolve) => {
                let timerid;
                action.cancel = () => {
                    clearTimeout(timerid);
                    action.cancel = null;
                    action.promise = null;
                };
                timerid = setTimeout(resolve, time);
            });

            return action;
        }

        function runJavascriptAction(element: HTMLElement, detail: string, type) {
            let definition: IActionDefinition = definitionMap[detail];
            let action: IAction = {};
            let executor: IActionExecutor = definition[type];

            action.promise = new Promise((resolve) => {
                let cancel = executor(element, () => {
                    resolve();
                });
                
                console.assert(typeof cancel === 'function', `drunk.Action: ${detail}的${type}状态未提供cancel回调函数`);
                
                action.cancel = () => {
                    action.cancel = null;
                    action.promise = null;
                    cancel();
                };
            });

            return action;
        }

        function runMaybeCSSAnimation(element: HTMLElement, detail: string, type: string) {
            detail = detail ? detail + '-' : config.prefix;

            let action: IAction = {};
            let className = detail + type;
            
            // 如果transitionDuration或animationDuration都不为0s的话说明已经设置了该属性
            // 必须先在这里取一次transitionDuration的值,动画才会生效
            let style = getComputedStyle(element, null);
            let transitionDuration = style[getPropertyName('transitionDuration')];
            let transitionExist = transitionDuration !== '0s';
            let transitionTimerid;

            action.promise = new Promise((resolve) => {
                // 给样式赋值后,取animationDuration的值,判断有没有设置animation动画
                element.classList.add(className);
                let animationExist = style[getPropertyName('animationDuration')] !== '0s';

                if (!transitionExist && !animationExist) {
                    // 如果为设置动画直接返回resolve状态
                    return resolve();
                }
                
                element.style[getPropertyName('animationFillMode')] = 'both';

                function onTransitionEnd() {
                    clearTimeout(transitionTimerid);
                    element.removeEventListener(animationEndEvent, onAnimationEnd, false);
                    element.removeEventListener(transitionEndEvent, onTransitionEnd, false);

                    if (type === Type.removed) {
                        element.classList.remove(detail + Type.created, className);
                    }
                    resolve();
                }
                function onAnimationEnd() {
                    // element.classList.remove(className);
                    element.removeEventListener(transitionEndEvent, onTransitionEnd, false);
                    element.removeEventListener(animationEndEvent, onAnimationEnd, false);
                    resolve();
                }

                element.addEventListener(animationEndEvent, onAnimationEnd, false);
                element.addEventListener(transitionEndEvent, onTransitionEnd, false);
                
                if (transitionExist) {
                    // 加一个定时器,避免当前属性与transitionend状态下属性的值没有变化时不会触发transitionend事件,
                    // 这里要设置一个定时器保证该事件的触发
                    transitionTimerid = setTimeout(onTransitionEnd, parseFloat(transitionDuration) * 1000);
                }

                action.cancel = () => {
                    clearTimeout(transitionTimerid);
                    element.removeEventListener(transitionEndEvent, onTransitionEnd, false);
                    element.removeEventListener(animationEndEvent, onAnimationEnd, false);
                    element.classList.remove(className);
                    action.cancel = null;
                    action.promise = null;
                };
            });

            return action;
        }
    }

    /**
     * action绑定的实现
     */
    @binding("action")
    export class ActionBinding extends Binding implements IBindingDefinition {
        
        static priority = Binding.Priority.aboveNormal;

        private _actionNames: string[];
        private _actionJob: util.IAsyncJob;

        init() {
            this.element[Action.weakRefKey] = this;
            this._actionJob = util.execAsyncWork(() => {
                this.runActionByType(Action.Type.created);
                this._actionJob = null;
            });
        }

        /**
         * 解析action的定义表达式
         */
        private _parseDefinition(actionType: string) {
            if (!this.expression) {
                this._actionNames = [];
            }
            else {
                let str: string = this.viewModel.$eval(this.expression, true);
                this._actionNames = str.split(/\s+/);

                if (actionType === Action.Type.removed) {
                    this._actionNames.reverse();
                }
            }
            
            let actions = this._actionNames;
            while (isNumber(actions[actions.length - 1])) {
                actions.pop();
            }
        }

        /**
         * 根据类型运行数据的action队列
         */
        private _runActions(type: string) {
            let element = this.element;

            if (this._actionNames.length < 2) {
                let action = Action.run(element, this._actionNames[0], type);
                action.promise.then(() => {
                    Action.removeRef(element);
                });
                return Action.setCurrentAction(element, action);
            }

            let actionQueue: IAction = {};
            let actions = this._actionNames;

            actionQueue.promise = new Promise((resolve) => {
                let index = 0;
                let runAction = () => {
                    let detail = actions[index++];

                    if (typeof detail === 'undefined') {
                        actionQueue.cancel = null;
                        actionQueue.promise = null;
                        Action.removeRef(element);
                        return resolve();
                    }

                    let currentAction = Action.run(element, detail, type);
                    currentAction.promise.then(runAction);
                    actionQueue.cancel = () => {
                        currentAction.cancel();
                        actionQueue.cancel = null;
                        actionQueue.promise = null;
                    };
                };

                runAction();
            });

            Action.setCurrentAction(element, actionQueue);
        }

        /**
         * 先取消还在运行的action，再运行指定的action
         */
        runActionByType(type: string) {
            if (this._actionJob) {
                this._actionJob.cancel();
                this._actionJob = null;
            }
            
            let currentAction = Action.getCurrentAction(this.element);
            if (currentAction && currentAction.cancel) {
                currentAction.cancel();
            }
            
            this._parseDefinition(type);
            this._runActions(type);
        }

        release() {
            if (this._actionJob) {
                this._actionJob.cancel();
            }
            
            this.runActionByType(Action.Type.removed);
            this.element[Action.weakRefKey] = null;
            this._actionNames = null;
            this._actionJob = null;
        }
    }
    
    function isNumber(value: any) {
        return !isNaN(parseFloat(value));
    }
}
