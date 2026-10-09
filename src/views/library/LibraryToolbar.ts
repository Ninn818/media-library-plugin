//module to render the library toolbar with search, filter, and sort controls

import { MEDIA_TYPES, MediaType } from "../../models/MediaType";
import { SortMode, SortType } from "../../models/SortType";
import { MediaLibrarySettings } from "../../settings";
import { MediaStatus } from "../../models/MediaStatus";

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

export function renderLibraryToolbar(
  container: HTMLElement,
  state: LibraryToolbarState,
  callbacks: LibraryToolbarCallbacks
): void {
  const shell = container.createDiv({ cls: "ml-toolbar-shell" });
  const topRow = shell.createDiv({ cls: "ml-toolbar-row ml-toolbar-row--top" });

  // Search (full-width left)
  const searchWrap = topRow.createDiv({ cls: "ml-toolbar-search" });
  const search = searchWrap.createEl("input", {
    type: "search",
    cls: "ml-toolbar-search-input",
  });
  search.placeholder = "Search title, creator, genre…";
  search.value = state.searchQuery;
  search.addEventListener("input", (event) => {
    callbacks.onSearchChange((event.target as HTMLInputElement).value);
  });

  // Right side: type, sort, direction, reset
  const controlsRight = topRow.createDiv({ cls: "ml-toolbar-controls-right" });

  const filterWrap = controlsRight.createDiv({ cls: "ml-toolbar-field" });
  const filterSelect = filterWrap.createEl("select", { cls: "ml-toolbar-select" });
  filterSelect.createEl("option", { text: "All Media", value: "all" });
  for (const type of MEDIA_TYPES) {
    const label = type.charAt(0).toUpperCase() + type.slice(1);
    filterSelect.createEl("option", { text: label, value: type });
  }
  filterSelect.value = state.currentFilter;
  filterSelect.addEventListener("change", (event) => {
    callbacks.onFilterChange((event.target as HTMLSelectElement).value as MediaType | "all");
  });

  const genreWrap = controlsRight.createDiv({ cls: "ml-toolbar-field" });
  const genreSelect = genreWrap.createEl("select", { cls: "ml-toolbar-select" });
  genreSelect.createEl("option", { text: "All genres", value: "all" });
  for (const genre of state.availableGenres) {
    genreSelect.createEl("option", { text: genre, value: genre });
  }
  genreSelect.value = state.currentGenre;
  genreSelect.addEventListener("change", (event) => {
    callbacks.onGenreChange((event.target as HTMLSelectElement).value as string | "all");
  });

  const statusWrap = controlsRight.createDiv({ cls: "ml-toolbar-field" });
  const statusSelect = statusWrap.createEl("select", { cls: "ml-toolbar-select" });
  for (const option of [
    ["Any status", "all"],
    ["Completed", "completed"],
    ["Uncompleted", "uncompleted"],
    ["Currently", "currently"],
  ] as const) {
    statusSelect.createEl("option", { text: option[0], value: option[1] });
  }
  statusSelect.value = state.currentStatus;
  statusSelect.addEventListener("change", (event) => {
    callbacks.onStatusChange((event.target as HTMLSelectElement).value as LibraryToolbarState["currentStatus"]);
  });

  const decadeWrap = controlsRight.createDiv({ cls: "ml-toolbar-field" });
  const decadeSelect = decadeWrap.createEl("select", { cls: "ml-toolbar-select" });
  decadeSelect.createEl("option", { text: "Any decade", value: "all" });
  for (const decade of state.availableDecades) {
    decadeSelect.createEl("option", { text: decade, value: decade });
  }
  decadeSelect.value = state.currentDecade;
  decadeSelect.addEventListener("change", (event) => {
    callbacks.onDecadeChange((event.target as HTMLSelectElement).value as string | "all");
  });

  const ratingWrap = controlsRight.createDiv({ cls: "ml-toolbar-field" });
  const ratingSelect = ratingWrap.createEl("select", { cls: "ml-toolbar-select" });
  for (const option of [["Any rating", "all"], ["Rated", "rated"], ["Unrated", "unrated"], ["8+ rating", "high"]] as const) {
    ratingSelect.createEl("option", { text: option[0], value: option[1] });
  }
  ratingSelect.value = state.currentRating;
  ratingSelect.addEventListener("change", (event) => {
    callbacks.onRatingChange((event.target as HTMLSelectElement).value as LibraryToolbarState["currentRating"]);
  });

  const sortWrap = controlsRight.createDiv({ cls: "ml-toolbar-field" });
  const sortSelect = sortWrap.createEl("select", { cls: "ml-toolbar-select" });
  const SORT_MODES: SortMode[] = ["latest", "read", "title", "creator", "year", "rating", "random"];
  for (const mode of SORT_MODES) {
    const label = mode.charAt(0).toUpperCase() + mode.slice(1);
    sortSelect.createEl("option", { text: label, value: mode });
  }
  sortSelect.value = state.currentSortMode;
  sortSelect.addEventListener("change", (event) => {
    callbacks.onSortModeChange((event.target as HTMLSelectElement).value as SortMode);
  });

  if (state.currentSortMode !== "random") {
    const dirWrap = controlsRight.createDiv({ cls: "ml-toolbar-field ml-toolbar-field--compact" });
    const directionSelect = dirWrap.createEl("select", {
      cls: "ml-toolbar-select ml-toolbar-select--Direction",
    });

    const ascOption = directionSelect.createEl("option", {
      text: "▲",
      value: "asc",
    });
    ascOption.selected = state.currentSortDirection === "asc";

    const descOption = directionSelect.createEl("option", {
      text: "▼",
      value: "desc",
    });
    descOption.selected = state.currentSortDirection === "desc";

    directionSelect.addEventListener("change", (event) => {
      callbacks.onSortDirectionChange(
        (event.target as HTMLSelectElement).value as "asc" | "desc",
      );
    });
  }

  const resetWrap = controlsRight.createDiv({ cls: "ml-toolbar-field" });
  const resetButton = resetWrap.createEl("button", {
    text: "Clear",
    cls: "ml-toolbar-button ml-toolbar-button--ghost",
  });
  resetButton.type = "button";
  resetButton.addEventListener("click", () => {
    callbacks.onReset();
    search.value = "";
    filterSelect.value = "all";
    genreSelect.value = "all";
    statusSelect.value = "all";
    decadeSelect.value = "all";
    ratingSelect.value = "all";
    sortSelect.value = state.currentSortMode;
  });

  if (callbacks.onViewSwitcher) {
    const switcherHost = controlsRight.createDiv({ cls: "ml-toolbar-view-switcher-host" });
    callbacks.onViewSwitcher(switcherHost);
  }

  const sizeWrap = controlsRight.createDiv({ cls: "ml-toolbar-card-size" });
  const sizeLabel = sizeWrap.createEl("label", { cls: "ml-toolbar-card-size-label" });
  sizeLabel.createSpan({ text: "Card size" });
  const sizeValue = sizeLabel.createSpan({ text: `${state.mediaCardSize}px` });
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
  sizeInput.addEventListener("input", () => {
    const value = Number(sizeInput.value);
    sizeValue.setText(`${value}px`);
    callbacks.onMediaCardSizeChange(value);
  });
  sizeInput.addEventListener("change", () => {
    callbacks.onMediaCardSizeCommit();
  });
}

//go and update modules that use this toolbar to include the new sort direction dropdown and shuffle button such as LibraryView, LibraryToolbar, and any other views that use the toolbar
//i have updated the LibraryView to include the new sort direction dropdown and shuffle button in the toolbar, and updated the state interface to include the current sort direction.