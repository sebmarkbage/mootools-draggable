/*
Script: Event.DataTransfer.js
	Contains the dataTransfer object attached to events during drag & drop operations in HTML 5.

	License:
		MIT-style license.

	Authors:
		Sebastian Markbåge
*/

(function(document){

var currentDrag;

var getCurrentDrag = function(){
	if (currentDrag) return currentDrag;
	document.body.addEvent('dragend', cleanUpDrag);
	return currentDrag = { data: {} };
};

var cleanUpDrag = function(){
	currentDrag = false;
	document.body.removeEvent('dragend', cleanUpDrag);
};

var limitedFormats = Browser.Engine.trident || (Browser.Engine.webkit && !Browser.Platform.mac);

var formatMap = limitedFormats ? { 'text/plain': 'Text', 'text/uri-list': 'URL' }
	: (Browser.Engine.gecko ? { 'text/uri-list' : 'text/x-moz-url' } : {});

this.DataTransfer.implement({

	clearData: function(format){
		if ($type(format) == 'object'){
			this.get('types').each(this.clearData, this);
			return this;
		}
		if (this.dataTransfer) this.dataTransfer.clearData(formatMap[format] || format);
		if (currentDrag) delete currentDrag.data[format];
		return this;
	},
	
	hasData: function(format){
		var dataTransfer = this.dataTransfer;
		if (dataTransfer && dataTransfer.types && dataTransfer.types.contains(formatMap[format] || format)) return true;
		return currentDrag && currentDrag.data[format] != undefined;
	},

	setData: function(format, data){
		if ($type(format) == 'object'){
			for (var f in format) this.setData(f, format[f]);
			return this;
		}
		var dataTransfer = this.dataTransfer;
		if (dataTransfer && $type(data) == 'string'){
			var map = formatMap[format];
			if (map || !limitedFormats){
				dataTransfer.setData(map || format, data);
				if (currentDrag) delete currentDrag.data[format];
				return this;
			}
		}
		getCurrentDrag().data[format] = data;
	},

	getData: function(format){
		if (!format){
			var types = this.get('types');
			return types.map(this.getData, this).associate(types);
		}
		if (currentDrag && currentDrag.data[format]) return currentDrag.data[format];
		var dataTransfer = this.dataTransfer;
		if (!dataTransfer) return undefined;
		var map = formatMap[format];
		return map || !limitedFormats ? dataTransfer.getData(map || format) : undefined;
	},

	get: function(name){
		var dataTransfer = this.dataTransfer;
		switch (name){
			case 'data': return this.getData();
			case 'types':
				var types = dataTransfer && dataTransfer.types ? dataTransfer.types.map(Hash.keyOf, formatMap) :
							(limitedFormats ? ['text/plain', 'text/uri-list'] : []);
				if (currentDrag) for (var type in currentDrag.data) types.include(type);
				return types;
			case 'effectAllowed':
				return dataTransfer ? dataTransfer[name] : (currentDrag ? currentDrag[name] : false) || 'uninitialized';
			case 'dropEffect':
				var current = dataTransfer || currentDrag;
				if (current && current[name]) return current[name];
				var allowed = this.get('effectAllowed');
				if (allowed == 'none' || allowed == 'move') return allowed;
				return allowed.substr(0, 4) == 'link' ? 'link' : 'copy';
			case 'dropAllowed':
				var allowed = this.get('effectAllowed');
				return allowed == 'uninitialized' || allowed == 'all' || allowed.contains(this.get('dropEffect'));
			default:
				return currentDrag ? currentDrag[name] : undefined;
		}
	},
	
	set: function(name, value){
		switch (name){
			case 'data': return this.setData(value);
			case 'dropEffect':
				// if (!(/^(none|copy|link|move)$/).test(type)) return this;
			case 'effectAllowed':
				// if (!(/^(none|copy|copyLink|copyMove|link|linkMove|move|all|uninitialized)$/).test(type)) return this;
				if (this.dataTransfer){
					this.dataTransfer[name] = value;
					return this;
				}
		}
		getCurrentDrag()[name] = value;
		return this;
	}	

});

})(document);