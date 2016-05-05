/// <reference path="../binding.ts" />

drunk.Binding.register("show", {

    update(isVisible: boolean) {
        var style = this.element.style;
        let action = this.element[drunk.Action.weakRefKey];

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
});
