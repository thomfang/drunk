/// <reference path="../viewmodel/viewmodel.ts" />
/// <reference path="../filter/filter" />
/// <reference path="../cache/cache" />


/**
 * 简单的解析器,只是做了字符串替换,然后使用new Function生成函数
 * @module drunk.parser
 * @class parser
 */
module drunk.parser {
    
    export interface IGetter {
        (viewModel: ViewModel, ...args: Array<any>): any;
        filters?: Array<filter.FilterDef>;
        dynamic?: boolean;
        isInterpolate?: boolean;
    }
    
    export interface ISetter {
        (viewModel: ViewModel, value: any): any;
    }
    
    interface IFilterCache {
        input: string;
        filters: Array<filter.FilterDef>;
    }
    
    let eventName = "$event";
    let elementName = "$el";
    let valueName = "__value";
    let contextName = "__context";
    let proxyOperation = contextName + ".proxy";
    let getHandlerOperation = contextName + ".__getHandler";
    
    // 保留关键字
    let reserved: Array<string> = [
        'break', 'case', 'catch', 'continue', 'debugger', 'default', 'delete', 'do',
        'else', 'finally', 'for', 'function', 'if', 'in', 'instanceof', 'new', 'return',
        'switch', 'this', 'throw', 'try', 'typeof', 'let', 'void', 'while',
        'class', 'null', 'undefined', 'true', 'false', 'with', eventName, elementName,
        'let', 'abstract', 'import', 'yield', 'arguments'
    ];
    
    let tokenCache = new Cache<any[]>();
    let getterCache = new Cache<IGetter>();
    let setterCache = new Cache<ISetter>();
    let filterCache = new Cache<IFilterCache>();
    let expressionCache = new Cache<IGetter>();
    let identifierCache = new Cache<any>();
    let interpolateGetterCache = new Cache<IGetter>();
    
