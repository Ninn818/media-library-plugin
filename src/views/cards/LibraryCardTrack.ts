import { App } from "obsidian";

import { MediaItem } from "../../models/MediaItem";
import { renderLibraryCard } from "./LibraryCard";

export interface LibraryCardTrackOptions {
	selectedItem?: MediaItem | null;
	onSelect?: (item: MediaItem) => void;
}

export function renderLibraryCardTrack(
	container: HTMLElement,
	items: MediaItem[],
	app: App,
	options: LibraryCardTrackOptions = {}
): void {
	container.empty();

	if (items.length === 0) {
		const empty = container.createDiv({ cls: "media-library-empty" });
		empty.createEl("h2", { text: "Your library is empty" });
		empty.createEl("p", { text: "No supported media notes were found in your vault." });
		return;
	}

	const grid = container.createDiv({ cls: "media-library-grid" });
	for (const item of items) {
		renderLibraryCard(grid, item, app, {
			selected: options.selectedItem?.path === item.path,
			onSelect: options.onSelect,
		});
	}
}