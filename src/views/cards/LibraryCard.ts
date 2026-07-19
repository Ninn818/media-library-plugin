import { App } from "obsidian";

import { Poster } from "../../components/Poster";
import { MediaItem } from "../../models/MediaItem";

export interface LibraryCardOptions {
	selected?: boolean;
	onSelect?: (item: MediaItem) => void;
}

export function renderLibraryCard(
	container: HTMLElement,
	item: MediaItem,
	app: App,
	options: LibraryCardOptions = {}
): HTMLElement {
	const card = container.createDiv({ cls: "media-card media-card-grid" });

	if (options.selected) {
		card.addClass("is-selected");
	}

	card.addEventListener("click", () => {
		options.onSelect?.(item);
	});

	const posterShell = card.createDiv({ cls: "media-card-poster-shell" });
	new Poster(item, app).render(posterShell);

	const body = card.createDiv({ cls: "media-card-body" });
	body.createEl("h3", { text: item.title });
	body.createDiv({ text: item.creator, cls: "media-card-creator" });

	const chips = body.createDiv({ cls: "media-card-chip-row" });
	if (item.genres?.length) {
		for (const genre of item.genres.slice(0, 2)) {
			chips.createDiv({ text: genre, cls: "media-card-chip" });
		}
	}
	else {
		chips.createDiv({ text: item.mediaType, cls: "media-card-chip" });
	}

	const meta = body.createDiv({ cls: "media-card-meta" });
	meta.createDiv({ text: item.mediaType, cls: "media-card-type" });
	if (item.year !== undefined) {
		meta.createDiv({ text: String(item.year), cls: "media-card-year" });
	}
	if (item.rating !== null && item.rating !== undefined) {
		meta.createDiv({ text: `★ ${item.rating}`, cls: "media-card-rating" });
	}

	return card;
}