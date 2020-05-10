import math from './math-min';

import Scene from "fewd/scene";
import {Label} from "fewd/uielements";
import Easing from "fewd/easing";
import {fileParsers, loadResources, countResources} from "fewd/loading";

import regeneratorRuntime from "regenerator-runtime"; // async requires this

import TitleScene from "./title";
fileParsers.STAGE = async response => {
	const stage = await response.json();

	let id = 0;
	function parseBranch(branch) {
		const parsedBranch = {dimensions: {}, attributes: {}};
		Object.defineProperty(parsedBranch, "id", {
			value: id,
			enumerable: false,
			configurable: false,
			writable: false
		});
		id++;
		for (const key of Object.keys(branch)) {
			if (key === "template") parsedBranch.template = stage.templates[branch[key]];
			else if (key in stage.spatialDimensions) parsedBranch.dimensions[key] = typeof branch[key] === "string" ? math.compile(branch[key]) : branch[key];
			else parsedBranch.attributes[key] = branch[key];
		}
		return parsedBranch;
	}

	function parseExpression(object) {
		if (Array.isArray(object)) {
			return object.map(e => {
				if (Array.isArray(e)) return [math.compile(e[0]), parseExpression(e[1])];
				if (typeof e === "string") return math.compile(e);
				return parseBranch(e);
			});
		}
		if (object) return parseBranch(object);
	}

	for (const key of Object.keys(stage.templates)) stage.templates[key] = parseExpression(stage.templates[key]);
	stage.waypoints = stage.waypoints.map(waypoint => parseExpression(waypoint));
	stage.foundations = stage.foundations.map(foundation => parseExpression(foundation));
	stage.units = stage.units.map(unit => parseExpression(unit));
	return stage;
};

export default class LoadingScene extends Scene {

	label = new Label("Loading... 0%", {
		font: "20px 'HiraKakuProN-W3'",
		fillStyle: '#444a',
		opacity: 1
	});

	constructor(list, nextScene, ...nextSceneArguments) {
		super();
		this.threePasses[0].enabled = false;
		this.UIScene.add(this.label);
		this.nextScene = nextScene;
		this.nextSceneArguments = nextSceneArguments;
		this.load(list);
	}

	async load(list) {
		console.log(list);
		const totalResources = countResources(list);

		let loadedResources = 0;
		await loadResources(list, () => {
			loadedResources++;
			this.label.text =	`Loading... ${loadedResources} / ${totalResources} (${Math.round(loadedResources / totalResources * 100)}%)`;
		});

		this.onComplete();
	}

	onComplete() {
		console.log('Load complete');
		this.addEasing(
			new Easing(this.label)
				.add({opacity: 0}, 200, Easing.LINEAR)
				.trigger(() => this.nextScene.createAndEnter(...this.nextSceneArguments))
		);
	}
}