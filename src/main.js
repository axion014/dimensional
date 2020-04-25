import {init, run} from "fewd/main";

import LoadingScene from "./loading";
import TitleScene from "./title";

import regeneratorRuntime from "regenerator-runtime"; // async requires this

window.onload = async function() {
	const canvas = init();

	LoadingScene.createAndEnter(TitleScene, TitleScene);

	document.body.appendChild(await canvas);

	run();
};
