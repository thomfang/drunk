/// <reference path="../binding" />
/// <reference path="../../util/elem" />
/// <reference path="../../component/component" />
/// <reference path="../../template/compiler" />
/// <reference path="../../viewmodel/viewmodel" />

 
module drunk {

    export interface IItemDataDescriptor {
        key: string | number;
        idx: number;
        val: any;
    }

    let repeaterPrefix = "__drunk_repeater_item_";
    let repeaterCounter = 0;

    let regParam = /\s+in\s+/;
    let regKeyValue = /(\w+)\s*,\s*(\w+)/;

    let RepeatBindingDefinition: IBindingDefinition = {

        isTerminal: true,
        priority: Binding.Priority.aboveNormal + 1,

        // 初始化绑定
        init() {
            this.createCommentNodes();
            this.parseDefinition();

            this._cache = {};
            this._nameOfRef = repeaterPrefix + repeaterCounter++;
            this._bindExecutor = Template.compile(this.element);
        },
        
        // 创建注释标记标签
        createCommentNodes() {
            this.startNode = document.createComment('repeat-start: ' + this.expression);
            this.endedNode = document.createComment('repeat-ended: ' + this.expression);

            elementUtil.insertBefore(this.startNode, this.element);
            elementUtil.replace(this.endedNode, this.element);
        },

        // 解析表达式定义
        parseDefinition() {
            let expression: string = this.expression;
            let parts = expression.split(regParam);

            console.assert(parts.length === 2, '错误的', config.prefix + 'repeat 表达式: ', expression);

            let params: any = parts[0];
            let key: string;
            let value: string;

            if (params.indexOf(',') > 0) {
                let matches = params.match(regKeyValue);
                console.assert(matches, '错误的', config.prefix + 'repeat 表达式: ', expression);
                // params = params.split(regComma);
                key = matches[2];
                value = matches[1];
            }
            else {
                value = params;
            }

            this.param = {
                key: key,
                val: value
            };

            this.expression = parts[1].trim();
        },

        // 数据更新
        update(newValue: any) {
            let items = RepeatItem.toList(newValue);
            let isEmpty = !this._itemVms || this._itemVms.length === 0;
            let last = items.length - 1;
            let newVms = [];
            let viewModel;
            var fragment: DocumentFragment;

            items.forEach((item, index) => {
                viewModel = newVms[index] = this._getRepeatItem(item, index === last);

                if (isEmpty) {
                    if (!fragment) {
                        fragment = document.createDocumentFragment();
                    }
                    fragment.appendChild(viewModel.element);
                }
                else {
                    viewModel._isUsed = true;
                }
            });

            if (isEmpty) {
                if (fragment) {
                    elementUtil.insertAfter(fragment, this.startNode);
                }
            }
            else {
                this._unrealizeUnusedItems();

                let currElement, itemElement, i;

                let getPrev = (node: Node) => {
                    currElement = node.previousSibling;
                    while (currElement && currElement.__disposed) {
                        currElement = currElement.previousSibling;
                    }
                    return currElement;
                }

                i = items.length;
                currElement = getPrev(this.endedNode);

                while (i--) {
                    viewModel = newVms[i];
                    itemElement = viewModel.element;

                    if (itemElement !== currElement) {
                        elementUtil.insertAfter(itemElement, currElement);
                    }
                    else {
                        currElement = getPrev(currElement);
                    }
                }
            }

            newVms.forEach((viewModel) => {
                viewModel._isUsed = false;

                if (!viewModel._isBinded) {
                    this._bindExecutor(viewModel, viewModel.element);
                    viewModel._isBinded = true;
                }
            });

            this._itemVms = newVms;
        },

        _getRepeatItem(item, isLast) {
            let value = item.val;
            let isCollection = util.isObject(value) || Array.isArray(value);
            let viewModel: RepeatItem;

            if (isCollection) {
                let arr = value[this._nameOfRef];
                if (arr) {
                    for (var i = 0; viewModel = arr[i]; i++) {
                        if (!viewModel._isUsed) {
                            break;
                        }
                    }
                }
            }
            else {
                let list = this._cache[value];

                if (list) {
                    let i = 0;
                    viewModel = list[0];

                    while (viewModel && viewModel._isUsed) {
                        viewModel = list[++i];
                    }
                }
            }

            if (viewModel) {
                this._updateItemModel(viewModel, item, isLast);
            }
            else {
                viewModel = this._realizeRepeatItem(item, isLast, isCollection);
            }

            return viewModel;
        },

        _realizeRepeatItem(item: IItemDataDescriptor, isLast: boolean, isCollection: boolean) {
            let value = item.val;
            let options: IModel = {};

            this._updateItemModel(options, item, isLast);

            let viewModel = new RepeatItem(this.viewModel, options, this.element.cloneNode(true));

            if (isCollection) {
                if (!value[this._nameOfRef]) {
                    util.defineProperty(value, this._nameOfRef, []);
                }
                value[this._nameOfRef].push(viewModel);
                viewModel._isCollection = true;
            }
            else {
                this._cache[value] = this._cache[value] || [];
                this._cache[value].push(viewModel);
            }

            return viewModel;
        },

        _updateItemModel(target: any, item: IItemDataDescriptor, isLast: boolean) {
            target.$odd = 0 === item.idx % 2;
            target.$even = !target.$odd;
            target.$last = isLast;
            target.$first = 0 === item.idx;

            target[this.param.val] = item.val;

            if (this.param.key) {
                target[this.param.key] = item.key;
            }
        },

        _unrealizeUnusedItems(force?: boolean) {
            let cache: { [id: string]: RepeatItem[] } = this._cache;
            let nameOfVal = this.param.val;
            let nameOfRef = this._nameOfRef;

            this._itemVms.forEach((viewModel: RepeatItem, index) => {
                if (viewModel._isUsed && !force) {
                    return;
                }

                let value = viewModel[nameOfVal];

                if (viewModel._isCollection) {
                    // 移除数据对viewModel实例的引用
                    util.removeArrayItem(value[nameOfRef], viewModel);
                    if (value[nameOfRef]) {
                        delete value[nameOfRef];
                    }
                }
                else {
                    util.removeArrayItem(cache[value], viewModel);
                }

                let element = viewModel.element;
                element.__disposed = true;
                viewModel.dispose();
                elementUtil.remove(element);
            });
        },

        release() {
            if (this._itemVms && this._itemVms.length) {
                this._unrealizeUnusedItems(true);
            }

            elementUtil.remove(this.startNode);
            elementUtil.remove(this.endedNode);

            this._cache = null;
            this._itemVms = null;
            this._bindExecutor = null;
            this.startNode = null;
            this.endedNode = null;
            this.element = null;
        }
    };

