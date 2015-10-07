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
(function (global) {
    //Lib
    var Utils = KIKAKU.Utils, JSON = KIKAKU.JSON, UIBuilder = KIKAKU.UIBuilder, PARAMETER_TYPE = UIBuilder.PARAMETER_TYPE;
    var PARAM = {
        EXPRESSION: 'Expression',
        EXECUTE: 'Execute',
        REFRESH: 'Refresh'
    };
    var EXPRESSION = {
        TRANSFORM: 0,
        EFFECT: 1
    };
    //Main
    var builder = new UIBuilder(global, 'PartialAdjustment', {
        version: '0.1.0',
        author: 'Kareobana',
        url: 'http://atarabi.com/'
    });
    builder
        .add(PARAMETER_TYPE.CHECKBOXES, PARAM.EXPRESSION, [
        { text: 'Transform', value: true },
        { text: 'Effect', value: true }
    ], { title: false })
        .add(PARAMETER_TYPE.SCRIPT, PARAM.EXECUTE, function () {
        function isSuccessiveLayers(sorted_layers, descend) {
            if (descend === void 0) { descend = true; }
            var delta = descend ? 1 : -1;
            for (var i = 0, l = sorted_layers.length - 1; i < l; i++) {
                if (sorted_layers[i].index - sorted_layers[i + 1].index !== delta) {
                    return false;
                }
            }
            return true;
        }
        var comp = Utils.getActiveComp();
        var layers = Utils.getSelectedLayers();
        if (!layers.length) {
            return;
        }
        layers.sort(function (lhs, rhs) { return rhs.index - lhs.index; });
        if (!isSuccessiveLayers(layers)) {
            return alert('Select successive layers');
        }
        var precomp_name = prompt('Give a precomp name', '');
        if (!precomp_name) {
            return;
        }
        else if (Utils.getCompByName(precomp_name)) {
            return alert("\"" + precomp_name + "\" already exists");
        }
        var precomp = app.project.items.addComp(precomp_name, comp.width, comp.height, comp.pixelAspect, comp.duration, comp.frameRate);
        var comp_layer = comp.layers.add(precomp);
        comp_layer.moveBefore(layers[layers.length - 1]);
        var comment_value = { comp: precomp_name };
        Utils.forEach(layers, function (layer) { return setComment(layer, comment_value); });
        copyLayers(layers, comp, precomp);
    })
        .add(PARAMETER_TYPE.SCRIPT, PARAM.REFRESH, function () {
        var comp = Utils.getActiveComp();
        var comp_layer = Utils.getSelectedLayer();
        var dst_comp = null;
        if (!comp_layer) {
            return;
        }
        else if (Utils.isCompLayer(comp_layer)) {
            dst_comp = comp_layer.source;
        }
        else {
            var comment_value = getComment(comp_layer);
            if (comment_value && Utils.isObject(comment_value) && Utils.isString(comment_value.comp)) {
                dst_comp = Utils.getCompByName(comment_value.comp);
            }
            if (!dst_comp) {
                return alert('Select a comp layer');
            }
        }
        var precomp_name = dst_comp.name;
        var layers = Utils.filter(Utils.getLayers(['all'], comp), function (layer) {
            var comment_value = getComment(layer);
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
    function getComment(layer) {
        return Utils.Comment.get(layer, getCommentKey());
    }
    function setComment(layer, value) {
        Utils.Comment.set(layer, getCommentKey(), value);
    }
    function removeComment(layer) {
        Utils.Comment.remove(layer, getCommentKey());
    }
    function copyLayers(layers, src_comp, dst_comp) {
        dst_comp.displayStartTime = src_comp.displayStartTime;
        layers.sort(function (lhs, rhs) { return rhs.index - lhs.index; });
        Utils.removeAllLayers(dst_comp);
        Utils.forEach(layers, function (layer) {
            layer.locked = false;
            layer.enabled = true;
            layer.solo = false;
            layer.copyToComp(dst_comp);
            layer.enabled = false;
        });
        layers.sort(function (lhs, rhs) { return lhs.index - rhs.index; });
        var do_transfotm = builder.get(PARAM.EXPRESSION, EXPRESSION.TRANSFORM);
        var do_effect = builder.get(PARAM.EXPRESSION, EXPRESSION.EFFECT);
        var layer_name_template = '#{LayerName}';
        var expression_template = "comp(\"" + src_comp.name + "\").layer(\"" + layer_name_template + "\").";
        Utils.forEach(layers, function (layer, i) {
            function setExpression(property_group, expressionMaker) {
                Utils.forEachPropertyGroup(property_group, function (property, i) {
                    if (Utils.isHiddenProperty(property) || Utils.isPropertyGroup(property) || !property.canSetExpression) {
                        return;
                    }
                    Utils.removeAllKeys(property);
                    property.expression = expressionMaker(property, i);
                });
            }
            var expression_prefix = expression_template.replace(layer_name_template, layer.name);
            var dst_layer = dst_comp.layer(i + 1);
            removeComment(dst_layer);
            if (do_transfotm) {
                setExpression(dst_layer.property('ADBE Transform Group'), function (property) { return (expression_prefix + "transform(\"" + property.matchName + "\")"); });
            }
            if (do_effect && Utils.isAVLayer(layer)) {
                Utils.forEachEffect(dst_layer, function (effect) {
                    var effect_name = effect.name;
                    setExpression(effect, function (property, i) { return (expression_prefix + "effect(\"" + effect_name + "\")(" + i + ")"); });
                });
            }
        });
    }
})(this);
