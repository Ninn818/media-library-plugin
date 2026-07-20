// src/components/Poster.ts

import { App } from "obsidian";

import { MediaItem } from "../models";
import { resolveCoverSource } from "../utils/Covers";

export class Poster {
	private readonly item: MediaItem;
	private readonly app?: App;

	constructor(item: MediaItem, app?: App) {
		this.item = item;
		this.app = app;
	}

	render(container: HTMLElement): HTMLElement {
		const wrapper = container.createDiv({ cls: "media-poster" });
		this.renderImage(wrapper);
		return wrapper;
	}

	private renderImage(container: HTMLElement): void {
		if (this.item.coverUrl) {
			this.createImage(container, this.item.coverUrl);
			return;
		}

		if (this.item.coverLocal) {
			this.createImage(container, this.item.coverLocal);
			return;
		}

		this.renderPlaceholder(container);
	}

	private createImage(container: HTMLElement, source: string): void {
		const resolvedSource = this.resolveSource(source);
		const image = container.createEl("img");
		image.src = resolvedSource;
		image.referrerPolicy = "no-referrer";
		image.alt = this.item.title;
		image.addClass("media-poster-image");
	}

	private renderPlaceholder(container: HTMLElement): void {
		container.addClass("media-poster-placeholder");
		container.setText("No cover");
	}

	private resolveSource(source: string): string {
		return resolveCoverSource(this.app, this.item.path, source);
	}

	destroy(): void {
		// Reserved for future cleanup.
	}
}