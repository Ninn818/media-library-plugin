//module to render the library toolbar with search, filter, and sort controls

import { MEDIA_TYPES, MediaType } from "../../models/MediaType";
import { SortMode, SortType } from "../../models/SortType";
import { MediaLibrarySettings } from "../../settings";
import { MEDIA_STATUSES, MediaStatus } from "../../models/MediaStatus";

export interface LibraryToolbarState {
	searchQuery: string;
	currentFilter: MediaType | "all";
	currentStatus: MediaStatus | "all"; 
	currentSortMode: SortMode;
	currentSort: SortType;
	settings: MediaLibrarySettings;
	currentSortDirection: "asc" | "desc";
}

export interface LibraryToolbarCallbacks {
	onSearchChange(value: string): void;
	onFilterChange(value: MediaType | "all"): void;
	onStatusChange(value: MediaStatus | "all"): void;
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

	// NEW: status filter
	const statusSelect = controls.createEl("select");
	statusSelect.createEl("option", { text: "All statuses", value: "all" });
		for (const status of MEDIA_STATUSES) {
			statusSelect.createEl("option", { text: status, value: status });
		}
		statusSelect.value = state.currentStatus;
		statusSelect.addEventListener("change", (event) => {
			callbacks.onStatusChange(
			(event.target as HTMLSelectElement).value as MediaStatus | "all",
			);
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
		directionSelect.addClass("media-library-direction-select");
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

		// Open the native select dropdown on hover
		directionSelect.addEventListener("mouseenter", () => {
			const el = directionSelect as HTMLSelectElement & { showPicker?: () => void };
			el.showPicker?.();
		});
		}


	//reset button
	const resetButton = controls.createEl("button", { text: "Reset" });
	resetButton.addEventListener("click", () => {
		callbacks.onReset();
		search.value = "";
		filterSelect.value = "all";
		sortSelect.value = state.currentSortMode;
	});

}

//go and update modules that use this toolbar to include the new sort direction dropdown and shuffle button such as LibraryView, LibraryToolbar, and any other views that use the toolbar
//i have updated the LibraryView to include the new sort direction dropdown and shuffle button in the toolbar, and updated the state interface to include the current sort direction.