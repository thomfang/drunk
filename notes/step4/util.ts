module drunk {

    /**
     * Ensure the item is a unique item in the array
     */
    export function addArrayItem(array: any[], item: any): void {
        var index: number = array.indexOf(item);
        if (index < 0) {
            array.push(item);
        }
    }

    /**
     * Remove item from array
     */
    export function removeArrayItem(array: any[], item: any): void {
        var index: number = array.indexOf(item);
        if (index > -1) {
            array.splice(index, 1);
        }
    }

    /**
     * Assert target is an object
     */
    export function isObject(unknow: any): boolean {
        return Object.prototype.toString.call(unknow) === '[object Object]';
    }
}