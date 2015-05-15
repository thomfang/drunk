/// <reference path="../viewmodel/viewmodel" />
/// <reference path="../parser/parser" />


module drunk.filter {
    
    export interface Filter {
        (input: any, ...args: any[]): any;
    }
    
    export interface FilterDef {
        name: string;
        param?: parser.Getter;
    }
    
    /**
     * method applyFilters
     * @param  {any}            input       输入
     * @param  {FilterDef[]}    filterDefs  filter定义集合
     * @param  {ViewModel}      viewModel   ViewModel实例
     * @param  {any[]}          ...args     其他参数
     * @return {any}                        过滤后得到的值
     */
    export function applyFilters(input: any, filterDefs: FilterDef[], viewModel: ViewModel, ...args: any[]): any {
        if (!filterDefs) {
            return input;
        }
        
        var filters = viewModel.filter;
        var method: Filter;
        
        filterDefs.forEach((def) => {
            method = filters[def.name];
            
            if ("function" !== typeof method) {
                return console.error(def.name, "filter未找到");
            }
            
            var params = def.param ? def.param(viewModel, ...args) : [];
            input = method(input, ...params);
        });
        
        return input;
    }
    
    export var filters: {[name: string]: Filter} = {
        
    };
}