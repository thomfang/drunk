/// <reference path="../binding" />
/// <reference path="../../component/component" />
/// <reference path="../../util/elem" />

module drunk {
    
    let reOneInterpolate = /^\{\{([^{]+)\}\}$/;

    /**
     * @module drunk.Binding
     * @class ComponentBinding
     */
    class ComponentBinding {

        expression: string;
        viewModel: RepeatItem;
        element: HTMLElement;
        
        component: Component;
        unwatches: Function[];
        isDisposed: boolean;

        isTerminal: boolean;
        priority: number;

        /**
         * 初始化组件,找到组件类并生成实例,创建组件的绑定
         */
        init() {
            let src = this.element.getAttribute('src');
            this.element.removeAttribute('src');
            if (src) {
                return this.initAsyncComponent(src);
            }
            
            let Ctor = Component.getByName(this.expression);
            if (!Ctor) {
                throw new Error(this.expression + ": 未找到该组件.");
            }

            this.component = new Ctor();
            this.unwatches = [];

            this.processComponentAttributes();
            return this.processComponentBinding();
        }
        
        /**
         * 初始化异步组件,先加载为fragment,再设置为组件的element,在进行初始化
         */
        initAsyncComponent(src: string) {
            return Template.renderFragment(src, null, true).then((fragment) => {
                let Ctor = Component.getByName(this.expression);
                if (!Ctor) {
                    throw new Error(this.expression + ": 未找到该组件.");
                }

                this.unwatches = [];
                this.component = new Ctor();
                this.component.element = util.toArray(fragment.childNodes);

                this.processComponentAttributes();
                return this.processComponentBinding();
            });
        }

        /**
         * 获取双向绑定的属性名
         */
        getTwowayBindingAttrMap() {
            let result = this.element.getAttribute('two-way');
            let marked: {[key: string]: boolean} = {};

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
        processComponentAttributes() {
            let element = this.element;
            let component = this.component;
            let twowayBindingAttrMap = this.getTwowayBindingAttrMap();

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
                        return this.registerComponentEvent(attrName, expression);
                    }

                    attrName = util.camelCase(attrName);

                    if (!parser.hasInterpolation(expression)) {
                        // 没有插值表达式
                        // title="someConstantValue"
                        component[attrName] = attrValue;
                        return;
                    }
                    
                    // title="{{somelet}}"
                    this.watchExpressionForComponent(attrName, expression, twowayBindingAttrMap[attrName]);
                });
            }

            component.emit(Component.Event.created, component);
        }
        
        /**
         * 处理组件的视图与数据绑定
         */
        processComponentBinding() {
            let element = this.element;
            let component = this.component;
            let viewModel = this.viewModel;

            return component.processTemplate().then((template) => {
                if (this.isDisposed) {
                    return;
                }

                let container = document.createElement('div');
                let isNodeArray = Array.isArray(template);

                if (isNodeArray) {
                    template.forEach((node) => {
                        container.appendChild(node);
                    });
                }
                else {
                    container.appendChild(template);
                }

                component.mount(template, viewModel, element);
                
                let nodeList = util.toArray(container.childNodes);
                elementUtil.replace(nodeList, element);
                container = null;
                
                if (viewModel instanceof RepeatItem) {
                    viewModel._element = nodeList;
                }
            }).catch((error) => {
                console.warn("组件创建失败:\n", error);
            });
        }
        
        /**
         * 注册组件的事件
         */
        registerComponentEvent(eventName: string, expression: string) {
            let viewModel: Component = this.viewModel;
            let func = parser.parse(expression);

            this.component.addListener(eventName, (...args: any[]) => {
                // 事件的处理函数,会生成一个$event对象,在表达式中可以访问该对象.
                // $event对象有type和args两个字段,args字段是组件派发这个事件所传递的参数的列表
                func.call(undefined, viewModel, {
                    type: eventName,
                    args: args
                });
            });
        }
        
        /**
         * 监控绑定表达式,表达式里任意数据更新时,同步到component的指定属性
         */
        watchExpressionForComponent(property: string, expression: string, isTwoway: boolean) {
            let viewModel = this.viewModel;
            let component = this.component;
            let locked = false;
            let unwatch: () => void;
            
            if (isTwoway) {
                let result = expression.match(reOneInterpolate);
                
                if (!result) {
                    throw new Error(expression + ': 该表达式不能进行双向绑定');
                }
                
                let ownerProperty = result[1].trim();
                
                unwatch = component.watch(property, (newValue) => {
                    if (isTwoway && locked) {
                        locked = false;
                        return;
                    }
                    viewModel.setValue(ownerProperty, newValue);
                });
                
                this.unwatches.push(unwatch);
            }

            unwatch = viewModel.watch(expression, (newValue) => {
                component[property] = newValue;
                locked = true;
            }, false, true);

            this.unwatches.push(unwatch);
        }

        /**
         * 组件释放
         */
        release() {
            let component = this.component;
            let element = component.element;
            
            // 组件实例释放
            component.emit(Component.Event.dispose, component);
            component.dispose();
            
            // 移除所有的属性监控
            this.unwatches.forEach(unwatch => unwatch());

            if (element) {
                elementUtil.remove(element);
            }
            
            // 移除所有引用
            this.component = null;
            this.unwatches = null;
            this.isDisposed = true;
        }
    }

    ComponentBinding.prototype.isTerminal = true;
    ComponentBinding.prototype.priority = Binding.Priority.aboveNormal;

    Binding.define('component', ComponentBinding.prototype);
}