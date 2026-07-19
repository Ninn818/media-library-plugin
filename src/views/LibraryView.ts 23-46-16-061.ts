// src/views/LibraryView.ts

import { ItemView, TFile, WorkspaceLeaf } from "obsidian";
import { MediaLibrarySettings } from "../settings";

import { MediaLibrary } from "../core/MediaLibrary";
import { ViewRegistry } from "../core/ViewRegistry";

import { Poster } from "../components/Poster";
import { CardView } from "./CardView";
import { MEDIA_TYPES, MediaType } from "../models/MediaType";
import { SortType, SORT_TYPES } from "../models/SortType";
import { MediaItem } from "../models/MediaItem";
import { isMediaStatus } from "../models/MediaStatus";

/**
 * LibraryView
 *
 * Main UI container for the Media Library.
 */
export class LibraryView extends ItemView {
	private readonly library: MediaLibrary;

	private readonly viewRegistry: ViewRegistry;

	private readonly settings: MediaLibrarySettings;

	private readonly cardView: CardView;

	private toolbarEl!: HTMLElement;

	private viewContentEl!: HTMLElement;

	private detailEl!: HTMLElement;

	private spotlightEl!: HTMLElement;

	private statusEl!: HTMLElement;

	private currentFilter: MediaType | "all" = "all";

	private currentSort: SortType = "date-created-desc";

	private searchQuery = "";

	private selectedItem: MediaItem | null = null;

	private reviewDraft = "";

	private featuredPath: string | null = null;

	constructor(
		leaf: WorkspaceLeaf,
		library: MediaLibrary,
		viewRegistry: ViewRegistry,
		settings: MediaLibrarySettings
	) {
		super(leaf);

		this.library = library;
		this.viewRegistry = viewRegistry;
		this.settings = settings;

		this.cardView = new CardView(this.app);
	}

	getViewType(): string {
		return "media-library-view";
	}

	getDisplayText(): string {
		return "Media Library";
	}

	getIcon(): string {
		return "library";
	}

	async onOpen(): Promise<void> {
		await this.library.refresh();
		this.currentSort = this.settings.defaultSortMode as SortType;
		this.featuredPath = null;
		this.render();
	}

	async onClose(): Promise<void> {
		this.contentEl.empty();
	}

	render(): void {
		this.contentEl.empty();
		this.contentEl.addClass("media-library");

		this.createToolbar();
		this.createHeader();
		this.createSpotlight();
		this.createDetailPanel();
		this.createContent();
		this.createStatusBar();

		this.renderCurrentView();
		this.renderSpotlight();
	}
		this.toolbarHost = this.contentEl.createDiv();
		renderLibraryToolbar(this.toolbarHost, this.getToolbarState(), {
			onSearchChange: (value) => {
				this.searchQuery = value;
				this.refresh();
			},
			onFilterChange: (value) => {
				this.currentFilter = value;
				this.refresh();
			},
			onSortChange: (value) => {
				this.currentSort = value;
				this.refresh();
			},
			onReset: () => {
				this.currentFilter = "all";
				this.currentSort = this.settings.defaultSortMode;
				this.searchQuery = "";
				this.refresh();
			},
			onShuffle: () => {
				this.renderShuffledView();
			},
		});
	private createToolbar(): void {
		renderLibraryHeader(this.contentEl, this.library);
		const title = this.toolbarEl.createEl("h2");
		this.spotlightHost = this.contentEl.createDiv({ cls: "media-library-spotlight-shell" });
		this.detailHost = this.contentEl.createDiv({ cls: "media-library-detail" });
		this.contentHost = this.contentEl.createDiv({ cls: "media-library-content" });
		this.statusHost = this.contentEl.createDiv({ cls: "media-library-status" });
		title.setText("Media Library");

		const controls = this.toolbarEl.createDiv({ cls: "media-library-controls" });

		const search = controls.createEl("input", { type: "search" });
		search.placeholder = "Search by title or creator";
		search.value = this.searchQuery;
		search.addEventListener("input", (event) => {
			this.searchQuery = (event.target as HTMLInputElement).value;
			this.refresh();
		});

		const filterSelect = controls.createEl("select");
		filterSelect.createEl("option", { text: "All", value: "all" });
		for (const type of MEDIA_TYPES) {
			filterSelect.createEl("option", { text: type, value: type });
		}
		filterSelect.value = this.currentFilter;
		filterSelect.addEventListener("change", (event) => {
			this.currentFilter = (event.target as HTMLSelectElement).value as MediaType | "all";
			this.refresh();
		});

		const sortSelect = controls.createEl("select");
		for (const sort of SORT_TYPES) {
			sortSelect.createEl("option", { text: sort.replace(/-/g, " "), value: sort });
		}
		sortSelect.value = this.currentSort;
		sortSelect.addEventListener("change", (event) => {
			this.currentSort = (event.target as HTMLSelectElement).value as SortType;
			this.refresh();
		});

		const resetButton = controls.createEl("button", { text: "Reset" });
		resetButton.addEventListener("click", () => {
			this.currentFilter = "all";
			this.currentSort = this.settings.defaultSortMode as SortType;
			this.searchQuery = "";
			this.refresh();
			search.value = "";
			filterSelect.value = "all";
			sortSelect.value = this.settings.defaultSortMode;
		});

		const shuffleButton = controls.createEl("button", { text: "Shuffle" });
		shuffleButton.addEventListener("click", () => {
			this.renderShuffledView();
		});
	}

