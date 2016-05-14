/// <reference path="../filter/filter.ts" />
/// <reference path="../cache/cache.ts" />

/**
 * 简单的解析器,只是做了字符串替换,然后使用new Function生成函数
 */
namespace drunk.Parser {
    
    import Cache = drunk.Cache;
    
    export interface IGetter {
        (viewModel: ViewModel, ...args: Array<any>): any;
        filters?: Array<Filter.IFilterDef>;
        dynamic?: boolean;
        isInterpolate?: boolean;
    }
    
    export interface ISetter {
        (viewModel: ViewModel, value: any): any;
    }
    
    interface IFilterCache {
        input: string;
        filters: Array<Filter.IFilterDef>;
    }
    
    let eventName = "$event";
    let elementName = "$el";
    let valueName = "__value";
    let contextName = "this";
    let proxyOperation = contextName + ".$proxy";
    let getHandlerOperation = contextName + ".__getHandler";
    
    // 保留关键字
    let reserved: Array<string> = [
        'break', 'case', 'catch', 'continue', 'debugger', 'default', 'delete', 'do',
        'else', 'finally', 'for', 'function', 'if', 'in', 'instanceof', 'new', 'return',
        'switch', 'this', 'throw', 'try', 'typeof', 'let', 'void', 'while',
        'class', 'null', 'undefined', 'true', 'false', 'with', eventName, elementName,
        'let', 'abstract', 'import', 'yield', 'arguments'
    ];
    
    let tokenCache = new Cache<any[]>(500);
    let getterCache = new Cache<IGetter>(500);
    let setterCache = new Cache<ISetter>(500);
    let filterCache = new Cache<IFilterCache>(500);
    let expressionCache = new Cache<IGetter>(500);
    let identifierCache = new Cache<any>(500);
    let interpolateGetterCache = new Cache<IGetter>(500);
    
