"use strict";

function bind(el: HTMLElement, model: Object): void {
    // find binding property
    let prop: string = el.getAttribute("data-bind");
        
    // default model value
    let value: any = model[prop];
        
    // define prop getter setter
    Object.defineProperty(model, prop, {
        set(newValue: any) {
            if (newValue !== value) {
                value = newValue;
                el.innerHTML = value;
                console.log(prop, "changed");
            }
        },
        get() {
            return value;
        }
    });
}

var myModel: any = {};

bind(document.getElementById("content"), myModel);

// div#content will be 'a'
myModel.a = 'This is the value of property "a"';