/// <reference path="../binding" />
/// <reference path="../../template/loader" />
/// <reference path="../../template/compiler" />

/**
 * 引入指定url的html字符串模板
 * @class drunk-include
 * @constructor
 * @show
 * @example
        <html>
            <section>
                <p>以下是标签中的模板</p>
                <div drunk-include="'tpl'"></div>
            </section>
            <div id="tpl" type="text/template" style="display:none">
                <div>这里是script 标签的模板</div>
            </div>
        </html>
        
        <script>
            new drunk.Component().mount(document.querySelector("section"));
        </script>
 */
module drunk {

    Binding.define("include", {
        
        isActived: true,
        _unbindExecutor: null,

        update(url: string) {
            if (!this.isActived || (url && url === this.url)) {
                return;
            }
            
            this.unbind();

            if (url) {
                this.url = url;
                return Template.load(url).then(this.createBinding.bind(this));
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
            elementUtil.html(this.element, '');
        }
    });

}