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

		if (sort.mode === "random") {
			return sorted.sort(() => Math.random() - 0.5);// Randomize the order of items
		}
		//Direction factor(1 for ascending, -1 for descending
		const dir = sort.direction === "desc" ? -1 : 1;

		// comparators
		const stringCmp = (a?: string, b?: string) =>
		((a ?? "").toLowerCase().localeCompare((b ?? "").toLowerCase())) * dir;

		const numCmp = (a: number | null | undefined, b: number | null | undefined) =>
		(((a ?? 0) - (b ?? 0)) * dir);

		// compare ISO date strings like "2024-01-02"
		const dateCmp = (a?: string, b?: string) =>
		((a ?? "").localeCompare(b ?? "")) * dir;

		return sorted.sort((a, b) => {
		switch (sort.mode) {
			case "title":
			return stringCmp(a.title, b.title);
			case "creator":
			return stringCmp(a.creator, b.creator);
			case "year":
			return numCmp(a.year, b.year);
			case "rating":
			return numCmp(a.rating, b.rating);
			case "read":
			return dateCmp(a.date, b.date);
			case "latest":
			return dateCmp(a.addedDate, b.addedDate);
			default:
			return 0;
		}
		});
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