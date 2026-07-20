// src/views/LibraryView.ts

import { ItemView, Modal, Notice, WorkspaceLeaf } from "obsidian";

import { MediaLibrary } from "../core/MediaLibrary";
import { ViewRegistry } from "../core/ViewRegistry";
import { MediaItem } from "../models/MediaItem";
import { MediaType } from "../models/MediaType";
import { SortType } from "../models/SortType";
import {
	DashboardConsumptionFilter,
	DashboardMediaFilter,
	DashboardScopeMode,
	LibraryPageTab,
	MediaLibrarySettings,
	SocialHubTab,
} from "../settings";
import * as ListService from "../services/ListService";
import { addTagToMediaNote } from "../services/TagService";
import { ActivityLogService } from "../services/ActivityLogService";
import { MediaActivityModal } from "../ui/MediaActivityModal";
import { CardView } from "./CardView";
import { GalleryView } from "./GalleryView";
import { ViewSwitcher } from "./ViewSwitcher";
import { renderLibraryHeader } from "./library/LibraryHeader";
import { renderMediaDashboard } from "./library/MediaDashboard";
import { renderMediaDashboardToolbar } from "./library/MediaDashboardToolbar";
import { renderLibraryPageTabs } from "./library/LibraryPageTabs";
import { renderLibraryShell } from "./library/LibraryShell";
import { renderLibrarySidebar } from "./library/LibrarySidebar";
import { renderLibraryToolbar } from "./library/LibraryToolbar";

export class LibraryView extends ItemView {
	private readonly library: MediaLibrary;
	private readonly viewRegistry: ViewRegistry;
	private readonly settings: MediaLibrarySettings;
	private readonly persistSettings: () => Promise<void>;
	private readonly cardView: CardView;
	private readonly galleryView: GalleryView;
	private readonly activityLogService: ActivityLogService;

	private toolbarHost!: HTMLElement;
	private headerHost!: HTMLElement;
	private bodyHost!: HTMLElement;
	private mainHost!: HTMLElement;
	private spotlightHost!: HTMLElement;
	private sidebarHost!: HTMLElement;
	private contentHost!: HTMLElement;
	private statusHost!: HTMLElement;

	private currentPageTab: LibraryPageTab = "library";
	private activeLibraryViewId: string;
	private currentFilter: MediaType | "all" = "all";
	private currentSort: SortType = "date-created-desc";
	private dashboardConsumption: DashboardConsumptionFilter = "consumed";
	private dashboardScope: DashboardScopeMode = "year";
	private dashboardFilter: DashboardMediaFilter = "all";
	private currentLibraryItems: MediaItem[] = [];
	private visibleItemCount = 12;
	private searchQuery = "";
	private selectedItem: MediaItem | null = null;
	private featuredPath: string | null = null;
	private activeSocialTab: SocialHubTab;
	private static readonly LIBRARY_PAGE_SIZE = 12;

	constructor(
		leaf: WorkspaceLeaf,
		library: MediaLibrary,
		viewRegistry: ViewRegistry,
		settings: MediaLibrarySettings,
		persistSettings: () => Promise<void>
	) {
		super(leaf);

		this.library = library;
		this.viewRegistry = viewRegistry;
		this.settings = settings;
		this.persistSettings = persistSettings;
		this.cardView = new CardView(this.app);
		this.galleryView = new GalleryView(this.app);
		this.activityLogService = new ActivityLogService(this.app);
		this.activeSocialTab = this.settings.defaultSocialTab;
		this.activeLibraryViewId = this.viewRegistry.getDefault().id;
	}

	getViewType(): string {
		return "media-library-view";
	}

	getDisplayText(): string {
		return "Media library";
	}

	getIcon(): string {
		return "library";
	}

	async onOpen(): Promise<void> {
		await this.library.refresh();
		this.currentPageTab = this.settings.defaultPageTab;
		this.activeSocialTab = this.settings.defaultSocialTab;
		this.currentSort = this.settings.defaultSortMode;
		this.dashboardConsumption = this.settings.dashboardDefaultConsumptionFilter;
		this.dashboardScope = this.settings.dashboardDefaultScope;
		this.dashboardFilter = this.settings.dashboardDefaultFilter;
		this.visibleItemCount = LibraryView.LIBRARY_PAGE_SIZE;
		this.featuredPath = null;
		this.render();
	}

