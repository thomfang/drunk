# 快速了解

* 最简单的用法，生成一个component实例并与dom元素建立绑定

    ```javascript
    // 绑定到body
    
    var bindingView = new drunk.Component();
    bindingView.$mount(document.body);
    ```
    
    
* 数据绑定
    ```html
    <body>
        Hello! {{greeting}}
    </body>
    ```
    
    ```javascript
    bindingView.greeting = 'world';
    ```

* 自定义组件

    ```javascript
    // 不带模板链接
    var MyComponent = drunk.Component.define({
        
        init: function () {
            
        }
    });
    
    var app = new MyComponent();
    app.$mount(document.body);
    
    // 带模板链接
    var MyComponent2 = drunk.Component.define({
        
        templateUrl: 'xxxx.html',
        
        init: function () {
            
        }
    });
    
    var app2 = new MyComponent2();
    app2.$processTemplate().then(function (element) {
        // element为模板生成的dom元素
        app2.$mount(element);
    });
    ```
    
* 异步组件

    alert.html:
    
    ```html
    <!--这里可以直接引用样式文件-->
    <link rel='stylesheet' type='text/css' href='alert.css' />
    <div class="alert">
        <p>{{content}}</p>
        <button drunk-on="click: cancel()">取消</button>
        <button drunk-on="click: confirm()">确认</button>
    </div>
    
    <!--可以直接引组件的js文件-->
    <script src='alert.js'></script>
    ```
    
    alert.js
    ```javascript
    drunk.Component.define('ui-alert-view', {
        cancel: function () {
            this.$emit('cancel');
        },
        confirm: function () {
            this.$emit('confirm');
        }
    });
    ```
    
    使用方式:
    ```html
    <body>
        <!--直接写组件的标签和该组件的html路径(写在src属性上),不用关心组件加载的问题-->
        <ui-alert-view
            drunk-if="alertVisible"
            src='alert.html'
            on-confirm="alertVisible = false, doConfirm()"
            on-cancel="alertVisible = false, doCancel()">
        </ui-alert-view>
    </body>
    ```
    
* 单页面应用

    每个页面定义为一个组件，并有自己的模板
    
    首页(home-page.js):
    ```javascript
    drunk.Component.define('home-page', {
        
        templateUrl: 'home-page.html',
        
        init: function () {
            
        },
       
        onEnter: function (state) {
           // 进入这个页面，会把路由参数这些状态都传进来
        }
    });
    ```
    
    订单页面(order-page.js):
    ```javascript
    drunk.Component.define('order-page', {
        
        templateUrl: 'order-page.html',
        
        init: function () {
            
        },
       
        onEnter: function (state) {
           
        }
    });
    ```
    
    在index.html里面引入drunk.js和drunk.application.js以及所有的页面组件，然后声明路由器如下：
    
    ```html
    <!--  drunk-index属性的值表明路由器的默认页为:'#/home/jczq'(playtype为jczq)  -->
    <body drunk-index="/home/jczq">
        <!--页面的标签,并声明其各自的路由规则-->
        <home-page drunk-route="/home/:playtype"></home-page>
        <order-page drunk-route="/order"></order-page>
    </body>
    ```
    
    初始化脚本,页面就渲染出来了,不用自己new组件实例，只用关心组件的业务逻辑的实现
    ```javascript
    // drunk.config.debug = true;
    drunk.Application.start();
    ```