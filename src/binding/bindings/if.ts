/// <reference path="../binding" />
/// <reference path="../../util/dom" />

/**
 * 条件表达式绑定,如果表达式的返回值为false则会把元素从dom树中移除,为true则会添加到dom树中
 * @class drunk-if
 * @constructor
 * @show
 * @example
        <html>
            <section>
                设置a的值: <input type="text" drunk-model="a" />
                <p drunk-if="a < 10">如果a小于10显示该标签</p>
            </section>
        </html>
        
        <script>
            var myView = new drunk.Component();
            myView.mount(document.querySelector("section"));
            myView.a = 0;
        </script>
 */
module drunk {

    Binding.register("if", {

        isTerminal: true,
        priority: Binding.Priority.aboveNormal + 2,

        init() {
            this.startNode = document.createComment("if-start: " + this.expression);
            this.endedNode = document.createComment("if-ended: " + this.expression);
            this.bindingExecutor = Template.compile(this.element);
            this.inDocument = false;

            dom.replace(this.startNode, this.element);
            dom.after(this.endedNode, this.startNode);
        },

        update(value) {
            if (!!value) {
                this.addToDocument();
            }
            else {
                this.removeFromDocument();
            }
        },

        addToDocument() {
            if (this.inDocument) {
                return;
            }

            this.tmpElement = this.element.cloneNode(true);
            dom.after(this.tmpElement, this.startNode);

            this.unbindExecutor = this.bindingExecutor(this.viewModel, this.tmpElement);
            this.inDocument = true;

        },

        removeFromDocument() {
            if (!this.inDocument) {
                return;
            }

            this.unbindExecutor();

            dom.remove(this.tmpElement);

            this.unbindExecutor = null;
            this.tmpElement = null;
            this.inDocument = false;

        },

        release() {
            this.removeFromDocument();

            dom.remove(this.startNode);
            dom.remove(this.endedNode);

            this.startNode = null;
            this.endedNode = null;
            this.bindingExecutor = null;
        }
    });
}