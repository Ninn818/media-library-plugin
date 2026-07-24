// src/views/CardView.ts

import { App } from "obsidian";

import { MediaItem } from "../models";
import { renderLibraryCardTrack } from "./cards/LibraryCardTrack";

export type CardSelectionHandler = (item: MediaItem | null) => void;

export interface CardViewCallbacks {
	onOpenNote?: (item: MediaItem) => void;
	onOpenModal?: (item: MediaItem) => void;
	onToggleFavorite?: (item: MediaItem) => void;
	isFavorite?: (itemPath: string) => boolean;
	onCreatorClick?: (creator: string) => void;
}

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
		onSelect: CardSelectionHandler | null = null,
		callbacks: CardViewCallbacks = {}
	): void {
		renderLibraryCardTrack(container, items, this.app, {
			selectedItem,
			onSelect: onSelect ?? undefined,
			onOpenNote: callbacks.onOpenNote,
			onOpenModal: callbacks.onOpenModal,
			onToggleFavorite: callbacks.onToggleFavorite,
			isFavorite: callbacks.isFavorite,
			onCreatorClick: callbacks.onCreatorClick,
		});
	}
}