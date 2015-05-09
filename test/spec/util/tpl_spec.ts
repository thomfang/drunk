/// <reference path="../../jasmine.d.ts" />
/// <reference path="../../../src/util/util.ts" />
/// <reference path="../../../src/util/xhr.ts" />
/// <reference path="../../../src/util/tpl.ts" />

module TemplateTestCases {
    
    import util = drunk.util;
    
    describe("drunk.util", () => {
    
        it("loadTemplate: template in script tag", (done) => {
            var tplString = "<div></div>";
            var tplScriptElem = document.createElement("script");
            tplScriptElem.id = "tpl/test.html";
            tplScriptElem.type = 'text/template';
            tplScriptElem.innerHTML = tplString;
    
            document.body.appendChild(tplScriptElem);
    
            util.loadTemplate('tpl/test.html').then((res) => {
                expect(res).toBe(tplString);
    
                util.loadTemplate('test_tpl.html').then((res) => {
                    expect(res).toBe("<div>test tpl</div>");
                    done();
                });
            });
        });
        
        it("loadTemplate: template on server", (done) => {
            util.loadTemplate("runner.html").then((html) => {
                
                expect(typeof html).toBe('string');
                done();
            });
        });
    
    });
}