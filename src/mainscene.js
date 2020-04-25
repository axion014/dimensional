import {Vector2, Group, Color} from "three";
import {SMAAPass} from "three/examples/jsm/postprocessing/SMAAPass.js";

import Scene from "fewd/scene";
import {Label, Gauge, Screen} from "fewd/uielements";
import Easing from "fewd/easing";
import {Ellipse} from "fewd/geometries";
import {List} from "fewd/layouts";
import Infiniteof from "fewd/infiniteof";
import {createMeshLine} from "fewd/threeutil";

import {Foundation, WayPoint} from "./dimensional";

export default class MainScene extends Scene {
	constructor(options) {
    super();
		this.UIScene.background = new Color("#002");
		this.threePasses.push(new SMAAPass());

		const gameview = new Screen({x: 0, y: 240, width: 640, height: 480});
		const gamespace = gameview.content.UIScene;
		gamespace.background = new Color("#113");
		this.UIScene.add(gameview);
		this.gameview = gameview;

		const gridX = new Infiniteof(() =>
			createMeshLine([0, -240, 0, 240], {color: '#777', lineWidth: 2}, true),
			new Vector2(72, 0), {});
		gridX.z = -1;
    gamespace.add(gridX);
		gridX.addEventListener('update', () => this.y = gameview.scroll.y);
		const gridY = new Infiniteof(() =>
			createMeshLine([-320, 0, 320, 0], {color: '#777', lineWidth: 2}, true),
			new Vector2(0, 72), {});
		gridY.z = -1;
		gamespace.add(gridY);
		gridY.addEventListener('update', () => this.x = gameview.scroll.x);

		this.dimensionX = new Label(options.x, {x: 0, y: 24, fillStyle: "#eee"});
		this.dimensionY = new Label(options.y, {x: -296, y: 240, rotation: Math.PI / 2, fillStyle: "#eee"});
		this.UIScene.add(this.dimensionX);
		this.UIScene.add(this.dimensionY);

		this.dimensionList = new List(true, 20, {x: 0, y: -20});
		this.UIScene.add(this.dimensionList);

		gamespace.xaxis = options.x;
		gamespace.yaxis = options.y;
		gamespace.spatialDimensions = {};
		gamespace.parametricDimensions = {};
		let speed;

		for (const k of Object.keys(options.parametricDimensions)) {
			const v = options.parametricDimensions[k];
			const group = new Group();
			group.height = 32;
			this.dimensionList.add(group);
			group.gauge = new DimensionalGauge({
				fillColor: "#113", gaugeColor: "#226", strokeWidth: 3, cornerRadius: 10,
				x: 65, width: 480, height: 20,
				value: 0, minValue: v.min, maxValue: v.max
			});
			group.add(group.gauge);
			if (k === "time") {
				const pause = new Label("", {x: -305, font: '24px "Font Awesome 5 Free"'});
				const normal = new Label("", {x: -270, font: '24px "Font Awesome 5 Free"'});
				const ff = new Label("", {x: -235, font: '24px "Font Awesome 5 Free"'});
				group.add(pause);
				group.add(normal);
				group.add(ff);
				pause.addEventListener("pointstart", () => {
					pause.fillStyle = "white";
					normal.fillStyle = ff.fillStyle = "#aaa";
					speed = 0;
				});
				normal.addEventListener("pointstart", () => {
					normal.fillStyle = "white";
					pause.fillStyle = ff.fillStyle = "#aaa";
					speed = 1;
				});
				ff.addEventListener("pointstart", () => {
					ff.fillStyle = "white";
					pause.fillStyle = normal.fillStyle = "#aaa";
					speed = 3;
				});
				pause.interactive = normal.interactive = ff.interactive = true;
				pause.dispatchEvent({type: "pointstart"});
				group.gauge.addEventListener("update", e => {
					group.gauge.value += speed * e.deltaTime / 1000;
				});
			} else {
				group.add(new Label(k, {x: -305, fillStyle: "#eee"}));
			}
			gamespace.parametricDimensions[k] = group;
		}
		for (const k of Object.keys(options.spatialDimensions)) {
			const v = options.spatialDimensions[k];
			const group = new Group();
			group.height = 32;
			this.dimensionList.add(group);
			if (k === gamespace.xaxis || k === gamespace.yaxis) group.visible = false;
			group.gauge = new DimensionalGauge({
				fillColor: "#113", gaugeColor: "#226", strokeWidth: 3, cornerRadius: 10,
				x: 65, width: 480, height: 20,
				value: 0, minValue: v.min, maxValue: v.max,
			});
			group.add(group.gauge);

			group.add(new Label(k, {x: -305, fillStyle: "#eee"}));
			const toX = new Label("𝓧", {x: -270, font: '13px "Font Awesome 5 Free"', fillStyle: "#eee"});
			const toY = new Label("𝓨", {x: -235, font: '13px "Font Awesome 5 Free"', fillStyle: "#eee"});
			group.add(toX);
			group.add(toY);
			((k, group) => {
				toX.addEventListener("pointstart", () => {
					console.log(k, group.visible, this.pointcaptured)
					if (!group.visible || this.pointcaptured) return;
					gamespace.spatialDimensions[gamespace.xaxis].visible = true;
					group.visible = false;
					gamespace.xaxis = k;
					gameview.scroll.x = group.gauge.value;
					this.dimensionX.text = k;
					this.pointcaptured = true;
				});
				toY.addEventListener("pointstart", () => {
					console.log(k, group.visible, this.pointcaptured)
					if (!group.visible || this.pointcaptured) return;
					gamespace.spatialDimensions[gamespace.yaxis].visible = true;
					group.visible = false;
					gamespace.yaxis = k;
					gameview.scroll.y = group.gauge.value;
					this.dimensionY.text = k;
					this.pointcaptured = true;
				});
			})(k, group);
			toX.interactive = toY.interactive = true;

			gamespace.spatialDimensions[k] = group;
		}

		for (const d of options.waypoints) {
			gamespace.add(new WayPoint({dimensions: d}));
		}
		for (const d of options.foundations) {
			gamespace.add(new Foundation({dimensions: d}));
		}

		console.log(gamespace);
  }
	update(delta) {
		super.update(delta);
		this.pointcaptured = false;
	}
}

class DimensionalGauge extends Gauge {
	constructor(options) {
		options = Object.assign({point: {}, draggable: true}, options);
		super(options);
		options.point = Object.assign({radius: this.height * 0.6, strokeWidth: 10, fillColor: "#cc6"}, options.point);
		this.point = new Ellipse(options.point);
		this.label = new Label("", {font: "16px 'HiraKakuProN-W3'", fillStyle: "#eee"});
		this.add(this.point);
		this.add(this.label);
		this.addEventListener("changed", () => {
			this.point.x = this.width * (this.rate - 0.5);
			this.label.text = this.value.toFixed(1);
		});
		this.dispatchEvent({type: "changed"});
	}
}