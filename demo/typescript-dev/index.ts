/// <reference path="../../build/drunk.d.ts" />

/**
 * MyApp
 */
@drunk.component("my-app")
class MyApp extends drunk.Component {

    firstName: string = "Jim";
    lastName: string = "Green";

    @drunk.computed
    get fullName() {
        let firstName = this.firstName || '';
        let lastName = this.lastName || '';
        return lastName ? firstName + ' ' + lastName : firstName;
    }
    set fullName(value: string) {
        let names = value.split(/\s+/) || [];
        console.log(value, names + '');
        this.firstName = names[0] || '';
        this.lastName = names[1] || '';
    }
    
}


new drunk.Component().$mount(document.body);