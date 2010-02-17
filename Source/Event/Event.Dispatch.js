/*
Script: Event.Dispatch.js
	Extends the Event type to allow for native event dispatching and bubbling

	License:
		MIT-style license.

	Authors:
		Sebastian Markbåge
*/

(function(){

var createEvent = !!document.createEvent;

var mouseEventType = 'MouseEvent',
	dragEventType = window.DragEvent ? 'DragEvent' : mouseEventType;

var eventTypes = Event.Types = {

	'dragstart': dragEventType,
	'drag': Browser.Engine.gecko19 ? mouseEventType : dragEventType,
	'dragenter': dragEventType,
	'dragover': dragEventType,
	'dragleave': dragEventType,
	'drop': dragEventType,
	'dragend': dragEventType,
	'mouseout': mouseEventType,
	'mouseover': mouseEventType,
	'mousemove': mouseEventType,
	'click': mouseEventType,
	'mousedown': mouseEventType,
	'mouseup': mouseEventType

};

var map = Event.TypePropertyMaps = {};
map.Event = ['type', 'canBubble', 'cancelable'];
map.UIEvent = map.Event.concat('view', 'detail');
map.MouseEvent = map.UIEvent.concat('screenX', 'screenY', 'clientX', 'clientY', 'ctrlKey', 'altKey', 'shiftKey', 'metaKey', 'button', 'relatedTarget');
map.DragEvent = map.MouseEvent.concat('dataTransfer');

var reverse = Event.PropertyReversals = {

	'canBubble': function(){ return true; },
	'cancelable': function(){ return true; },
	'view': function(){ return (this.event && this.event.window) || window; },
	'detail': function(){ return (this.event && this.event.detail) || 0; },
	'screenX': function(){ return (this.event && this.event.screenX) || 0; },
	'screenY': function(){ return (this.event && this.event.screenY) || 0; },
	'clientX': function(){ return this.client.x; },
	'clientY': function(){ return this.client.y; },
	'ctrlKey': function(){ return !!this.control; },
	'altKey': function(){ return !!this.alt; },
	'shiftKey': function(){ return !!this.shift; },
	'metaKey': function(){ return !!this.meta; },
	'button': function(){ return (this.event && this.event.button) || 0; },
	'dataTransfer': function(){ return this.event && this.event.dataTransfer; }

};

var reverseProperty = function(property){
	var reversal = reverse[property];
	return reversal ? reversal.call(this) : this[property];
};

var unsafeEvents = Browser.Engine.gecko18 ? ['dragover', 'dragenter', 'dragleave'] : null, safeSuffix = '-safe';
//unsafeEvents = Browser.Engine.presto ? ['drop'] : false;

if (unsafeEvents) // Workaround for dispatching native XUL events
	unsafeEvents.each(function(event){
		Element.Events[event] = { base: event + safeSuffix	};
		Element.NativeEvents[event + safeSuffix] = 2;
	});

Event.implement({

	get: function(key){
		return this[key];
	},

	set: function(key, value){
		if (key instanceof String) this[key] = value;
		else for (var k in key) this[k] = key[k];
		return this;
	},

	dispatch: createEvent ? function(){
		var eventType = eventTypes[this.type] || 'Event';
		if (eventType == 'DragEvent' && !reverseProperty.call(this, 'dataTransfer')) eventType = 'MouseEvent';
		var args = map[eventType].map(reverseProperty, this);
		var event = document.createEvent(eventType + 's');
		event['init' + eventType].apply(event, args);
		if (unsafeEvents && unsafeEvents.contains(event.type)) event.type += safeSuffix;
		return this.target.dispatchEvent(event);
	} : function(){
		var event = document.createEventObject(this.event);
		//event.type = type;
		//if (type == 'dragenter') event.fromElement = relatedTarget || original.relatedTarget;
		//if (type == 'dragleave') event.toElement = relatedTarget || original.relatedTarget;
		if (this.page){
			event.pageX = this.page.x;
			event.pageY = this.page.y;
		}
		var t = this.target;
		try {
			return !t || (t._fireEvent || t.fireEvent)('on' + this.type, event);
		} catch (e){
			return true;
		}
	}

});

})();