import { MEDIA_TYPES, MediaType } from "../../models/MediaType";
import { SortType, SORT_TYPES } from "../../models/SortType";
import { MediaLibrarySettings } from "../../settings";

export interface LibraryToolbarState {
	searchQuery: string;
	currentFilter: MediaType | "all";
	currentSort: SortType;
	settings: MediaLibrarySettings;
}

export interface LibraryToolbarCallbacks {
	onSearchChange(value: string): void;
	onFilterChange(value: MediaType | "all"): void;
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

	const sortSelect = controls.createEl("select");
	for (const sort of SORT_TYPES) {
		sortSelect.createEl("option", { text: sort.replace(/-/g, " "), value: sort });
	}
	sortSelect.value = state.currentSort;
	sortSelect.addEventListener("change", (event) => {
		callbacks.onSortChange((event.target as HTMLSelectElement).value as SortType);
	});

	const resetButton = controls.createEl("button", { text: "Reset" });
	resetButton.addEventListener("click", () => {
		callbacks.onReset();
		search.value = "";
		filterSelect.value = "all";
		sortSelect.value = state.settings.defaultSortMode;
	});

	const shuffleButton = controls.createEl("button", { text: "Shuffle" });
	shuffleButton.addEventListener("click", () => {
		callbacks.onShuffle();
	});
}