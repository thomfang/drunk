/// <reference path="../viewmodel/viewmodel.ts" />
/// <reference path="../filter/filter" />


/**
 * 简单的词法解析器
 * 
 * @module drunk.parser
 * @class parser
 */
module drunk.parser {
    
    export interface Getter {
        (viewModel: ViewModel, ...args: Array<any>): any;
        filters?: Array<filter.FilterDef>;
        dynamic?: boolean;
    }
    
    export interface Setter {
        (viewModel: ViewModel, value: any): any;
    }
    
    interface FilterCache {
        input: string;
        filters: Array<filter.FilterDef>;
    }
    
    var eventName = "$event";
    var valueName = "$value";
    var elementName = "$el";
    var contextName = "$context";
    var proxyOperation = contextName + ".proxy";
    var getHandlerOperation = contextName + ".getHandler";
    
    // 保留关键字
    var reserved: Array<string> = [
        'break', 'case', 'catch', 'continue', 'debugger', 'default', 'delete', 'do',
        'else', 'finally', 'for', 'function', 'if', 'in', 'instanceof', 'new', 'return',
        'switch', 'this', 'throw', 'try', 'typeof', 'var', 'void', 'while',
        'class', 'null', 'undefined', 'true', 'false', 'with', '$event', '$el',
        'let', 'abstract', 'import', 'yield', 'arguments'
    ];
    
    var tokenCache: {[expression: string]: Array<any>} = {};
    var getterCache: {[expression: string]: Getter} = {};
    var setterCache: {[expression: string]: Setter} = {};
    var filterCache: {[expression: string]: FilterCache} = {};
    var expressionCache: {[expression: string]: Getter} = {};
    var identifierCache: {[expression: string]: any} = {};
    var interpolateGetterCache: {[expression: string]: Getter} = {};
    
    var regIdentifier = /("|').*?\1|[a-zA-Z$_][a-z0-9A-Z$_]*/g;
    var regFilter = /("|').*?\1|\|\||\|\s*([a-zA-Z$_][a-z0-9A-Z$_]*)(:[^|]*)?/g;
    var regInterpolate = /\{\{([^{]+)\}\}/g;
    var regBrackets = /^\([^)]*\)/;
    var regObjectKey = /[{,]\s*$/;
    var regColon = /^\s*:/;
    var regAnychar = /\S+/;

    // 解析filter定义
    function parseFilterDef(str: string, skipSetter: boolean = false) {
        if (!filterCache[str]) {
            var def: Array<filter.FilterDef> = [];
            var idx: number;
            
            str.replace(regFilter, ($0, quote, name, args, i) => {
                if (!name) {
                    return $0;
                }
                
                if (idx == null) {
                    // 记录filter开始的位置， 因为filter只能是连续的出现一直到表达式结尾
                    idx = i;
                }
                
                var param: Getter;
                if (args) {
                    param = parseGetter('[' + args.slice(1) + ']');
                }
                def.push({ name: name,  param: param });
            });
            
            if (!def.length) {
                return;
            }
            
            filterCache[str] = {
                input: str.slice(0, idx).trim(),
                filters: def
            };
        }
        
        return filterCache[str];
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
        var cache = identifierCache[str];
        
        if (!cache) {
            var index = 0;
            var proxies = [];
            var identifiers = [];

            var formated = str.replace(regIdentifier, function (x, p, i) {
                if (p === '"' || p === "'" || str[i - 1] === '.') {
                    // 如果是字符串: "aaa"
                    // 或对象的属性: ".aaa"
                    index = i + x.length;
                    return x;
                }

                var prefix = str.slice(index, i);     // 前一个字符
                var suffix = str.slice(i + x.length); // 后一个字符

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
            
            identifierCache[str] = cache;
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
    export function parse(expression: string): Getter {
        assertNotEmptyString(expression, "解析表达式失败");
        
        var fn: Getter = expressionCache[expression];
        
        if (!fn) {
            var detail = parseIdentifier(expression);
            var fnBody = detail.proxies + "return (" + detail.formated + ");";
            
            fn = createFunction(expression, contextName, eventName, eventName, fnBody);
            expressionCache[expression] = fn;
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
    export function parseGetter(expression: string, skipFilter?: boolean): Getter {
        assertNotEmptyString(expression, "创建getter失败");
        
        var getter: Getter = getterCache[expression];
        
        if (!getter) {
            var input: string = expression;
            var filter: FilterCache;
    
            if (!skipFilter && (filter = parseFilterDef(expression))) {
                input = filter.input;
            }
            
            var detail = parseIdentifier(input);
            var fnBody = detail.proxies + "try{return (" + detail.formated + ");}catch(e){}";
    
            getter = createFunction(expression, contextName, eventName, elementName, fnBody);
            getter.dynamic = !!detail.identifiers.length;
            getter.filters = filter ? filter.filters : null;
            
            getterCache[expression] = getter;
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
    export function parseSetter(expression: string): Setter {
        assertNotEmptyString(expression, "创建setter失败");
        
        var setter: Setter = setterCache[expression];

        if (!setter) {
            var detail = parseIdentifier(expression);
            var fnBody = detail.proxies + "return (" + detail.formated + " = " + valueName + ");";
            
            setter = createFunction(expression, contextName, valueName, fnBody);
            setterCache[expression] = setter;
        }
        
        return setter;
    }
    
    /**
     * 解析包含插值绑定的字符串表达式， 类似"a {{interpolate_var}}"， 花括号里的就是插值变量
     * 先判断是否存在花括号， 然后在解析成tokens， 再根据token生成getter函数
     * 
     * @method parseInterpolate
     * @static
     * @param  {string}  expression  表达式字符串
     * @param  {boolean} justTokens  是否只需要返回tokens
     * @return {array|function}      返回token数组或getter函数
     */
    export function parseInterpolate(expression: string): Getter;
    export function parseInterpolate(expression: string, justTokens: boolean): any[];
    export function parseInterpolate(expression: string, justTokens?: boolean): any {
        if (hasInterpolate(expression)) {
            return;
        }
        
        var tokens = tokenCache[expression];
        
        if (!tokens) {
            tokens = [];
            
            var index = 0;
            var length = expression.length;
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
            
            tokenCache[expression] = tokens;
        }
        if (!tokens.length) {
            return;
        }
        
        return justTokens ? tokens : tokensToGetter(tokens, expression);
    }
    
    /**
     * 是否有插值语法
     * 
     * @method hasInterpolate
     * @static
     * @param  {string}  str  字符串
     * @return {boolean}      返回结果
     */
    export function hasInterpolate(str: string): boolean {
        return str.match(regInterpolate) != null;
    }
    
    // 根据token生成getter函数
    function tokensToGetter(tokens: any[], expression): Getter {
        var getter = interpolateGetterCache[expression];
        var dynamic = false;
        
        if (!getter) {
            tokens = tokens.map((token) => {
                if (typeof token === "string") {
                    return token;
                }
                if (token && token.expression != null) {
                    dynamic = true;
                    return parseGetter(token.expression);
                }
                console.error("getter生成失败失败,未知的token:\n", tokens);
            });
            
            getter = (viewModel: ViewModel) => {
                var val;
                var ret;
                tokens.forEach((token) => {
                    if (typeof token === 'string') {
                        val = token;
                    }
                    else {
                        val = viewModel.eval(token);
                        val = val == null ? '' : val;
                    }
                    ret = ret == null ? val : ret + val;
                });
                return ret;
            };

            getter.dynamic = dynamic;
            interpolateGetterCache[expression] = getter;
        }
        return getter;
    }
}