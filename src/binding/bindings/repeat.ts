/// <reference path="../binding" />
/// <reference path="../../util/dom" />
/// <reference path="../../component/component" />

module drunk {

    interface IDataItem {
        key: number | string;
        val: any;
        idx: number;
    }

    var regParam = /\s+in\s+/;              // 根据 in 关键字分片
    var regComma = /\s*,\s*/;               // 匹配逗号加空格分片
    var counter = 0;                        // 计数器
    var idPrefix = '__REPEATE_BINDING__';   // id名前缀
    
    /**
     * 元素循环器绑定定义
     * @class RepeatBinding
     */
    class RepeatBinding {

        isEnding = true;
        priority = 99;
        
        element: Node;
        viewModel: Component | RepeatItem;
        expression: string;
        param: {key?: string; val?: string};
        
        /**
         * 唯一id
         * @property id
         * @type string
         * @private
         */
        private id: string;
        
        /**
         * 绑定执行器
         * @property bindingExecutor
         * @type BindingExecutor
         * @private
         */
        private bindingExecutor: BindingExecutor;
        
        /**
         * 所有的item的viewModel列表
         * @property itemVms
         * @type Array<RepeatItem>
         * @private
         */
        private itemVms: Array<RepeatItem>;
        
        /**
         * 循环作用域在DOM树上的开始标记节点
         * @property startNode
         * @type Comment
         * @private
         */
        private startNode: Comment;
        
        /**
         * 循环作用域在DOM树上的结束标记节点
         * @property endedNode
         * @type Comment
         * @private
         */
        private endedNode: Comment;
        
        /**
         * RepeatItem实例的缓存
         * @property vmCache
         * @type object
         * @private
         */
        private vmCache: {[index: string]: Array<RepeatItem>};
        
        /**
         * 未修改的表达式
         * @property originalExp
         * @type string
         * @private
         */
        private originalExp: string;

        // 初始化绑定
        init() {
            this.createCommnetNodes();
            this.parseExpression();

            this.id = idPrefix + counter++;
            this.bindingExecutor = Template.compile(this.element);
        }

        // 生成两个标记注释节点，用于插入循环创建的item节点
        private createCommnetNodes() {
            this.startNode = document.createComment(this.expression + " [循环开始]");
            this.endedNode = document.createComment(this.expression + " [循环结束]");

            dom.insertBefore(this.startNode, this.element);
            dom.replace(this.endedNode, this.element);
        }

        // 解析表达式，'item,index in list'解析得到参数: {key: 'index', value: 'item'}
        // 数据源表达式为'list'
        private parseExpression() {
            var parts: Array<string> = this.expression.split(regParam);

            console.assert(parts.length === 2, "错误的repeat绑定语法", this.expression);

            var params: any = parts[0];
            var key: string;
            var value: string;

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

            this.originalExp = this.expression;
            this.expression = parts[1].trim();
        }

        // 数据更新,把接收到的数据转换成数组，然后再对比数组，移除旧数组中已经不存在的item，
        // 为新的Item创建（或复用）RepeatItem实例，然后根据数据的位置插入对应的DOM节点位置中
        update(data: any) {
            var id = this.id;
            var last = data.length - 1;
            var newVms: Array<RepeatItem> = [];
            var isEmpty = !this.itemVms || this.itemVms.length === 0;

            var itemVm: RepeatItem;

            data.forEach((item, index) => {
                itemVm = newVms[index] = this.getItemVm(item, index === last);
                itemVm._isUsing = true;

                if (isEmpty) {
                    dom.insertBefore(itemVm._element, this.endedNode);
                }
            });

            if (!isEmpty) {
                this.disposeItemVms(this.itemVms);

                var i = data.length;
                var currElement = this.endedNode.previousSibling;
                var nextElement;

                while (i--) {
                    itemVm = newVms[i];
                    nextElement = itemVm._element;

                    if (nextElement !== currElement) {
                        dom.insertAfter(nextElement, currElement);
                    }
                    else {
                        currElement = currElement.previousSibling;
                    }
                }
            }

            newVms.forEach((itemVm) => {
                itemVm._isUsing = false;

                if (!itemVm._isBinded) {
                    this.bindingExecutor(itemVm, itemVm._element);
                    itemVm._isBinded = true;
                }
            });

            this.itemVms = newVms;
        }
        
