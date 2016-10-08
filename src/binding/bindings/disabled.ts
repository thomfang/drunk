/// <reference path="../binding.ts" />

namespace drunk {

    import binding = drunk.binding;
    import Binding = drunk.Binding;

    @binding('disabled')
    class DisabledBinding extends Binding {

        element: HTMLButtonElement;

        update(disabled: boolean) {
            this.element.disabled = !!disabled;
        }
    }

}