import { App, setIcon } from "obsidian";

import { Poster } from "../components/Poster";
import { MediaItem } from "../models/MediaItem";

export interface GalleryViewHosts {
	carouselHost: HTMLElement;
	contentHost: HTMLElement;
	sidebarHost: HTMLElement;
}

export interface GalleryViewCallbacks {
	onSelectItem(item: MediaItem): void;
	onOpenNote(item: MediaItem): void;
	onOpenModal(item: MediaItem): void;
	onToggleFavorite(item: MediaItem): void;
}

export interface GalleryViewOptions {
	activePath?: string | null;
	isFavorite?: (itemPath: string) => boolean;
}

export class GalleryView {
	private readonly app: App;

	constructor(app: App) {
		this.app = app;
	}

	render(hosts: GalleryViewHosts, items: MediaItem[], callbacks: GalleryViewCallbacks, options: GalleryViewOptions = {}): void {
		hosts.carouselHost.empty();
		hosts.carouselHost.addClass("is-hidden");
		hosts.contentHost.empty();

		if (!items.length) {
			hosts.contentHost.createDiv({ cls: "media-library-empty", text: "No media found for this view." });
			return;
		}

		const activeItem = this.pickActiveItem(items, options.activePath);
		const grid = hosts.contentHost.createDiv({ cls: "media-gallery-grid" });
		for (const item of items) {
			this.renderPosterCard(grid, item, activeItem?.path === item.path, callbacks, options.isFavorite?.(item.path) ?? false);
		}

		// hosts.statusHost.setText(`${items.length} items in gallery view`);
	}

	private pickActiveItem(items: MediaItem[], activePath?: string | null): MediaItem {
		if (activePath) {
			const found = items.find((item) => item.path === activePath);
			if (found) {
				return found;
			}
		}

		return items[0] as MediaItem;
	}

	private renderPosterCard(container: HTMLElement, item: MediaItem, isActive: boolean, callbacks: GalleryViewCallbacks, isFavorite: boolean): void {
		const card = container.createDiv({ cls: "media-gallery-card" });
		if (isActive) {
			card.addClass("is-active");
		}

		card.addEventListener("click", () => {
			callbacks.onSelectItem(item);
		});

		const posterHost = card.createDiv({ cls: "media-gallery-poster" });
		new Poster(item, this.app).render(posterHost);
		card.createDiv({
			cls: "media-gallery-hover-title",
			text: item.year ? `${item.title} (${item.year})` : item.title,
		});

		const actionBar = card.createDiv({ cls: "media-gallery-actions" });
		this.createIconButton(actionBar, "Open note", "eye", () => {
			callbacks.onOpenNote(item);
		});
		this.createIconButton(actionBar, "Favorite", "heart", () => {
			callbacks.onToggleFavorite(item);
		});
		this.createIconButton(actionBar, "Open modal", "more-horizontal", () => {
			callbacks.onOpenModal(item);
		});

		if (isFavorite) {
			actionBar.addClass("is-favorite");
		}
	}

	private createIconButton(container: HTMLElement, label: string, icon: string, onClick: () => void): void {
		const button = container.createEl("button", {
			cls: "media-gallery-action-button",
			attr: { "aria-label": label, title: label },
		});

		const glyph = button.createSpan({ cls: "media-gallery-action-icon" });
		setIcon(glyph, icon);

		button.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			onClick();
		});
	}
}
