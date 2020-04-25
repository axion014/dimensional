
import Scene from "fewd/scene";
import {Label} from "fewd/uielements";
import Easing from "fewd/easing";
import {loadResources, countResources} from "fewd/loading";

import regeneratorRuntime from "regenerator-runtime"; // async requires this

import TitleScene from "./title";

export default class LoadingScene extends Scene {

	label = new Label("Loading... 0%", {
		font: "20px 'HiraKakuProN-W3'",
		fillStyle: '#444a',
		opacity: 1
	});

	constructor(list, nextScene, ...nextSceneArguments) {
		super();
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