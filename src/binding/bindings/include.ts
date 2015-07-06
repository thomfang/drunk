/// <reference path="../binding" />
/// <reference path="../../template/loader" />
/// <reference path="../../template/compiler" />

module drunk {

    Binding.define("include", {
        
        isActived: true,
        _unbindExecutor: null,

        update(url: string) {
            if (!this.isActived || (url && url === this.url)) {
                return;
            }
            
            this.unbind();
            this.url = url;

            if (url) {
                Template.load(url).then(this.createBinding.bind(this));
            }
            else {
                util.toArray(this.element.childNodes).forEach((child) => {
                    elementUtil.remove(child);
                });
            }
        },

        createBinding(template: string) {
            if (!this.isActived) {
                return;
            }
            
            elementUtil.html(this.element, template);
            this._unbindExecutor = Template.compile(this.element)(this.viewModel, this.element);
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
            this.isActived = false;
        }
    });

}