// Renders search, sorting, filters, and media stats.

import { setIcon } from "obsidian";

import { MEDIA_TYPES, MediaStatus, MediaType, SortMode, SortType } from "../../models";
import { MediaLibrary } from "../../core";
import { MediaLibrarySettings } from "../../settings";

export interface LibraryToolbarState {
	searchQuery: string;
	currentFilter: MediaType | "all";
  currentGenre: string | "all";
  availableGenres: string[];
  currentDecade: string | "all";
  availableDecades: string[];
  currentRating: "all" | "rated" | "unrated" | "high";
	currentStatus: MediaStatus | "all" | "completed" | "uncompleted" | "currently"; 
	currentSortMode: SortMode;
	currentSort: SortType;
	settings: MediaLibrarySettings;
	currentSortDirection: "asc" | "desc";
	mediaCardSize: number;
}

export interface LibraryToolbarCallbacks {
	onSearchChange(value: string): void;
	onFilterChange(value: MediaType | "all"): void;
	onGenreChange(value: string | "all"): void;
  onDecadeChange(value: string | "all"): void;
  onRatingChange(value: "all" | "rated" | "unrated" | "high"): void;
	onStatusChange(value: MediaStatus | "all" | "completed" | "uncompleted" | "currently"): void;
	onSortModeChange(value: SortMode): void;
	onSortDirectionChange(value: "asc" | "desc"): void;
	onSortChange(value: SortType): void;
	onReset(): void;
  onViewSwitcher?(container: HTMLElement): void;
	onMediaCardSizeChange(value: number): void;
	onMediaCardSizeCommit(): void;
}

let filtersOpen = false;

const SORT_LABELS: Record<SortMode, string> = {
	latest: "Newest added",
	read: "Last read/watched",
	title: "Title",
	creator: "Creator",
	year: "Year",
	rating: "Rating",
	random: "Random",
};

function defaultDirection(mode: SortMode): "asc" | "desc" {
	return mode === "title" || mode === "creator" ? "asc" : "desc";
}