	private createHeader(): void {
		const avgRating = this.getAverageRating();
		const counts = this.getCounts();

		const header = this.contentEl.createDiv({ cls: "media-library-header" });
		header.createDiv({ cls: "media-library-header-eyebrow", text: "Welcome to" });
		const title = header.createDiv({ cls: "media-library-header-title" });
		title.setText("Media Library");
		header.createDiv({ cls: "media-library-header-subtitle", text: "A vault of books, films, series & essays." });

		const stats = header.createDiv({ cls: "media-library-header-stats" });
		stats.createDiv({ text: `Average ${avgRating ?? "—"}/10`, cls: "media-library-header-pill" });
		stats.createDiv({ text: `Books ${counts.books}`, cls: "media-library-header-pill" });
		stats.createDiv({ text: `Films ${counts.movies}`, cls: "media-library-header-pill" });
		stats.createDiv({ text: `Series ${counts.series}`, cls: "media-library-header-pill" });
		stats.createDiv({ text: `Essays ${counts.essays}`, cls: "media-library-header-pill" });
	}

	private createSpotlight(): void {
		this.spotlightEl = this.contentEl.createDiv({ cls: "media-library-spotlight-shell" });
	}

	private createContent(): void {
		this.viewContentEl = this.contentEl.createDiv({ cls: "media-library-content" });
	}

	private createDetailPanel(): void {
		this.detailEl = this.contentEl.createDiv({ cls: "media-library-detail" });
		this.renderDetailPanel();
	}

	private createStatusBar(): void {
		this.statusEl = this.contentEl.createDiv({ cls: "media-library-status" });

		if (this.settings.showCounts) {
			this.updateStatusBar();
		}
	}

	private updateStatusBar(): void {
		this.statusEl.empty();

		const visibleItems = this.getVisibleItems();

		this.statusEl.setText(
			`${visibleItems.length} of ${this.library.getCount()} media items • ${this.library.getBookCount()} books • ${this.library.getMovieCount()} movies • ${this.library.getSeriesCount()} series • ${this.library.getEssayCount()} essays`
		);
	}

	private renderCurrentView(): void {
		this.viewContentEl.empty();

		const items = this.getVisibleItems();

		this.cardView.render(
			this.viewContentEl,
			items,
			this.selectedItem,
			(item) => {
				this.selectedItem = item;
				if (item) {
					this.featuredPath = item.path;
				}
				this.renderCurrentView();
				this.renderSpotlight();
			}
		);
	}

