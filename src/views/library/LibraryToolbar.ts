//module to render the library toolbar with search, filter, and sort controls

import { MEDIA_TYPES, MediaType } from "../../models/MediaType";
import { SortMode, SortType } from "../../models/SortType";
import { MediaLibrarySettings } from "../../settings";

export interface LibraryToolbarState {
	searchQuery: string;
	currentFilter: MediaType | "all";
	currentSortMode: SortMode;
	currentSort: SortType;
	settings: MediaLibrarySettings;
	currentSortDirection: "asc" | "desc";
}

export interface LibraryToolbarCallbacks {
	onSearchChange(value: string): void;
	onFilterChange(value: MediaType | "all"): void;
	onSortModeChange(value: SortMode): void;
	onSortDirectionChange(value: "asc" | "desc"): void;
	onSortChange(value: SortType): void;
	onReset(): void;
	onShuffle(): void;
}

export function renderLibraryToolbar(
	container: HTMLElement,
	state: LibraryToolbarState,
	callbacks: LibraryToolbarCallbacks
): void {
	const toolbar = container.createDiv({ cls: "media-library-toolbar" });

	const controls = toolbar.createDiv({ cls: "media-library-controls" });

	const search = controls.createEl("input", { type: "search" });
	search.placeholder = "Search by title or creator";
	search.value = state.searchQuery;
	search.addEventListener("input", (event) => {
		callbacks.onSearchChange((event.target as HTMLInputElement).value);
	});

	const filterSelect = controls.createEl("select");
	filterSelect.createEl("option", { text: "All", value: "all" });
	for (const type of MEDIA_TYPES) {
		filterSelect.createEl("option", { text: type, value: type });
	}
	filterSelect.value = state.currentFilter;
	filterSelect.addEventListener("change", (event) => {
		callbacks.onFilterChange((event.target as HTMLSelectElement).value as MediaType | "all");
	});

	//sort modes
	const SORT_MODES: SortMode[] = ["latest", "title", "creator", "year", "rating", "random"];
	//mode dropdown 
	const sortSelect = controls.createEl("select");
		for (const mode of SORT_MODES) {
			sortSelect.createEl("option", { text: mode, value: mode });
		}
		sortSelect.value = state.currentSortMode;
		sortSelect.addEventListener("change", (event) => {
			callbacks.onSortModeChange((event.target as HTMLSelectElement).value as SortMode);
		});

		//if the current sort mode is not random, add a direction dropdown
		if (state.currentSortMode !== "random") {
		const directionSelect = controls.createEl("select");
		const sortDirection = state.currentSortDirection;

		const ascOption = directionSelect.createEl("option", {
			text: "Ascending",
			value: "asc",
		});
		ascOption.selected = sortDirection === "asc";

		const descOption = directionSelect.createEl("option", {
			text: "Descending",
			value: "desc",
		});
		descOption.selected = sortDirection === "desc";

		directionSelect.addEventListener("change", (event) => {
			callbacks.onSortDirectionChange(
			(event.target as HTMLSelectElement).value as "asc" | "desc",
			);
		});
		}

	//asc button
	const ascButton = controls.createEl("button", { text: "Asc" });
	ascButton.addEventListener("click", () => {
		callbacks.onSortDirectionChange("asc");
	});

	//desc button
	const descButton = controls.createEl("button", { text: "Desc" });
	descButton.addEventListener("click", () => {
		callbacks.onSortDirectionChange("desc");
	});

	//reset button
	const resetButton = controls.createEl("button", { text: "Reset" });
	resetButton.addEventListener("click", () => {
		callbacks.onReset();
		search.value = "";
		filterSelect.value = "all";
		sortSelect.value = state.currentSortMode;
	});

	const shuffleButton = controls.createEl("button", { text: "Shuffle" });
	shuffleButton.addEventListener("click", () => {
		callbacks.onShuffle();
	});
}

//go and update modules that use this toolbar to include the new sort direction dropdown and shuffle button such as LibraryView, LibraryToolbar, and any other views that use the toolbar
//i have updated the LibraryView to include the new sort direction dropdown and shuffle button in the toolbar, and updated the state interface to include the current sort direction.