        /**
         * 从数据中找到是否存在对应的RepeatItem实例，如果没有找到再创建一个
         * @method getItemVm
         * @private
         * @param  {IDataItem}  item  数据item对象
         * @param  {boolean}    isLast 是否是最后一个
         * @return {RepeatItem}  返回从缓存中找到的或新创建的RepeatItem实例
         */
        private getItemVm(item: IDataItem, isLast: boolean): RepeatItem {
            var value = item.val;
            var isObjectOrAarray = util.isObject(value) || Array.isArray(value);
            var viewModel: RepeatItem;

            if (isObjectOrAarray) {
                // 如果是对象或数组，从数据的指定私有属性上找到viewModel实例
                viewModel = value[this.id];
            }
            else {
                // 如果是其他类型的数据，比如字符串和数字，从缓存中找未在使用的viewModel实例
                var list = this.vmCache[value];

                if (list) {
                    var i = 0;
                    viewModel = list[0];

                    while (viewModel && viewModel._isUsing) {
                        viewModel = list[++i];
                    }
                }
            }

            if (viewModel) {
                this.updateItemModel(ViewModel, item, isLast);
            }

            if (!viewModel) {
                viewModel = this.createItemVm(item, isLast, isObjectOrAarray);
            }

            return viewModel;
        }

        /**
         * 根据数据的Item生成一个RepeatItem实例,如果是对象或数组类型，直接创建在数据上的该实例的引用，
         * 用于下次访问时的快速定位
         * @method createItemVm
         * @private
         * @param  {IDataItem}  item             列表数据的item
         * @param  {boolean}    isLast           是否是最后一个
         * @param  {boolean}    isCollection     item数据是否是对象或数组
         * @return {RepeatItem} 返回创建的实例
         */
        private createItemVm(item: IDataItem, isLast: boolean, isCollection: boolean): RepeatItem {
            var own: IModel = {};
            var value = item.val;
            var viewModel: RepeatItem;

            this.updateItemModel(own, item, isLast);

            viewModel = new RepeatItem(this.viewModel, this.element.cloneNode(true), own);

            if (isCollection) {
                util.defineProperty(value, this.id, viewModel);
                viewModel._isCollection = true;
            }
            else {
                this.vmCache[value] = this.vmCache[value] || [];
                this.vmCache[value].push(viewModel);
            }
            return viewModel;
        }

        /**
         * 更新相应item的字段
         * @method updateItemModel
         * @private
         * @param  {any}        target   给对象设置item相关的数据
         * @param  {IDataItem}  item     item数据描述
         * @param  {boolean}    isLast   是否是最后一个
         */
        private updateItemModel(target: any, item: IDataItem, isLast: boolean) {
            target.$odd = 0 === item.idx % 2;
            target.$first = 0 === item.idx;
            target.$last = isLast;

            target[this.param.val] = item.val;

            if (this.param.key) {
                target[this.param.key] = item.key;
            }
        }

        /**
         * 销毁不再使用的viewmodel实例
         * @method disposeItemVms
         * @private
         * @param  {Array<RepeatItem>}  vms  item的viewModel列表
         */
        private disposeItemVms(vms: Array<RepeatItem>) {
            var id = this.id;
            var vmCache = this.vmCache;

            vms.forEach((vm) => {
                if (vm._isUsing) {
                    return;
                }
                
                var data = vm[this.param.val];
                if (vm._isCollection) {
                    // 如果是集合类型的数据，把数据上的viewModel引用移除
                    data[id] = null;
                }
                else {
                    // 如果是其他类型的数据，从缓存中移除
                    util.removeArrayItem(vmCache[data], vm);
                }

                // 销毁实例并移除DOM节点
                vm.dispose();
                dom.remove(vm._element);
            });
        }

