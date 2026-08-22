import { App, setIcon } from "obsidian";

import { Poster } from "../../components/Poster";
import { MediaItem } from "../../models/MediaItem";

export interface LibraryCardOptions {
	selected?: boolean;
	onSelect?: (item: MediaItem) => void;
	onOpenNote?: (item: MediaItem) => void;
	onOpenModal?: (item: MediaItem) => void;
	onToggleFavorite?: (item: MediaItem) => void;
	isFavorite?: boolean;
	onCreatorClick?: (creator: string) => void;
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

	const actionBar = posterShell.createDiv({ cls: "media-card-actions" });
	createIconButton(actionBar, "Open note", "eye", () => {
		options.onOpenNote?.(item);
	});
	createIconButton(actionBar, "Favorite", "heart", () => {
		options.onToggleFavorite?.(item);
	});
	createIconButton(actionBar, "Open modal", "more-horizontal", () => {
		options.onOpenModal?.(item);
	});
	if (options.isFavorite) {
		actionBar.addClass("is-favorite");
	}

	const body = card.createDiv({ cls: "media-card-body" });
	body.createEl("h3", { text: item.title });
	const creator = body.createDiv({ text: item.creator, cls: "media-card-creator" });
	creator.addEventListener("click", (event) => {
		event.preventDefault();
		event.stopPropagation();
		options.onCreatorClick?.(item.creator);
	});

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
	const metaRow = meta.createDiv({ cls: "media-card-meta-row" });
	metaRow.createDiv({ text: item.mediaType, cls: "media-card-type" });
	if (item.rating !== null && item.rating !== undefined) {
		metaRow.createDiv({ text: `★ ${item.rating}`, cls: "media-card-rating" });
	}
	if (item.year !== undefined) {
		meta.createDiv({ text: String(item.year), cls: "media-card-year" });
	}
	if (item.date) {
		meta.createDiv({ text: formatMediaDate(item.date), cls: "media-card-date" });
	}

	return card;
}

function formatMediaDate(value: string): string {
	const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
	if (Number.isNaN(date.getTime())) {
		return value;
	}

	const day = date.getUTCDate();
	const suffix = day % 100 >= 11 && day % 100 <= 13
		? "th"
		: ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[day % 10] ?? "th";
	const month = date.toLocaleString("en-US", { month: "long", timeZone: "UTC" });
	return `${month} ${day}${suffix}, ${date.getUTCFullYear()}`;
}

function createIconButton(container: HTMLElement, label: string, icon: string, onClick: () => void): void {
	const button = container.createEl("button", {
		cls: "media-card-action-button",
		attr: { "aria-label": label, title: label },
	});

	const glyph = button.createSpan({ cls: "media-card-action-icon" });
	setIcon(glyph, icon);

	button.addEventListener("click", (event) => {
		event.preventDefault();
		event.stopPropagation();
		onClick();
	});
}