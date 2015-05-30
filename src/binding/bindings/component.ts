/// <reference path="../binding" />
/// <reference path="../../component/component" />
/// <reference path="../../util/elem" />

module drunk {
    
    Binding.register("component", {

        isEnding: true,
        priority: 80,

        /*
         * 初始化组件,找到组件类并生成实例,创建组件的绑定
         */
        init() {
            let Ctor = Component.defined[this.expression];

            if (!Ctor) {
                throw new Error(this.expression + ": 未找到该组件.");
            }
            
            this.component = new Ctor();
            this.unwatches = [];
            
            this.processComponentContextEvent();
            this.processComponentAttributes();
            
            // 触发组件实例创建事件
            this.viewModel.dispatchEvent(Component.SUB_COMPONENT_CREATED, this.component);
            
            return this.processComponentBinding();
        },
        
        processComponentContextEvent() {
            let element: HTMLElement = this.element;
            let viewModel: Component = this.viewModel;
            
            // 在组件实例上注册getComponentContext事件,
            // 该事件提供获取组件父级viewModel及element上下文的借口,
            // 可以在任何地方触发该事件以获取组件相关上下文,
            // 只要在触发该事件时把特定事件名传递过来,就会触发该事件名并把上下文传递过去
            this.component.addListener(Component.GET_COMPONENT_CONTEXT, (eventName) => {
                if (typeof eventName === 'string') {
                    this.dispatchEvent(eventName, viewModel, element);
                }
            });
        },
        
        /*
         * 为组件准备数据和绑定事件
         */
        processComponentAttributes() {
            let element: HTMLElement = this.element;
            let component: Component = this.component;
            
            if (!element.hasAttributes()) {
                return;
            }
            
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
                this.watchExpressionForComponent(attrName, expression);
            });
        },
        
        /*
         * 处理组件的视图于数据绑定
         */
        processComponentBinding() {
            let component: Component = this.component;
            let viewModel: Component = this.viewModel;
            
            return component.processTemplate().then((template: Node | Node[]) => {
                if (this.isDisposed) {
                    return;
                }
                
                elementUtil.replace(template, this.element);
                component.mount(template);
                
                // 触发组件已经挂载到元素上的事件
                viewModel.dispatchEvent(Component.SUB_COMPONENT_MOUNTED, component);
            }).catch(function (reason) {
                console.warn("组件挂载失败,错误信息:");
                console.warn(reason);
            });
        },
        
        /*
         * 注册组件的事件
         */
        registerComponentEvent(eventName: string, expression: string) {
            let viewModel: Component = this.viewModel;
            let func = parser.parse(expression);
            
            // 事件的处理函数,会生成一个$event对象,在表达式中可以访问该对象.
            // $events对象有type和args两个字段,args字段是组件派发这个事件所传递的参数的列表
            let handler = function (...args: any[]) {
                func.call(undefined, viewModel, {
                    type: eventName,
                    args: args
                });
            };
            
            this.component.addListener(eventName, handler);
        },
        
        /*
         * 监控绑定表达式,表达式里任意数据更新时,同步到component的指定属性
         */
        watchExpressionForComponent(property: string, expression: string) {
            let viewModel: Component = this.viewModel;
            let component: Component = this.component;
            
            let unwatch = viewModel.watch(expression, (newValue) => {
                component[property] = newValue;
            }, true, true);
            
            this.unwatches.push(unwatch);
        },

        /*
         * 组件释放
         */
        release() {
            // 触发组件即将释放事件
            this.viewModel.dispatchEvent(Component.SUB_COMPONENT_BEFORE_RELEASE, this.component);
            
            if (this.component.element) {
                elementUtil.remove(this.component.element);
            }
            
            // 组件实例释放
            this.component.dispose();
            
            // 移除所有的属性监控
            this.unwatches.forEach(unwatch => unwatch());
            
            // 触发组件已经释放完毕事件
            this.viewModel.dispatchEvent(Component.SUB_COMPONENT_RELEASED, this.component);
            
            // 移除所有引用
            this.component = null;
            this.unwatches = null;
            this.isDisposed = true;
        }
    });
}