	async onClose(): Promise<void> {
		this.contentEl.empty();
	}

	render(): void {
		this.contentEl.empty();
		this.contentEl.addClass("media-library");
		this.contentEl.toggleClass("is-motion-off", !this.settings.enableUiAnimations);

		this.toolbarHost = this.contentEl.createDiv();
		this.headerHost = this.contentEl.createDiv();
		this.renderToolbarArea();
		this.renderHeaderArea();

		const shell = renderLibraryShell(this.contentEl);
		this.bodyHost = shell.bodyHost;
		this.mainHost = shell.mainHost;
		this.spotlightHost = shell.spotlightHost;
		this.sidebarHost = shell.sidebarHost;
		this.contentHost = shell.contentHost;
		this.statusHost = shell.statusHost;

		this.renderActivePage();
	}

	refresh(): void {
		this.renderHeaderArea();
		this.renderActivePage();
	}

	private getToolbarState() {
		return {
			searchQuery: this.searchQuery,
			currentFilter: this.currentFilter,
			currentSort: this.currentSort,
			settings: this.settings,
		};
	}

	private renderToolbarArea(): void {
		this.toolbarHost.empty();

		renderLibraryPageTabs(this.toolbarHost, this.currentPageTab, {
			onTabChange: (tab) => {
				this.currentPageTab = tab;
				this.renderToolbarArea();
				this.renderHeaderArea();
				this.renderActivePage();
			},
		});

		const controlsHost = this.toolbarHost.createDiv();
		if (this.currentPageTab === "library") {
			renderLibraryToolbar(controlsHost, this.getToolbarState(), {
				onSearchChange: (value) => {
					this.searchQuery = value;
					this.resetVisibleItemCount();
					this.refresh();
				},
				onFilterChange: (value) => {
					this.currentFilter = value;
					this.resetVisibleItemCount();
					this.refresh();
				},
				onSortChange: (value) => {
					this.currentSort = value;
					this.resetVisibleItemCount();
					this.refresh();
				},
				onReset: () => {
					this.currentFilter = "all";
					this.currentSort = this.settings.defaultSortMode;
					this.searchQuery = "";
					this.selectedItem = null;
					this.featuredPath = null;
					this.resetVisibleItemCount();
					this.refresh();
				},
				onShuffle: () => {
					this.renderShuffledView();
				},
			});

			const switcherHost = this.toolbarHost.createDiv();
			new ViewSwitcher({
				container: switcherHost,
				viewRegistry: this.viewRegistry,
				initialView: this.activeLibraryViewId,
				onChange: (viewId) => {
					this.activeLibraryViewId = viewId;
					this.renderActivePage();
				},
			});
			return;
		}

		renderMediaDashboardToolbar(controlsHost, {
			consumption: this.dashboardConsumption,
			scope: this.dashboardScope,
			filter: this.dashboardFilter,
		}, {
			onConsumptionChange: (filter) => {
				this.dashboardConsumption = filter;
				this.renderToolbarArea();
				this.renderActivePage();
			},
			onScopeChange: (scope) => {
				this.dashboardScope = scope;
				this.renderToolbarArea();
				this.renderActivePage();
			},
			onFilterChange: (filter) => {
				this.dashboardFilter = filter;
				this.renderToolbarArea();
				this.renderActivePage();
			},
		});
	}

	private renderHeaderArea(): void {
		this.headerHost.empty();
		if (this.currentPageTab === "dashboard" || this.isGalleryViewActive()) {
			return;
		}
		renderLibraryHeader(this.headerHost, this.library, this.settings, this.currentPageTab);
	}

