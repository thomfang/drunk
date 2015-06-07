/// <reference path="../binding" />
/// <reference path="../../config/config" />
/// <reference path="../../promise/promise" />

module drunk {

    /**
     * 动画定义接口
     * @interface IAnimationDefinition
     */
    export interface IAnimationDefinition {
        
        /**
         * 元素被添加进dom时调用的动画方法,会接收元素节点和一个动画完成的回调
         * @method created
         * @param  {HTMLElement}  element           元素节点
         * @param  {function}     onDoneCallback    动画完成的回调
         * @return {function}     返回一取消动画继续执行的方法
         */
        created(element: HTMLElement, onDoneCallback: Function): () => void;
        
        /**
         * 元素被移除时调用的动画方法,会接收元素节点和一个动画完成的回调
         * @method removed
         * @param  {HTMLElement}  element           元素节点
         * @param  {function}     onDoneCallback    动画完成的回调
         * @return {function}     返回一取消动画继续执行的方法
         */
        removed(element: HTMLElement, onDoneCallback: Function): () => void;
    }

    export interface IActionState {
        cancel?(): void;
        promise?: Promise<any>;
    }

    /**
     * 动画模块
     * @module drunk.Action
     * @class Action
     */
    export module Action {
        
        /**
         * action的类型
         * @property Type
         * @type object
         */
        export var Type = {
            created: 'created',
            removed: 'removed'
        };
        
        /**
         * action事件类型
         * @property Event
         * @type object
         */
        export var Event = {
            created: 'drunk:action:created',
            removed: 'drunk:action:removed'
        };
        
        /**
         * js动画定义
         * @property definitions
         * @private
         * @type object
         */
        let definitions: { [name: string]: IAnimationDefinition } = {};
        
        /**
         * 动画状态
         * @property actionStates
         * @private
         * @type object
         */
        let actionStates: { [id: number]: IActionState } = {};

        export function setState(element: HTMLElement, state: IActionState) {
            let id = util.uuid(element);
            actionStates[id] = state;
        }
        
        /**
         * 获取节点的动画状态
         * @method getState
         * @static
         * @param  {HTMLElement}  element  元素节点
         * @return {object}
         */
        export function getState(element: HTMLElement) {
            let id = util.uuid(element);
            return actionStates[id];
        }
        
        /**
         * 清楚节点的动画状态缓存
         * @method clearState
         * @static
         * @private
         * @param  {HTMLElement} element
         */
        function clearState(element: HTMLElement) {
            let id = util.uuid(element);
            actionStates[id] = null;
        }

        var prefix: string = null;
        var transitionEndEvent: string = null;
        var animationEndEvent: string = null;

        function getPropertyName(property: string) {
            if (prefix === null) {
                var style = document.body.style;

                if ('webkitAnimationDuration' in style) {
                    prefix = 'webkit';
                    transitionEndEvent = 'webkitTransitionEnd';
                    animationEndEvent = 'webkitAnimationEnd';
                }
                else if ('mozAnimationDuration' in style) {
                    prefix = 'moz';
                    transitionEndEvent = 'mozTransitionEnd';
                    animationEndEvent = 'mozAnimationEnd';
                }
                else if ('msAnimationDuration' in style) {
                    prefix = 'ms';
                    transitionEndEvent = 'msTransitionEnd';
                    animationEndEvent = 'msAnimationEnd';
                }
                else {
                    prefix = '';
                    transitionEndEvent = 'transitionEnd';
                    animationEndEvent = 'animationEnd';
                }
            }

            return prefix ? prefix + (property.charAt(0).toUpperCase() + property.slice(1)) : property;
        }
        
