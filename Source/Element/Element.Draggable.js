/*
Script: Element.Draggable.js
	Enables HTML 5 drag operation events in legacy browsers.

	License:
		MIT-style license.

	Authors:
		Sebastian Markbåge
*/

(function(window, document){

	var useNative = true, useShim = false, snap = 16;

	var startEvent = null, gesture = false;

	var shim = useShim && new Element('div', { styles: { width: '100%', height: '100%', position: 'absolute', left: 0, top: 0, zIndex: 9999 } });

	var dispatchDragEvent = function(original, type, target, relatedTarget){
		var event = new Event(original);
		event.set({
			type: type,
			target: target || event.target,
			relatedTarget: relatedTarget || event.relatedTarget,
			dataTransfer: new DataTransfer(original.dataTransfer, event)
		});
		return event.dispatch();
	};

	var dragPreStart = function(event){
		if (startEvent) return;
		startEvent = (Browser.Engine.gecko) ? new Event($extend({}, event.event)) : event;
		gesture = this.retrieve('draggable') == 'gesture';
		event.preventDefault();
		if (shim) shim.inject(document.body);
		document.addEvents({ mousemove: dragCheck, mouseup: dragCancel, selectstart: stopEvent });
	};

	var dragCancel = function(){
		this.removeEvents({	mousemove: dragCheck, mouseup: dragCancel });
		if (shim) shim.dispose();
		startEvent = null;
	};

	var dragCheck = function(event){
		if (Math.pow(event.page.x - startEvent.page.x, 2) + Math.pow(event.page.y - startEvent.page.y, 2) <= snap) return;

		this.removeEvents({ mousemove: dragCheck, mouseup: dragCancel });
		event.stop();

		if (!gesture && useNative && startEvent.target.dragDrop){
			startEvent.target.dragDrop();
		} else if (dispatchDragEvent(startEvent.event, 'dragstart', startEvent.target)){
			attachListeners();
			return;
		}
		this.removeEvent('selectstart', stopEvent);
		if (shim) shim.dispose();
		startEvent = null;
	};
	
	// TODO: Cancelable using ESC key
	var attachListeners = window.addEventListener ? function(){
		var win = window;
		win.addEventListener('mousemove', dragOver, true);
		win.addEventListener('mouseover', dragEnter, true);
		win.addEventListener('mouseout', dragLeave, true);
		win.addEventListener('mouseup', dragEnd, true);
	} : function(){
		var body = document.body;
		body.attachEvent('onmousemove', dragOver);
		body.attachEvent('onmousemove', dragEnter);
		body.attachEvent('onmousemove', dragLeave);
		body.attachEvent('onmouseup', dragEnd);
		body.setCapture();
	};
	
	var detachListeners = window.addEventListener ? function(){
		var win = window;
		win.removeEventListener('mousemove', dragOver, true);
		win.removeEventListener('mouseover', dragEnter, true);
		win.removeEventListener('mouseout', dragLeave, true);
		win.removeEventListener('mouseup', dragEnd, true);
	} : function(){
		var body = document.body;
		body.detachEvent('onmousemove', dragOver);
		body.detachEvent('onmousemove', dragEnter);
		body.detachEvent('onmousemove', dragLeave);
		body.detachEvent('onmouseup', dragEnd);
		document.releaseCapture();
	};

	var dragOver = function(event){
		event = event || window.event;
		stopEvent(event);
		resetDropEffect('none');
		var end = !dispatchDragEvent(event, 'drag', startEvent.target);
		resetDropEffect();
		if (end || dispatchDragEvent(event, 'dragover')) resetDropEffect('none');
		if (end) dragEnd(event);
	};
	
	var dragEnter = function(event){
		event = event || window.event;
		stopEvent(event);
		resetDropEffect();
		if (dispatchDragEvent(event, 'dragenter')) resetDropEffect('none');
	};
	
	var dragLeave = function(event){
		event = event || window.event;
		stopEvent(event);
		dispatchDragEvent(event, 'dragleave');
	};

	var dragEnd = function(event){
		event = event || window.event;
		
		if (shim) shim.dispose();

		stopEvent(event);

		var dataTransfer = new DataTransfer();
		if (dataTransfer.get && dataTransfer.get('dropAllowed'))
			dispatchDragEvent(event, 'drop');

		dispatchDragEvent(event, 'dragend', startEvent.target);

		startEvent = null;

		this.removeEvent('selectstart', stopEvent);
		
		detachListeners();
	};
	
	var stopEvent = window.addEventListener ? function(event){
		event.stopPropagation();
		event.preventDefault();
	} : function(event){
		event = event || window.event;
		event.cancelBubble = true;
		event.returnValue = false;
	};
	
	var resetDropEffect = function(value){
		var dataTransfer = new DataTransfer();
		if (dataTransfer.set) dataTransfer.set('dropEffect', value);
	};
	
	var blockNativeStart = function(event){
		if ((event.event || event).dataTransfer){ event.preventDefault(); }
	};

	/*
	Gecko doesn't allow screen position on drag and dragend events
	if (Browser.Engine.gecko19) window.addEventListener('dragover', function(event){
		dispatchDragEvent(event, 'drag', startEvent.target);
	}, true);
	*/
	
	Element.Properties.draggable = /*Browser.Engine.webkit ? {
	
		// TODO: Gesture option
	
		// TODO: Too many bugs in WebKit on PC? Use fallback instead?

		get: function(){
			var drag = this.getStyle('-khtml-user-drag');
			if (!drag) return this.draggable == undefined ? 'auto' : this.draggable;
			return drag == 'auto' ? drag : (drag == 'element');
		},

		set: function(value){
			this.setStyle('-khtml-user-drag', value == 'auto' ? 'auto' : (value && value != 'false' ? 'element' : 'none'));
			this.setStyle('-webkit-user-select', 'none');
			//if (value) this.addEvent('mousedown', stopEvent);
			//else this.removeEvent('mousedown', stopEvent);
		}

	} :*/ {
	
		get: function(){
			var d = this.retrieve('draggable');
			if (d !== undefined) return d;
			if (useNative && 'draggable' in this) return this.draggable;
			var events = this.retrieve('events');
			return !events || !events['mousedown'] || !events['mousedown'].contains(dragPreStart);
		},
		
		set: function(value){
			this.store('draggable', value);
			var n = useNative && value != 'gesture';
			if (!n && Browser.Engine.trident) this.addEvent('dragstart', blockNativeStart);
			if (n && 'draggable' in this) this.draggable = value;
			else if (Boolean(value)) this.addEvent('mousedown', dragPreStart);
			else this.removeEvent('mousedown', dragPreStart);
		}
	
	};

})(window, document);