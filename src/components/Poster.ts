// src/components/Poster.ts

import { App, TFile } from "obsidian";

import { MediaItem } from "../models";

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
		let normalized = source.trim();

		for (let index = 0; index < 4; index += 1) {
			const next = normalized
				.replace(/^!\[[^\]]*\]\(([^)]+)\)$/, "$1")
				.replace(/^\[[^\]]*\]\(([^)]+)\)$/, "$1")
				.replace(/^!\[\[([^|\]#]+)(?:#[^|\]]+)?(?:\|[^\]]*)?\]\]$/, "$1")
				.replace(/^\[\[([^|\]#]+)(?:#[^|\]]+)?(?:\|[^\]]*)?\]\]$/, "$1")
				.replace(/^\((.*)\)$/, "$1")
				.replace(/^<(.*)>$/, "$1")
				.replace(/^"(.*)"$/, "$1");

			if (next === normalized) {
				break;
			}

			normalized = next.trim();
		}

		const external = normalized
			.replace(/^http:\/\/books\.google\.com/i, "https://books.google.com")
			.replace(/^https:\/\/books\.google\.com\/books\/content\?/i, "https://books.google.com/books/content?");

		if (external.startsWith("http://") || external.startsWith("https://")) {
			return external;
		}

		if (this.app) {
			const directFile = this.app.vault.getAbstractFileByPath(normalized);
			if (directFile instanceof TFile) {
				return this.app.vault.getResourcePath(directFile);
			}

			const linkedFile = this.app.metadataCache.getFirstLinkpathDest(normalized, this.item.path);
			if (linkedFile instanceof TFile) {
				return this.app.vault.getResourcePath(linkedFile);
			}

			const linkedFromRoot = this.app.metadataCache.getFirstLinkpathDest(normalized, "");
			if (linkedFromRoot instanceof TFile) {
				return this.app.vault.getResourcePath(linkedFromRoot);
			}

			if (!normalized.startsWith("/") && this.item.path) {
				const folder = this.item.path.includes("/") ? this.item.path.slice(0, this.item.path.lastIndexOf("/")) : "";
				if (folder) {
					const relativeCandidate = `${folder}/${normalized}`;
					const relativeFile = this.app.vault.getAbstractFileByPath(relativeCandidate);
					if (relativeFile instanceof TFile) {
						return this.app.vault.getResourcePath(relativeFile);
					}
				}
			}

			const fileByPath = this.app.vault.getAbstractFileByPath(normalized);
			if (fileByPath instanceof TFile) {
				return this.app.vault.getResourcePath(fileByPath);
			}
		}

		return normalized;
	}

	destroy(): void {
		// Reserved for future cleanup.
	}
}