	private renderActivePage(): void {
		this.updateLayoutMode();

		if (this.currentPageTab === "dashboard") {
			this.spotlightHost.removeClass("is-hidden");
			this.sidebarHost.removeClass("is-hidden");
			this.renderDashboardPage();
			return;
		}

		if (this.activeLibraryViewId === "gallery") {
			this.sidebarHost.removeClass("is-hidden");
			this.renderGalleryLibraryView();
			return;
		}

		this.spotlightHost.empty();
		this.spotlightHost.addClass("is-hidden");
		this.sidebarHost.removeClass("is-hidden");
		this.renderCurrentView();
		this.renderSidebar();
		this.updateStatusBar();
	}

	private renderGalleryLibraryView(): void {
		this.currentLibraryItems = this.getVisibleItems();
		this.galleryView.render({
			carouselHost: this.spotlightHost,
			contentHost: this.contentHost,
			sidebarHost: this.sidebarHost,
			statusHost: this.statusHost,
		}, this.currentLibraryItems, {
			onSelectItem: (item) => {
				this.selectItem(item);
				this.renderActivePage();
			},
			onOpenItem: (item) => {
				this.selectItem(item);
				this.openActivityModal(item);
			},
			onToggleFavorite: (item) => {
				this.toggleFavorite(item);
			},
			onTagItem: (item) => {
				void this.promptAndAddTag(item);
			},
		}, {
			activePath: this.selectedItem?.path ?? this.featuredPath,
			social: {
				state: this.getSocialHubState(),
				callbacks: this.getSocialHubCallbacks(),
			},
			isFavorite: (path) => ListService.isFavorite(this.settings, path),
		});
		if (this.activeSocialTab === "lists" || this.activeSocialTab === "favorites") {
			this.sidebarHost.addClass("is-hidden");
		} else {
			this.sidebarHost.removeClass("is-hidden");
			this.renderSidebar("airy");
		}
		this.updateStatusBar();
	}

	private renderCurrentView(): void {
		this.contentHost.empty();

		this.currentLibraryItems = this.getVisibleItems();
		const renderedItems = this.currentLibraryItems.slice(0, this.visibleItemCount);
		this.cardView.render(this.contentHost, renderedItems, this.selectedItem, (item) => {
			this.selectItem(item);
			this.renderSidebar();
			this.updateStatusBar();
			this.openActivityModal(item);
		});
		this.renderShowMoreControl(this.currentLibraryItems.length, renderedItems.length);
	}

	private renderDashboardPage(): void {
		renderMediaDashboard({
			heroHost: this.spotlightHost,
			contentHost: this.contentHost,
			sidebarHost: this.sidebarHost,
			statusHost: this.statusHost,
		}, this.app, {
			items: this.library.getAll(),
			consumption: this.dashboardConsumption,
			scope: this.dashboardScope,
			filter: this.dashboardFilter,
			settings: this.settings,
		}, {
			onOpenItem: (item) => {
				this.selectedItem = item;
				this.featuredPath = item.path;
				void this.app.workspace.openLinkText(item.path, "", false);
			},
		});
	}

	private renderShuffledView(): void {
		this.currentLibraryItems = [...this.getVisibleItems()].sort(() => Math.random() - 0.5);
		this.contentHost.empty();
		const renderedItems = this.currentLibraryItems.slice(0, this.visibleItemCount);
		this.cardView.render(this.contentHost, renderedItems, this.selectedItem, (item) => {
			this.selectItem(item);
			this.renderSidebar();
			this.updateStatusBar();
			this.openActivityModal(item);
		});
		this.renderShowMoreControl(this.currentLibraryItems.length, renderedItems.length);
	}

	private selectItem(item: MediaItem | null): void {
		if (!item) {
			return;
		}

		this.selectedItem = item;
		this.featuredPath = item.path;
	}

	private openActivityModal(item: MediaItem | null): void {
		if (!item) {
			return;
		}

		new MediaActivityModal({
			item,
			activityLogService: this.activityLogService,
			tagStorageFormat: this.settings.tagStorageFormat,
			onSaved: async () => {
				await this.library.refresh();
				const refreshed = this.library.getByPath(item.path);
				if (refreshed) {
					this.selectItem(refreshed);
				}
				this.activeSocialTab = "activity";
				this.render();
			},
		}).open();
	}

