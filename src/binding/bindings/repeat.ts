/// <reference path="../binding" />
/// <reference path="../../util/elem" />
/// <reference path="../../component/component" />
/// <reference path="../../template/compiler" />
/// <reference path="../../viewmodel/viewmodel" />

 
module drunk {
    
    interface IDataItem {
        key: string | number;
        idx: number;
        val: any;
    }
    
    let REPEAT_PREFIX = "__repeat_id";
    let counter = 0;

    let regParam = /\s+in\s+/;
    let regComma = /\s*,\s*/;

    let RepeatBindingDefinition: IBindingDefinition = {

        isEnding: true,
        priority: 90,

        // 初始化绑定
        init() {
            this.createCommentNodes();
            this.parseDefinition();

            this.$id = REPEAT_PREFIX + counter++;
            this.cache = {};
            this.bindingExecutor = Template.compile(this.element);
        },
        
        // 创建注释标记标签
        createCommentNodes() {
            this.startNode = document.createComment(this.expression + " : [循环开始]");
            this.endedNode = document.createComment(this.expression + " : [循环结束]");

            elementUtil.insertBefore(this.startNode, this.element);
            elementUtil.replace(this.endedNode, this.element);
        },

        // 解析表达式定义
        parseDefinition() {
            let expression: string = this.expression;
            let parts = expression.split(regParam);

            console.assert(parts.length === 2, '非法的 ', config.prefix + 'repeat 表达式: ', expression);

            let params: any = parts[0];
            let key: string;
            let value: string;
            
            if (params.indexOf(',') > 0) {
                params = params.split(regComma);
                key = params[1];
                value = params[0];
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
            let data = toList(newValue);

            let last = data.length - 1;
            let isEmpty = !this.itemVms || this.itemVms.length === 0;
            let vmList = [];

            let viewModel, item, i;

            for (i = 0; i <= last; i++) {
                item = data[i];
                viewModel = vmList[i] = this.getItemVm(item, i === last);

                viewModel._isChecked = true;

                if (isEmpty) {
                    elementUtil.insertBefore(viewModel.element, this.endedNode);
                }
            }

            if (!isEmpty) {
                this.releaseVm(this.itemVms);

                let curr, el;

                i = data.length;
                curr = this.endedNode.previousSibling;

                while (i--) {
                    viewModel = vmList[i];
                    el = viewModel.element;

                    if (el !== curr) {
                        elementUtil.insertAfter(el, curr);
                    }
                    else {
                        curr = curr.previousSibling;
                    }
                }
            }

            vmList.forEach(function (viewModel) {
                viewModel._isChecked = false;

                if (!viewModel._isBinded) {
                    this.bindingExecutor(viewModel, viewModel.element);
                    viewModel._isBinded = true;
                }
            }, this);

            this.itemVms = vmList;
        },

        getItemVm(item, isLast) {
            let val = item.val;
            let isCollection = util.isObject(val) || Array.isArray(val);
            let viewModel: RepeatItem;

            if (isCollection) {
                viewModel = val[this.$id];
            }
            else {
                let list = this.cache[val];

                if (list) {
                    let i = 0;
                    viewModel = list[0];

                    while (viewModel && viewModel._isChecked) {
                        viewModel = list[++i];
                    }
                }
            }

            if (viewModel) {
                this.updateItemModel(viewModel, item, isLast);
            }
            else {
                viewModel = this.createItemVm(item, isLast, isCollection);
            }

            return viewModel;
        },

        createItemVm(item: IDataItem, isLast: boolean, isCollection: boolean) {
            let own: IModel = {};
            let val = item.val;

            this.updateItemModel(own, item, isLast);

            let viewModel = new RepeatItem(this.viewModel, own, this.element.cloneNode(true));

            if (isCollection) {
                util.defineProperty(val, this.$id, viewModel);
                viewModel._isCollection = true;
            }
            else {
                this.cache[val] = this.cache[val] || [];
                this.cache[val].push(viewModel);
            }

            return viewModel;
        },

        updateItemModel(target: any, item: IDataItem, isLast: boolean) {
            target.$odd = 0 === item.idx % 2;
            target.$last = isLast;
            target.$first = 0 === item.idx;

            target[this.param.val] = item.val;

            if (this.param.key) {
                target[this.param.key] = item.key;
            }
        },

        releaseVm(itemVms: RepeatItem[], force?: boolean) {
            let cache: {[id: string]: RepeatItem[]} = this.cache;
            let value = this.param.val;
            let id = this.$id;

            itemVms.forEach((viewModel: RepeatItem) => {
                if (viewModel._isChecked && !force) {
                    return;
                }

                // 如果未在使用或强制销毁
                
                let val = viewModel[value];

                if (viewModel._isCollection) {
                    // 移除数据对viewModel实例的引用
                    val[id] = null;
                }
                else {
                    util.removeArrayItem(cache[val], viewModel);
                }

                elementUtil.remove(viewModel.element);
                viewModel.dispose();
            });
        },

        release() {
            if (this.itemVms && this.itemVms.length) {
                this.releaseVm(this.itemVms, true);
            }

            elementUtil.remove(this.startNode);
            elementUtil.replace(this.element, this.endedNode);

            this.cache = null;
            this.itemVms = null;
            this.startNode = null;
            this.endedNode = null;
            this.element = null;
            this.bindingExecutor = null;
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
        _isChecked: boolean;
        
        protected _models: IModel[] = [];
        
        constructor(public parent: Component | RepeatItem, ownModel, public element) {
            super(ownModel);
        }
        
        protected __init(ownModel) {
            let parent = this.parent;
            let models = (<RepeatItem>parent)._models;
            
            super.__init.call(this, parent._model);
            
            this.filter = parent.filter;
            
            this.__proxyModel(ownModel);
            observable.create(ownModel);
    
            if (models) {
                models.forEach(function (model) {
                    this.__proxyModel(model);
                }, this);
            }
        }
        
        proxy(property: string) {
            if (util.proxy(this, name, this._model)) {
                this.parent.proxy(name);
            }
        }
        
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
        
        private __proxyModel(model: IModel) {
            Object.keys(model).forEach((name) => {
                util.proxy(this, name, model);
            });
            this._models.push(model);
        }
    }

    /*
     * 把数据转成列表,如果为空则转成空数组
     */
    function toList(target): IDataItem[] {
        let ret: IDataItem[] = [];

        if (Array.isArray(target)) {
            target.forEach(function (val, idx) {
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
