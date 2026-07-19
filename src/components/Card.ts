// src/components/Card.ts

import { App, TFile } from "obsidian";

import { MediaItem } from "../models";

/**
 * Card
 *
 * Renders a single MediaItem.
 *
 * This component is intentionally focused on a single
 * responsibility: displaying one media item.
 *
 * It is reused throughout the plugin in:
 *
 * - Card View
 * - Search Results
 * - Collections
 * - Favorites
 * - Recently Added
 * - Recommendations
 * - Spotlight
 */
export class Card {
	private readonly item: MediaItem;

	private readonly app?: App;

	constructor(item: MediaItem, app?: App) {
		this.item = item;
		this.app = app;
	}

	/**
	 * Render this card.
	 */
	render(container: HTMLElement): HTMLElement {
		const card = container.createDiv({
			cls: "media-card",
		});

		this.renderCover(card);

		this.renderInfo(card);

		this.registerEvents(card);

		return card;
	}

	/**
	 * -----------------------------
	 * Cover
	 * -----------------------------
	 */
	private renderCover(card: HTMLElement): void {
		const cover = card.createDiv({
			cls: "media-card-cover",
		});
		cover.addClass("media-card-cover-image-wrap");

		if (this.item.coverUrl) {
			const image = cover.createEl("img");

			image.src = this.resolveCoverSource(this.item.coverUrl);
			image.alt = this.item.title;

			return;
		}

		if (this.item.coverLocal) {
			const image = cover.createEl("img");

			image.src = this.resolveCoverSource(this.item.coverLocal);
			image.alt = this.item.title;

			return;
		}

		cover.addClass("media-card-cover-placeholder");

		cover.setText("No Cover");
	}

	private resolveCoverSource(source: string): string {
		const normalized = source
			.trim()
			.replace(/^!\[\[(.*)\]\]$/, "$1")
			.replace(/^\[\[(.*)\]\]$/, "$1")
			.replace(/^\((.*)\)$/, "$1");

		if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
			return normalized;
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

	/**
	 * -----------------------------
	 * Information
	 * -----------------------------
	 */
	private renderInfo(card: HTMLElement): void {
		const body = card.createDiv({
			cls: "media-card-body",
		});

		body.createEl("h3", {
			text: this.item.title,
			cls: "media-card-title",
		});

		body.createDiv({
			text: this.item.creator,
			cls: "media-card-creator",
		});

		if (this.item.year !== undefined) {
			body.createDiv({
				text: String(this.item.year),
				cls: "media-card-year",
			});
		}

		if (this.item.rating !== undefined && this.item.rating !== null) {
			body.createDiv({
				text: `★ ${this.item.rating}`,
				cls: "media-card-rating",
			});
		}

		body.createDiv({
			text: this.item.mediaType,
			cls: "media-card-type",
		});
	}

	/**
	 * -----------------------------
	 * Events
	 * -----------------------------
	 */
	private registerEvents(card: HTMLElement): void {
		card.addEventListener("click", () => {

			// Future:
			// Open popup
			// Open note
			// Preview
		});
	}
}