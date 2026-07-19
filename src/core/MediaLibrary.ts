// src/core/MediaLibrary.ts

import { App } from "obsidian";

import { MediaItem, MediaType, SortType } from "../models";
import { VaultScanner } from "./VaultScanner";

/**
 * MediaLibrary
 *
 * Holds every MediaItem currently loaded into memory.
 *
 * This class is the single source of truth for the library.
 *
 * Views should NEVER communicate with VaultScanner directly.
 */
export class MediaLibrary {
	private readonly scanner: VaultScanner;

	private items: MediaItem[] = [];

	constructor(app: App) {
		this.scanner = new VaultScanner(app);
	}

	/**
	 * Scan the vault and rebuild the library.
	 */
	async refresh(): Promise<void> {
		this.items = await this.scanner.scanVault();
	}

	/**
	 * Returns every media item.
	 */
	getAll(): MediaItem[] {
		return [...this.items];
	}

	/**
	 * Returns every item of one media type.
	 */
	getByMediaType(type: MediaType): MediaItem[] {
		return this.items.filter(
			(item) => item.mediaType === type
		);
	}

	getBooks(): MediaItem[] {
		return this.getByMediaType("book");
	}

	getMovies(): MediaItem[] {
		return this.getByMediaType("movie");
	}

	getSeries(): MediaItem[] {
		return this.getByMediaType("series");
	}

	getEssays(): MediaItem[] {
		return this.getByMediaType("essay");
	}

	/**
	 * Returns one media item by vault path.
	 */
	getByPath(path: string): MediaItem | undefined {
		return this.items.find(
			(item) => item.path === path
		);
	}

	/**
	 * Search titles and creators.
	 */
	search(query: string): MediaItem[] {
		const q = query.trim().toLowerCase();

		if (!q) {
			return this.getAll();
		}

		return this.items.filter((item) => {
			return (
				item.title.toLowerCase().includes(q) ||
				item.creator.toLowerCase().includes(q)
			);
		});
	}

	/**
	 * Returns every item sorted.
	 */
	sort(
		items: MediaItem[],
		sort: SortType
	): MediaItem[] {

		const sorted = [...items];

		switch (sort) {

			case "title-asc":
				return sorted.sort((a, b) =>
					a.title.localeCompare(b.title)
				);

			case "title-desc":
				return sorted.sort((a, b) =>
					b.title.localeCompare(a.title)
				);

			case "creator-asc":
				return sorted.sort((a, b) =>
					a.creator.localeCompare(b.creator)
				);

			case "creator-desc":
				return sorted.sort((a, b) =>
					b.creator.localeCompare(a.creator)
				);

			case "year-asc":
				return sorted.sort(
					(a, b) =>
						(a.year ?? 0) -
						(b.year ?? 0)
				);

			case "year-desc":
				return sorted.sort(
					(a, b) =>
						(b.year ?? 0) -
						(a.year ?? 0)
				);

			case "rating-asc":
				return sorted.sort(
					(a, b) =>
						(a.rating ?? 0) -
						(b.rating ?? 0)
				);

			case "rating-desc":
				return sorted.sort(
					(a, b) =>
						(b.rating ?? 0) -
						(a.rating ?? 0)
				);

			case "random":
				return sorted.sort(
					() => Math.random() - 0.5
				);

			default:
				return sorted;
		}
	}

	/**
	 * Number of media items.
	 */
	getCount(): number {
		return this.items.length;
	}

	getBookCount(): number {
		return this.getBooks().length;
	}

	getMovieCount(): number {
		return this.getMovies().length;
	}

	getSeriesCount(): number {
		return this.getSeries().length;
	}

	getEssayCount(): number {
		return this.getEssays().length;
	}
}