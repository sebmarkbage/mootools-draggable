/*
Script: Event.Dispatch.NonNative.js
	Extends the Event type to allow for bubbling event dispatching

	License:
		MIT-style license.

	Authors:
		Sebastian Markbåge
*/

(function(){

var stopPropagation = Event.prototype.stopPropagation,
	preventDefault = Event.prototype.preventDefault;

Event.implement({

	get: function(key){
		return this[key];
	},

	set: function(key, value){
		if (key instanceof String) this[key] = value;
		else for (var k in key) this[k] = key[k];
		return this;
	},

	dispatch: function(){
		this.preventedDefault = false;
		this.stoppedPropagation = false;
			
		var target = this.target,
			body = target.ownerDocument.body,
			type = this.type;

		while (target){
			var events = target.retrieve && target.retrieve('events');
			if (events && type in events){
				events[type].keys.each(function(fn){
					fn.call(target, this);
				}, this);
			}
			if (this.stoppedPropagation || target === body) break;
			target = target.parentNode;
		}
		return !this.preventedDefault;
	},
	
	preventDefault: function(){
		this.preventedDefault = true;
		return preventDefault.apply(this, arguments);
	},
	
	stopPropagation: function(){
		this.stoppedPropagation = true;
		return stopPropagation.apply(this, arguments);
	}

});

})();