	private renderShuffledView(): void {
		const items = [...this.getVisibleItems()].sort(() => Math.random() - 0.5);
		this.viewContentEl.empty();

		this.cardView.render(
			this.viewContentEl,
			items,
			this.selectedItem,
			(item) => {
				this.selectedItem = item;
				if (item) {
					this.featuredPath = item.path;
				}
				this.renderCurrentView();
				this.renderSpotlight();
			}
		);
	}

	private renderSpotlight(): void {
		this.spotlightEl.empty();

		const featured = this.getFeaturedItem();
		if (!featured) {
			const empty = this.spotlightEl.createDiv({ cls: "media-library-spotlight-empty" });
			empty.createEl("h3", { text: "Select a title" });
			empty.createEl("p", { text: "Pick a book, movie, series, or essay to see the spotlight view." });
			return;
		}

		const spotlight = this.spotlightEl.createDiv({ cls: "media-library-spotlight" });
		const infoCol = spotlight.createDiv({ cls: "media-library-spotlight-info" });
		const posterCol = spotlight.createDiv({ cls: "media-library-spotlight-poster" });

		infoCol.createDiv({ cls: "media-library-spotlight-label", text: "Featured Spotlight" });
		infoCol.createEl("h3", { text: featured.title });
		infoCol.createDiv({ text: featured.creator, cls: "media-library-detail-subtitle" });
		infoCol.createDiv({ text: `${featured.mediaType} • ${featured.year ?? "Unknown year"}`, cls: "media-library-detail-meta" });

		const actionRow = infoCol.createDiv({ cls: "media-library-spotlight-actions" });
		actionRow.createEl("button", {
			text: this.settings.showReviewSection ? "Open review" : "View details",
		}).addEventListener("click", () => {
			this.selectedItem = featured;
			this.reviewDraft = featured.review ?? "";
			this.renderDetailPanel();
		});

		const posterWrap = posterCol.createDiv({ cls: "media-library-spotlight-cover" });
		new Poster(featured, this.app).render(posterWrap);
	}

	private getFeaturedItem(): MediaItem | null {
		const items = this.getVisibleItems();
		if (!items.length) return null;

		if (this.featuredPath) {
			const selected = items.find((item) => item.path === this.featuredPath);
			if (selected) return selected;
		}

		return items[0] ?? null;
	}

	private renderDetailPanel(): void {
		this.detailEl.empty();

		if (!this.selectedItem) {
			const empty = this.detailEl.createDiv({ cls: "media-library-spotlight-empty" });
			empty.createEl("h3", { text: "Select a title" });
			empty.createEl("p", { text: "Pick a book, movie, series, or essay to see a featured view with cover art and quick actions." });
			return;
		}

		const spotlight = this.detailEl.createDiv({ cls: "media-library-spotlight" });
		const posterCol = spotlight.createDiv({ cls: "media-library-spotlight-poster" });
		const infoCol = spotlight.createDiv({ cls: "media-library-spotlight-info" });

		const posterWrap = posterCol.createDiv({ cls: "media-library-spotlight-cover" });
		new Poster(this.selectedItem, this.app).render(posterWrap);

		const header = infoCol.createDiv({ cls: "media-library-detail-header" });
		header.createEl("h3", { text: this.selectedItem.title });
		header.createDiv({ text: this.selectedItem.creator, cls: "media-library-detail-subtitle" });
		header.createDiv({ text: `${this.selectedItem.mediaType} • ${this.selectedItem.year ?? "Unknown year"}`, cls: "media-library-detail-meta" });

		this.renderActionRow(infoCol);

		if (this.settings.showReviewSection) {
			this.renderReviewSection(infoCol);
		}

		const meta = infoCol.createDiv({ cls: "media-library-detail-body" });
		if (this.selectedItem.summary) {
			meta.createEl("p", { text: this.selectedItem.summary });
		}
		if (this.selectedItem.genres?.length) {
			meta.createDiv({ text: `Genres: ${this.selectedItem.genres.join(", ")}`, cls: "media-library-detail-meta" });
		}
		if (this.selectedItem.releaseDate) {
			meta.createDiv({ text: `Release date: ${this.selectedItem.releaseDate}`, cls: "media-library-detail-meta" });
		}
		if (this.selectedItem.date) {
			meta.createDiv({ text: `Completed: ${this.selectedItem.date}`, cls: "media-library-detail-meta" });
		}
		if (this.selectedItem.pages) {
			meta.createDiv({ text: `Pages: ${this.selectedItem.pages}`, cls: "media-library-detail-meta" });
		}
		if (this.selectedItem.isbn) {
			meta.createDiv({ text: `ISBN: ${this.selectedItem.isbn}`, cls: "media-library-detail-meta" });
		}
		if (this.selectedItem.duration) {
			meta.createDiv({ text: `Duration: ${this.selectedItem.duration}`, cls: "media-library-detail-meta" });
		}

		this.renderStatusHistory(infoCol);
	}

