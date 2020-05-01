import {Vector3, Group} from "three";

import Element from "fewd/element";
import {Ellipse} from "fewd/geometries";
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
			this.dimensionNeedsUpdate = true;
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

	existsOnCurrentConfiguration() {
		// TODO
		return true;
	}

	expandDimension(name, overrideParameters) {
		if (!this.existsOnCurrentConfiguration()) throw new Error("This object doesn't exist on the current configration");
		// TODO
		//this.parent.parametricDimensions;
		// throw new Error("Dimension " + name + " not found");
		return this.dimensions[name];
	}

	expandDimensions(overrideParameters) {
		for (const name of Object.keys(this.dimensions)) this.dimensionsExpanded[name] = this.expandDimension(name, overrideParameters);
	}

	getDimension(name, overrideParameters) {
		if (!this.existsOnCurrentConfiguration()) throw new Error("This object doesn't exist on the current configration");
		const value = this.dimensionsExpanded[name];
		if (value !== undefined) return value;
		return this.dimensionsExpanded[name] = this.expandDimension(name, overrideParameters);
	}

	update() {
		if (this.dimensionNeedsUpdate) {
			if (this.existsOnCurrentConfiguration()) {
				this.expandDimensions();
			}
			const updateVisual = () => {
				if (this.existsOnCurrentConfiguration()) {
					// calculate depth
					const diffs = [];
					for (const k of Object.keys(this.parent.spatialDimensions)) {
						if (k === this.parent.xaxis || k === this.parent.yaxis) continue;
						diffs.push(this.parent.spatialDimensions[k].gauge.value - this.getDimension(k))
					}
					const depth = Math.hypot.apply(null, diffs) * VEILING_COEFFICIENT;

					this.x = this.getDimension(this.parent.xaxis);
					this.y = this.getDimension(this.parent.yaxis);

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
			this.dimensionNeedsUpdate = false;
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