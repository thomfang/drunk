/// <reference path="../binding" />
/// <reference path="../../component/component" />
/// <reference path="../../util/dom" />
/// <reference path="./repeat" />
/// <reference path="../../template/fragment" />

module drunk {

    let reOneInterpolate = /^\{\{([^{]+)\}\}$/;

    class ComponentBinding implements IBindingDefinition {

        expression: string;
        viewModel: RepeatItem;
        element: HTMLElement;

        component: Component;
        unwatches: Function[];
        isDisposed: boolean;

        isTerminal: boolean;
        priority: number;

        private _startNode: any;
        private _endedNode: any;

        /**
         * 初始化组件,找到组件类并生成实例,创建组件的绑定
         */
        init() {
            let src = this.element.getAttribute('src');
            this.element.removeAttribute('src');
            if (src) {
                return this._initAsyncComponent(src);
            }

            let Ctor = Component.getByName(this.expression);
            if (!Ctor) {
                throw new Error(this.expression + ": 未找到该组件.");
            }

            this.component = new Ctor();
            this.unwatches = [];

            this._processComponentAttributes();
            return this._processComponentBinding();
        }
        
        /**
         * 初始化异步组件,先加载为fragment,再设置为组件的element,在进行初始化
         */
        private _initAsyncComponent(src: string) {
            return Template.renderFragment(src, null, true).then((fragment) => {
                let Ctor = Component.getByName(this.expression);
                if (!Ctor) {
                    throw new Error(this.expression + ": 未找到该组件.");
                }

                this.unwatches = [];
                this.component = new Ctor();
                this.component.element = util.toArray(fragment.childNodes);

                this._processComponentAttributes();
                return this._processComponentBinding();
            });
        }

        /**
         * 获取双向绑定的属性名
         */
        private _getTwowayBindingAttrMap() {
            let result = this.element.getAttribute('two-way');
            let marked: { [key: string]: boolean } = {};

            this.element.removeAttribute('two-way');

            if (result) {
                result.trim().split(/\s+/).forEach((str) => {
                    marked[util.camelCase(str)] = true;
                });
            }
            return marked;
        }
        
        /**
         * 为组件准备数据和绑定事件
         */
        private _processComponentAttributes() {
            let element = this.element;
            let component = this.component;
            let twowayBindingAttrMap = this._getTwowayBindingAttrMap();

            if (element.hasAttributes()) {
            
                // 遍历元素上所有的属性做数据准备或数据绑定的处理
                // 如果某个属性用到插值表达式,如"a={{b}}",则对起进行表达式监听(当b改变时通知component的a属性更新到最新的值)
                util.toArray(element.attributes).forEach((attr: Attr) => {
                    let attrName = attr.name;
                    let attrValue = attr.value;

                    if (attrName.indexOf(config.prefix) > -1) {
                        return console.warn("自定义组件标签上不支持使用绑定语法");
                    }

                    if (!attrValue) {
                        component[attrName] = true;
                        return;
                    }

                    let expression = attrValue.trim();

                    if (attrName.indexOf("on-") === 0) {
                        // on-click="doSomething()"
                        // => "click", "doSomething()"
                        attrName = util.camelCase(attrName.slice(3));
                        return this._registerComponentEvent(attrName, expression);
                    }

                    attrName = util.camelCase(attrName);

                    if (!parser.hasInterpolation(expression)) {
                        // 没有插值表达式
                        // title="someConstantValue"
                        component[attrName] = attrValue;
                        return;
                    }
                    
                    // title="{{somelet}}"
                    this._watchExpressionForComponent(attrName, expression, twowayBindingAttrMap[attrName]);
                });
            }

            component.$emit(Component.Event.created, component);
        }
        
        /**
         * 处理组件的视图与数据绑定
         */
        private _processComponentBinding() {
            let element = this.element;
            let component = this.component;
            let viewModel = this.viewModel;

            return component.$processTemplate().then((template) => {
                if (this.isDisposed) {
                    return;
                }

                let startNode = this._startNode = document.createComment(`[start]component: ${this.expression}`);
                let endedNode = this._endedNode = document.createComment(`[ended]component: ${this.expression}`);
                dom.replace(startNode, element);
                dom.after(endedNode, startNode);
                dom.after(template, startNode);

                component.$mount(template, viewModel, element);

                let nodeList: any[] = [startNode];
                let currNode = startNode.nextSibling;

                while (currNode && currNode !== endedNode) {
                    nodeList.push(currNode);
                    currNode = currNode.nextSibling;
                }
                nodeList.push(endedNode);

                if (viewModel instanceof RepeatItem) {
                    if (viewModel._element === element) {
                        viewModel._element = nodeList;
                    }
                    // if (!Array.isArray(viewModel._element)) {
                    //     viewModel._element = [viewModel._element];
                    // }
                    // viewModel._element.push(...nodeList);
                }
            }).catch((error) => {
                console.warn("组件创建失败:\n", error);
            });
        }
        
        /**
         * 注册组件的事件
         */
        private _registerComponentEvent(eventName: string, expression: string) {
            let viewModel: Component = this.viewModel;
            let func = parser.parse(expression);

            this.component.$addListener(eventName, (...args: any[]) => {
                // 事件的处理函数,会生成一个$event对象,在表达式中可以访问该对象.
                // $event对象有type和args两个字段,args字段是组件派发这个事件所传递的参数的列表
                // $el字段为该组件实例
                func.call(undefined, viewModel, {
                    type: eventName,
                    args: args
                }, this.component);
            });
        }
        
        /**
         * 监控绑定表达式,表达式里任意数据更新时,同步到component的指定属性
         */
        private _watchExpressionForComponent(property: string, expression: string, isTwoway: boolean) {
            let viewModel = this.viewModel;
            let component = this.component;
            let unwatch: () => void;

            if (isTwoway) {
                let result = expression.match(reOneInterpolate);

                if (!result) {
                    throw new Error(expression + ': 该表达式不能进行双向绑定');
                }

                let ownerProperty = result[1].trim();

                unwatch = component.$watch(property, (newValue, oldValue) => {
                    let currValue = viewModel.$eval(expression, true);
                    if (newValue === currValue) {
                        return;
                    }
                    viewModel.$setValue(ownerProperty, newValue);
                });

                this.unwatches.push(unwatch);
            }

            unwatch = viewModel.$watch(expression, (newValue) => {
                if (component[property] === newValue) {
                    return;
                }
                component[property] = newValue;
            }, false, true);

            this.unwatches.push(unwatch);
        }

        /**
         * 组件释放
         */
        release() {
            let component = this.component;
            let element = component.element;

            component.$release();
            
            // 移除所有的属性监控
            this.unwatches.forEach(unwatch => unwatch());

            if (element) {
                dom.remove(element);
            }

            if (this._startNode && this._endedNode) {
                dom.remove(this._startNode);
                dom.remove(this._endedNode);
            }
            
            // 移除所有引用
            this._startNode = null;
            this._endedNode = null;
            this.component = null;
            this.unwatches = null;
            this.isDisposed = true;
        }
    }

    ComponentBinding.prototype.isTerminal = true;
    ComponentBinding.prototype.priority = Binding.Priority.aboveNormal;

    Binding.register('component', ComponentBinding.prototype);
}