import { App } from "obsidian";

import { Poster } from "../../components/Poster";
import { MediaItem } from "../../models/MediaItem";
import { MediaLibrarySettings } from "../../settings";

export interface LibrarySpotlightCallbacks {
	onOpenDetails(item: MediaItem): void;
}

export function renderLibrarySpotlight(
	container: HTMLElement,
	item: MediaItem | null,
	app: App,
	settings: MediaLibrarySettings,
	callbacks: LibrarySpotlightCallbacks
): void {
	container.empty();

	if (!item) {
		const empty = container.createDiv({ cls: "media-library-spotlight-empty" });
		empty.createEl("h3", { text: "Select a title" });
		empty.createEl("p", { text: "Pick a book, movie, series, or essay to see the spotlight view." });
		return;
	}

	const spotlight = container.createDiv({ cls: "media-library-spotlight" });
	const infoCol = spotlight.createDiv({ cls: "media-library-spotlight-info" });
	const posterCol = spotlight.createDiv({ cls: "media-library-spotlight-poster" });

	infoCol.createDiv({ cls: "media-library-spotlight-label", text: "Featured Spotlight" });
	infoCol.createEl("h3", { text: item.title });
	infoCol.createDiv({ text: item.creator, cls: "media-library-detail-subtitle" });
	infoCol.createDiv({ text: `${item.mediaType} • ${item.year ?? "Unknown year"}`, cls: "media-library-detail-meta" });

	const actionRow = infoCol.createDiv({ cls: "media-library-spotlight-actions" });
	actionRow.createEl("button", {
		text: settings.showReviewSection ? "Open review" : "View details",
	}).addEventListener("click", () => {
		callbacks.onOpenDetails(item);
	});

	const posterWrap = posterCol.createDiv({ cls: "media-library-spotlight-cover" });
	new Poster(item, app).render(posterWrap);
}