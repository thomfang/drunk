/// <reference path="../binding" />
/// <reference path="../../component/component" />
/// <reference path="../../util/elem" />
/// <reference path="../../template/compiler" />

module drunk {
    
     Binding.define("transclude", {

        /*
         * 初始化绑定,先注册transcludeResponse事件用于获取transclude的viewModel和nodelist
         * 然后发送getTranscludeContext事件通知
         */
        init(parentViewModel: Component, placeholder: HTMLElement) {
            if (!parentViewModel || !placeholder) {
                throw new Error('未提供父级component实例和组件声明标签');
            }
            
            let nodes = [];
            let unbinds = [];
            let transclude = placeholder.childNodes;
            let fragment = document.createDocumentFragment();

            util.toArray(transclude).forEach((node) => {
                nodes.push(node);
                fragment.appendChild(node);
            });

            // 换掉节点
            elementUtil.replace(fragment, this.element);

            nodes.forEach((node) => {
                // 编译模板病获取绑定创建函数
                // 保存解绑函数
                let bind = Template.compile(node);
                unbinds.push(bind(parentViewModel, node));
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