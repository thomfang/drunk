/// <reference path="../binding.ts" />

namespace drunk {

    @binding('show')
    class ShowBinding extends Binding {

        update(isVisible: boolean) {
            var style = this.element.style;
            let action: drunk.ActionBinding = this.element[drunk.Action.weakRefKey];

            if (!isVisible) {
                if (action) {
                    action.runActionByType(drunk.Action.Type.removed);
                    drunk.Action.process(this.element).then(() => {
                        style.display = 'none';
                    });
                }
                else {
                    style.display = 'none';
                }
            }
            else if (isVisible) {
                style.display = '';
                if (action) {
                    action.runActionByType(drunk.Action.Type.created);
                }
            }
        }
    }
}

