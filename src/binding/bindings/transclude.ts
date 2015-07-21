/// <reference path="../binding" />
/// <reference path="../../component/component" />
/// <reference path="../../util/dom" />
/// <reference path="../../template/compiler" />

module drunk {
    drunk.Binding.register("transclude", {

        /**
         * 初始化绑定,先注册transcludeResponse事件用于获取transclude的viewModel和nodelist
         * 然后发送getTranscludeContext事件通知
         */
        init(ownerViewModel: drunk.Component, placeholder: HTMLElement) {
            if (!ownerViewModel || !placeholder) {
                throw new Error('未提供父级component实例和组件声明的占位标签');
            }

            let nodes = [];
            let unbinds = [];
            let transclude = placeholder.childNodes;
            let fragment = document.createDocumentFragment();

            drunk.util.toArray(transclude).forEach((node) => {
                nodes.push(node);
                fragment.appendChild(node);
            });

            // 换掉节点
            drunk.dom.replace(fragment, this.element);

            nodes.forEach((node) => {
                // 编译模板并获取绑定创建函数
                // 保存解绑函数
                let bind = drunk.Template.compile(node);
                unbinds.push(bind(ownerViewModel, node));
            });

            this._nodes = nodes;
            this._unbindExecutors = unbinds;
        },

        /**
         * 释放绑定
         */
        release() {
            this._unbindExecutors.forEach(unbind => unbind());
            this._nodes.forEach(node => drunk.dom.remove(node));
            this._unbindExecutors = null;
            this._nodes = null;
        }
    });
}
