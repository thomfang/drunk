/// <reference path="../binding" />
/// <reference path="../../component/component" />
/// <reference path="../../util/elem" />
/// <reference path="../../template/compiler" />

module drunk {
    
     Binding.register("transclude", {

        /*
         * 初始化绑定,先注册transcludeResponse事件用于获取transclude的viewModel和nodelist
         * 然后发送getTranscludeContext事件通知
         */
        init() {
            var eventName = "transclude:setup";
            this.viewModel.once(eventName, this.setup.bind(this), true);
            this.viewModel.emit(Component.GET_COMPONENT_CONTEXT, eventName);
        },

        /*
         * 设置transclude并创建绑定
         */
        setup(viewModel: Component, element: Node) {
            var nodes = [];
            var unbinds = [];
            var transclude = element.childNodes;
            var fragment = document.createDocumentFragment();

            util.toArray(transclude).forEach((node) => {
                nodes.push(node);
                fragment.appendChild(node);
            });

            // 换掉节点
            elementUtil.replace(fragment, this.element);

            nodes.forEach((node) => {
                // 编译模板病获取绑定创建函数
                // 保存解绑函数
                var bind = Template.compile(node);
                unbinds.push(bind(viewModel, node));
            });

            this.nodes = nodes;
            this.unbinds = unbinds;
        },

        /*
         * 释放绑定
         */
        release() {
            this.unbinds.forEach(unbind => unbind());
            this.nodes.forEach(node => elementUtil.remove(node));
            this.unbinds = null;
            this.nodes = null;
        }
    });
}