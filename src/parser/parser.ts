/**
 * A simple parser for JavaScript syntax with custom filter expression.
 */

interface Getter {
    (dataContext, event?: Event, element?: HTMLElement): any;
    filters?: { name: string; param: Getter }[];
}

interface Setter {
    (dataContext, value: any): any;
}

module drunk.parser {

    function getFilters(expression: string, skipSetter: boolean = false) {

    }

    // @TODO
    // A string like 'a + b' would be parsed to a getter function like:
    // function getter($ctx) {
    //     try { return ($ctx.a + $ctx.b); }
    //     catch (e) { /* here would return undefined*/ }
    // }
    export function parseGetter(expression: string): Getter {
        var getter: Getter;

        return getter;
    }

    // @TODO
    // A string like 'a[b].c' would be parsed to a setter function like:
    // function ($ctx, $val) {
    //     try { return ($ctx.a[$ctx.b].c = $val); }
    //     catch (e) {}
    // }
    export function parseSetter(expression: string): Setter {
        var setter: Setter;

        return setter;
    }

    // @TODO
    // Parse a string with binding template tag to a getter function.
    // At first we check if the string has the binding template tag(which would like '{{ }}'),
    // we would make it tokenize. Which string like 'A string with interpolate {{value}} here' would
    // be parsed to tokens like: ['A string with interpolate ', {varname: 'value'}, ' here'].
    // And if the 'justTokens' given to be 'true', we just return the tokens, and won't parse to a
    // getter function.
    export function parseInterpolate(expression: string, justTokens: boolean = false): Getter {
        var getter: Getter;

        return getter;
    }
}