export function renderLibraryToolbar(
	container: HTMLElement,
	state: LibraryToolbarState,
	callbacks: LibraryToolbarCallbacks
): void {
	const shell = container.createDiv({ cls: "ml-toolbar-shell" });
	const bar = shell.createDiv({ cls: "ml-toolbar-bar" });
	const searchWrap = bar.createDiv({ cls: "ml-toolbar-search" });
	const search = searchWrap.createEl("input", { type: "search", cls: "ml-toolbar-search-input" });
	search.placeholder = "Search title, creator, genre…";
	search.value = state.searchQuery;
	search.addEventListener("input", (event) =>
		callbacks.onSearchChange((event.target as HTMLInputElement).value)
	);

	const sortGroup = bar.createDiv({ cls: "ml-toolbar-sort-group" });
	const sortSelect = sortGroup.createEl("select", { cls: "ml-toolbar-select" });
	for (const mode of Object.keys(SORT_LABELS) as SortMode[]) {
		sortSelect.createEl("option", { text: SORT_LABELS[mode], value: mode });
	}
	sortSelect.value = state.currentSortMode;

	let sortMode = state.currentSortMode;
	let direction = state.currentSortDirection;
	const directionButton = sortGroup.createEl("button", { cls: "ml-toolbar-icon-button" });
	directionButton.type = "button";

	const syncDirectionButton = () => {
		directionButton.empty();
		setIcon(directionButton, direction === "asc" ? "arrow-up" : "arrow-down");
		const label = direction === "asc" ? "Ascending" : "Descending";
		directionButton.setAttr("aria-label", label);
		directionButton.setAttr("title", label);
		directionButton.toggleClass("is-hidden", sortMode === "random");
	};
	syncDirectionButton();

	sortSelect.addEventListener("change", () => {
		const next = sortSelect.value as SortMode;
		if (sortMode === "random") {
			direction = "desc";
		}
		sortMode = next;
		syncDirectionButton();
		callbacks.onSortModeChange(next);
	});
	directionButton.addEventListener("click", () => {
		direction = direction === "asc" ? "desc" : "asc";
		syncDirectionButton();
		callbacks.onSortDirectionChange(direction);
	});

	const filtersButton = bar.createEl("button", { cls: "ml-toolbar-button ml-toolbar-filters-button" });
	filtersButton.type = "button";
	setIcon(filtersButton.createSpan({ cls: "ml-toolbar-button-icon" }), "sliders-horizontal");
	filtersButton.createSpan({ text: "Filters" });
	const badge = filtersButton.createSpan({ cls: "ml-toolbar-badge is-hidden" });

	if (callbacks.onViewSwitcher) {
		callbacks.onViewSwitcher(bar.createDiv({ cls: "ml-toolbar-view-switcher-host" }));
	}

	const panel = shell.createDiv({ cls: "ml-toolbar-panel" });
	panel.toggleClass("is-open", filtersOpen);
	filtersButton.toggleClass("is-active", filtersOpen);
	filtersButton.addEventListener("click", () => {
		filtersOpen = !filtersOpen;
		panel.toggleClass("is-open", filtersOpen);
		filtersButton.toggleClass("is-active", filtersOpen);
	});

	const grid = panel.createDiv({ cls: "ml-toolbar-panel-grid" });
	const selects: HTMLSelectElement[] = [];
	const updateBadge = () => {
		const count = selects.filter((select) => select.value !== "all").length;
		badge.setText(String(count));
		badge.toggleClass("is-hidden", count === 0);
	};
	const addFilter = (
		label: string,
		options: Array<[string, string]>,
		value: string,
		onChange: (value: string) => void
	): HTMLSelectElement => {
		const field = grid.createDiv({ cls: "ml-toolbar-field" });
		field.createEl("label", { text: label, cls: "ml-toolbar-field-label" });
		const select = field.createEl("select", { cls: "ml-toolbar-select" });
		for (const [text, optionValue] of options) {
			select.createEl("option", { text, value: optionValue });
		}
		select.value = value;
		select.addEventListener("change", () => {
			onChange(select.value);
			updateBadge();
		});
		selects.push(select);
		return select;
	};

	addFilter(
		"Media",
		[["All media", "all"], ...MEDIA_TYPES.map((type): [string, string] => [
			type.charAt(0).toUpperCase() + type.slice(1),
			type,
		])],
		state.currentFilter,
		(value) => callbacks.onFilterChange(value as MediaType | "all")
	);
	addFilter(
		"Genre",
		[["All genres", "all"], ...state.availableGenres.map((genre): [string, string] => [genre, genre])],
		state.currentGenre,
		callbacks.onGenreChange
	);
	addFilter(
		"Status",
		[["Any status", "all"], ["Completed", "completed"], ["Uncompleted", "uncompleted"], ["Currently", "currently"]],
		state.currentStatus,
		(value) => callbacks.onStatusChange(value as LibraryToolbarState["currentStatus"])
	);
	addFilter(
		"Decade",
		[["Any decade", "all"], ...state.availableDecades.map((decade): [string, string] => [decade, decade])],
		state.currentDecade,
		callbacks.onDecadeChange
	);
	addFilter(
		"Rating",
		[["Any rating", "all"], ["Rated", "rated"], ["Unrated", "unrated"], ["8+ rating", "high"]],
		state.currentRating,
		(value) => callbacks.onRatingChange(value as LibraryToolbarState["currentRating"])
	);
	updateBadge();

	const footer = panel.createDiv({ cls: "ml-toolbar-panel-footer" });
	const sizeWrap = footer.createDiv({ cls: "ml-toolbar-card-size" });
	const sizeLabel = sizeWrap.createEl("label", { cls: "ml-toolbar-card-size-label" });
	sizeLabel.createSpan({ text: "Card size" });
	const sizeInput = sizeLabel.createEl("input", {
		type: "range",
		attr: {
			min: "120",
			max: "320",
			step: "10",
			value: String(state.mediaCardSize),
			"aria-label": "Card size",
		},
	});
	const sizeValue = sizeLabel.createSpan({
		text: `${state.mediaCardSize}px`,
		cls: "ml-toolbar-card-size-value",
	});
	sizeInput.addEventListener("input", () => {
		const value = Number(sizeInput.value);
		sizeValue.setText(`${value}px`);
		callbacks.onMediaCardSizeChange(value);
	});
	sizeInput.addEventListener("change", () => callbacks.onMediaCardSizeCommit());

	const clearButton = footer.createEl("button", {
		text: "Clear all",
		cls: "ml-toolbar-button ml-toolbar-button--ghost",
	});
	clearButton.type = "button";
	clearButton.addEventListener("click", () => {
		callbacks.onReset();
		search.value = "";
		for (const select of selects) {
			select.value = "all";
		}
		sortMode = state.settings.defaultSortMode;
		direction = defaultDirection(sortMode);
		sortSelect.value = sortMode;
		syncDirectionButton();
		updateBadge();
	});
}