	private renderReviewSection(container: HTMLElement): void {
		if (!this.selectedItem) return;

		const section = container.createDiv({ cls: "media-library-review" });
		section.createEl("h4", { text: "My Review" });

		const textarea = section.createEl("textarea", { cls: "media-library-review-textarea" });
		textarea.value = this.selectedItem.review ?? "";
		this.reviewDraft = textarea.value;
		textarea.addEventListener("input", () => {
			this.reviewDraft = textarea.value;
		});

		const actions = section.createDiv({ cls: "media-library-review-actions" });
		const saveButton = actions.createEl("button", { text: "Save review" });
		saveButton.addEventListener("click", async () => {
			await this.updateFrontmatter({ review: this.reviewDraft });
		});

		if (this.selectedItem.review) {
			section.createDiv({ text: this.selectedItem.review, cls: "media-library-review-preview" });
		}
	}

	private renderActionRow(container: HTMLElement): void {
		if (!this.selectedItem) return;

		const row = container.createDiv({ cls: "media-library-detail-actions" });

		const statusSelect = row.createEl("select");
		const statusOptions = this.getStatusOptionsForItem(this.selectedItem);
		for (const status of statusOptions) {
			statusSelect.createEl("option", { text: status, value: status });
		}
		statusSelect.value = this.selectedItem.status ?? statusOptions[0] ?? "";

		const statusButton = row.createEl("button", { text: "Save status" });
		statusButton.addEventListener("click", async () => {
			await this.updateFrontmatter({ status: statusSelect.value || null });
		});

		const ratingSelect = row.createEl("select");
		for (const value of ["", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]) {
			ratingSelect.createEl("option", { text: value === "" ? "No rating" : value, value });
		}
		ratingSelect.value = this.selectedItem.rating != null ? String(this.selectedItem.rating) : "";

		const ratingButton = row.createEl("button", { text: "Save rating" });
		ratingButton.addEventListener("click", async () => {
			await this.updateFrontmatter({ rating: ratingSelect.value === "" ? null : Number(ratingSelect.value) });
		});

		const actionButton = row.createEl("button", { text: this.getActionLabel(this.selectedItem) });
		actionButton.addEventListener("click", async () => {
			await this.markCompletedAgain();
		});
	}

	private renderStatusHistory(container: HTMLElement): void {
		if (!this.selectedItem) return;

		const history = this.getHistoryEntries(this.selectedItem);
		if (history.length === 0) return;

		const historyEl = container.createDiv({ cls: "media-library-detail-history-panel" });
		historyEl.createEl("strong", { text: "Activity" });
		for (const entry of history.slice(-5).reverse()) {
			historyEl.createDiv({ text: `${entry.label}: ${entry.date}`, cls: "media-library-detail-history" });
		}
	}

