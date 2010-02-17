/*
Script: Event.DataTransfer.Feedback.js
	Extends DataTransfer with methods to set image represenation of current drag operations.

	License:
		MIT-style license.

	Authors:
		Sebastian Markbåge
*/

(function(document){

var ghost, lastTarget;

var tmp = (/AppleWebKit\/(\d\d\d)\.\d/).exec(navigator.userAgent),
	efpProp = Browser.Engine.presto || (tmp && parseInt(tmp[1]) < 532) ? 'page' : 'client',
	offsetProp = Browser.Engine.trident4 ? 'page' : 'client',
	positioning = Browser.Engine.trident4 ? 'absolute' : 'fixed',
	emptyElement = new Element('div', { styles: { width: 1, height: 1, visibility: 'hidden' }});

var moveGhost = function(event){
	if (!ghost.nativ)
		ghost.element.setStyles({
			left: event[offsetProp].x - ghost.offset.x,
			top: event[offsetProp].y - ghost.offset.y
		});
};

var endGhost = function(event){
	ghost.nativ = false;
	//moveGhost(lastDrag || event);
	if (ghost.revert && event.dataTransfer.get('dropEffect') == 'none'){
		ghost.revert.start(ghost.revertTarget).chain(cleanUpGhost);
	} else {
		cleanUpGhost();
	}
};

var cleanUpGhost = function(){
	if (!ghost) return;
	if (ghost.effect) ghost.effect.cancel();
	ghost.element.destroy();
	document.body.removeEvents({ drag: moveGhost, dragend: endGhost });
	ghost = undefined;
	lastTarget = undefined;
};

var dispatchDragEvent = function(original, type, target, relatedTarget){
	return new Event(original.event)
		.set({
			type: type,
			target: target,
			relatedTarget: relatedTarget || null,
			dataTransfer: original.dataTransfer
		})
		.dispatch();
};

var dragOverGhost = function(event){
	event.stopPropagation();
	var target = getTarget(event);
	if (lastTarget != target){
		if (dispatchDragEvent(event, 'dragenter', target, lastTarget) === false) event.preventDefault();
		if (lastTarget) dispatchDragEvent(event, 'dragleave', lastTarget, target);
		lastTarget = target;
	}
	else if (dispatchDragEvent(event, 'dragover', target) === false) event.preventDefault();
};

var dropOnGhost = function(event){
	event.stop();
	dispatchDragEvent(event, 'drop', getTarget(event));
};

var getTarget = document.elementFromPoint ? function(event){
	var doc = event.target.ownerDocument, style = ghost.element.style;
	var display = style.display;
	style.display = 'none';
	var target = doc.elementFromPoint(event[efpProp].x, event[efpProp].y);
	style.display = display;
	return target;
} : function(){
	return document.body;
};

this.DataTransfer.implement({

	setDragFeedback: function(element, options){
		/*
		options = {
			opacity: 1,
			class: '...',
			styles: { ... },
			revert: false,
			container: false,
			limit: false,
			offset: { x: undefined, y: undefined },
			wrapImage: true,
			native: true
		}
		*/
		
		element = document.id(element);

		var dataTransfer = this.dataTransfer;

		if (!element){
			cleanUpGhost();
			if (dataTransfer && dataTransfer.setDragImage)
				dataTransfer.setDragImage(emptyElement, 0, 0);
			return this;
		}

		if (ghost)
			ghost.element.destroy();
		else
			document.body.addEvents({ drag: moveGhost, dragend: endGhost });
		
		ghost = {};

		if (options.offset){
			ghost.offset = options.offset;
		} else  if (this.event && element.getParent()){
			var l = element.getPosition(), v = event.page, b = element.getDocument().body;
			ghost.offset = { x: v.x - l.x - b.offsetLeft, y: v.y - l.y - b.offsetTop };
		} else {
			ghost.offset = { x: -1, y: -1 };
		}

		ghost.limit = document.id(options.container) ? options.container.getCoordinates() : options.limit;
		//var size = ghost.element.getSize();
		
		ghost.nativ = options['native'] !== false && !ghost.limit && (!Browser.Engine.webkit || Browser.Platform.mac) && !Browser.Engine.gecko && dataTransfer && dataTransfer.setDragImage;
	
		if (element.getParent()) element = element.snapshot(true, false);

		element.set({ styles: options.styles, 'class': options['class'], opacity: options.opacity });

		if (ghost.nativ){
			if (options.wrapImage !== false && element.get('tag') == 'img') element = new Element('div').adopt(element.setStyles({ margin: 0, left: 0, top: 0 }));
			if (Browser.Engine.gecko) element.set('opacity', element.get('opacity') / 0.75);
		}

		if (options.revert && this.event && (!ghost.nativ || !Browser.Engine.webkit)){
			ghost.revert = new Fx.Morph(element, $extend({duration: 250, link: 'cancel'}, options.revert));
			ghost.revertTarget = {
				left: this.event[offsetProp].x - ghost.offset.x,
				top: this.event[offsetProp].y - ghost.offset.y
			};
		}

		ghost.element = element.setStyles({
			'position': positioning,
			'z-index': 2000,
			'left': -2000,
			'top': 0,
			'max-width': '100%',
			'max-height': '100%',
			'float': 'none',
			'display': 'block',
			'margin': 0
		}).inject(document.body);

		if (ghost.nativ){
			dataTransfer.setDragImage(element, ghost.offset.x, ghost.offset.y);
		} else {
			if (dataTransfer && dataTransfer.setDragImage) dataTransfer.setDragImage(emptyElement, 0, 0);
			element.addEvents({
				dragenter: dragOverGhost,
				dragleave: Event.stopPropagation,
				dragover: dragOverGhost,
				drop: dropOnGhost
			});
		}
		return this;
	},
	
	setDragImage: function(image, x, y){
		return this.setDragFeedback(image, { offset: { x: y, y: y }, wrapImage: false });
	}

});

})(document);