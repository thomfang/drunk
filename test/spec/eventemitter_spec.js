/// <reference path="../../build/drunk.d.ts" />
/// <reference path="../jasmine.d.ts" />

describe("EventEmitter", function () {
    
    var emitter = new drunk.EventEmitter();
    var spy1 = jasmine.createSpy("event listener 1");
    var spy2 = jasmine.createSpy("event listener 2");
    var onceSpy = jasmine.createSpy('once listener spy');
    
    it("should add listener by type and callback", function () {
        emitter.addListener('a', spy1);
        
        expect(emitter.listeners('a')[0]).toBe(spy1);
        
        emitter.on('a', spy1);
        expect(emitter.listeners('a').length).toBe(1);
        
        emitter.on('a', spy2);
        expect(emitter.listeners('a').length).toBe(2);
    });
    
    it("should return different listener array", function () {
        var listeners1 = emitter.listeners('a');
        var listeners2 = emitter.listeners('a');
        
        expect(listeners1).not.toBe(listeners2);
        expect(listeners1).toEqual(listeners2);
    });
    
    it("should emit event by type", function () {
        emitter.emit('a', 1, 2);
        
        expect(spy1).toHaveBeenCalledWith(1, 2);
        expect(spy2).toHaveBeenCalledWith(1, 2);
        expect(emitter.listeners('a').length).toBe(2);
    });
    
    it("should add a once time listener", function () {
        emitter.once('a', onceSpy);
        
        expect(emitter.listeners('a').length).toBe(3);
        expect(onceSpy.__isOnce).toBe(true);
        
        emitter.emit('a', 123);
        
        expect(spy1).toHaveBeenCalledWith(123);
        expect(spy2).toHaveBeenCalledWith(123);
        expect(onceSpy).toHaveBeenCalledWith(123);
        
        expect(drunk.EventEmitter.listenerCount(emitter, 'a')).toBe(2);
        expect(emitter.listeners('a').indexOf(onceSpy)).toBe(-1);
    });
    
    it("should remove the given listener", function () {
        emitter.removeListener('a', spy1);
        expect(emitter.listeners('a').length).toBe(1);
        expect(drunk.EventEmitter.listenerCount(emitter, 'a')).toBe(1);
    });
    
    it("should remove all the listeners by the given event type", function () {
        emitter.removeAllListeners('a');
        expect(drunk.EventEmitter.listenerCount(emitter, 'a')).toBe(0);
    });
    
    it("should remove all the listeners without event type", function () {
        emitter.on('a', spy1);
        emitter.on('b', spy2);
        emitter.on('c', function (params) {
            
        });
        
        emitter.removeAllListeners();
        expect(emitter.listeners('a').length).toBe(0);
        expect(emitter.listeners('b').length).toBe(0);
        expect(emitter.listeners('c').length).toBe(0);
    });
});