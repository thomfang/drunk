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
         * @method enter
         * @param  {HTMLElement}  element           元素节点
         * @param  {function}     onDoneCallback    动画完成的回调
         * @return {function}     返回一取消动画继续执行的方法
         */
        enter(element: HTMLElement, onDoneCallback: Function): () => void;
        
        /**
         * 元素被移除时调用的动画方法,会接收元素节点和一个动画完成的回调
         * @method enter
         * @param  {HTMLElement}  element           元素节点
         * @param  {function}     onDoneCallback    动画完成的回调
         * @return {function}     返回一取消动画继续执行的方法
         */
        leave(element: HTMLElement, onDoneCallback: Function): () => void;
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
            enter: 'enter',
            leave: 'leave'
        };
        
        /**
         * action事件类型
         * @property Event
         * @type object
         */
        export var Event = {
            enter: 'drunk:action:enter',
            leave: 'drunk:action:leave'
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
         * @param  {string}         animation  动画名称
         * @param  {string}         type       动画的类型(enter或leave)
         */
        export function run(element: HTMLElement, animationName: string, type: string) {
            let state: IActionState = {};
            let definition = definitions[animationName];

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

            animationName = animationName ? animationName + '-' : config.prefix;
            let className = animationName + type;
            let style = getComputedStyle(element, null);

            if (style[getPropertyName('transitionDuration')] !== '0s') {
                // 如果样式中有设置了transition属性,并且其duration值不为0s,则判断为transition动画
                // 注册transitionEnd事件触发动画完成
                state.promise = new Promise((resolve) => {
                    let onTransitionEnd = () => {
                        element.removeEventListener(transitionEndEvent, onTransitionEnd, false);
                        state.cancel = null;
                        state.promise = null;
                        
                        if (type === Type.leave) {
                            element.classList.remove(animationName + Type.enter, className);
                        }
                        resolve();
                    };

                    element.addEventListener(transitionEndEvent, onTransitionEnd, false);
                    element.classList.add(className);

                    state.cancel = () => {
                        element.removeEventListener(transitionEndEvent, onTransitionEnd, false);
                        element.classList.remove(className);
                    };
                });

                return state;
            }

            element.classList.add(className);

            if (style[getPropertyName('animationDuration')] !== '0s') {
                state.promise = new Promise((resolve) => {
                    let onAnimationEnd = () => {
                        element.removeEventListener(animationEndEvent, onAnimationEnd, false);
                        element.classList.remove(className);
                        state.cancel = null;
                        state.promise = null;
                        resolve();
                    };

                    element.addEventListener(animationEndEvent, onAnimationEnd, false);

                    state.cancel = () => {
                        element.removeEventListener(animationEndEvent, onAnimationEnd, false);
                        element.classList.remove(className);
                    };
                });

                return state;
            }

            state.promise = Promise.resolve();
            state.cancel = () => {
                element.classList.remove(className);
            };

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
            
            this.element.addEventListener(Action.Event.enter, this._runEnterActions, false);
            this.element.addEventListener(Action.Event.leave, this._runLeaveActions, false);
            
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

                    if (!isNaN(Number(action))) {
                        let timerid = setTimeout(runAction, action * 1000);
                        state.cancel = () => {
                            clearTimeout(timerid);
                        };
                        return;
                    }

                    let animState = Action.run(element, action, type);
                    animState.promise.then(runAction);
                    state.cancel = animState.cancel;
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
            this.runActions(Action.Type.leave);
            this._actions = null;
            this.element.removeEventListener(Action.Event.enter, this._runEnterActions, false);
            this.element.removeEventListener(Action.Event.leave, this._runLeaveActions, false);
        },
        
        _runEnterActions() {
            this.cancelPrevAction();
            this.getActions();
            this.runActions(Action.Type.enter);
        },
        
        _runLeaveActions() {
            this.cancelPrevAction();
            this.getActions();
            this.runActions(Action.Type.leave);
        }
    });
}