	private getStatusOptionsForItem(item: MediaItem): string[] {
		const defaults = item.mediaType === "book" || item.mediaType === "essay"
			? ["read", "reading", "want to read", "finished", "dropped", "paused", "favorite"]
			: ["watched", "watching", "want to watch", "completed", "dropped", "paused", "favorite"];
		return defaults.filter((value): value is string => isMediaStatus(value));
	}

	private getActionLabel(item: MediaItem): string {
		return item.mediaType === "book" || item.mediaType === "essay"
			? "Mark as read again"
			: "Mark as watched again";
	}

	private getHistoryEntries(item: MediaItem): Array<{ label: string; date: string }> {
		const raw = item.raw ?? {};
		const dates = item.mediaType === "book" || item.mediaType === "essay"
			? (raw.readHistory as string[] | undefined) ?? []
			: (raw.watchHistory as string[] | undefined) ?? [];

		return dates
			.filter((date): date is string => typeof date === "string" && date.length > 0)
			.map((date) => ({
				label: item.mediaType === "book" || item.mediaType === "essay" ? "Read again" : "Watched again",
				date,
			}));
	}

	private async updateFrontmatter(updates: { status?: string | null; rating?: number | null; review?: string }): Promise<void> {
		if (!this.selectedItem) return;

		const file = this.app.vault.getAbstractFileByPath(this.selectedItem.path);
		if (!file || !(file instanceof TFile)) return;

		await this.app.fileManager.processFrontMatter(file, (fm) => {
			if (updates.status !== undefined) {
				fm.status = updates.status ?? undefined;
			}
			if (updates.rating !== undefined) {
				fm.personalRating = updates.rating ?? undefined;
			}
			if (updates.review !== undefined) {
				fm.review = updates.review.trim().length > 0 ? updates.review : undefined;
			}
		});

		await this.library.refresh();
		this.render();
	}

	private async markCompletedAgain(): Promise<void> {
		if (!this.selectedItem) return;

		const file = this.app.vault.getAbstractFileByPath(this.selectedItem.path);
		if (!file || !(file instanceof TFile)) return;

		const today = new Date().toISOString().slice(0, 10);
		const isReadingType = this.selectedItem.mediaType === "book" || this.selectedItem.mediaType === "essay";
		const statusField = isReadingType ? "dateRead" : "dateWatched";
		const historyField = isReadingType ? "readHistory" : "watchHistory";
		const fallbackStatus = isReadingType ? "read" : "watched";

		await this.app.fileManager.processFrontMatter(file, (fm) => {
			fm.status = fm.status ?? fallbackStatus;
			fm[statusField] = today;
			const history = Array.isArray(fm[historyField]) ? [...(fm[historyField] as unknown[])] : [];
			history.push(today);
			fm[historyField] = history;
		});

		await this.library.refresh();
		this.render();
	}

	private getVisibleItems(): MediaItem[] {
		let items = this.library.getAll();

		if (this.currentFilter !== "all") {
			items = items.filter((item) => item.mediaType === this.currentFilter);
		}

		if (this.searchQuery.trim()) {
			const q = this.searchQuery.trim().toLowerCase();
			items = items.filter((item) =>
				item.title.toLowerCase().includes(q) ||
				item.creator.toLowerCase().includes(q)
			);
		}

		return this.library.sort(items, this.currentSort);
	}

	private getAverageRating(): number | null {
		const ratings = this.library
			.getAll()
			.map((item) => item.rating)
			.filter((rating): rating is number => typeof rating === "number" && Number.isFinite(rating) && rating > 0);

		if (!ratings.length) return null;
		return Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 10) / 10;
	}

	private getCounts(): { books: number; movies: number; series: number; essays: number } {
		return {
			books: this.library.getBookCount(),
			movies: this.library.getMovieCount(),
			series: this.library.getSeriesCount(),
			essays: this.library.getEssayCount(),
		};
	}
}