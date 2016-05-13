/// <reference path="../binding.ts" />

namespace drunk {

    import Action = drunk.Action;

    @binding('show')
    class ShowBinding extends Binding {

        update(isVisible: boolean) {
            var style = this.element.style;

            if (!isVisible) {
                Action.triggerAction(this.element, Action.Type.removed).then(() => {
                    style.display = 'none';
                });
            }
            else if (isVisible) {
                style.display = '';
                Action.triggerAction(this.element, Action.Type.created);
            }
        }
    }
}

