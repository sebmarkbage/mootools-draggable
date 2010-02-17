/*
Script: Event.Drag.js
	Extends the Event native to also cover drag and drop events.

	License:
		MIT-style license.

	Authors:
		Sebastian Markbåge
*/

// This logic should be moved to Core to avoid duplicate code and a cleaner model

(function(){

var originalConstructor = Event.prototype.constructor,
	originalProperties = Event,
	lastTarget,
	startPosition;

window.Event = new Native({

	legacy: Event,

	name: 'Event',

	initialize: function(event, win){

		event = originalConstructor.apply(this, arguments);
		win = win || window;

		if (!event.type.match(/drag|drop/)) return event;
		
		if (!event.relatedTarget && event.type.match(/enter|leave/)){
			// TODO: Better relatedTarget solution for WebKit
			var related = lastTarget || event.event.relatedTarget || event.event.fromElement || event.event.toElement;
			if (!(function(){
				while (related && related.nodeType == 3) related = related.parentNode;
				return true;
			}).create({ attempt: Browser.Engine.gecko })()) related = false;
			event.relatedTarget = related;
			lastTarget = event.target;
		}

		if (event.type == 'dragend') lastTarget = undefined;

		if (!event.page){
			var doc = win.document, e = event.event;
			doc = (!doc.compatMode || doc.compatMode == 'CSS1Compat') ? doc.html : doc.body;
			event.page = { x: e.pageX || e.clientX + doc.scrollLeft, y: e.pageY || e.clientY + doc.scrollTop };
			event.client = { x: (e.pageX) ? e.pageX - win.pageXOffset : e.clientX, y: (e.pageY) ? e.pageY - win.pageYOffset : e.clientY };
		}
		
		if (event.type == 'dragstart') startPosition = event.page;
		else if (startPosition) event.relative = { x: event.page.x - startPosition.x, y: event.page.y - startPosition.y };

		if (!event.dataTransfer) event.dataTransfer = new DataTransfer(event.event.dataTransfer, event);

		return event;
	}

});

for (var prop in originalProperties) Event[prop] = originalProperties[prop];

originalProperties = null;

$extend(Element.NativeEvents, {	dragstart: 2, drag: 2, dragend: 2, dragenter: 2, dragover: 2, dragleave: 2, drop: 2 });

var $check = function(event){
	var related = event.relatedTarget;
	if(related == undefined) return true;
	if(related === false) return false;
	return $type(this) != 'document' && related != this && related.prefix != 'xul' && !this.hasChild(related);
};

$extend(Element.Events, {

	dragend: Browser.Engine.webkit ? {
		condition: function(event){
			// Delay dragend event on webkit until after the drop event to conform with HTML 5 specs.
			// Important for correct clean up order. Cannot be done in drop event since that may occur in a different window.
			if (event.$delayed) return true;
			event.$delayed = true;
			this.fireEvent.delay(40, this, ['dragend', event]);
			return false;
		}
	} : {},
	drag: Browser.Engine.gecko19 ? {
		condition: function(event){
			return event.page.x != 0 || event.page.y != 0 || event.client.x != 0 || event.client.y != 0;
		}
	} : {},
	dragenterself: { base: 'dragenter', condition: $check },
	dragleaveself: { base: 'dragleave', condition: $check }

});

document.body.addEvent('dragstart', function(){}); // Make sure startPosition always gets initialized

window.DataTransfer = new Native({

	name: 'DataTransfer',

	initialize: function(dataTransfer, event){
		this.event = event;
		if (dataTransfer) this.dataTransfer = dataTransfer.dataTransfer || dataTransfer;
	}

});

})();