    Binding.register("repeat", RepeatBindingDefinition);

    /**
     * 用于repeat作用域下的子viewModel
     * @class RepeatItem
     * @constructor
     * @param {Component}   parent      父级ViewModel
     * @param {object}      ownModel    私有的数据
     * @param {HTMLElement} element     元素对象
     */
    export class RepeatItem extends Component {

        _isCollection: boolean;
        _isUsed: boolean;

        protected _models: IModel[];

        constructor(public parent: Component | RepeatItem, ownModel, public element) {
            super(ownModel);
            this.__inheritParentMembers();
        }
        
        /**
         * 这里只初始化私有model
         * @method __init
         * @override
         * @protected
         */
        protected __init(ownModel) {
            this.__proxyModel(ownModel);
            observable.create(ownModel);
        }
        
        /**
         * 继承父级viewModel的filter和私有model
         * @method __inheritParentMembers
         * @protected
         * @override
         */
        protected __inheritParentMembers() {
            let parent = this.parent;
            let models = (<RepeatItem>parent)._models;

            super.__init(parent._model);

            this.filter = parent.filter;

            if (models) {
                models.forEach((model) => {
                    this.__proxyModel(model);
                });
            }
        }
        
        /**
         * 代理指定model上的所有属性
         * @method __proxyModel
         * @protected
         */
        protected __proxyModel(model: IModel) {
            Object.keys(model).forEach((name) => {
                util.proxy(this, name, model);
            });

            if (!this._models) {
                this._models = [];
            }

            this._models.push(model);
        }
        
        /**
         * 重写代理方法,顺便也让父级viewModel代理该属性
         * @method proxy
         * @override
         */
        proxy(property: string) {
            if (util.proxy(this, name, this._model)) {
                this.parent.proxy(name);
            }
        }
        
        /**
         * 重写获取事件处理方法,忘父级查找该方法
         * @override
         * @method __getHandler
         */
        __getHandler(name: string) {
            let context: any = this;
            let handler = this[name];

            while (!handler && context.parent) {
                context = context.parent;
                handler = context[name];
            }

            if (!handler) {
                if (typeof window[name] !== 'function') {
                    throw new Error("Handler not found: " + name);
                }

                handler = window[name];
                context = window;
            }

            return (...args: any[]) => {
                return handler.apply(context, args);
            };
        }

        /**
         * 把数据转成列表,如果为空则转成空数组
         * @method toList
         * @static
         * @param  {any}  target
         */
        static toList(target: any): IItemDataDescriptor[] {
            let ret: IItemDataDescriptor[] = [];

            if (Array.isArray(target)) {
                target.forEach(function(val, idx) {
                    ret.push({
                        key: idx,
                        idx: idx,
                        val: val
                    });
                });
            }
            else if (util.isObject(target)) {
                let idx = 0;
                let key;

                for (key in target) {
                    ret.push({
                        key: key,
                        idx: idx++,
                        val: target[key]
                    });
                }
            }
            else if (typeof target === 'number') {
                for (let i = 0; i < target; i++) {
                    ret.push({
                        key: i,
                        idx: i,
                        val: i
                    });
                }
            }

            return ret;
        }
    }

}