/** Renders media-type counts, library mix, and average rating for the Media page. */
export function renderLibraryStatBar(container: HTMLElement, library: MediaLibrary): void {
  const bar = container.createDiv({ cls: "ml-stats" });
  const row = bar.createDiv({ cls: "ml-stats-row" });

  const counts: Array<{ type: string; label: string; icon: string; value: number }> = [
    { type: "book", label: "Books", icon: "book-open", value: library.getBookCount() },
    { type: "movie", label: "Films", icon: "film", value: library.getMovieCount() },
    { type: "series", label: "Series", icon: "tv", value: library.getSeriesCount() },
    { type: "essay", label: "Essays", icon: "file-text", value: library.getEssayCount() },
  ];

  const tiles = row.createDiv({ cls: "ml-stats-tiles" });
  for (const entry of counts) {
    const tile = tiles.createDiv({ cls: `ml-stats-tile is-${entry.type}` });
    setIcon(tile.createSpan({ cls: "ml-stats-icon" }), entry.icon);
    const text = tile.createDiv({ cls: "ml-stats-text" });
    text.createDiv({ cls: "ml-stats-value", text: entry.value.toLocaleString() });
    text.createDiv({ cls: "ml-stats-label", text: entry.label });
  }

  const ratings = library.getAll()
    .map((item) => item.rating)
    .filter((rating): rating is number =>
      typeof rating === "number" && Number.isFinite(rating) && rating > 0
    );
  const average = ratings.length
    ? Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 10) / 10
    : null;

  const avg = row.createDiv({ cls: "ml-stats-average" });
  setIcon(avg.createSpan({ cls: "ml-stats-average-icon" }), "star");
  const avgText = avg.createDiv({ cls: "ml-stats-text" });
  const avgValue = avgText.createDiv({ cls: "ml-stats-value" });
  avgValue.createSpan({ text: average != null ? average.toFixed(1) : "—" });
  avgValue.createSpan({ cls: "ml-stats-value-suffix", text: "/10" });
  avgText.createDiv({ cls: "ml-stats-label", text: "Avg rating" });

  // Library mix: one thin segment per type, sized by share
  const total = counts.reduce((sum, entry) => sum + entry.value, 0);
  if (total > 0) {
    const mix = bar.createDiv({ cls: "ml-stats-mix" });
    for (const entry of counts) {
      if (entry.value === 0) continue;
      const segment = mix.createDiv({ cls: `ml-stats-mix-segment is-${entry.type}` });
      segment.style.flexGrow = String(entry.value);
      segment.setAttr("title", `${entry.label}: ${Math.round((entry.value / total) * 100)}%`);
    }
  }
}