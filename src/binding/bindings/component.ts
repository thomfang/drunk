/// <reference path="../binding" />
/// <reference path="../../component/component" />
/// <reference path="../../util/elem" />

module drunk {
    
    Binding.define("component", {

        isTerminal: true,
        priority: Binding.Priority.aboveNormal,

        /*
         * 初始化组件,找到组件类并生成实例,创建组件的绑定
         */
        init() {
            let Ctor = Component.getComponentByName(this.expression);

            if (!Ctor) {
                throw new Error(this.expression + ": 未找到该组件.");
            }
            
            this.component = new Ctor();
            this.unwatches = [];
            
            this.processComponentAttributes();
            return this.processComponentBinding();
        },
        
        /*
         * 为组件准备数据和绑定事件
         */
        processComponentAttributes() {
            let element: HTMLElement = this.element;
            let component: Component = this.component;
            
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
                    this.watchExpressionForComponent(attrName, expression);
                });
            }
            
            component.emit(Component.Event.created, component);
        },
        
        /*
         * 处理组件的视图于数据绑定
         */
        processComponentBinding() {
            let element: HTMLElement = this.element;
            let component: Component = this.component;
            let viewModel: Component = this.viewModel;
            
            return component.processTemplate().then((template: Node | Node[]) => {
                if (this.isDisposed) {
                    return;
                }
                
                elementUtil.replace(template, element);
                component.mount(template, viewModel, element);
            }).catch(function (reason) {
                console.warn("组件挂载失败,错误信息:\n", reason);
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
    });
}