        /**
         * 释放绑定,释放所有的RepeatItem实例
         * @method release
         */
        release() {
            this.itemVms.forEach((vm: RepeatItem) => {
                vm.dispose();
            });
            
            dom.remove(this.startNode);
            dom.remove(this.endedNode);
            
            this.itemVms = null;
            this.startNode = null;
            this.endedNode = null;
        }
    }

    /**
     * 每个repeat绑定内部生成的item的viewmodel类，可维护自己私有的数据
     * @class RepeatItem
     */
    export class RepeatItem extends Component {

        /**
         * 私有model列表
         * @property _models
         * @type Array<IModel>
         * @private
         */
        _models: Array<IModel>;
        
        /**
         * 是否已经进行视图与数据的绑定
         * @property _isBinded
         * @type boolean
         * @private
         */
        _isBinded: boolean;
        
        /**
         * 是否正在使用
         * @property _isUsing
         * @type boolean
         * @private
         */
        _isUsing: boolean;
        
        /**
         * 数据是否是对象或数组类型
         * @property _isCollection
         * @type boolean
         * @private
         */
        _isCollection: boolean;

        /**
         * @constructor
         * @param  {Component|RepeatItem} parent   父级viewModel
         * @param  {Node}                 _element 绑定
         * @param  {IModel}               ownModel 私有model
         */
        constructor(public parent: Component | RepeatItem, public _element: Node, ownModel: IModel) {
            super({
                model: parent._model,
                filters: parent.filter
            });

            this._models = [];
            this._proxyOwnModel(ownModel);
        }

        /**
         * 设置字段代理，顺便给父级viewModel实例也设置代理
         * @method proxy
         * @override
         */
        proxy(name: string): void {
            super.proxy(name);
            this.parent.proxy(name);
        }
        
        /**
         * 返回事件处理函数
         * @method getHandler
         * @override
         */
        getHandler(handlerName: string) {
            var context: any = this.parent;
            var handler = context.handlers[handlerName];
            
            while (!handler && context.parent) {
                context = context.parent;
                handler = context.handlers[handlerName];
            }
            
            if (!handler) {
                // 如果没有找到，尝试在window上找
                if (typeof window[handlerName] !== 'function') {
                    throw new Error("未找到事件处理函数:" + handlerName);
                }
                
                handler = window[handlerName];
                context = window;
            }
            
            return (...args: any[]) => {
                return handler.apply(context, args);
            };
        }

        /**
         * 代理私有model,先代理生成实例时传入的model，在代理父级上的私有model
         * @method _proxyOwnModel
         * @param  {IModel}  ownModel 私有的model
         * @private
         */
        private _proxyOwnModel(ownModel: IModel) {
            this._proxyModel(ownModel);
            observable.create(ownModel);

            var models = (<RepeatItem>this.parent)._models;
            if (models) {
                models.forEach((model) => {
                    this._proxyModel(model);
                });
            }
        }

        /**
         * 遍历指定model的所有字段，进行代理
         * @method _proxyModel
         * @param  {IModel}  model 数据
         * @private
         */
        private _proxyModel(model: IModel) {
            Object.keys(model).forEach((name: string) => {
                if (ViewModel.isProxy(this, name)) {
                    ViewModel.proxy(this, name, model);
                }
            });
            this._models.push(model);
        }
    }

    /*
     * 把数据转换为列表,如果为空则转换为空数组
     */
    function toList(target: any): Array<IDataItem> {
        var ret: Array<IDataItem> = [];

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
            var idx = 0;
            var key;

            for (key in target) {
                ret.push({
                    key: key,
                    idx: idx++,
                    val: target[key]
                });
            }
        }
        else if (typeof target === 'number') {
            for (var i = 0; i < target; i++) {
                ret.push({
                    key: i,
                    idx: i,
                    val: i
                })
            }
        }

        return ret;
    }

    // 注册这个绑定
    Binding.define("repeat", new RepeatBinding());
}