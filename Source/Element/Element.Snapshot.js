/*
Script: Element.Snapshot.js
	Extends Element with methods that clones an element with it's current relative stylesheets intact.

	License:
		MIT-style license.

	Authors:
		Sebastian Markbåge
*/

(function(window){

	var isPercentage = /\%$/, isRelative = /\%|em|ex/, isDigits = /^\d+$/, hasUnit = /[a-z]{2}$/i,
		isExcludedStyle = /cssText|^length$|parentRule|hasLayout/, isSizeConstraint = /(max|min)(Width|Height)/,
		isZeroClip = /rect\((0(px)?\, ){3}0(px?)\)/,
		relativeSides = ['textIndent', 'paddingBottom', 'paddingLeft', 'paddingRight', 'paddingTop'];

	var getCurrentStyle = window.getComputedStyle ? function(element){
		return window.getComputedStyle(element, null);
	} : function(element){
		return element.currentStyle || element.style;
	};

	var getRelativeFontSize = function(element){
		var z = getCurrentStyle(element).fontSize, u, i = 0;
		if (hasUnit.test(z)) i = -2;
		else if (isPercentage.test(z)) i = -1;
		u = z.substr(z.length + i);
		z = parseFloat(z.substr(0, z.length + i));
		if (isRelative.test(u) && element.parentNode && element.parentNode != window.document.body){
			var p = arguments.callee(element.parentNode);
			z = (u == '%' ? z / 100 : (u == 'ex' ? z / 2 : z)) * p.size;
			u = p.unit;
		}
		return { size: z, unit: u, value: z + u };
	};
	
	Element.implement({
	
		cloneStyles: function(from){
			var styles = getCurrentStyle(from);
			for (var k in styles){
				if (isDigits.test(k)) k = styles[k];
				if (k == 'clip' && isZeroClip.test(styles[k]))
					this.style['clip'] = 'auto';
				else if (!isExcludedStyle.test(k) && styles[k] != '' && $type(styles[k]) != 'function'
					&& (!isSizeConstraint.test(k) || styles[k] != '-1px'))
					this.style[k] = styles[k];
			}
			return this;
		},

		snapshot: function(contents, keepid){
			var clone = this.clone(contents, keepid);
			if (!this.parentNode || this.parentNode.nodeType == 11) return clone;

			var offsetParent = this;
			while ((offsetParent = offsetParent.parentNode) && getCurrentStyle(offsetParent).display == 'inline');

			var thisSize = this.getComputedSize(), parentWidth = document.id(offsetParent).getComputedSize().width;

			var ce = clone.getElementsByTagName('*'), te = this.getElementsByTagName('*');
			for (var i = ce.length; i--;) Element.cloneStyles(ce[i], te[i]);

			var styles = getCurrentStyle(this);
			relativeSides.each(function(style){
				var value = styles[style];
				if (isPercentage.test(value))
					newElement.setStyle(style, parentWidth * parseFloat(value.substr(0, value.length - 1)) / 100);
			});

			return clone.setStyles({
				'font-size': getRelativeFontSize(this).value,
				'width': thisSize.width,
				'height': thisSize.height
			});
		}

	});

})(window);