    let regIdentifier = /("|').*?\1|[a-zA-Z$_][a-z0-9A-Z$_]*/g;
    let regFilter = /("|').*?\1|\|\||\|\s*([a-zA-Z$_][a-z0-9A-Z$_]*)(:[^|]*)?/g;
    let regInterpolate = /\{\{([^{]+)\}\}/g;
    let regBrackets = /^\([^)]*\)/;
    let regObjectKey = /[{,]\s*$/;
    let regColon = /^\s*:/;
    let regAnychar = /\S+/;

    // 解析filter定义
    function parseFilterDef(str: string, skipSetter: boolean = false) {
        if (!filterCache.get(str)) {
            let def: Array<filter.FilterDef> = [];
            let idx: number;
            
            str.replace(regFilter, ($0, quote, name, args, i) => {
                if (!name) {
                    return $0;
                }
                
                if (idx == null) {
                    // 记录filter开始的位置， 因为filter只能是连续的出现一直到表达式结尾
                    idx = i;
                }
                
                let param: IGetter;
                if (args) {
                    param = parseGetter('[' + args.slice(1) + ']');
                }
                def.push({ name: name,  param: param });
            });
            
            if (!def.length) {
                return;
            }
            
            filterCache.set(str, {
                input: str.slice(0, idx).trim(),
                filters: def
            });
        }
        
        return filterCache.get(str);
    }
    
    // 断言非空字符串
    function assertNotEmptyString(target: string, message: string): void {
        if (!(typeof target === 'string' && regAnychar.test(target))) {
            throw new Error(message + ": 表达式为空");
        }
    }
    
    // 是否是对象的key
    function isObjectKey(str: string): boolean {
        return str.match(regObjectKey) != null;
    }

    // 前一个字符是否是冒号
    function isColon(str: string): boolean {
        return str.match(regColon) != null;
    }

    // 是否是一个方法调用
    function isCallFunction(str: string): boolean {
        return str.match(regBrackets) != null;
    }
    
    // 解析所有的标记并对表达式进行格式化
    function parseIdentifier(str: string) {
        let cache = identifierCache.get(str);
        
        if (!cache) {
            let index = 0;
            let proxies = [];
            let identifiers = [];

            let formated = str.replace(regIdentifier, function (x, p, i) {
                if (p === '"' || p === "'" || str[i - 1] === '.') {
                    // 如果是字符串: "aaa"
                    // 或对象的属性: .aaa
                    index = i + x.length;
                    return x;
                }

                let prefix = str.slice(index, i);     // 前一个字符
                let suffix = str.slice(i + x.length); // 后一个字符

                index = i + x.length;

                if (isColon(suffix) && isObjectKey(prefix)) {
                    // 如果前一个字符是冒号，再判断是否是对象的Key
                    return x;
                }

                if (reserved.indexOf(x) > -1) {
                    // 如果是保留关键字直接返回原字符串
                    return x;
                }
                
                if (isCallFunction(suffix)) {
                    // 如果后面有连续的字符是一对括号则为方法调用
                    // method(a) 会转成 __context.getHandler("method")(a)
                    return getHandlerOperation + ' && ' + getHandlerOperation + '("' + x + '")';
                }

                if (identifiers.indexOf(x) < 0) {
                    // 标记未添加到列表中是
                    proxies.push('  ' + proxyOperation + '("' + x + '")');
                    identifiers.push(x);
                }

                // 否则为属性访问， 直接加上下文
                // a 转成  __context.a
                return contextName + '.' + x;
            });
            
            cache = {
                proxies: identifiers.length ? ('if (' + proxyOperation + ') {\n' + proxies.join(';\n') + ';\n}\n') : '',
                formated: formated,
                identifiers: identifiers
            };
            
            identifierCache.set(str, cache);
        }

        return cache;
    }
    
    // 创建函数
    function createFunction(expression, ...args: Array<string>): any {
        try {
            return Function.apply(Function, args);
        }
        catch (err) {
            console.error(
                '解析错误\n\n',
                '非法的表达式"' + expression + '", 尝试解析后的结果为:\n\n',
                args[args.length - 1], '\n\n',
                err.stack
            );
        }
    }
    
    /**
     * 解析表达式
     * 
     * @method parse
     * @static
     * @param  {string}  expression  表达式
     * @return {function}            返回一个方法
     */
    export function parse(expression: string): IGetter {
        assertNotEmptyString(expression, "解析表达式失败");
        
        let fn = expressionCache.get(expression);
        
        if (!fn) {
            let detail = parseIdentifier(expression);
            let fnBody = detail.proxies + "return (" + detail.formated + ");";
            
            fn = createFunction(expression, contextName, eventName, eventName, fnBody);
            expressionCache.set(expression, fn);
        }
        
        return fn;
    }
    
    /**
     * 解析表达式生成getter函数
     * 
     * @method parsetGetter
     * @static
     * @param  {string}  expression  表达式字符串
     * @param  {boolean} skipFilter  跳过解析filter
     * @return {function}            getter函数
     */
    export function parseGetter(expression: string, skipFilter?: boolean): IGetter {
        assertNotEmptyString(expression, "创建getter失败");
        
        let getter = getterCache.get(expression);
        
        if (!getter) {
            let input: string = expression;
            let filter: IFilterCache;
    
            if (!skipFilter && (filter = parseFilterDef(expression))) {
                input = filter.input;
            }
            
            let detail = parseIdentifier(input);
            let fnBody = detail.proxies + "try{return (" + detail.formated + ");}catch(e){}";
    
            getter = createFunction(expression, contextName, eventName, elementName, fnBody);
            getter.dynamic = !!detail.identifiers.length;
            getter.filters = filter ? filter.filters : null;
            
            getterCache.set(expression, getter);
        }

        return getter;
    }
    
    /**
     * 解析表达式生成setter函数
     * 
     * @method parsetSetter
     * @static
     * @param  {string}  expression 表达式字符串
     * @return {function}           setter函数
     */
    export function parseSetter(expression: string): ISetter {
        assertNotEmptyString(expression, "创建setter失败");
        
        let setter = setterCache.get(expression);

        if (!setter) {
            let detail = parseIdentifier(expression);
            let fnBody = detail.proxies + "return (" + detail.formated + " = " + valueName + ");";
            
            setter = createFunction(expression, contextName, valueName, fnBody);
            setterCache.set(expression, setter);
        }
        
        return setter;
    }
    
    /**
     * 解析包含插值绑定的字符串表达式， 类似"a {{interpolate_let}}"， 花括号里的就是插值变量
     * 先判断是否存在花括号， 然后在解析成tokens， 再根据token生成getter函数
     * 
     * @method parseInterpolate
     * @static
     * @param  {string}  expression  表达式字符串
     * @param  {boolean} justTokens  是否只需要返回tokens
     * @return {array|function}      返回token数组或getter函数
     */
    export function parseInterpolate(expression: string): IGetter;
    export function parseInterpolate(expression: string, justTokens: boolean): any[];
    export function parseInterpolate(expression: string, justTokens?: boolean): any {
        console.assert(hasInterpolation(expression), "parseInterpolate: 非法表达式", expression);
        
        let tokens = tokenCache.get(expression);
        
        if (!tokens) {
            tokens = [];
            
            let index = 0;
            let length = expression.length;
            expression.replace(regInterpolate, ($0, exp, i) => {
                if (i > index) {
                    tokens.push(expression.slice(index, i));
                }
                tokens.push({
                    expression: exp.trim()
                });
                index = i + $0.length;
                
                return $0;
            });
            
            if (index < length && index !== 0) {
                tokens.push(expression.slice(index));
            }
            
            tokenCache.set(expression, tokens);
        }
        if (!tokens.length) {
            return;
        }
        
        return justTokens ? tokens : tokensToGetter(tokens, expression);
    }
    
    /**
     * 是否有插值语法
     * 
     * @method hasInterpolation
     * @static
     * @param  {string}  str  字符串
     * @return {boolean}      返回结果
     */
    export function hasInterpolation(str: string): boolean {
        return typeof str === 'string' && str.match(regAnychar) !== null && str.match(regInterpolate) !== null;
    }
    
    // 根据token生成getter函数
    function tokensToGetter(tokens: any[], expression): IGetter {
        let getter = interpolateGetterCache.get(expression);

        if (!getter) {
            let dynamic = false;
            let filters = [];
            
            tokens = tokens.map(function (item, i) {
                if (typeof item === 'string') {
                    filters[i] = null;
                    return item;
                }
                if (item && item.expression != null) {
                    getter = parseGetter(item.expression);
                    filters[i] = getter.filters;
                    
                    if (!getter.dynamic) {
                        return getter(<ViewModel>(null));
                    }
                    dynamic = true;
                    return getter;
                }
                
                console.error("非法的token:\n", item);
            });

            getter = (ctx) => {
                return tokens.map(function (item) {
                    if (typeof item === 'string') {
                        return item;
                    }
                    return item.call(null, ctx);
                });
            };

            getter.dynamic = dynamic;
            getter.filters = filters;
            getter.isInterpolate = true;
            
            interpolateGetterCache.set(expression, getter);
        }
        return getter;
    }
}