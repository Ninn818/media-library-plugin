// src/components/Poster.ts

import { App, setIcon } from "obsidian";

import { MediaItem } from "../models";
import { resolveCoverSource } from "../utils/Covers";

const PLACEHOLDER_ICONS: Record<string, string> = {
	book: "book",
	movie: "clapperboard",
	series: "tv",
	essay: "scroll-text",
};

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
		const sources = [this.item.coverLocal, this.item.coverUrl]
			.filter((value): value is string => typeof value === "string" && value.trim().length > 0);

		if (!sources.length) {
			this.renderPlaceholder(container);
			return;
		}

		this.createImage(container, sources, 0);
	}

	private createImage(container: HTMLElement, sources: string[], index: number): void {
		const source = sources[index];
		if (!source) {
			container.empty();
			this.renderPlaceholder(container);
			return;
		}

		const resolvedSource = this.resolveSource(source);
		const image = container.createEl("img");
		image.src = resolvedSource;
		image.alt = this.item.title;
		image.addClass("media-poster-image");
		image.addEventListener("error", () => {
			image.remove();
			this.createImage(container, sources, index + 1);
		});
	}

	private renderPlaceholder(container: HTMLElement): void {
		container.addClass("media-poster-placeholder");
		const icon = container.createDiv({ cls: "media-poster-placeholder-icon" });
		setIcon(icon, PLACEHOLDER_ICONS[this.item.mediaType] ?? "image-off");
		container.createDiv({ cls: "media-poster-placeholder-title", text: this.item.title });
	}

	private resolveSource(source: string): string {
		return resolveCoverSource(this.app, this.item.path, source);
	}

	destroy(): void {
		// Reserved for future cleanup.
	}
}