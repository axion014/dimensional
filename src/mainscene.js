import {Vector2, Group, Color} from "three";
import {SMAAPass} from "three/examples/jsm/postprocessing/SMAAPass.js";

import Scene from "fewd/scene";
import {Label, Gauge, Screen} from "fewd/uielements";
import Easing from "fewd/easing";
import {Ellipse} from "fewd/geometries";
import {List} from "fewd/layouts";
import assets from "fewd/loading";
import Infiniteof from "fewd/infiniteof";
import {createMeshLine} from "fewd/threeutil";

import {Foundation, WayPoint, Unit} from "./dimensional";

export default class MainScene extends Scene {
	constructor(stageID) {
    super();

		const stage = assets.STAGE[stageID];

		this.UIScene.background = new Color("#002");
		this.threePasses[0].enabled = false;
		this.threePasses.push(new SMAAPass());

		const gameview = new Screen();
		gameview.content.threePasses[0].enabled = false;
		const gamespace = gameview.content.UIScene;
		gamespace.background = new Color("#113");
		gamespace.dimensionalElements = [];
		this.UIScene.add(gameview);
		this.gameview = gameview;

		let currentPointer, previousX, previousY;

		gameview.addEventListener('pointstart', e => {
			currentPointer = e.identifier;
			previousX = e.localX;
			previousY = e.localY;
			e.startTracking();
		});

		gameview.addEventListener('pointmove', e => {
			if (e.identifier === currentPointer) {
				gameview.scroll.x -= e.localX - previousX;
				gameview.scroll.y -= e.localY - previousY;
				previousX = e.localX;
				previousY = e.localY;
			}
		});

		const gridX = new Infiniteof(() =>
			createMeshLine([0, -gameview.height / 2, 0, gameview.height / 2], {color: '#777', lineWidth: 2}, true),
			new Vector2(72, 0), {});
		gridX.z = -1;
    gamespace.add(gridX);
		gridX.addEventListener('render', () => gridX.y = gameview.scroll.y);
		const gridY = new Infiniteof(() =>
			createMeshLine([-gameview.width / 2, 0, gameview.width / 2, 0], {color: '#777', lineWidth: 2}, true),
			new Vector2(0, 72), {});
		gridY.z = -1;
		gamespace.add(gridY);
		gridY.addEventListener('render', () => gridY.x = gameview.scroll.x);

		this.dimensionX = new Label(stage.x, {y: 24, fillStyle: "#eee"});
		this.dimensionY = new Label(stage.y, {rotation: Math.PI / 2, fillStyle: "#eee"});
		this.UIScene.add(this.dimensionX);
		this.UIScene.add(this.dimensionY);

		this.dimensionList = new List(true, 20, {y: -20});
		this.UIScene.add(this.dimensionList);

		gamespace.xaxis = stage.x;
		gamespace.yaxis = stage.y;
		gamespace.spatialDimensions = {};
		gamespace.parametricDimensions = {};
		let speed;

		for (const k of Object.keys(stage.parametricDimensions)) {
			const v = stage.parametricDimensions[k];
			const group = new Group();
			group.height = 32;
			this.dimensionList.add(group);
			group.gauge = new DimensionalGauge({
				fillColor: "#113", gaugeColor: "#226", strokeWidth: 3, cornerRadius: 10, height: 20,
				value: 0, minValue: v.min, maxValue: v.max
			});
			group.add(group.gauge);
			((k, gauge) => {
				gauge.addEventListener('changed', () => {
					for (const e of gamespace.dimensionalElements) e.changedParameters.add(k);
				});
			})(k, group.gauge);
			if (k === "time") {
				const pause = new Label("", {x: 15, font: '24px "Font Awesome 5 Free"'});
				const normal = new Label("", {x: 50, font: '24px "Font Awesome 5 Free"'});
				const ff = new Label("", {x: 85, font: '24px "Font Awesome 5 Free"'});
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
				(gauge => {
					gauge.addEventListener("update", e => gauge.value += speed * e.deltaTime / 1000);
				})(group.gauge);
			} else {
				group.add(new Label(k, {x: 15, fillStyle: "#eee"}));
			}
			gamespace.parametricDimensions[k] = group;
		}
		for (const k of Object.keys(stage.spatialDimensions)) {
			const v = stage.spatialDimensions[k];
			const group = new Group();
			group.height = 32;
			this.dimensionList.add(group);
			if (k === gamespace.xaxis || k === gamespace.yaxis) group.visible = false;
			group.gauge = new DimensionalGauge({
				fillColor: "#113", gaugeColor: "#226", strokeWidth: 3, cornerRadius: 10, height: 20,
				value: 0, minValue: v.min, maxValue: v.max,
			});
			group.add(group.gauge);

			group.add(new Label(k, {x: 15, fillStyle: "#eee"}));
			const toX = new Label("𝓧", {x: 50, font: '13px "Font Awesome 5 Free"', fillStyle: "#eee"});
			const toY = new Label("𝓨", {x: 85, font: '13px "Font Awesome 5 Free"', fillStyle: "#eee"});
			group.add(toX);
			group.add(toY);
			((k, group) => {
				group.gauge.addEventListener('changed', () => {
					if (k !== gamespace.xaxis && k !== gamespace.yaxis) {
						for (const e of gamespace.dimensionalElements) e.depthNeedsUpdate = true;
					}
				});
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

		for (const d of stage.waypoints) {
			gamespace.add(new WayPoint({dimensions: d}));
		}
		for (const d of stage.foundations) {
			gamespace.add(new Foundation({dimensions: d}));
		}
		for (const d of stage.units) {
			gamespace.add(new Unit({dimensions: d, z: 0.001}));
		}

		this.addEventListener('render', e => {
			if (e.resized) {
				const w = e.scene.width, h = e.scene.height;
				gameview.y = h / 4;
				gameview.width = w;
				gameview.height = h / 2;
				gridX.refresh();
				gridY.refresh();
				this.dimensionY.x = -w / 2 + 24;
				this.dimensionY.y = h / 4;
				for (const child of this.dimensionList.children) {
					child.position.x = -w / 2;
					child.gauge.x = w / 2 + 65;
					child.gauge.width = w - 160;
				}
			}
		});

		console.log(gamespace);
  }
	update(delta) {
		super.update(delta);
		this.pointcaptured = false;
	}
}

class DimensionalGauge extends Gauge {
	constructor(options) {
		options = Object.assign({point: {}}, options);
		super(options);
		this.interactive = true;
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