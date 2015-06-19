/// <reference path="./loader" />
/// <reference path="../util/elem" />

module drunk.Template {
    
    export function renderFragment(url: string, hostedElement?: Node) {
        return load(url).then(elementUtil.create).then((template) => {
            return 123;
        });
    }
}