/// <reference path="../binding" />
/// <reference path="../../util/dom" />
/// <reference path="../../component/component" />


module drunk {
    
    // 根据 in 关键字分片
    var regParam = /\s+in\s+/;
    // 匹配逗号加空格分片
    var regComma = /\s*,\s*/;
    
    var counter: number = 0;
    
    /**
     * @class drunk-repeat
     * @constructor
     */
    Binding.define("repeat", {

        // 终止型绑定
        isEnding: true,

        priority: 99,
        
        // 所有的item的viewModel列表
        itemVms: null,

        // 初始化绑定
        init() {
            this.createCommnetNodes();
            this.parseExpression();

            this.id = '__REPEATE_BINDING__' + counter++;
            this.bindingExecutor = Template.compile(this.element);
        },

        // 生成两个标记注释节点，用于插入循环创建的item节点
        createCommentNodes() {
            this.startNode = document.createComment(this.expression + " [repeat start]");
            this.endedNode = document.createComment(this.expression + " [repeat ended]");

            dom.insertBefore(this.startNode, this.element);
            dom.replace(this.endedNode, this.element);
        },

        // 解析表达式，'item,index in list'解析得到参数: {key: 'index', value: 'item'}
        // 数据源表达式为'list'
        parseExpression() {
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

            this.originalExpression = this.expression;
            this.expression = parts[1].trim();
        },

        // 数据更新,把接收到的数据转换成数组，然后再对比数组，移除旧数组中已经不存在的item，
        // 为新的Item创建（或复用）RepeaterItem实例，然后根据数据的位置插入对应的DOM节点位置中
        update(data: any) {
            var id = this.id;
            var last = data.length - 1;
            var newVms: Array<RepeaterItem> = [];
            var isEmpty = !this.itemVms || this.itemVms.length === 0;

            var itemVm: RepeaterItem;
            
            data.forEach((item, index) => {
                itemVm = newVms[index] = this.getItemVm(item, index === last);
                itemVm._isActived = true;
                
                if (isEmpty) {
                    dom.insertBefore(itemVm._element, this.endedNode);
                }
            });

            if (!isEmpty) {
                this.disposeVms(this.itemVms);

                var i = data.length;
                var currElement = this.endedNode.previousElementSibling;
                var nextElement;

                while (i--) {
                    itemVm = newVms[i];
                    nextElement = dom.getRef(itemVm._element);

                    if (nextElement !== currElement) {
                        dom.insertAfter(nextElement, currElement);
                    }
                    else {
                        currElement = currElement.previousElementSibling;
                    }
                }
            }

            newVms.forEach((itemVm) => {
                itemVm._isActived = false;

                if (!itemVm._isBinded) {
                    this.bindingExecutor(itemVm, itemVm._element);
                    itemVm._isBinded = true;
                }
            });

            this.itemVms = newVms;
        },
        
        getItemVm() {
            
        },
        
        createItemVm() {
            
        },
        
        disposeVms() {
            
        },

        release() {

        }
    });

    class RepeaterItem extends Component {

        _models: Array<Model>;
        _isBinded: boolean;
        _isActived: boolean;

        constructor(public parent: Component | RepeaterItem, public _element: HTMLElement, ownModel: Model) {
            super();

            this._model = parent._model;
            this._models = [];
            this._proxyOwnModel(ownModel);
        }

        proxy(name: string): void {
            super.proxy(name);
            this.parent.proxy(name);
        }

        _proxyOwnModel(ownModel: Model) {
            this._proxyModel(ownModel);
            observable.create(ownModel);

            var models = (<RepeaterItem>this.parent)._models;
            if (models) {
                models.forEach((model) => {
                    this._proxyModel(model);
                });
            }
        }

        _proxyModel(model: Model) {
            Object.keys(model).forEach((name: string) => {
                if (ViewModel.isProxy(this, name)) {
                    ViewModel.proxy(this, name, model);
                }
            });
            this._models.push(model);
        }
    }

    interface IRepeatItem {
        key: number | string;
        val: any;
        idx: number;
    }

    function toList(target: any): Array<IRepeatItem> {
        var ret: Array<IRepeatItem> = [];

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
}