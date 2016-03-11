/// <reference path="../binding.ts" />

drunk.Binding.register("show", {

    update(isVisible: boolean) {
        var style = this.element.style;

        if (!isVisible && style.display !== 'none') {
            style.display = 'none';
        }
        else if (isVisible && style.display === 'none') {
            style.display = '';
        }
    }
});
