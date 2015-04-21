# drunk.ts
Just code for fun ~_~.

# My data binding implementation notes

## STEP 1 -- A simple binding

We could define the getter/setter for binding properties of model, then when the properties changed, we could recieve the message, and do update view actions.

```html

    <!--innerHTML binded to 'a' property of model -->
    <div id="content" data-bind="a"></div>
```


```typescript

    function bind(el: HTMLElement, model: Object): void {
        // find binding property
        let prop: string = el.getAttribute("data-bind");
        
        // default model value
        let value: any = model[prop];
        
        // define prop getter setter
        Object.defineProperty(model, prop, {
            set(newValue: any) {
                if (newValue !== value) {
                    // changed to new value, update the view
                    value = newValue;
                    el.innerHTML = value;
                }
            },
            get() {
                return value;
            },
            configurable: true,
            enumerable: true
        });
    }
   
    var myModel = {};

    bind(document.getElementById("content"), myModel);

    // div#content will be 'a'
    myModel.a = 'a';
```

## STEP 2 -- Multiple elements binding to one expression
    
When a property changed, if we want to publish for multiple elements, we should have a dispatcher, all the update actions subscribe this dispatcher. So which element binding to the property would only create an update action and add to listener list of the dispatcher.


### Define in a module, the binding create method looks like this:

```typescript

module Binding {

    /**
     * Bind element to model
     */
    export function create(el: HTMLElement, model: Object): void {
        // find binding property
        let prop: string = el.getAttribute("data-bind");
        
        // default model value
        let value: any = model[prop];

        // dispatcher
        let dispatcher: Dispatcher = getDispatcher(model);

        // create a property changed listener
        function listener(newValue) {
            el.innerHTML = newValue;
            console.log(prop, "changed");
        }

        dispatcher.addListener(prop, listener);

        let descriptor = Object.getOwnPropertyDescriptor(model, prop);

        // Check if getter/setter exist
        if (!descriptor || (typeof descriptor.set !== 'function' && typeof descriptor.get !== 'function')) {

            // define prop getter setter
            Object.defineProperty(model, prop, {

                set(newValue: any) {
                    if (newValue !== value) {
                        let oldValue = value;

                        value = newValue;

                        // value changed and dispatch message
                        dispatcher.dispatch(prop, newValue, oldValue);
                    }
                },

                get() {
                    return value;
                },

                configurable: true,
                enumerable: true
            });
        }
    }
}
```

### `Dispatcher` class:

```typescript

module Binding {
    /**
     * Action listener
     */
    export interface Listener {
        (newValue: any, oldValue: any): void;
    }

    /**
     * Dispatcher for model property changed
     */
    class Dispatcher {
        private listeners: { [index: string]: Listener[] };

        public addListener(name: string, listener: Listener): void {
            if (!this.listeners) {
                this.listeners = {};
            }
            
            if (!this.listeners[name]) {
                this.listeners[name] = [];
            }

            let listeners = this.listeners[name];
            let index: number = listeners.indexOf(listener);

            if (index < 0) {
                listeners.push(listener);
            }
        }

        public dispatch(name: string, newValue: any, oldValue: any): void {
            if (!this.listeners || !this.listeners[name] || this.listeners[name].length === 0) {
                return;
            }

            let listeners: Listener[] = this.listeners[name];

            listeners.forEach((listener) => {
                listener(newValue, oldValue);
            });
        }
    }
}
```

### Dipatcher manager

```typescript

module Binding {
    var id: number = 0;
    var uniqueKey: string = '__id__';
    var dispatcherCache: {[index: number]: Dispatcher} = {};

    /**
     * @private
     */
    function getDispatcher(model: any): Dispatcher {
        if (model[uniqueKey] == null) {
            id += 1;

            Object.defineProperty(model, uniqueKey, { value: id });

            let dispatcher = new Dispatcher();
            dispatcherCache[id] = dispatcher;
        }

        return dispatcherCache[model[uniqueKey]];
    }
}
```

## STEP 3 -- Multiple bindings

Okay, now, I think I must think about that when I need to use multiple bindings for one element, and how could users setup their custom binding, so I should make it scalable.

### At first, I must have a binding executor manager, I could register on it  my binding when I need, so now it should looks like:

```typescript

module Binding {
    /**
     * The binding evalucator
     */
    let bindingExecutor = {
        bind(el: HTMLElement, value: any) {
            if (value == null) {
                value = '';
            }
            el.innerHTML = value;
        },
        class(el: HTMLElement, value: string) {
            el.className = value;
        }
    };
}
```

### So now the `create` method should have a little changed, listener would refer to the `bindingExecutor`.

```typescript

module Binding {
    function create(el: HTMLElement, model: Object, name: string, prop: string, value: any) {
        // dispatcher
        let dispatcher: Dispatcher = getDispatcher(model);

        // create a property changed listener
        function listener(newValue, oldValue) {
            // call the binding executor
            bindingExecutor[name](el, newValue, oldValue);
        }

        dispatcher.addListener(prop, listener);

        let descriptor = Object.getOwnPropertyDescriptor(model, prop);

        // Check if getter/setter exist
        if (!descriptor || (typeof descriptor.set !== 'function' && typeof descriptor.get !== 'function')) {

            // define prop getter setter
            Object.defineProperty(model, prop, {

                set(newValue: any) {
                    if (newValue !== value) {
                        let oldValue = value;

                        value = newValue;

                        // value changed and dispatch message
                        dispatcher.dispatch(prop, newValue, oldValue);
                    }
                },

                get() {
                    return value;
                },

                configurable: true,
                enumerable: true
            });
        }

        // update the view when first setup
        listener(value, undefined);
    }
}
```

### I add a `parse` method to find and create all the binding on a element.

```typescript

module Binding {
    export function parse(el: HTMLElement, model: Object) {
        let attrs = [].slice.call(el.attributes);

        attrs.forEach((attr) => {
            let name: string = attr.name;

            if (!isBinding(name)) {
                return;
            }

            // get binding name
            name = name.slice(prefix.length);

            // find binding property
            let prop: string = attr.value;
        
            // default model value
            let value: any = model[prop];

            // create binding
            create(el, model, name, prop, value);
        });
    }
}
```

### Have a try:

```html

    <div id="test" data-bind="content" data-class="myclass"></div>
    <button id="btn1">toggle class</button>
    <button id="btn2">change content</button>
```


```typescript

var myModel = {
    myclass: 'red',
    content: 'This is the default content value'
};

Binding.parse(document.getElementById('test'), myModel);

// toggle class
document.getElementById("btn1").onclick = () => {
    if (myModel.myclass === 'black') {
        myModel.myclass = 'red';
    }
    else {
        myModel.myclass = 'black';
    }
};

// toggle content
document.getElementById("btn2").onclick = () => {
    myModel.content = Math.random() + '';
};
```

## STEP 4 -- Binding with a complex path

We will encounter in the process of development of ` data - bind = "a + b" `, ` a. [c] - [e] ` d etc. This kind of quite complex scenes, we have already can't only to a certain attributes create listening to achieve the result of view update, so we are going to have a more reasonable data binding design.

### Think in the getters/setter

When the expression come to be complex, how could I manage each property of the data, when one property changed, how could we dispatch to multiple watchers?