// src/views/CardView.ts

import { App } from "obsidian";

import { MediaItem } from "../models";
import { renderLibraryCardTrack } from "./cards/LibraryCardTrack";

export type CardSelectionHandler = (item: MediaItem | null) => void;

/**
 * CardView
 *
 * Displays MediaItems as a responsive card grid.
 *
 * Responsibilities:
 * - Create the grid
 * - Ask MediaCard to render each card
 *
 * Should NOT:
 * - Scan the vault
 * - Parse metadata
 * - Search
 * - Filter
 */
export class CardView {
	private readonly app: App;

	constructor(app: App) {
		this.app = app;
	}

	/**
	 * Render every media item.
	 */
	render(
		container: HTMLElement,
		items: MediaItem[],
		selectedItem: MediaItem | null = null,
		onSelect: CardSelectionHandler | null = null
	): void {
		renderLibraryCardTrack(container, items, this.app, {
			selectedItem,
			onSelect: onSelect ?? undefined,
		});
	}
}