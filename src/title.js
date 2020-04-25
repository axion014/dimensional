import {Color} from "three";

import Scene from "fewd/scene";
import {Label} from "fewd/uielements";
import {List} from "fewd/layouts";
import Element from "fewd/element";
import Easing from "fewd/easing";
import assets from "fewd/loading";

import MainScene from "./mainscene";

const hiddenEvent = {type: "hidden"};
const revealedEvent = {type: "revealed"};

export default class TitleScene extends Scene {
	constructor() {
    super();
		this.UIScene.background = new Color("#002");

		const list = new List(true, 0, {y: 320});
		this.UIScene.add(list);

		list.add(new Label("Dimensional", {font: "72px 'HiraKakuProN-W3'", fillStyle: "#eee"}));
		const campaign = new Label("Campaign", {font: "48px 'HiraKakuProN-W3'", fillStyle: "#eee"});
		list.add(campaign);

		const addChildItem = (parent, children) => {
			const group = new Element(null, {height: 0, opacity: 1});
			parent.parent.children.splice(parent.parent.children.indexOf(parent) + 1, 0, group);
			group.parent = parent.parent;
			const list = new List(true, 0);
			group.add(list);
			group.origin = list.origin;
			for (const child of children) {
				child.opacity = 0;
				child.addEventListener('hidden', () => child.interactive = false);
				child.addEventListener('revealed', () => child.interactive = !child.hidden);
				child.hidden = true;
				child.dispatchEvent(hiddenEvent);

				list.add(child);
			}
			group.addEventListener('hidden', () => {
				for (const child of children) {child.dispatchEvent(hiddenEvent);}
			});
			group.addEventListener('revealed', () => {
				for (const child of children) {child.dispatchEvent(revealedEvent);}
			});
			list.addEventListener('lengthchanged', () => {
				if (parent.open) group.height = list.height;
			});
			list.y = children.reduce((h, c) => h + c.height + list.children[0].height / 2, 0);

			if (!parent.hidden) parent.interactive = true;
			parent.open = false;
			parent.addEventListener('pointend', () => {
				const tweenLength = Math.sqrt(list.height) * 20;
				if (parent.open) {
					this.addEasing(new Easing(group).add({height: 0}, tweenLength, Easing.out(2)));
					this.addEasing(new Easing(list).add({y: list.height}, tweenLength, Easing.out(2)));
					list.children.reduce((wait, curr) => {
						const fadeOutLength = Easing.in(2)((list.height + curr.y) / list.height) * tweenLength - wait;
						curr.hidden = true;
						curr.dispatchEvent(hiddenEvent);
						this.addEasing(new Easing(curr).wait(wait).add({opacity: 0}, fadeOutLength, Easing.out(2)));
						return wait + fadeOutLength;
					}, 0);
				} else {
					this.addEasing(new Easing(group).add({height: list.height}, tweenLength, Easing.out(2)));
					this.addEasing(new Easing(list).add({y: 0}, tweenLength, Easing.out(2)));
					list.children.reduceRight((wait, curr) => {
						const fadeInLength = Easing.in(2)((list.height + curr.y + curr.height / 2) / list.height) * tweenLength - wait;
						this.addEasing(new Easing(curr).wait(wait).add({opacity: 1}, fadeInLength, Easing.out(2)).trigger(() => {
							curr.hidden = false;
							curr.dispatchEvent(revealedEvent);
						}));
						return wait + fadeInLength;
					}, 0);
				}
				parent.open = !parent.open;
			});
		}

		function makeLabels(arr, fontSize) {
			for (let i = 0; i < arr.length; i++) arr[i] = new Label(arr[i], {
				font: `${fontSize}px 'HiraKakuProN-W3'`,
				fillStyle: "#eee"
			});
			return arr;
		}

		const chapters = makeLabels([
			"Chapter Ⅰ"
		], 36);
		const chapter_1 = makeLabels([
			"Stage 1"
		], 24);

		addChildItem(campaign, chapters);
		addChildItem(chapters[0], chapter_1);

		const registerStage = (label, id) => {
			label.addEventListener('pointend', () => MainScene.createAndEnter(assets.JSON.stages[id]));
		};

		registerStage(chapter_1[0], "1-1");

		list.add(new Label("Free Play", {font: "48px 'HiraKakuProN-W3'", fillStyle: "#eee"}));
		list.add(new Label("Map Editor", {font: "48px 'HiraKakuProN-W3'", fillStyle: "#eee"}));
		list.add(new Label("Options", {font: "48px 'HiraKakuProN-W3'", fillStyle: "#eee"}));
	}
	static requiredResources = {
		JSON: {
			stages: "data/stages.json"
		}
	};
}