# 介绍
drunk是一个高性能的web前端MVVM开发框架，采用WebComponents的开发方式，提供简单易用的API，可以实现强大的自定义组件，异步组件，自定义指令以及简单易用的自定义动画等功能。
只支持兼容ES5以上的浏览器。

# 查看demo
* 使用命令行工具或git工具拷贝本项目,比如
  ```shell
  git clone git@github.com:tilfon/drunk.git
  ```

* 在项目根目录启一个静态服务器比如

  ```shell
  cd ./drunk
  python -m SimpleHTTPServer
  ```
  
  然后在浏览器中查看`/demo/`目录下的的案例
  
  * 数据绑定:  `localhost:8000/demo/model/index.html`
  * 条件判断:  `localhost:8000/demo/if/index.html`
  * 列表循环:  `localhost:8000/demo/repeat/index.html`
  * 动画控制:  `localhost:8000/demo/action/index.html`
  * 创建组件:  `localhost:8000/demo/component/index.html`
  * 单页应用:  `localhost:8000/demo/application/index.html`
  
# 编译源码
* `drunk`源码编译，在项目根目录下使用

  ```shell
  tsc
  ```
  
* 项目组件编译

  ```shell
  cd ./components
  tsc
  ```

# 快速了解
    
* **数据绑定**

    > 使用`{{$variable}}`的插值方式`
    
    ```html
    <body>
        Hello {{greeting}}!
    </body>
    ```
    
    ```javascript
    // 创建一个组件实例,并挂载到body
    
    var view = new drunk.Component({
        greeting: 'world'
    });
    view.$mount(document.body);
    ```
    
* **数据双向绑定**

    > 在标签上使用`drunk-model`属性进行双向绑定
    
    ```html
    <!--在输入框修改数据后，会更新p标签的内容-->
    <body>
    Hello {{greeting}}!
        <input type="text" drunk-model="greeting" />
    </body>
    ```
    
    ```javascript
    // 创建一个组件实例,并挂载到body
    
    var view = new drunk.Component({
        greeting: 'world'
    });
    view.$mount(document.body);
    ```
    
* **注册事件**

    > * `drunk-on="eventType: doSomething()"`属性进行事件注册   
    > * `$event`可访问到原生event对象,`$el`可访问到当前element对象    
    > * `drunk-on="click: onClicked(); keyup: $event.keyCode == 13 && onTypingEnterKey()"`注册多个事件用分号隔开:
    
    ```html
    <body>
    Hello {{greeting}}!
        <input type="text" drunk-model="greeting" />
        <button drunk-on="click: greeting = ''">清空输入框</button>
        <button drunk-on="click: clear()">清空输入框</button>
    </body>
    ```
    
    ```javascript
    // javascript写法
    var TestView = drunk.Component.define({
        greeting: 'world',
        clear: function() {
            this.greeting = '';
        }
    });
    new TestView().$mount(document.body)
    ```
    
    ```typescript
    // typescript写法
    class TestView extends drunk.Component {
        greeting = 'world';
        clear() {
            this.greeting = '';
        }
    }
    new TestView().$mount(document.body);
    ```
    
* **样式绑定**

    > * `drunk-class="{class1: condition1, class2: condition2}"`值为object形式,当每个key对应的value为true则增加这个key为class  
    > * `drunk-class="[class1, class2, class3]"` 数组的形式添加多个样式  
    > * `drunk-class="$varibal"` 变量的形式绑定样式    
    
    ```html
    <style>
        .red {color: red}
        .black {color: black}
        .strike {text-decoration: line-through;}
    </style>
    <body>
        <div>
            <input type="text" drunk-model="fontColor" placeholder="请输入red,black,strike查看效果">
            <p drunk-class="fontColor">根据变量的值改变颜色
            <p drunk-class="{red: fontColor == 'red', black: fontColor == 'black'}">值为true则设置添加对应的key为样式
            <p drunk-class="[fontColor, 'red']">列表的形式设置多个样式根据变量的值变化
        </div>
    </body>
    ```
    
    ```javascript
    new drunk.Component().$mount(document.body);
    ```
    
* **attribute绑定**
    ```html
    <style>
        .red {color: red}
    </style>
    <body>
        <div style="color: {{fontColor}}">直接用{{$var}}的插值方式</div>
        <div>
        使用drunk-attr的方式设置
            <img drunk-attr="{src: imgUrl, width: imgWidth, height: imgHeight}" />
        </div>
    </body>
    ```
    
    ```javascript
    new drunk.Component({
        fontColor: 'red',
        imgUrl: '',
        imgWidth: 200,
        imgHeight: 100
    }).$mount(document.body);
    ```

* **渲染列表**
    ```html
    <body>
        <ul>
            <li drunk-repeat="user,index in list">
                NO.{{index}}  -- {{user}}
            </li>
        </ul>
    </body>
    ```
    
    ```typescript
    // javascript
    var TestView = drunk.Component.define({
        // list: [ ... ], 这么写会吧list数组拓展到原型，每个实例都会引用同一个list，不推荐
        init: function () {
            this.list = [
                'Todd',
                'Fon',
            ]
        }
    });
    new TestView().$mount(document.body);
    
    //typescript
    class TestView extends drunk.Component {
        // list在typescript中不会拓展到原型
        list = [
                'Todd',
                'Fon',
        ];
    }
    new TestView().$mount(document.body);
    ```
    
* **条件判断**
    ```html
    <body>
    当前年龄: {{age}}
        <p drunk-if="age < 18">18岁禁止观看！
        <p drunk-if="age >= 18">文明观球！
        <button drunk-on="click: age += 1">增加一岁</button>
        <button drunk-on="click: age -= 1">减少一岁</button>
    </body>
    ```
    
    ```javascript
    var TestView = drunk.Component.define({
        age: 16
    });
    new TestView().$mount(document.body)
    ```
    
* **监控属性**
   ```html
    <body>
    上次输入的消息: {{oldValue}}
    刚刚输入的消息: {{newValue}}
        <div>
            <input type="text" drunk-model="content" drunk-on="keyup: $event.keyCode == 13 && addMessage()" />
            <button drunk-on="click: addMessage()">添加消息</button>
        </div>
        <p drunk-repeat="message in messageList">{{message}}</>
    </body>
    ```
    
    ```javascript
    new drunk.Component({
        newValue: '',
        oldValue: '',
        init: function () {
            this.messageList = [];
            // 监控元数据属性
            this.$watch('content', function (newValue, oldValue) {
                this.newValue = newValue;
                this.oldValue = oldValue;
            });
            // 监控数组或对象
            this.$watch('messageList', function () {
                console.log('messageList changed');
            }, true/*是否要深度监听每个元素的变化*/);
        },
        addMessage: function () {
            if (this.content) {
                this.messageList.push(this.content);
                this.content = '';
            }
        }
    }).$mount(document.body);
    ```
    
* **action(动画)控制**

    > * css声明的action,如取名slide-left,则对应创建(created)和移除(removed)的两个状态的样式名为slide-left-created,slide-left-removed
    > * drunk-action属性里的值使用空格隔开每个action
    > * 数字会变成一个延迟时间，可以除了action结尾外任何位置设置延迟时间
    > * 可以组合css与js的action,只要它们在动画效果上不冲突
    > * 当触发某个状态时,如created状态,action列表会依次触发各个action,css是添加actionName-created样式名,js是调用改action声明的created方法
    > * action的执行会被drunk-if,drunk-show,drunk-repeat触发
        
    ```html
    <style>
        .blackbox {
            background-color: #333;
            width: 300px;
            height: 100px;
            transition: all 0.4s cubic-bezier(0, 0, 0, 1);
            opacity: 0;
            transform: translateX(100px);
            transform: translateX(100px);
            margin: 5px 0;
        }
        .slide-left-created {
            opacity: 1;
            transform: translateX(0px);
            transform: translateX(0px);
        }
        .slide-left-removed {
            opacity: 0;
            transform: translateX(100px);
            transform: translateX(100px);
        }
        .bounce-created {
            animation: bounce-in .5s;
            animation: bounce-in .5s;
        }
        
        .bounce-removed {
            animation: bounce-out .5s;
            animation: bounce-out .5s;
        }
        @keyframes bounce-in {
            0% {
                transform: scale(0);
            }
            50% {
                transform: scale(1.5);
            }
            100% {
                transform: scale(1);
            }
        }
        
        @keyframes bounce-out {
            0% {
                transform: scale(1);
            }
            50% {
                transform: scale(1.5);
            }
            100% {
                transform: scale(0);
            }
        }
    </style>
    <body>
        <div>
            <input type="text" drunk-model="delay">
            <button drunk-on="click: visible = !visible">点击{{visible? '隐藏': '显示'}}</button>
            <div drunk-show="visible" class="blackbox" drunk-action="{{delay}} slide-left bounce">
            </div>
        </div>
    </body>
    ```
    
    ```javascript
    // 自定义一个js action
    drunk.Action.register('fade', {
        // created方法会在节点添加到dom树或从display:none变成不为none的情况调用
        created: function (element, done) {
            element.style.opacity = 0;
            var timerid = setInterval(function () {
                var opacity = Number(getComputedStyle(element, null).opacity);
                if (opacity >= 1) {
                    cancel();
                    return done();
                }
                element.style.opacity = opacity + 0.3;
            }, 50);
            function cancel() {
                clearInterval(timerid);
            }
            return cancel;
        },
        // removed方法会在节点从dom树移除或变成display:none的情况调用
        removed: function (element, done) {
            element.style.opacity = 1;
            var timerid = setInterval(function () {
                var opacity = Number(getComputedStyle(element, null).opacity);
                if (opacity <= 0) {
                    cancel();
                    return done();
                }
                element.style.opacity = opacity - 0.3;
            }, 50);
            function cancel() {
                clearInterval(timerid);
            }
            return cancel;
        }
    });
    
    // 绑定视图
    new drunk.Component({delay: 0.3}).$mount(document.body);
    ```

* **自定义组件**

    > * `drunk.Component.define(componentName, options)`定义并注册一个组件标签,componentName类型这种形式:`my-view`
    > * 定义了类似`my-view`组件名后就可以用这个名字作为标签名`<my-view></my-view>`
    > * `options.template` 组件的模板字符串
    > * `options.templateUrl` 组件的模板链接，会自动加载进来
    > * `options.init` 创建组件时会调用该方法，可用于初始化组件
    > * 可在`options`上提供该组件的方法或事件处理函数

    ```typescript
    // javascript写法
    drunk.Component.define('my-view', {
        templateUrl: 'my-view.html',
        
        init: function () {
            this.firstName = 'Todd';
            this.lastName = 'Fon';
            
            // 定义computed属性
            this.$computed('fullName', {
                get: function () {
                    return this.firstName + ' ' + this.lastName;
                },
                set: function (value) {
                    var names = value.split(/\s+/);
                    this.firstname = names[0];
                    this.lastname = names[1];
                }
            });
        }
    });
    
    // typescript写法,可以使用decorator和继承
    @drunk.component('my-view')
    class MyView extends drunk.Component {
        templateUrl = 'my-view.html';
        
        firstName = 'Todd';
        lastName = 'Fon';
        
        @drunk.computed
        get fullName(): string {
            return this.firstName + ' ' + this.lastName;
        }
        set fullName(value: string) {
            let names = value.split(/\s+/);
            this.firstname = names[0];
            this.lastname = names[1];
        }
    }
    ```
    
    ```html
    <body>
        <my-view></my-view>
        <my-view template-url="other-template.html"></my-view>
        
        <script type="text/tpl" id="my-view.html">
          <div>Hello {{fullName}}!</div>
        </script>
        <script type="text/tpl" id="other-template.html">
          <div>Hello {{fullName}}! 这是另一个模板，不过同样使用的是一套逻辑.</div>
        </script>
    </body>
    <script>
        // 创建一个以body为根元素的组件，会
        new drunk.Component().$mount(document.body);
    </script>
    ```
    
* **异步组件**

    > 一个异步组件可以是一个.html文件,里面包含模板和样式(用`<link>`外链或`<style>`直接声明),以及js脚本
    
    > * 【标签名称】使用注册的组件名作为标签名
    > * 【异步加载】设置`src`属性为`.html`文件的路径后会把该组件作为异步组件加载
    > * 【数据传递】跟webcomponent相同，通过属性传递数据,如`alertVisible`和`alertContent`通过属性传递进去
    > * 【双向绑定】通过在标签上设置`two-way`属性，可以建立当前组件和所属组件的双向绑定，和我们写其他input类标签实现的效果一样，如`two-way="alertVisible alertContent"`(多个属性用空格隔开),当组件内部修改两个属性，外部组件对应的属性也会改变
    > * 【事件注册A】通过设置`on-`前缀加上事件名注册事件(如"cancel"事件要写成"on-cancel")，属性的值可以是任何表达式，表达式里变量对应的上下文为组件所属的Component实例
    > * 【事件注册B】通过`drunk-on`注册,这样事件名就可以直接用声明的字符串，如`drunk-on="cancel: a(); confirm: bbb()"`
    > * 【！注意！】因为html语法忽略大小写，所以所有的驼峰式的属性和事件名都要换成带`-`的写法，如`alertVisible`要写成`alert-visible`

    *alert.html:*
    
    ```html
    <!--可以直接引用样式外链或直接写style标签-->
    <link rel='stylesheet' type='text/css' href='alert.css' />
    
    <div class="alert" drunk-show="alertVisible">
    {{alertContent}}
        <button drunk-on="click: cancel()">取消</button>
        <button drunk-on="click: confirm()">确认</button>
    </div>
    
    <!--可以直接引组件的js外链或直接写script标签-->
    <script src='alert.js'></script>
    ```
    
    *alert.js*
    ```typescript
    // javascript写法
    drunk.Component.define('ui-alert-view', {
        cancel: function () {
            this.$emit('cancel');
        },
        confirm: function () {
            this.$emit('confirm');
        }
    });
    
    // typescript写法
    @drunk.component('ui-alert-view')
    class UIAlertView extends drunk.Component {
        cancel() {
            this.$emit('cancel');
        }
        confirm() {
            this.$emit('confirm');
        }
    }
    ```
    
    **使用方法:**
    ```html
    <body>
        <button drunk-on="click: alertVisible = !alertVisible">{{alertVisible?'隐藏':'显示'}}ui-alert-view</button>
        <ui-alert-view
            src='alert.html'
            alert-visible="{{alertVisible}}"
            alert-content="{{alertContent}}"
            on-confirm="alertVisible = false, doConfirm()"
            drunk-on="cancel: alertVisible = false, doCancel()"
            two-way="alertVisible">
        </ui-alert-view>
    </body>
    ```
    
    ```typescript
    // javascript写法
    var MyApp = drunk.Component.define({
        alertVisible: false,
        alertContent: '',
        doConfirm: function () {
            // ...
        },
        doCancel: function () {
            // ...
        }
    });
    
    // typescript写法
    class MyApp extends drunk.Component {
        alertVisible = false;
        alertContent = '';
        
        doConfirm() {
            // ...
        }
        doCancel() {
            // ...
        }
    }
    
    new MyApp().$mount(document.body);
    ```
    
* **带路由的单页面应用**
    
    > * 引入./build/drunk.js和./components/application/application.js以及所有的页面组件，然后声明路由
    > * `drunk-index` 声明默认的路由，初始化页面和发现404的路由时会跳转到该路由,
    > * `drunk-route` 声明组件的路由规则
    > * `drunk.Application.start()`启动解析页面就渲染出来了,不用自己new组件实例，只用关心组件的业务逻辑的实现
    
    *index.html*
    ```html
    <body drunk-index="/home/book">
        <home-page drunk-route="/home/:type"></home-page>
        <detail-page drunk-route="/detail/:name" template-url="order-page.html"></detail-page>
    </body>
    <script>
        // drunk.config.debug = true;
        drunk.Application.start();
    </script>
    ```

    > 每个页面定义为一个组件
    
    *home-page.js*
    ```typescript
    // typescript写法
    @drunk.component('home-page')
    class HomePage extends drunk.Component {
        // 可以在这里设置templateUrl属性，也可以在使用组件的时候在组件标签上设置template-url的方式,
        // 默认标签上设置template-url会覆盖掉组件内部定义的templateUrl
        templateUrl = 'home-page.html';
        
        products: any[];
        
        books = [{
            name: '毛泽东语录',
            price: 18.8
        }, {
            name: '邓小平思想',
            price: 15
        }, {
            name: '谈笑风生',
            price: 99.9
        }];
        
        videos = [{
            name: '喜羊羊',
            price: 22
        }, {
            name: '熊出没',
            price: 33
        }, {
            name: '葫芦娃',
            price: 98
        }];
        
        onEnter(state: {params: {[key: string]: string}) {
            // 可以在这里使用state.params中从location.hash(如"#/home/:type")中解析出来的参数
            // 如果只是参数改变引起的组件刷新，还是会调用这个方法而不会移除组件再创建新组件，比如url从"/home/book"变成"/home/video"
            switch (state.params['type']) {
                case 'book':
                    this.products = this.books; break;
                case 'video':
                    this.products = this.videos; break;
                default:
                    location.replace('#/');
            }
        }
        onExit() {
            // 路由切换后，会把当前组件销毁并进入新的路由组件，销毁之前会调用这个方法
            console.log('退出home-page页面');
        }
        view(name: string) {
            // 或者用 location.replace(...), location.href = ...;
            drunk.Application.navigate("#/detail/" + name);
        }
    }
    
    // javascript写法
    drunk.Component.define('home-page', {
        templateUrl: 'home-page.html',
        init: function () {
            this.books = [{
                name: '毛泽东语录',
                price: 18.8
            }, {
                name: '邓小平思想',
                price: 15
            }, {
                name: '谈笑风生',
                price: 99.9
            }];
            
            this.videos = [{
                name: '喜羊羊',
                price: 22
            }, {
                name: '熊出没',
                price: 33
            }, {
                name: '葫芦娃',
                price: 98
            }];
        },
        onEnter: function (state) {
            switch (state.params.type) {
                case 'book':
                    this.products = this.books; break;
                case 'video':
                    this.products = this.videos; break;
                default:
                    location.replace('#/');
            }
        },
        onExit: function () {
            console.log('退出home-page页面');
        },
        view: function (name) {
            drunk.Application.navigate("#/detail/" + name);
        }
    });
    ```
    
    *home-page.html*
    ```html
    <ul>
        <li drunk-repeat="product in products" drunk-on="click: view(product.name)">
          <strong>《{{product.name}}》</strong>
      Sale: ￥{{price}}
        </li>
    </ul>
    ```
    
    *detail-page.js*
    ```typescript
    // typescript写法
    @drunk.component('detail-page')
    class DetailPage extends drunk.Component {
        name: string;
        onEnter({params}) {
            this.name = params.name;
        }
    }
    
    // javascript写法
    drunk.Component.define('detail-page', {
        onEnter: function (state) {
           this.name = state.params.name;
        }
    });
    ```
    
    *detail-page.html*
    ```html
    <div>
        <button onclick="history.back()">返回首页</button>
        <h2>{{name}}</h2>
    </div>
    ```
    
* **自定义Binding**
    
    > * `Binding.register(bindingName, prototype)`,bindingName的格式类似于`on-click`,使用的时候就是`<div drunk-on-click="...">`
    > * (可选)`prototype.init`初始化
    > * (可选)`prototype.update(newValue, oldValue)`当绑定的model更新会调用该方法，如果该方法不提供，则为一个静态绑定，
    > * 可以声明一个静态绑定不坚挺任何model,所以也可以不用为绑定属性设置值，如假设有一个`remove-on-click`的Binding点击该元素就删除，用法是`<div drunk-remove-on-click>`
    > * (可选)`prorotype.release`当解除绑定和释放该Binding实例时会调用该方法，可以做一些释放引用的操作
    
    **以下是一个当值改变时切换样式的Binding实现**
    ```typescript
    // typescript
    @drunk.binding('toggle-class')
    class ToggleClass extends drunk.Binding {
        classList: string[];
        init() {
            // this.element可以访问到绑定的元素
            this.classList = JSON.parse(this.element.getAttribute('class-list') || '[]');
        }
        update(newValue: any, oldValue: any) {
            // 当绑定的属性更新时会调用该方法
            this.classList.forEach(className => this.element.classList.toggle(className));
        }
        release() {
            // binding移除时会调用该方法
            this.classList = null;
        }
    }
    
    // javascript写法
    drunk.Binding.register('toggle-class', {
        init: function() {
            this.classList = JSON.parse(this.element.getAttribute('class-list') || '[]');
        },
        update: function(newValue, oldValue) {
            this.classList.forEach(function (className) {
                this.element.classList.toggle(className);
            });
        },
        release: function() {
            this.classList = null;
        }
    });
    ```
    
    **使用方法**
    ```html
    <style>
       div {background: black; transition:all linear 0.5s; width: 100px;height:100px;}
      .red {background: red;}
      .large {transform: scale(1.5, 1.5)}
    </style>
    <body>
        <!--需要加上drunk-前缀-->
        <div drunk-toggle-class="counter" class-list="['red']"></div>
    </body>
    ```
    
    ```typescript
    var MyApp = drunk.Component.define({
        counter: 0,
        init: function () {
            var timerId = setInterval(function () {
                this.counter += 1;
            }.bind(this), 1000);
            
            // drunk.Component.Event. => release|created|mounted|templateLoadFailed
            this.$on(drunk.Component.Event.release, function () {
                clearInterval(timerId);
            });
        },
    });
    new MyApp().$mount(document.body);
    ```

# API

## drunk.Component

* 静态属性/方法

    * 事件

    > `Event`   
    > `Event.created, Event.mounted, Event.release, Event.templateLoadFailed`

    ```typescript
    var view = new drunk.Component();
    view.$on(drunk.Component.Event.release, () => {
        console.log('View instance will be released');
    });
    ```

    * 定义组件

    > `define(members: Object)` 匿名组件  
    > `define(name: string, members: Object)` 具名组件    

    ```typescript
    // 匿名组件
    var ComponentA = drunk.Component.define({
        init() {

        }
    });

    // 具名组件
    var ComponentB = drunk.Component.define('component-b', {
        init() {

        }
    });
    ```
    
    * 根据名字和组件的类(构造函数)注册一个组件 

    > `register(name: string, constructor: Function)` 

    ```typescript
    class ComponentC extends drunk.Component {
        // ....
    }
    drunk.Component.register('component-c', ComponentC);
    ```


* 实例属性/方法

    * `$filter` 持有该实例的所有过滤器的对象

    ```typescript
    var vm = new drunk.Component();
    vm.$filter.capitalize = (value: string) => {
        return value.charAt(0).toUpperCase() + value.slice(1);
    };
    ```
    
    * 把实例挂载到DOM节点上

    > `$mount(element: HTMLElement)` 

    ```typescript
    new drunk.Component().$mount(document.body);
    ```
    
    * 监听数据

    > `$watch(expression: string, callback: (newValue: any, oldValue: any) => any, deepWatch?: boolean): Function`

    ```typescript
    var cp = new drunk.Component({list: []});
    var unwatch = cp.$watch('list.length', (newLen: number) => {
        console.log('list.length has changed to: ', newLen);
    }, true);

    unwatch();
    ```

    * 执行字符串表达式并返回结果

    > `$eval(expression: string): any;`

    ```typescript
    var vm = new drunk.Component({user: {name: 'Todd'}});
    vm.$eval('user.name'); // 结果: 'Todd'
    ```

    * 根据字符串表达式设置值

    > `$setValue(expression: string)`

    ```typescript
    var vm = new drunk.Component({user: {}});
    vm.$setValue('user.name', 'Todd'); // vm.user.name => 'Todd'
    ```
    
    * 设置计算属性

    > `$computed(property: string, descriptor: {set: Function; get: Function})` 根据descriptor设置getter,setter     
    > `$computed(property: string, getter: Function)` 根据getter函数设置  

    ```typescript
    var vm = new drunk.Component({
        firstName: 'Todd',
        lastName: 'Fon'
    });

    vm.$computed('fullName', {
        get() {
            return this.firstname + ' ' + this.lastName;
        },
        set(fullName: string) {
            var list = fullName.split(/\W+/);
            this.firstName = list[0];
            this.lastName = list[1];
        }
    });
    ```

    * 设置数据过滤器
    
    > `$setFilters(filterDefs: Object)`

    ```typescript
    class ComponentD extends drunk.Component {
        init() {
            this.$setFilters({
                toPadded: (value: number) => {
                    return (value < 10 ? '0' : '') + value;
                }
            });
        }
    }
    ```

    * 处理异步或同步数据

    > `$resolveData(data: {[name: string]: Promise<any> | any})`

    ```typescript
    var vm = new drunk.Component();
    vm.$resolveData({
        time: Promise.resole(1000),
        userName: 'Todd Fon'
    })
    ```

    * 注册事件

    > `$on(eventName: string, callback: Function)`  
    > `$addListener(eventName: string, callback: Function)`

    ```typescript
    var vm = new drunk.Component();
    vm.$on(drunk.Component.release, () => {

    });
    ```

    * 触发事件

    > `$emit(eventName: string, ...args: any[])`

    ```typescript
    var vm = new drunk.Component();
    vm.$on('event:x', (...data: any[]) => {
        console.log('event:x recieves data: ', data);
    });
    vm.$emit('event:x', 1, 2, 3); // console.log: 'event:x recieves data: [1, 2, 3]'
    ```

    * 注册一次性事件,事件触发后会移除这个回调

    > `$once(eventName: string, callback: Function)`

    ```typescript
    var vm = new drunk.Component();
    vm.$once('custom:event', () => {
        console.log('custom:event triggered');
    });
    vm.$emit('custom:event');  // console.log: 'custom:event triggered'
    vm.$emit('custom:event');  // nothing happen
    ```

    * 移除事件

    > `$removeListener(eventName: string, callback?: Function)`

    ```typescript
    var callback1 = () => {
        console.log('event:x triggered');
    };
    var callback2 = () => {
        console.log('callback2 invoked');
    };
    vm.$on('event:x', callback1);
    vm.$on('event:x', callback2);
    vm.$removeListener('event:x', callback1); // 移除了callback1
    vm.$removeListener('event:x'); // 移除了所有的event:x回调
    ```

    * 实例释放

    > `$release()`

    ```typescript
    var vm = new drunk.Component();
    vm.$release();
    ```