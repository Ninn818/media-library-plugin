import { App, CachedMetadata, TFile } from "obsidian";

import { MediaItem, MediaType, SortType } from "./models";
import { ParserRegistry } from "./parsers";
import { ActivityLogService } from "./services";

/** Metadata for a supported media type. */
export interface MediaDefinition {
	type: MediaType;
	name: string;
	icon: string;
}

/** Catalog of supported media types. */
export class MediaRegistry {
	private readonly media: MediaDefinition[] = [
		{ type: "book", name: "Books", icon: "book-open" },
		{ type: "movie", name: "Movies", icon: "film" },
		{ type: "series", name: "Series", icon: "tv" },
		{ type: "essay", name: "Essays", icon: "file-text" },
	];

	getAll(): MediaDefinition[] {
		return [...this.media];
	}

	get(type: MediaType): MediaDefinition | undefined {
		return this.media.find((media) => media.type === type);
	}

	has(type: MediaType): boolean {
		return this.media.some((media) => media.type === type);
	}

	getTypes(): MediaType[] {
		return this.media.map((media) => media.type);
	}

	getNames(): string[] {
		return this.media.map((media) => media.name);
	}
}

/** Metadata for a view available in the library. */
export interface ViewDefinition {
	id: string;
	name: string;
	icon: string;
}

/** Catalog of library views. */
export class ViewRegistry {
	private readonly views: ViewDefinition[] = [
		{ id: "cards", name: "Cards", icon: "layout-grid" },
		{ id: "gallery", name: "Gallery", icon: "images" },
	];

	getAll(): ViewDefinition[] {
		return [...this.views];
	}

	get(id: string): ViewDefinition | undefined {
		return this.views.find((view) => view.id === id);
	}

	has(id: string): boolean {
		return this.views.some((view) => view.id === id);
	}

	getDefault(): ViewDefinition {
		const view = this.views[0];
		if (!view) {
			throw new Error("No views have been registered.");
		}
		return view;
	}

	getIds(): string[] {
		return this.views.map((view) => view.id);
	}
}

/** Scans vault notes and turns supported media notes into MediaItems. */
export class VaultScanner {
	private readonly app: App;
	private readonly parserRegistry: ParserRegistry;
	private readonly activityLogService: ActivityLogService;

	constructor(app: App) {
		this.app = app;
		this.parserRegistry = new ParserRegistry();
		this.activityLogService = new ActivityLogService(app);
	}

	async scanVault(): Promise<MediaItem[]> {
		const mediaItems: MediaItem[] = [];
		const files = this.app.vault.getMarkdownFiles();

		for (const file of files) {
			const item = await this.scanFile(file);
			if (item) {
				mediaItems.push(item);
			}
		}

		return mediaItems;
	}

	async scanFile(file: TFile): Promise<MediaItem | null> {
		const metadata = this.app.metadataCache.getFileCache(file);
		if (!metadata) {
			return null;
		}

		const frontmatter = this.getFrontmatter(metadata);
		if (!frontmatter) {
			return null;
		}

		const hasMediaType =
			frontmatter.type !== undefined ||
			frontmatter.mediaType !== undefined ||
			frontmatter.media !== undefined;
		if (!hasMediaType) {
			return null;
		}

		const item = this.parserRegistry.parse(file, frontmatter);
		if (!item) {
			return null;
		}

		item.activityEntries = await this.activityLogService.loadEntries(file, item);
		item.addedDate = new Date(file.stat.mtime).toISOString();
		if (!item.createdDate) {
			item.createdDate = item.addedDate;
		}

		return item;
	}

	private getFrontmatter(metadata: CachedMetadata): Record<string, unknown> | null {
		return metadata.frontmatter ?? null;
	}

	async refreshFile(file: TFile): Promise<MediaItem | null> {
		return this.scanFile(file);
	}

	async refresh(): Promise<MediaItem[]> {
		return this.scanVault();
	}
}

/** In-memory source of truth for scanned media items. */
export class MediaLibrary {
	private readonly scanner: VaultScanner;
	private items: MediaItem[] = [];

	constructor(app: App) {
		this.scanner = new VaultScanner(app);
	}

	async refresh(): Promise<void> {
		this.items = await this.scanner.scanVault();
	}

	getAll(): MediaItem[] {
		return [...this.items];
	}

	getByMediaType(type: MediaType): MediaItem[] {
		return this.items.filter((item) => item.mediaType === type);
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

	getByPath(path: string): MediaItem | undefined {
		return this.items.find((item) => item.path === path);
	}

	search(query: string): MediaItem[] {
		const normalizedQuery = query.trim().toLowerCase();
		if (!normalizedQuery) {
			return this.getAll();
		}

		return this.items.filter((item) =>
			item.title.toLowerCase().includes(normalizedQuery) ||
			item.creator.toLowerCase().includes(normalizedQuery)
		);
	}

	sort(items: MediaItem[], sort: SortType): MediaItem[] {
		const sorted = [...items];
		if (sort.mode === "random") {
			return sorted.sort(() => Math.random() - 0.5);
		}

		const direction = sort.direction === "desc" ? -1 : 1;
		const compareText = (a?: string, b?: string) =>
			(a ?? "").toLowerCase().localeCompare((b ?? "").toLowerCase()) * direction;
		const compareNumber = (a: number | null | undefined, b: number | null | undefined) =>
			((a ?? 0) - (b ?? 0)) * direction;
		const compareDate = (a?: string, b?: string) =>
			(a ?? "").localeCompare(b ?? "") * direction;

		return sorted.sort((a, b) => {
			switch (sort.mode) {
				case "title":
					return compareText(a.title, b.title);
				case "creator":
					return compareText(a.creator, b.creator);
				case "year":
					return compareNumber(a.year, b.year);
				case "rating":
					return compareNumber(a.rating, b.rating);
				case "read":
					return compareDate(a.date, b.date);
				case "latest":
					return compareDate(a.addedDate, b.addedDate);
				default:
					return 0;
			}
		});
	}

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
