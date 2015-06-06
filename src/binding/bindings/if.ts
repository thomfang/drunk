/// <reference path="../binding" />
/// <reference path="../../util/elem" />

/**
 * 条件表达式绑定,如果表达式的返回值为false则会把元素从elementUtil树中移除,为true则会添加到elementUtil树中
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
        priority: 100,

        init() {
            this.startNode = document.createComment(" if: " + this.expression);
            this.endedNode = document.createComment(" /if: " + this.expression);
            this.bindingExecutor = Template.compile(this.element);
            this.inDocument = false;

            elementUtil.replace(this.startNode, this.element);
            elementUtil.insertAfter(this.endedNode, this.startNode);
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
            elementUtil.insertAfter(this.tmpElement, this.startNode);

            this.unbindExecutor = this.bindingExecutor(this.viewModel, this.tmpElement);
            this.inDocument = true;

        },

        removeFromDocument() {
            if (!this.inDocument) {
                return;
            }

            this.unbindExecutor();

            elementUtil.remove(this.tmpElement);

            this.unbindExecutor = null;
            this.tmpElement = null;
            this.inDocument = false;

        },

        release() {
            this.removeFromDocument();

            elementUtil.remove(this.startNode);
            elementUtil.remove(this.endedNode);

            this.startNode = null;
            this.endedNode = null;
            this.bindingExecutor = null;
        }
    });
}