    let reIdentifier = /("|').*?\1|[a-zA-Z$_][a-z0-9A-Z$_]*/g;
    let reFilter = /("|').*?\1|\|\||\|\s*([a-zA-Z$_][a-z0-9A-Z$_]*)(:[^|]*)?/g;
    let reInterpolate = /\{\{((.|\n)+?)\}\}/g;
    let reBrackets = /^\([^)]*\)/;
    let reObjectKey = /[{,]\s*$/;
    let reColon = /^\s*:/;
    let reAnychar = /\S+/;
    let reThisProperties = /\bthis\.([_$[A-Za-z0-9]+)|\bthis\[\s*("|')(.+?)\2\s*\]/g;

    /**
     *  解析filter定义
     */
    function parseFilterDef(str: string, skipSetter: boolean = false) {
        if (!filterCache.get(str)) {
            let def: Array<Filter.IFilterDef> = [];
            let idx: number;
            
            str.replace(reFilter, ($0, quote, name, args, i) => {
                if (!name) {
                    return $0;
                }
                
                if (idx == null) {
                    // 记录filter开始的位置， 因为filter只能是连续的出现一直到表达式结尾
                    idx = i;
                }
                
                let param: IGetter;
                if (args) {
                    param = parseGetter('[' + args.slice(1) + ']', false, true);
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
    
    /**
     *  断言非空字符串
     */
    function assertNotEmptyString(target: string, message: string): void {
        if (!(typeof target === 'string' && reAnychar.test(target))) {
            throw new Error(`${message} : 表达式为空`);
        }
    }
    
    /**
     *  是否是对象的key
     */
    function isObjectKey(str: string): boolean {
        return str.match(reObjectKey) != null;
    }

    /**
     *  前一个字符是否是冒号
     */
    function isColon(str: string): boolean {
        return str.match(reColon) != null;
    }

    /**
     *  是否是一个方法调用
     */
    function isCallFunction(str: string): boolean {
        return str.match(reBrackets) != null;
    }
    
    /**
     *  解析所有的标记并对表达式进行格式化
     */
    function parseIdentifier(str: string) {
        let cache = identifierCache.get(str);
        
        if (!cache) {
            let index = 0;
            let proxies = [];
            let identifiers = [];

            let formated = str.replace(reIdentifier, function (x, p, i) {
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
    
    /**
     *  创建函数
     */
    function createFunction(expression, ...args: Array<string>): any {
        try {
            return Function.apply(Function, args);
        }
        catch (err) {
            console.error(`"${expression}"解析失败,尝试解析后的结果为\n`, args[args.length - 1]);
            throw err;
        }
    }
    
    /**
     * 解析表达式
     * @param  expression  表达式
     */
    export function parse(expression: string): IGetter {
        assertNotEmptyString(expression, `[Parser.parse]解析表达式失败`);
        
        let fn = expressionCache.get(expression);
        
        if (!fn) {
            let detail = parseIdentifier(expression);
            let fnBody = detail.proxies + "return (" + detail.formated + ");";
            
            fn = createFunction(expression, eventName, elementName, fnBody);
            expressionCache.set(expression, fn);
        }
        
        return fn;
    }
    
    /**
     * 解析表达式生成getter函数
     * @param   expression      表达式字符串
     * @param   isInterpolate   是否是一哥插值表达式
     * @param   skipFilter      跳过解析filter
     */
    export function parseGetter(expression: string, isInterpolate?: boolean, skipFilter?: boolean): IGetter {
        assertNotEmptyString(expression, `[Parser.parseGetter]创建getter失败`);
        
        if (isInterpolate) {
            return parseInterpolate(expression);
        }
        
        let getter = getterCache.get(expression);
        
        if (!getter) {
            let input: string = expression;
            let filter: IFilterCache;
    
            if (!skipFilter && (filter = parseFilterDef(expression))) {
                input = filter.input;
            }
            
            let detail = parseIdentifier(input);
            let fnBody = detail.proxies + "try{return (" + detail.formated + ");}catch(e){}";
    
            getter = createFunction(expression, eventName, elementName, fnBody);
            getter.dynamic = !!detail.identifiers.length;
            getter.filters = filter ? filter.filters : null;
            
            getterCache.set(expression, getter);
        }

        return getter;
    }
    
    /**
     * 解析表达式生成setter函数
     * @param   expression 表达式字符串
     */
    export function parseSetter(expression: string): ISetter {
        assertNotEmptyString(expression, `[Parser.parseSetter]创建setter失败`);
        
        let setter = setterCache.get(expression);

        if (!setter) {
            let detail = parseIdentifier(expression);
            let fnBody = detail.proxies + "return (" + detail.formated + " = " + valueName + ");";
            
            setter = createFunction(expression, valueName, fnBody);
            setterCache.set(expression, setter);
        }
        
        return setter;
    }
    
    /**
     * 解析包含插值绑定的字符串表达式， 类似"a {{interpolate_let}}"， 花括号里的就是插值变量
     * 先判断是否存在花括号， 然后在解析成tokens， 再根据token生成getter函数
     * @param   expression  表达式字符串
     * @param   justTokens  是否只需要返回tokens
     */
    export function parseInterpolate(expression: string): IGetter;
    export function parseInterpolate(expression: string, justTokens: boolean): any[];
    export function parseInterpolate(expression: string, justTokens?: boolean): any {
        console.assert(hasInterpolation(expression), `[Parser.parseInterpolate]非法表达式`, expression);
        
        let tokens = tokenCache.get(expression);
        
        if (!tokens) {
            tokens = [];
            
            let index = 0;
            let length = expression.length;
            expression.replace(reInterpolate, ($0, exp, $2, i) => {
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
     * @param   str  字符串
     */
    export function hasInterpolation(str: string): boolean {
        return typeof str === 'string' && str.match(reAnychar) !== null && str.match(reInterpolate) !== null;
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
                
                console.error(`非法的token:\n`, item);
            });

            getter = function () {
                return tokens.map(item => {
                    if (typeof item === 'string') {
                        return item;
                    }
                    return item.call(this);
                });
            };

            getter.dynamic = dynamic;
            getter.filters = filters;
            getter.isInterpolate = true;
            
            interpolateGetterCache.set(expression, getter);
        }
        return getter;
    }
    
    export function getProxyProperties(expression: any) {
        let properties: string[] = [];
        expression.toString().replace(reThisProperties, ($0, $1, $2, $3) => {
            if ($1) {
                properties.push($1);
            }
            else if ($3) {
                properties.push($3);
            }
            return $0;
        });
        
        return properties;
    }
}