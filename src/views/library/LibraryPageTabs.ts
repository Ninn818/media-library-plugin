import { LibraryPageTab } from "../../settings";

export interface LibraryPageTabsCallbacks {
	onTabChange(tab: LibraryPageTab): void;
}

export function renderLibraryPageTabs(
	container: HTMLElement,
	activeTab: LibraryPageTab,
	callbacks: LibraryPageTabsCallbacks
): void {
	const tabs = container.createDiv({ cls: "media-library-page-tabs" });

	renderTabButton(tabs, "home", "Home", activeTab, callbacks);
	renderTabButton(tabs, "dashboard", "Dashboard", activeTab, callbacks);
	renderTabButton(tabs, "media", "Media", activeTab, callbacks);
	renderTabButton(tabs, "diary", "Diary", activeTab, callbacks);
	renderTabButton(tabs, "activity", "Activity", activeTab, callbacks);
	renderTabButton(tabs, "lists", "Lists", activeTab, callbacks);
	renderTabButton(tabs, "tags", "Tags", activeTab, callbacks);
}

function renderTabButton(
	container: HTMLElement,
	tab: LibraryPageTab,
	label: string,
	activeTab: LibraryPageTab,
	callbacks: LibraryPageTabsCallbacks
): void {
	const button = container.createEl("button", {
		text: label,
		cls: "media-library-page-tab",
	});

	if (activeTab === tab) {
		button.addClass("is-active");
	}

	button.addEventListener("click", () => {
		callbacks.onTabChange(tab);
	});
}