	private renderSidebar(variant: "default" | "airy" = "default"): void {
		renderLibrarySidebar(this.sidebarHost, {
			visibleItems: this.getVisibleItems(),
			variant,
		});
	}

	private updateStatusBar(): void {
		this.statusHost.empty();
		const visibleItems = this.getVisibleItems();
		const shownCount = Math.min(this.visibleItemCount, this.currentLibraryItems.length || visibleItems.length);
		this.statusHost.setText(
			`${shownCount} shown of ${visibleItems.length} filtered • ${this.library.getCount()} media items • ${this.library.getBookCount()} books • ${this.library.getMovieCount()} movies • ${this.library.getSeriesCount()} series • ${this.library.getEssayCount()} essays`
		);
	}

	private updateLayoutMode(): void {
		const isGalleryLayout = this.isGalleryViewActive();
		this.contentEl.toggleClass("is-gallery-mode", isGalleryLayout);
		this.toolbarHost.toggleClass("is-gallery-mode", isGalleryLayout);
		this.bodyHost?.toggleClass("is-gallery-mode", isGalleryLayout);
		this.mainHost?.toggleClass("is-gallery-mode", isGalleryLayout);
		this.headerHost?.toggleClass("is-hidden", isGalleryLayout);
	}

	private isGalleryViewActive(): boolean {
		return this.currentPageTab === "library" && this.activeLibraryViewId === "gallery";
	}

	private getSocialHubState() {
		const allItems = this.library.getAll();
		return {
			app: this.app,
			activeTab: this.activeSocialTab,
			items: this.currentLibraryItems,
			lists: this.settings.customLists,
			favorites: ListService.getFavoritesList(this.settings) ?? null,
			allItemsByPath: new Map(allItems.map((item) => [item.path, item])),
			selectedItem: this.selectedItem,
		};
	}

	private getSocialHubCallbacks() {
		return {
			onTabChange: (tab: SocialHubTab) => {
				this.activeSocialTab = tab;
				this.renderActivePage();
			},
			onCreateList: (name: string) => {
				const created = ListService.createCustomList(this.settings, name);
				if (!created) {
					return;
				}
				void this.persistAndRender();
			},
			onDeleteList: (listId: string) => {
				if (!this.deleteListById(listId)) {
					return;
				}
				void this.persistAndRender();
			},
			onAddItemToList: (listId: string, itemPath: string) => {
				if (!itemPath || !this.addItemToListById(listId, itemPath)) {
					return;
				}
				void this.persistAndRender();
			},
			onRemoveItemFromList: (listId: string, itemPath: string) => {
				if (!this.removeItemFromListById(listId, itemPath)) {
					return;
				}
				void this.persistAndRender();
			},
			onOpenItem: (item: MediaItem) => {
				this.selectItem(item);
				this.openActivityModal(item);
			},
			onAddTag: (item: MediaItem, tag: string) => {
				void this.addTagFromSocial(item, tag);
			},
		};
	}

	private async promptAndAddTag(item: MediaItem): Promise<void> {
		const input = await this.askForTag();
		if (!input || !input.trim()) {
			return;
		}

		const result = await addTagToMediaNote(this.app, item.path, input, this.settings.tagStorageFormat);
		if (!result.added) {
			if (result.reason === "note-not-found") {
				new Notice("Could not find note for this media item.");
				return;
			}
			if (result.reason === "empty-tag") {
				new Notice("Tag was empty.");
				return;
			}
			new Notice("Tag already exists.");
			return;
		}

		new Notice(`Added tag ${result.value}`);
		await this.refreshLibraryAfterMutation(item.path);
	}

	private async addTagFromSocial(item: MediaItem, tag: string): Promise<void> {
		if (!tag.trim()) {
			return;
		}

		const result = await addTagToMediaNote(this.app, item.path, tag, this.settings.tagStorageFormat);
		if (!result.added) {
			if (result.reason === "note-not-found") {
				new Notice("Could not find note for this media item.");
				return;
			}
			if (result.reason === "empty-tag") {
				new Notice("Tag was empty.");
				return;
			}
			new Notice("Tag already exists.");
			return;
		}

		new Notice(`Added tag ${result.value}`);
		await this.refreshLibraryAfterMutation(item.path);
	}

