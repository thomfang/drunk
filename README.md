# 查看demo
* 使用命令行工具或git工具拷贝本项目,比如
  ```shell
  git clone git@github.com:tilfon/drunk.git
  ```

* 在项目根目录启一个静态服务器比如
  ```shell
  python -m SimpleHTTPServer
  ```
  
  然后在浏览器中查看`/demo/`目录下的的案例
  
  * 数据绑定:  `localhost:8000/demo/model/index.html`
  * 条件判断:  `localhost:8000/demo/if/index.html`
  * 列表循环:  `localhost:8000/demo/repeat/index.html`
  * 动画控制:  `localhost:8000/demo/action/index.html`
  * 创建组件:  `localhost:8000/demo/component/index.html`
  * 单页应用:  `localhost:8000/demo/application/index.html`

# 快速了解
    
* **数据绑定**
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
    ```html
    <!--在输入框修改数据后，会更新p标签的内容-->
    <body>
        <p>Hello {{greeting}}!</p>
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
    ```html
    <body>
        <p>Hello {{greeting}}!</p>
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
    ```html
    <style>
        .red {color: red}
        .black {color: black}
        .strike {text-decoration: line-through;}
    </style>
    <body>
        <div>
            <input type="text" drunk-model="fontColor" placeholder="请输入red,black,strike查看效果">
            <p drunk-class="fontColor">根据变量的值改变颜色</p>
            <p drunk-class="{red: fontColor == 'red', black: fontColor == 'black'}">值为true则设置添加对应的key为样式</p>
            <p drunk-class="[fontColor, 'red']">列表的形式设置多个样式根据变量的值变化</p>
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
            <p>使用drunk-attr的方式设置</p>
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
    
* **action(动画)控制**
    ```html
    <style>
        .blackbox {
            background-color: #333;
            width: 300px;
            height: 100px;
            transition: all 0.4s cubic-bezier(0, 0, 0, 1);
            opacity: 0;
            -webkit-transform: translateX(100px);
            transform: translateX(100px);
            margin: 5px 0;
        }
        .slide-left-created {
            opacity: 1;
            -webkit-transform: translateX(0px);
            transform: translateX(0px);
        }
        .slide-left-removed {
            opacity: 0;
            -webkit-transform: translateX(100px);
            transform: translateX(100px);
        }
        .bounce-created {
            -webkit-animation: bounce-in .5s;
            animation: bounce-in .5s;
        }
        
        .bounce-removed {
            -webkit-animation: bounce-out .5s;
            animation: bounce-out .5s;
        }
    </style>
    <body>
        <p>* drunk-action属性里的值使用空格隔开每个action</p>
        <p>* 数字会变成一个延迟时间，可以除了action结尾外任何位置设置延迟时间</p>
        <p>* 可以组合css与js的action,只要它们在动画效果上不冲突</p>
        <p>* action的执行会被drunk-if,drunk-show,drunk-repeat触发</p>
        
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
        <p>当前年龄: {{age}}</p>
        <p drunk-if="age < 18">18岁禁止观看！</p>
        <p drunk-if="age >= 18">文明观球！</p>
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

* **自定义组件**
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
    ```

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
    new drunk.Component().$mount(document.body);
    
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
    
* **异步组件**

    *alert.html:*
    
    ```html
    <!--可以直接引用样式外链或直接写style标签-->
    <link rel='stylesheet' type='text/css' href='alert.css' />
    
    <div class="alert" drunk-show="alertVisible">
        <p>{{alertContent}}</p>
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
        <!--
        * 【标签名称】使用注册的组件名作为标签名
        * 【异步加载】设置 src 属性为.html文件的路径后会把该组件作为异步组件加载
        * 【数据传递】跟webcomponent相同，通过属性传递数据,如alertVisible和alertContent通过属性传递进去
        * 【双向绑定】通过在标签上设置two-way属性，可以建立当前组件和所属组件的双向绑定，和我们写其他input类标签实现的效果一样，
                     如two-way="alertVisible alertContent"(多个属性用空格隔开),当组件内部修改两个属性，外部组件对应的属性也会改变
        * 【事件注册】通过设置`on-`前缀加上事件名注册事件(如"cancel"事件要写成"on-cancel")，属性的值可以是任何表达式，
                     表达式里变量对应的上下文为组件所属的Component实例
        * 【！注意！】因为html语法忽略大小写，所以所有的驼峰式的属性和事件名都要换成带`-`的写法，如 alertVisible要写成alert-visible
        -->
        
        <button drunk-on="click: alertVisible = !alertVisible">{{alertVisible?'隐藏':'显示'}}ui-alert-view</button>
        <ui-alert-view
            src='alert.html'
            alert-visible="{{alertVisible}}"
            alert-content="{{alertContent}}"
            on-confirm="alertVisible = false, doConfirm()"
            on-cancel="alertVisible = false, doCancel()
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
    
    new MyApp.$mount(document.body);
    ```
    
* **带路由的单页面应用**
    
    **引入./build/drunk.js和./components/application/application.js以及所有的页面组件，然后声明路由器如下：**
    
    *index.html*
    ```html
    <!--
        * 【drunk-index】 声明默认的路由，初始化页面和发现404的路由时会跳转到该路由,
        * 【drunk-route】 声明组件的路由规则
    -->
    <body drunk-index="/home/book">
        <home-page drunk-route="/home/:type"></home-page>
        <detail-page drunk-route="/detail/:name" template-url="order-page.html"></detail-page>
    </body>
    ```
    
    **初始化脚本,页面就渲染出来了,不用自己new组件实例，只用关心组件的业务逻辑的实现**
    
    *index.js*
    ```javascript
    // drunk.config.debug = true;
    drunk.Application.start();
    ```

    **每个页面定义为一个组件**
    
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
            location.href = "#/detail/" + name;
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
            location.href = "#/detail/" + name;
        }
    });
    ```
    
    *home-page.html*
    ```html
    <ul>
        <li drunk-repeat="product in products" drunk-on="click: view(product.name)">
          <strong>《{{product.name}}》</strong>
          <p>Sale: ￥{{price}}</p>
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
    
    