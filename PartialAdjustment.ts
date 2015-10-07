/*
 *  PartialAdjustment.jsx v0.1.0 / ScriptUI
 *
 *  Author: Kareobana(http://atarabi.com/)
 *  License: MIT
 *  Dependencies:
 *    Kikaku.jsx 0.1.0
 */

/// <reference path="./typings/aftereffects/ae.d.ts" />
/// <reference path="./typings/kikaku/Kikaku.d.ts" />

(function(global) {
	
	//Lib
	const Utils = KIKAKU.Utils,
		JSON = KIKAKU.JSON,
		UIBuilder = KIKAKU.UIBuilder,
		PARAMETER_TYPE = UIBuilder.PARAMETER_TYPE;

	//Const and Interface
	interface CommentValue {
		comp: string;
	}

	const PARAM = {
		EXPRESSION: 'Expression',
		EXECUTE: 'Execute',
		REFRESH: 'Refresh'
	};

	const EXPRESSION = {
		TRANSFORM: 0,
		EFFECT: 1,
	};
	
	//Main
	const builder = new UIBuilder(global, 'PartialAdjustment', {
		version: '0.1.0',
		author: 'Kareobana',
		url: 'http://atarabi.com/',
	});

	builder
		.add(PARAMETER_TYPE.CHECKBOXES, PARAM.EXPRESSION, [
			{ text: 'Transform', value: true },
			{ text: 'Effect', value: true }
		], { title: false })
		.add(PARAMETER_TYPE.SCRIPT, PARAM.EXECUTE, () => {
			function isSuccessiveLayers(sorted_layers: Layer[], descend = true) {
				const delta = descend ? 1 : -1;
				for (let i = 0, l = sorted_layers.length - 1; i < l; i++) {
					if (sorted_layers[i].index - sorted_layers[i + 1].index !== delta) {
						return false;
					}
				}
				return true;
			}

			const comp = Utils.getActiveComp();
			const layers = Utils.getSelectedLayers();
			if (!layers.length) {
				return;
			}
			layers.sort((lhs: Layer, rhs: Layer) => rhs.index - lhs.index);
			if (!isSuccessiveLayers(layers)) {
				return alert('Select successive layers');
			}

			const precomp_name = prompt('Give a precomp name', '');
			if (!precomp_name) {
				return;
			} else if (Utils.getCompByName(precomp_name)) {
				return alert(`"${precomp_name}" already exists`);
			}

			const precomp = app.project.items.addComp(precomp_name, comp.width, comp.height, comp.pixelAspect, comp.duration, comp.frameRate);
			const comp_layer = comp.layers.add(precomp);
			comp_layer.moveBefore(layers[layers.length - 1]);

			const comment_value: CommentValue = { comp: precomp_name };
			Utils.forEach(layers, (layer: Layer) => setComment(layer, comment_value));

			copyLayers(layers, comp, precomp);
		})
		.add(PARAMETER_TYPE.SCRIPT, PARAM.REFRESH, () => {
			const comp = Utils.getActiveComp();
			let comp_layer: AVLayer = <AVLayer>Utils.getSelectedLayer();
			let dst_comp: CompItem = null;
			if (!comp_layer) {
				return;
			} else if (Utils.isCompLayer(comp_layer)) {
				dst_comp = <CompItem>comp_layer.source;
			} else {
				const comment_value: CommentValue = getComment(comp_layer);
				if (comment_value && Utils.isObject(comment_value) && Utils.isString(comment_value.comp)) {
					dst_comp = Utils.getCompByName(comment_value.comp);
				}
				if (!dst_comp) {
					return alert('Select a comp layer');
				}
			}

			const precomp_name = dst_comp.name;
			const layers = Utils.filter(Utils.getLayers(['all'], comp), (layer: Layer) => {
				const comment_value: CommentValue = getComment(layer);
				return (comment_value && Utils.isObject(comment_value) && comment_value.comp === precomp_name);
			});
			if (!layers.length) {
				return;
			}

			copyLayers(layers, comp, dst_comp);
		})
		.build();

	//Function
	function getCommentKey() {
		return builder.getName();
	}

	function getComment(layer: Layer) {
		return Utils.Comment.get(layer, getCommentKey());
	}

	function setComment(layer: Layer, value) {
		Utils.Comment.set(layer, getCommentKey(), value);
	}

	function removeComment(layer: Layer) {
		Utils.Comment.remove(layer, getCommentKey());
	}

	function copyLayers(layers: Layer[], src_comp: CompItem, dst_comp: CompItem) {
		dst_comp.displayStartTime = src_comp.displayStartTime;

		layers.sort((lhs: Layer, rhs: Layer) => rhs.index - lhs.index);

		Utils.removeAllLayers(dst_comp);
		Utils.forEach(layers, (layer: Layer) => {
			layer.locked = false;
			layer.enabled = true;
			layer.solo = false;
			layer.copyToComp(dst_comp);
			layer.enabled = false;
		});

		layers.sort((lhs: Layer, rhs: Layer) => lhs.index - rhs.index);

		const do_transfotm: boolean = builder.get(PARAM.EXPRESSION, EXPRESSION.TRANSFORM);
		const do_effect: boolean = builder.get(PARAM.EXPRESSION, EXPRESSION.EFFECT);

		const layer_name_template = '#{LayerName}';
		const expression_template = `comp("${src_comp.name}").layer("${layer_name_template}").`;
		Utils.forEach(layers, (layer: Layer, i: number) => {
			function setExpression(property_group: PropertyGroup, expressionMaker: (property?: Property, i?: number) => string) {
				Utils.forEachPropertyGroup(property_group, (property: Property, i) => {
					if (Utils.isHiddenProperty(property) || Utils.isPropertyGroup(property) || !property.canSetExpression) {
						return;
					}
					Utils.removeAllKeys(property);
					property.expression = expressionMaker(property, i);
				});
			}

			const expression_prefix = expression_template.replace(layer_name_template, layer.name);
			const dst_layer = dst_comp.layer(i + 1);
			removeComment(dst_layer);
			if (do_transfotm) {
				setExpression(<PropertyGroup>dst_layer.property('ADBE Transform Group'), (property: Property) => `${expression_prefix}transform("${property.matchName}")`);
			}
			if (do_effect && Utils.isAVLayer(layer)) {
				Utils.forEachEffect(dst_layer, (effect) => {
					const effect_name = effect.name;
					setExpression(effect, (property, i) => `${expression_prefix}effect("${effect_name}")(${i})`);
				});
			}
		});
	}

})(this);