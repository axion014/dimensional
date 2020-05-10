import {Vector3, Group} from "three";

import Element from "fewd/element";
import {Ellipse, SymmetricTriangle} from "fewd/geometries";
import {define} from "fewd/utils";

const VEILING_COEFFICIENT = 0.01;
const BLURRING_RATE = 25;

export class DimensionalElement extends Element {
	constructor(options) {
		super(new Group(), options);
		this.dimensions = options.dimensions;
		this.dimensionsExpanded = [];
		this.addEventListener('added', () => {
			if (typeof this.parent.xaxis !== "string" ||
					typeof this.parent.yaxis !== "string" ||
					!this.parent.spatialDimensions ||
					!this.parent.parametricDimensions) throw new Error("Wrong parent");
			this._parent = this.parent;
			this.parent.dimensionalElements.push(this);
			this.changedParameters = new Set(Object.keys(this.parent.parametricDimensions));
			this.update();
		});
		this.addEventListener('removed', () => {
			this._parent.dimensionalElements.pop(this);
			this._parent = undefined;
		});
	}

	addContent(original) {
		const group = this.nativeContent;
		define(group, "position", original.position);
		define(original, "position", new Vector3(0, 0, 0));
		group.left = original;
		group.right = original.clone(); // shallow clone
		define(group.right, "quaternion", group.left.quaternion);
		define(group.right, "scale", group.left.scale);
		group.add(group.left);
		group.add(group.right);
	}

	expandDimensions(matches, changedParameters, overrideParameters) {
		if (!overrideParameters) overrideParameters = {};
		const parameters = {};
		for (const key of Object.keys(this.parent.parametricDimensions)) {
			parameters[key] = overrideParameters[key] !== undefined ? overrideParameters[key] : this.parent.parametricDimensions[key].gauge.value;
		}

		const expressions = {};
		let matchCount = 0;
		let identical = true;
		if (!matches) matches = [];
		const setExpression = expression => {
			if (identical) {
				if (expression.id !== matches[matchCount]) identical = false;
				matchCount++;
			}
			matches[matchCount] = expression.id;
			let incomplete;
			for (const key of Object.keys(this.parent.spatialDimensions)) {
				if (expression.dimensions[key] !== undefined) {
					if (expressions[key] !== undefined) console.warn("Overwriting expression. please adjust the stage definition.");
					expressions[key] = expression.dimensions[key];
				} else if (expressions[key] === undefined) {
					incomplete = true;
				}
			}
			Object.assign(parameters, expression.attributes);
			if (expression.template) return incomplete && !matchExpression(expression.template);
			return incomplete;
		};
		const matchExpression = object => {
			const lists = [object];
			const indexes = [];
			let index = 0;
			while (lists.length !== 0) {
				const current = lists[index];
				if (Array.isArray(current)) {
					if (indexes[index] === undefined) indexes[index] = 0;
					if (indexes[index] < current.length) {
						const arm = current[indexes[index]];
						indexes[index]++;
						if (Array.isArray(arm)) {
							if (arm[0].evaluate(parameters)) {
								lists.push(arm[1]);
								index++;
							}
						} else if (!arm.id) arm.evaluate(parameters);
						else if (!setExpression(arm)) return true;
						continue;
					} else indexes[index] = 0;
				} else if (!current) return false;
				else if (!setExpression(current)) return true;
				lists.pop();
				index--;
			};
			return false;
		};
		if (!matchExpression(this.dimensions)) return null;
		if (matchCount !== matches.length) identical = false;

		if (identical) {
			for (const key of Object.keys(expressions)) {
				if (typeof expressions[key] !== "number") {
					for (const usedVariable of expressions[key].variables()) {
						if (changedParameters.has(usedVariable)) {
							this.dimensionsExpanded[key] = expressions[key].evaluate(parameters);
							break;
						}
					}
				}
			}
		} else {
			for (const key of Object.keys(expressions)) {
				this.dimensionsExpanded[key] = typeof expressions[key] === "number" ? expressions[key] : expressions[key].evaluate(parameters);
			}
		}
		return matches;
	}

	update() {
		if (this.changedParameters.size !== 0) {
			this.matches = this.expandDimensions(this.matches);
			this.changedParameters.clear();
			this.depthNeedsUpdate = true;
		}
		if (this.depthNeedsUpdate) {
			const updateVisual = () => {
				if (this.matches) {
					// calculate depth
					const diffs = [];
					for (const k of Object.keys(this.parent.spatialDimensions)) {
						if (k === this.parent.xaxis || k === this.parent.yaxis) continue;
						diffs.push(this.parent.spatialDimensions[k].gauge.value - this.dimensionsExpanded[k])
					}
					const depth = Math.hypot.apply(null, diffs) * VEILING_COEFFICIENT;

					this.x = this.dimensionsExpanded[this.parent.xaxis];
					this.y = this.dimensionsExpanded[this.parent.yaxis];

					this.nativeContent.visible = depth < 1;
					this.selfOpacity = 1 - depth;
					this.nativeContent.left.x = -depth * BLURRING_RATE;
					this.nativeContent.right.x = depth * BLURRING_RATE;

					// only either instance need to be updated because the material is shared
					if (typeof this.updateColor === "function") this.updateColor(this.nativeContent.left.fillColor, depth);
				} else {
					this.nativeContent.visible = false;
				}
				this.removeEventListener('render', updateVisual);
			};
			this.addEventListener('render', updateVisual);
			this.depthNeedsUpdate = false;
		}
	}
}

export class WayPoint extends DimensionalElement {
	constructor(options) {
		super(options);
		options = Object.assign({radius: 10, fillColor: "hsl(40, 10%, 48%)", strokeColor: "#aaa"}, options);

		this.addContent(new Ellipse(options));
	}

	updateColor(fillColor, depth) {
		fillColor.setHSL(0.11, Math.max(0.1 - depth * 0.1, 0), 0.48);
	}
}

export class Foundation extends DimensionalElement {
	constructor(options) {
		super(options);
		options = Object.assign({radius: 24, fillColor: "hsl(0, 30%, 48%)", strokeColor: "#aaa"}, options);

		this.addContent(new Ellipse(options));
	}

	updateColor(fillColor, depth) {
		fillColor.setHSL(0, Math.max(0.3 - depth * 0.3, 0), 0.48);
	}
}

export class Unit extends DimensionalElement {
	constructor(options) {
		super(options);
		options = Object.assign({width: 24, height: 36, fillColor: "hsl(240, 50%, 60%)", strokeColor: "#ccc"}, options);

		this.addContent(new SymmetricTriangle(options));

		this.hslcomponents = this.nativeContent.left.fillColor.getHSL({});
	}

	updateColor(fillColor, depth) {
		fillColor.setHSL(this.hslcomponents.h, Math.max(this.hslcomponents.s - depth * this.hslcomponents.s, 0), this.hslcomponents.l);
	}
}