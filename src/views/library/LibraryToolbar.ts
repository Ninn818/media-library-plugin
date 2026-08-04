//module to render the library toolbar with search, filter, and sort controls

import { MEDIA_TYPES, MediaType } from "../../models/MediaType";
import { SortMode, SortType } from "../../models/SortType";
import { MediaLibrarySettings } from "../../settings";
import { MEDIA_STATUSES, MediaStatus } from "../../models/MediaStatus";

export interface LibraryToolbarState {
	searchQuery: string;
	currentFilter: MediaType | "all";
	currentStatus: MediaStatus | "all" | "completed" | "uncompleted"; 
	currentSortMode: SortMode;
	currentSort: SortType;
	settings: MediaLibrarySettings;
	currentSortDirection: "asc" | "desc";
}

export interface LibraryToolbarCallbacks {
	onSearchChange(value: string): void;
	onFilterChange(value: MediaType | "all"): void;
	onStatusChange(value: MediaStatus | "all" | "completed" | "uncompleted"): void;
	onSortModeChange(value: SortMode): void;
	onSortDirectionChange(value: "asc" | "desc"): void;
	onSortChange(value: SortType): void;
	onReset(): void;
}

export function renderLibraryToolbar(
  container: HTMLElement,
  state: LibraryToolbarState,
  callbacks: LibraryToolbarCallbacks
): void {
  const shell = container.createDiv({ cls: "ml-toolbar-shell" });
  const topRow = shell.createDiv({ cls: "ml-toolbar-row ml-toolbar-row--top" });
  const bottomRow = shell.createDiv({ cls: "ml-toolbar-row ml-toolbar-row--bottom" });

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
  filterSelect.createEl("option", { text: "All media", value: "all" });
  for (const type of MEDIA_TYPES) {
    filterSelect.createEl("option", { text: type, value: type });
  }
  filterSelect.value = state.currentFilter;
  filterSelect.addEventListener("change", (event) => {
    callbacks.onFilterChange((event.target as HTMLSelectElement).value as MediaType | "all");
  });

  const sortWrap = controlsRight.createDiv({ cls: "ml-toolbar-field" });
  const sortSelect = sortWrap.createEl("select", { cls: "ml-toolbar-select" });
  const SORT_MODES: SortMode[] = ["latest", "title", "creator", "year", "rating", "random"];
  for (const mode of SORT_MODES) {
    sortSelect.createEl("option", { text: mode, value: mode });
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
    sortSelect.value = state.currentSortMode;
  });

  // Bottom row: status pills (but less rounded)
  const statusLabel = bottomRow.createDiv({ cls: "ml-toolbar-status-label" });
  statusLabel.textContent = "Status";

  const statusGroup = bottomRow.createDiv({ cls: "ml-toolbar-status-group" });

  const makeStatusChip = (label: string, value: MediaStatus | "all" | "completed" | "uncompleted") => {
    const chip = statusGroup.createEl("button", {
      text: label,
      cls: "ml-toolbar-chip",
    });
    chip.type = "button";
    chip.toggleClass("is-active", state.currentStatus === value);
    chip.addEventListener("click", () => {
      callbacks.onStatusChange(value as MediaStatus | "all" | "completed" | "uncompleted");
    });
  };

  makeStatusChip("All", "all");
  makeStatusChip("Completed", "completed");
  makeStatusChip("Uncompleted", "uncompleted");
}

//go and update modules that use this toolbar to include the new sort direction dropdown and shuffle button such as LibraryView, LibraryToolbar, and any other views that use the toolbar
//i have updated the LibraryView to include the new sort direction dropdown and shuffle button in the toolbar, and updated the state interface to include the current sort direction.