import { App } from "obsidian";

import { Poster } from "../components/Poster";
import { MediaItem } from "../models/MediaItem";

export interface ShowcaseViewHosts {
	carouselHost: HTMLElement;
	contentHost: HTMLElement;
	sidebarHost: HTMLElement;
	statusHost: HTMLElement;
}

export interface ShowcaseViewCallbacks {
	onOpenItem(item: MediaItem): void;
}

export class ShowcaseView {
	private readonly app: App;

	constructor(app: App) {
		this.app = app;
	}

	render(hosts: ShowcaseViewHosts, items: MediaItem[], callbacks: ShowcaseViewCallbacks): void {
		hosts.carouselHost.empty();
		hosts.contentHost.empty();
		hosts.sidebarHost.empty();
		hosts.statusHost.empty();

		if (!items.length) {
			hosts.contentHost.createDiv({ cls: "media-library-empty", text: "No media found for this view." });
			return;
		}

		hosts.carouselHost.removeClass("is-hidden");
		this.renderCarousel(hosts.carouselHost, items, callbacks);

		const lowerGrid = hosts.contentHost.createDiv({ cls: "media-showcase-lower-grid" });
		this.renderLastRated(lowerGrid, items, callbacks);
		this.renderTryThese(lowerGrid, items, callbacks);
		hosts.statusHost.setText(`${items.length} items in showcase view`);
	}

	private renderCarousel(container: HTMLElement, items: MediaItem[], callbacks: ShowcaseViewCallbacks): void {
		const shell = container.createDiv({ cls: "media-showcase-shelf" });
		const titleRow = shell.createDiv({ cls: "media-showcase-title-row" });
		titleRow.createEl("h3", { text: "Browse the shelf", cls: "media-showcase-title" });
		titleRow.createDiv({ text: "Every item in your current library view, laid out like a living shelf.", cls: "media-showcase-subtitle" });

		const frame = shell.createDiv({ cls: "media-showcase-carousel-frame" });
		const leftButton = frame.createEl("button", { text: "←", cls: "media-showcase-arrow" });
		const track = frame.createDiv({ cls: "media-showcase-carousel-track" });
		const rightButton = frame.createEl("button", { text: "→", cls: "media-showcase-arrow" });

		for (const item of items) {
			const card = track.createDiv({ cls: "media-showcase-carousel-card" });
			card.addEventListener("click", () => callbacks.onOpenItem(item));
			new Poster(item, this.app).render(card.createDiv({ cls: "media-showcase-carousel-poster" }));
			card.createDiv({ text: item.title, cls: "media-showcase-carousel-label" });
		}

		leftButton.addEventListener("click", () => {
			track.scrollBy({ left: -420, behavior: "smooth" });
		});

		rightButton.addEventListener("click", () => {
			track.scrollBy({ left: 420, behavior: "smooth" });
		});
	}

	private renderLastRated(container: HTMLElement, items: MediaItem[], callbacks: ShowcaseViewCallbacks): void {
		const featured = getLastRatedItem(items) ?? items[0] ?? null;
		if (!featured) {
			return;
		}

		const panel = container.createDiv({ cls: "media-showcase-feature-panel" });
		const header = panel.createDiv({ cls: "media-showcase-panel-header" });
		header.createDiv({ text: "Last rated", cls: "media-showcase-panel-title" });
		header.createEl("button", { text: "Open", cls: "media-showcase-open-button" }).addEventListener("click", () => {
			callbacks.onOpenItem(featured);
		});

		const body = panel.createDiv({ cls: "media-showcase-feature-body" });
		const posterWrap = body.createDiv({ cls: "media-showcase-feature-poster" });
		new Poster(featured, this.app).render(posterWrap);

		const copy = body.createDiv({ cls: "media-showcase-feature-copy" });
		copy.createEl("h3", { text: featured.title });
		copy.createDiv({ text: featured.creator, cls: "media-showcase-feature-meta" });
		copy.createDiv({
			text: [featured.rating != null ? `${featured.rating}/10` : null, featured.date ?? null].filter(Boolean).join(" • "),
			cls: "media-showcase-feature-meta",
		});
		copy.createEl("p", {
			text: featured.summary ?? featured.synopsis ?? "No synopsis yet.",
			cls: "media-showcase-feature-summary",
		});
	}

	private renderTryThese(container: HTMLElement, items: MediaItem[], callbacks: ShowcaseViewCallbacks): void {
		const panel = container.createDiv({ cls: "media-showcase-try-panel" });
		panel.createDiv({ text: "Try these", cls: "media-showcase-panel-title" });
		panel.createDiv({ text: "Random media from the same filtered view.", cls: "media-showcase-side-note" });

		const picks = getRandomItems(items, 4, getLastRatedItem(items)?.path);
		const row = panel.createDiv({ cls: "media-showcase-try-row" });

		for (const item of picks) {
			const button = row.createDiv({ cls: "media-showcase-try-card" });
			button.addEventListener("click", () => callbacks.onOpenItem(item));
			new Poster(item, this.app).render(button.createDiv({ cls: "media-showcase-try-poster" }));
			button.createDiv({ text: item.title, cls: "media-showcase-try-label" });
		}
	}
}

function getLastRatedItem(items: MediaItem[]): MediaItem | null {
	const rated = items.filter((item) => typeof item.rating === "number" && (item.rating ?? 0) > 0);
	if (!rated.length) {
		return null;
	}

	return [...rated].sort((left, right) => {
		const dateCompare = (right.date ?? "").localeCompare(left.date ?? "");
		if (dateCompare !== 0) {
			return dateCompare;
		}

		return (right.rating ?? 0) - (left.rating ?? 0);
	})[0] ?? null;
}

function getRandomItems(items: MediaItem[], count: number, excludedPath?: string): MediaItem[] {
	const pool = items.filter((item) => item.path !== excludedPath);
	const shuffled = [...pool].sort(() => Math.random() - 0.5);
	return shuffled.slice(0, count);
}