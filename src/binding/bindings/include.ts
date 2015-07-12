/// <reference path="../binding" />
/// <reference path="../../template/loader" />
/// <reference path="../../template/compiler" />

module drunk {

    Binding.register("include", {
        
        _unbindExecutor: null,

        update(url: string) {
            if (!this._isActived || (url && url === this.url)) {
                return;
            }
            
            this.unbind();
            this.url = url;
            
            dom.remove(util.toArray(this.element.childNodes));

            if (url) {
                Template.load(url).then(this.createBinding.bind(this));
            }
        },

        createBinding(template: string) {
            if (!this.isActived) {
                return;
            }
            
            dom.html(this.element, template);
            
            let nodes = util.toArray(this.element.childNodes);
            this._unbindExecutor = Template.compile(nodes)(this.viewModel, nodes);
        },
        
        unbind() {
            if (this._unbindExecutor) {
                this._unbindExecutor();
                this._unbindExecutor = null;
            }
        },

        release() {
            this.unbind();
            this.url = null;
        }
    });

}