	private toggleFavorite(item: MediaItem): void {
		if (ListService.isFavorite(this.settings, item.path)) {
			ListService.removeItemFromFavorites(this.settings, item.path);
		} else {
			ListService.addItemToFavorites(this.settings, item.path);
		}
		void this.persistAndRender();
	}

	private askForTag(): Promise<string | null> {
		return new Promise((resolve) => {
			const modal = new Modal(this.app);
			modal.setTitle("Add tag");

			const wrap = modal.contentEl.createDiv({ cls: "media-tag-modal" });
			const input = wrap.createEl("input", {
				type: "text",
				placeholder: "tag-name",
			});

			const actions = wrap.createDiv({ cls: "media-tag-modal-actions" });
			const cancel = actions.createEl("button", { text: "Cancel" });
			cancel.type = "button";
			cancel.addEventListener("click", () => {
				modal.close();
				resolve(null);
			});

			const add = actions.createEl("button", { text: "Add", cls: "mod-cta" });
			add.type = "button";
			add.addEventListener("click", () => {
				const value = input.value.trim();
				modal.close();
				resolve(value.length > 0 ? value : null);
			});

			modal.onClose = () => {
				resolve(null);
			};

			modal.open();
			input.focus();
		});
	}

	private async persistAndRender(): Promise<void> {
		await this.persistSettings();
		this.renderActivePage();
	}

	private async refreshLibraryAfterMutation(pathToReselect: string): Promise<void> {
		await this.library.refresh();
		const refreshed = this.library.getByPath(pathToReselect);
		if (refreshed) {
			this.selectItem(refreshed);
		}
		this.renderActivePage();
	}

	private deleteListById(listId: string): boolean {
		const before = this.settings.customLists.length;
		this.settings.customLists = this.settings.customLists.filter((list) => list.id !== listId);
		return this.settings.customLists.length < before;
	}

	private addItemToListById(listId: string, itemPath: string): boolean {
		const list = this.settings.customLists.find((entry) => entry.id === listId);
		if (!list || list.itemPaths.includes(itemPath)) {
			return false;
		}

		list.itemPaths = [...list.itemPaths, itemPath];
		list.updatedAt = new Date().toISOString();
		return true;
	}

	private removeItemFromListById(listId: string, itemPath: string): boolean {
		const list = this.settings.customLists.find((entry) => entry.id === listId);
		if (!list || !list.itemPaths.includes(itemPath)) {
			return false;
		}

		list.itemPaths = list.itemPaths.filter((path) => path !== itemPath);
		list.updatedAt = new Date().toISOString();
		return true;
	}

	private renderShowMoreControl(totalItems: number, renderedItems: number): void {
		if (renderedItems >= totalItems || totalItems === 0) {
			return;
		}

		const footer = this.contentHost.createDiv({ cls: "media-library-load-more" });
		footer.createDiv({
			text: `${renderedItems} of ${totalItems} loaded`,
			cls: "media-library-load-more-label",
		});

		const button = footer.createEl("button", {
			text: `Show more (${Math.min(totalItems - renderedItems, LibraryView.LIBRARY_PAGE_SIZE)})`,
		});
		button.addEventListener("click", () => {
			this.visibleItemCount += LibraryView.LIBRARY_PAGE_SIZE;
			this.renderCurrentView();
			this.renderSidebar();
			this.updateStatusBar();
		});
	}

	private resetVisibleItemCount(): void {
		this.visibleItemCount = LibraryView.LIBRARY_PAGE_SIZE;
	}

	private getVisibleItems(): MediaItem[] {
		let items = this.library.getAll();

		if (this.currentFilter !== "all") {
			items = items.filter((item) => item.mediaType === this.currentFilter);
		}

		if (this.searchQuery.trim()) {
			const query = this.searchQuery.trim().toLowerCase();
			items = items.filter((item) => item.title.toLowerCase().includes(query) || item.creator.toLowerCase().includes(query));
		}

		return this.library.sort(items, this.currentSort);
	}

}