        /**
         * 执行动画,有限判断是否存在js动画,再判断是否是css动画
         * @method run
         * @static
         * @param  {HTMLElement}    element    元素对象
         * @param  {string}         detail     动画的信息,动画名或延迟时间
         * @param  {string}         type       动画的类型(created或removed)
         */
        export function run(element: HTMLElement, detail: string, type: string) {
            let state: IActionState = {};

            if (!isNaN(Number(detail))) {
                // 如果是一个数字,则为延时等待操作
                state.promise = new Promise((resolve) => {
                    let timerid;
                    state.cancel = () => {
                        clearTimeout(timerid);
                    };
                    timerid = setTimeout(resolve, (<any>detail) * 1000);
                });

                return state;
            }
            
            let definition = definitions[detail];
            if (definition) {
                // 如果有通过js注册的action,优先执行
                let action = definition[type];

                state.promise = new Promise((resolve) => {
                    state.cancel = action(element, () => {
                        state.cancel = null;
                        state.promise = null;
                        resolve();
                    });
                });

                return state;
            }

            detail = detail ? detail + '-' : config.prefix;

            let className = detail + type;
            
            // 如果transitionDuration或animationDuration都不为0s的话说明已经设置了该属性
            // 必须先在这里取一次transitionDuration的值,动画才会生效
            let style = getComputedStyle(element, null);
            let transitionExist = style[getPropertyName('transitionDuration')] !== '0s';

            state.promise = new Promise((resolve) => {
                // 给样式赋值后,取animationDuration的值,判断有没有设置animation动画
                element.classList.add(className);
                let animationExist = style[getPropertyName('animationDuration')] !== '0s';
                
                if (!transitionExist && !animationExist) {
                    return resolve();
                }
                
                function onTransitionEnd() {
                    element.removeEventListener(animationEndEvent, onAnimationEnd, false);
                    element.removeEventListener(transitionEndEvent, onTransitionEnd, false);
                    state.cancel = null;
                    state.promise = null;

                    if (type === Type.removed) {
                        element.classList.remove(detail + Type.created, className);
                    }
                    resolve();
                }
                function onAnimationEnd() {
                    element.removeEventListener(transitionEndEvent, onTransitionEnd, false);
                    element.removeEventListener(animationEndEvent, onAnimationEnd, false);
                    element.classList.remove(className);
                    state.cancel = null;
                    state.promise = null;
                    resolve();
                }

                element.addEventListener(animationEndEvent, onAnimationEnd, false);
                element.addEventListener(transitionEndEvent, onTransitionEnd, false);

                state.cancel = () => {
                    element.removeEventListener(transitionEndEvent, onTransitionEnd, false);
                    element.removeEventListener(animationEndEvent, onAnimationEnd, false);
                    element.classList.remove(className);
                };
            });
            
            return state;
        }
        
        /**
         * 判断是否有动画正在处理,返回一个动画执行完成的promise对象
         * @method processAll
         * @static
         * @param  {HTMLElement}  element 元素节点
         * @return {Promise}
         */
        export function processAll(element: HTMLElement) {
            var state = getState(element);

            if (state) {
                clearState(element);
                return Promise.resolve(state.promise);
            }

            return Promise.resolve();
        }

        /**
         * 注册一个js动画
         * @method register
         * @param  {string}                 name        动画名称
         * @param  {IAnimationDefinition}   definition  动画定义
         */
        export function register(name: string, definition: IAnimationDefinition) {
            if (definitions[name] != null) {
                console.warn(name, "动画已经被覆盖为", definition);
            }

            definitions[name] = definition;
        }

    }

    Binding.register('action', {

        init() {
            this._runEnterActions = this._runEnterActions.bind(this);
            this._runLeaveActions = this._runLeaveActions.bind(this);

            this.element.addEventListener(Action.Event.created, this._runEnterActions, false);
            this.element.addEventListener(Action.Event.removed, this._runLeaveActions, false);

            this._runEnterActions();
        },

        getActions() {
            if (!this.expression) {
                this._actions = [];
            }
            else {
                var str = this.viewModel.eval(this.expression, true);
                this._actions = str.split(/\s+/);
            }
        },

        runActions(type: string) {
            let element = this.element;

            if (this._actions.length < 2) {
                return Action.setState(element, Action.run(element, this._actions[0], type));
            }

            let state: IActionState = {};
            let actions = this._actions;

            state.promise = new Promise((resolve) => {
                let index = 0;

                let runAction = () => {
                    let action = actions[index++];

                    if (typeof action === 'undefined') {
                        state.cancel = null;
                        state.promise = null;
                        return resolve();
                    }

                    let actionState = Action.run(element, action, type);
                    actionState.promise.then(runAction);
                    state.cancel = actionState.cancel;
                };

                runAction();
            });

            Action.setState(element, state);
        },

        cancelPrevAction() {
            let state = Action.getState(this.element);
            if (state && state.cancel) {
                state.cancel();
            }
        },

        release() {
            this.runActions(Action.Type.removed);
            this._actions = null;
            this.element.removeEventListener(Action.Event.created, this._runEnterActions, false);
            this.element.removeEventListener(Action.Event.removed, this._runLeaveActions, false);
        },

        _runEnterActions() {
            this.cancelPrevAction();
            this.getActions();
            this.runActions(Action.Type.created);
        },

        _runLeaveActions() {
            this.cancelPrevAction();
            this.getActions();
            this.runActions(Action.Type.removed);
        }
    });
}
