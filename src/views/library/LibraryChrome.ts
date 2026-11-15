import { LibraryPageTab } from "../../settings";

export interface LibraryShellElements {
	bodyHost: HTMLElement;
	mainHost: HTMLElement;
	spotlightHost: HTMLElement;
	contentHost: HTMLElement;
	sidebarHost: HTMLElement;
}

/** Builds the main library layout and returns its render hosts. */
export function renderLibraryShell(container: HTMLElement): LibraryShellElements {
	const bodyHost = container.createDiv({ cls: "media-library-body" });
	const mainHost = bodyHost.createDiv({ cls: "media-library-main" });
	const sidebarHost = bodyHost.createDiv({ cls: "media-library-sidebar" });
	const spotlightHost = mainHost.createDiv({ cls: "media-library-spotlight-shell" });
	const contentHost = mainHost.createDiv({ cls: "media-library-content" });

	return { bodyHost, mainHost, spotlightHost, contentHost, sidebarHost };
}

export interface LibraryPageTabsCallbacks {
	onTabChange(tab: LibraryPageTab): void;
}

/** Renders the library's top-level page navigation. */
export function renderLibraryPageTabs(
	container: HTMLElement,
	activeTab: LibraryPageTab,
	callbacks: LibraryPageTabsCallbacks
): void {
	const tabs = container.createDiv({ cls: "media-library-page-tabs" });
	const labels: Array<[LibraryPageTab, string]> = [
		["home", "Home"],
		["dashboard", "Dashboard"],
		["media", "Media"],
		["diary", "Diary"],
		["activity", "Activity"],
		["lists", "Lists"],
		["tags", "Tags"],
		["year-in-media", "Year in Media"],
	];

	for (const [tab, label] of labels) {
		const button = tabs.createEl("button", {
			text: label,
			cls: "media-library-page-tab",
		});
		button.toggleClass("is-active", activeTab === tab);
		button.addEventListener("click", () => callbacks.onTabChange(tab));
	}
}

