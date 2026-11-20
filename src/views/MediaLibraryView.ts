// src/views/MediaLibraryView.ts

//update to add sort direction dropdown and shuffle button to the library toolbar, and update modules that use this toolbar to include the new sort direction dropdown  such as LibraryView, LibraryToolbar, and any other views that use the toolbar


import { ItemView, Notice, WorkspaceLeaf, setIcon } from "obsidian";

import { MediaLibrary, ViewRegistry } from "../core";
import { MediaItem, MediaStatus, MediaType, SortMode, SortType } from "../models";
import {
	DashboardConsumptionFilter,
	DashboardMediaFilter,
	DashboardScopeMode,
	LibraryPageTab,
	MediaLibrarySettings,
	MediaLibraryCustomList,
	SocialHubTab,
} from "../settings";
import * as ListService from "../services";
import { ActivityLogService, addTagToMediaNote } from "../services";
import { buildActivityEvents, formatEventAge, latestEventTimestamp } from "../utils/ActivityEvents";
import { MediaActivityModal } from "../ui/MediaActivityModal";
import { Poster } from "../PluginControllers";
import { CardView, GalleryView, TableView, ViewSwitcher } from "./LibraryDisplayViews";
import { renderMediaDashboard } from "./library/MediaInsightsDashboard";
import { renderLibraryPageTabs, renderLibraryShell } from "./library/LibraryChrome";
import { renderLibrarySidebar } from "./library/LibraryOverviewSidebar";
import { renderLibrarySocialHub } from "./library/LibrarySocialPanel";
import { renderLibraryStatBar, renderLibraryToolbar } from "./library/LibraryControls";
import { renderYearInMedia } from "./library/YearInMedia";
import { MediaListModal } from "../ui/MediaListModal";

type HomeActivityKind = "added" | "favorited" | "rated" | "note" | "read" | "watched" | "reading" | "watching";

interface HomeRecentItem {
	item: MediaItem;
	activities: HomeActivityKind[];
	latestDate: string;
	progress: number | null;
}

export class LibraryView extends ItemView {
	// Core dependencies
	private readonly library: MediaLibrary;
	private readonly viewRegistry: ViewRegistry;
	private readonly settings: MediaLibrarySettings;
	private readonly persistSettings: () => Promise<void>;
	private readonly cardView: CardView;
	private readonly galleryView: GalleryView;
	private readonly tableView: TableView;
	private readonly activityLogService: ActivityLogService;
	// Root DOM hosts
	private toolbarHost!: HTMLElement;
	private mediaControlsHost!: HTMLElement;
	private headerHost!: HTMLElement;
	private bodyHost!: HTMLElement;
	private mainHost!: HTMLElement;
	private spotlightHost!: HTMLElement;
	private sidebarHost!: HTMLElement;
	private contentHost!: HTMLElement;

	// View state
	private currentPageTab: LibraryPageTab = "home";
	private activeLibraryViewId: string;
	private currentFilter: MediaType | "all" = "all";
	private currentGenre: string | "all" = "all";
	private currentDecade: string | "all" = "all";
	private currentRating: "all" | "rated" | "unrated" | "high" = "all";
	private currentStatus: MediaStatus | "all" | "completed" | "uncompleted" | "currently" = "all";
	private currentSort: SortType = { mode: "latest", direction: "desc" };
	private dashboardConsumption: DashboardConsumptionFilter = "consumed";
	private dashboardScope: DashboardScopeMode = "year";
	private dashboardFilter: DashboardMediaFilter = "all";
	private yearInMediaYear: number | null = null;
	private currentLibraryItems: MediaItem[] = [];
	private visibleItemCount = LibraryView.LIBRARY_PAGE_SIZE;
	private searchQuery = "";
	private selectedItem: MediaItem | null = null;
	private featuredPath: string | null = null;
	private activeSocialTab: SocialHubTab;
	private listViewMode: "lists" | "currently" = "lists";
	private isSidebarVisible = true;
	private static readonly LIBRARY_PAGE_SIZE = 40;
	private static readonly GALLERY_PAGE_SIZE = 40;
	private static readonly DIARY_PAGE_SIZE = 40;
	private static readonly ACTIVITY_PAGE_SIZE = 40;
	private diaryPage = 0;
	private activityPage = 0;
	private diarySortKey: "date" | "rating" | "year" = "date";
	private diarySortDirection: "asc" | "desc" = "desc";

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
		this.settings.mediaCardSize = normalizeMediaCardSize(this.settings.mediaCardSize);
		this.cardView = new CardView(this.app);
		this.galleryView = new GalleryView(this.app);
		this.tableView = new TableView(this.app);
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
		this.currentPageTab = this.normalizePageTab(this.settings.defaultPageTab);
		this.activeSocialTab = this.settings.defaultSocialTab;
		this.dashboardConsumption = this.settings.dashboardDefaultConsumptionFilter;
		this.dashboardScope = this.settings.dashboardDefaultScope;
		this.dashboardFilter = this.settings.dashboardDefaultFilter;
		this.visibleItemCount = this.getPageSizeStep();
		this.featuredPath = null;
		this.ensureCoreLists();
		this.render();
	}

	async onClose(): Promise<void> {
		this.contentEl.empty();
	}

	render(): void {
		this.contentEl.empty();
		this.contentEl.addClass("media-library");
		this.contentEl.toggleClass("is-motion-off", !this.settings.enableUiAnimations);
		this.contentEl.style.setProperty("--media-library-card-size", `${this.settings.mediaCardSize}px`);

		this.toolbarHost = this.contentEl.createDiv({ cls: "media-library-toolbar-host" });
		this.mediaControlsHost = this.toolbarHost;
		this.headerHost = this.contentEl.createDiv({ cls: "media-library-header-host" });
		this.renderToolbarArea();
		this.renderHeaderArea();

		const shell = renderLibraryShell(this.contentEl);
		this.bodyHost = shell.bodyHost;
		this.mainHost = shell.mainHost;
		this.spotlightHost = shell.spotlightHost;
		this.sidebarHost = shell.sidebarHost;
		this.contentHost = shell.contentHost;

		this.renderActivePage();
	}

	refresh(): void {
		this.renderHeaderArea();
		this.renderActivePage();
	}

	private toSortType(mode: SortMode): SortType {
		switch (mode) {
			case "title":
				return { mode: "title", direction: "asc" };
			case "creator":
				return { mode: "creator", direction: "asc" };
			case "year":
				return { mode: "year", direction: "desc" };
			case "rating":
				return { mode: "rating", direction: "desc" };
			case "latest":
				return { mode: "latest", direction: "desc" };
			case "read":
				return { mode: "read", direction: "desc" };
			default:
				return { mode: "latest", direction: "desc" };
		}
	}

	// Toolbar + tab controls
	private getToolbarState() {
		const mode = this.currentSort.mode;
		const direction: "asc" | "desc" =
			mode === "random" ? "desc" : this.currentSort.direction;

		return {
			searchQuery: this.searchQuery,
			currentFilter: this.currentFilter,
			currentGenre: this.currentGenre,
			availableGenres: this.getAvailableGenres(),
			currentDecade: this.currentDecade,
			availableDecades: this.getAvailableDecades(),
			currentRating: this.currentRating,
			currentStatus: this.currentStatus,     // NEW
			currentSortMode: mode,
			currentSort: this.currentSort,
			currentSortDirection: direction,
			mediaCardSize: this.settings.mediaCardSize,
			settings: this.settings,
		};
	}

	//In renderToolbarArea, only create the sidebar toggle button on those two tabs.
	private renderToolbarArea(): void {
		this.toolbarHost.empty();
		this.mediaControlsHost.empty();
		this.toolbarHost.toggleClass("is-dashboard-tab", this.currentPageTab === "dashboard");
		this.toolbarHost.toggleClass("is-media-tab", this.currentPageTab === "media");

		const tabsRow = this.toolbarHost.createDiv({ cls: "media-library-toolbar-row" });
		tabsRow.addClass("media-library-tabs-row");
		renderLibraryPageTabs(tabsRow, this.currentPageTab, {
			onTabChange: (tab) => {
				this.currentPageTab = this.normalizePageTab(tab);
				this.renderToolbarArea();
				this.renderHeaderArea();
				this.renderActivePage();
			},
		});


		if (this.currentPageTab === "home" || this.currentPageTab === "dashboard") {
			const sidebarButton = tabsRow.createEl("button", {
				cls: "media-library-sidebar-toggle",
				attr: {
					title: this.isSidebarVisible ? "Hide sidebar" : "Show sidebar",
					"aria-label": this.isSidebarVisible ? "Hide sidebar" : "Show sidebar",
				},
			});
			sidebarButton.type = "button";
			setIcon(sidebarButton, this.isSidebarVisible ? "panel-right-close" : "panel-right-open");
			sidebarButton.addEventListener("click", () => {
				this.isSidebarVisible = !this.isSidebarVisible;
				this.renderToolbarArea();
				this.renderActivePage();
			});
		}

		if (this.currentPageTab === "media") {
			const mediaControlsShell = this.mediaControlsHost.createDiv({ cls: "media-library-media-controls-shell" });
			const statsHost = mediaControlsShell.createDiv();
			renderLibraryStatBar(statsHost, this.library);
			const controlsHost = mediaControlsShell.createDiv();
			//render the library toolbar with search, filter, sort mode, and sort direction controls
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
				onGenreChange: (value) => {
					this.currentGenre = value;
					this.resetVisibleItemCount();
					this.refresh();
				},
				onDecadeChange: (value) => {
					this.currentDecade = value;
					this.resetVisibleItemCount();
					this.refresh();
				},
				onRatingChange: (value) => {
					this.currentRating = value;
					this.resetVisibleItemCount();
					this.refresh();
				},
				  onStatusChange: (value) => {               // NEW
					this.currentStatus = value;
					this.resetVisibleItemCount();
					this.refresh();
				},
				onSortModeChange: (value) => {
					// switch mode but keep direction when possible
					const direction =
					this.currentSort.mode === "random"
						? "desc"
						: this.currentSort.direction;
					this.currentSort = { mode: value, direction };
					this.resetVisibleItemCount();
					this.refresh();
				},
				onSortDirectionChange: (value) => {
					if (this.currentSort.mode === "random") {
					// switch out of random into latest with chosen direction
					this.currentSort = { mode: "latest", direction: value };
					} else {
					this.currentSort = { ...this.currentSort, direction: value };
					}
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
					this.currentGenre = "all";
					this.currentDecade = "all";
					this.currentRating = "all";
					this.currentStatus = "all";
					this.currentSort = this.toSortType(this.settings.defaultSortMode);
					this.searchQuery = "";
					this.selectedItem = null;
					this.featuredPath = null;
					this.resetVisibleItemCount();
					this.refresh();
				},
				onViewSwitcher: (container) => {
					new ViewSwitcher({
						container,
						viewRegistry: this.viewRegistry,
						initialView: this.activeLibraryViewId,
						onChange: (viewId) => {
							this.activeLibraryViewId = viewId;
							this.resetVisibleItemCount();
							this.renderActivePage();
						},
					});
				},
				onMediaCardSizeChange: (value) => {
					this.settings.mediaCardSize = normalizeMediaCardSize(value);
					this.contentEl.style.setProperty("--media-library-card-size", `${this.settings.mediaCardSize}px`);
				},
				onMediaCardSizeCommit: () => {
					void this.persistSettings();
				},
			});
			return;
		}

		if (this.currentPageTab !== "dashboard") {
			return;
		}

	}

	// Top header area (kept simple now)
	private renderHeaderArea(): void {
		this.headerHost.empty();
	}

	// Main page routing
	private renderActivePage(): void {
		this.contentEl.toggleClass("is-home-page", this.currentPageTab === "home");
		this.bodyHost?.toggleClass("is-home-layout", this.currentPageTab === "home");
		this.bodyHost?.removeClass("is-social-layout");
		this.updateLayoutMode();

		// Only Home and Dashboard have a sidebar.
		if (this.currentPageTab !== "home" && this.currentPageTab !== "dashboard") {
			this.sidebarHost.empty();
			this.sidebarHost.addClass("is-hidden");
			this.bodyHost?.addClass("is-sidebar-hidden");
		}

		if (this.currentPageTab === "home") {
			this.spotlightHost.empty();
			this.spotlightHost.addClass("is-hidden");
			this.sidebarHost.removeClass("is-hidden");
			this.renderHomePage();
			this.applySidebarVisibility();
			return;
		}

		if (this.currentPageTab === "dashboard") {
			this.spotlightHost.removeClass("is-hidden");
			this.sidebarHost.removeClass("is-hidden");
			this.renderDashboardPage();
			this.applySidebarVisibility();
			return;
		}

		if (this.currentPageTab === "year-in-media") {
			this.renderYearInMediaPage();
			return;
		}

		if (this.currentPageTab === "diary") {
			this.diaryPage = 0; // NEW
			this.renderDiaryTablePage();
			return;
		}

		if (this.currentPageTab === "activity") {
			this.activityPage = 0; // NEW
			this.renderActivityTimelinePage();
			return;
		}

		if (this.currentPageTab === "lists") {
			this.renderTopSocialPage("lists");
			return;
		}

		if (this.currentPageTab === "tags") {
			this.renderTopSocialPage("tags");
			return;
		}

		if (this.activeLibraryViewId === "gallery") {
			if (this.visibleItemCount < LibraryView.GALLERY_PAGE_SIZE) {
				this.visibleItemCount = LibraryView.GALLERY_PAGE_SIZE;
			}
			this.sidebarHost.addClass("is-hidden");
			this.bodyHost?.addClass("is-sidebar-hidden");
			this.renderGalleryLibraryView();
			return;
		}

		if (this.activeLibraryViewId === "table") {
			this.spotlightHost.empty();
			this.spotlightHost.addClass("is-hidden");
			this.sidebarHost.addClass("is-hidden");
			this.bodyHost?.addClass("is-sidebar-hidden");
			this.renderTableLibraryView();
			return;
		}

		if (this.currentPageTab === "media") {
			this.spotlightHost.empty();
			this.spotlightHost.addClass("is-hidden");
			this.sidebarHost.addClass("is-hidden");
			this.bodyHost?.addClass("is-sidebar-hidden");
			this.renderCurrentView();
			return;
		}

		this.spotlightHost.empty();
		this.spotlightHost.addClass("is-hidden");
		this.renderCurrentView();
	}

	private renderTopSocialPage(tab: SocialHubTab): void {
		this.spotlightHost.empty();
		this.spotlightHost.addClass("is-hidden");
		this.contentHost.empty();
		this.sidebarHost.addClass("is-hidden");
		this.bodyHost?.addClass("is-social-layout");

		renderLibrarySocialHub(this.contentHost, {
			...this.getSocialHubState(),
			activeTab: tab,
		}, this.getSocialHubCallbacks(), {
			showTabs: false,
		});
	}

	private renderPaginationControls(
		container: HTMLElement,
		page: number,
		pageSize: number,
		totalItems: number,
		onPageChange: (page: number) => void,
		): void {
		if (totalItems <= pageSize) return;

		const totalPages = Math.ceil(totalItems / pageSize);
		const pager = container.createDiv({ cls: "media-pagination" });

		const info = pager.createDiv({ cls: "media-pagination-info" });
		info.textContent = `Page ${page + 1} of ${totalPages}`;

		const buttons = pager.createDiv({ cls: "media-pagination-buttons" });

		const prev = buttons.createEl("button", {
			cls: "media-pagination-prev",
			text: "Previous",
		});
		prev.type = "button";
		prev.disabled = page === 0;
		prev.addEventListener("click", () => {
			if (this.currentPageTab === "diary" && this.diaryPage > 0) {
				onPageChange(page - 1);
			} else if (this.currentPageTab === "activity" && this.activityPage > 0) {
				onPageChange(page - 1);
			}
		});

		const next = buttons.createEl("button", {
			cls: "media-pagination-next",
			text: "Next",
		});
		next.type = "button";
		next.disabled = page >= totalPages - 1;
		next.addEventListener("click", () => {
			if (page < totalPages - 1) {
			onPageChange(page + 1);
			}
		});
	}


	private renderActivityTimelinePage(): void {
		this.spotlightHost.empty();
		this.spotlightHost.addClass("is-hidden");
		this.contentHost.empty();
		this.sidebarHost.addClass("is-hidden");
		this.bodyHost?.addClass("is-social-layout");

		const wrap = this.contentHost.createDiv({ cls: "media-home-activity" });
		const header = wrap.createDiv({ cls: "media-home-header" });
		header.createDiv({ cls: "media-home-sidebar-title", text: "Activity" });

		const byPath = new Map(this.library.getAll().map((item) => [item.path, item]));
		const allEvents = this.getHomeActivityItems(this.getUpNextItems(byPath), Infinity);

		if (!allEvents.length) {
			wrap.createDiv({ cls: "media-home-empty", text: "No activity yet." });
			return;
		}

		const pageSize = LibraryView.ACTIVITY_PAGE_SIZE;
		const start = this.activityPage * pageSize;
		const pageEvents = allEvents.slice(start, start + pageSize);

		const list = wrap.createDiv({ cls: "media-home-activity-list is-expanded" });
		for (const [index, entry] of pageEvents.entries()) {
			const row = list.createDiv({ cls: "media-home-activity-item" });
			const node = row.createDiv({ cls: "media-home-activity-node" });
			node.createDiv({ cls: "media-home-activity-dot" });
			if (index < pageEvents.length - 1) {
			node.createDiv({ cls: "media-home-activity-stem" });
			}

			const body = row.createDiv({ cls: "media-home-activity-body" });
			const line = body.createDiv({ cls: "media-home-activity-line" });
			line.createSpan({ text: entry.prefix });
			line.createSpan({
			cls: "media-home-activity-title-emphasis",
			text: entry.item.title,
			});
			line.createSpan({ text: entry.suffix });
			body.createDiv({ cls: "media-home-activity-meta", text: entry.when });

			row.addEventListener("click", () => {
			this.selectItem(entry.item);
			this.openActivityModal(entry.item);
			});
		}

		this.renderPaginationControls(
			wrap,
			this.activityPage,
			pageSize,
			allEvents.length,
			(nextPage) => {
			this.activityPage = nextPage;
			this.renderActivityTimelinePage();
			},
		);
	}


	// Diary table page (Letterboxd-style)
	private renderDiaryTablePage(): void {
		this.spotlightHost.empty();
		this.spotlightHost.addClass("is-hidden");
		this.contentHost.empty();
		this.sidebarHost.addClass("is-hidden");
		this.bodyHost?.addClass("is-social-layout");

		const wrap = this.contentHost.createDiv({ cls: "media-diary-page" });

		// Header row
		const header = wrap.createDiv({ cls: "media-diary-header" });

		const leftHeader = header.createDiv({ cls: "media-diary-header-left" });
		leftHeader.createDiv({ cls: "media-diary-title", text: "Diary" });

		const cols = header.createDiv({ cls: "media-diary-header-cols" });
		const releasedCol = cols.createDiv({ cls: "media-diary-col" });
		releasedCol.createSpan({ text: "Released", cls: "media-diary-col-label" });
		const releasedSort = releasedCol.createEl("button", { cls: "media-diary-col-sort", text: "↕" });
		releasedSort.type = "button";
		releasedSort.addEventListener("click", () => {
			this.diarySortKey = "year";
			this.diarySortDirection = this.diarySortDirection === "asc" ? "desc" : "asc";
			this.renderDiaryTablePage();
		});

		const ratingCol = cols.createDiv({ cls: "media-diary-col" });
		ratingCol.createSpan({ text: "Rating", cls: "media-diary-col-label" });
		const ratingSort = ratingCol.createEl("button", { cls: "media-diary-col-sort", text: "↕" });
		ratingSort.type = "button";
		ratingSort.addEventListener("click", () => {
			this.diarySortKey = "rating";
			this.diarySortDirection = this.diarySortDirection === "asc" ? "desc" : "asc";
			this.renderDiaryTablePage();
		});

		const reviewCol = cols.createDiv({ cls: "media-diary-col" });
		reviewCol.createSpan({ text: "Watched / read", cls: "media-diary-col-label" });
		const dateSort = reviewCol.createEl("button", { cls: "media-diary-col-sort", text: "↕" });
		dateSort.type = "button";
		dateSort.addEventListener("click", () => {
			this.diarySortKey = "date";
			this.diarySortDirection = this.diarySortDirection === "asc" ? "desc" : "asc";
			this.renderDiaryTablePage();
		});

		// All items with a date, sorted using diary controls
		let allItems = this.library
			.getAll()
			.filter((item) => Boolean(item.date) && this.isCompleted(item));

		allItems = allItems.sort((a, b) => {
			const dir = this.diarySortDirection === "asc" ? 1 : -1;
			if (this.diarySortKey === "rating") {
				return ((a.rating ?? 0) - (b.rating ?? 0)) * dir;
			}
			if (this.diarySortKey === "year") {
				return ((a.year ?? 0) - (b.year ?? 0)) * dir;
			}
			// default: date
			return ((a.date ?? "").localeCompare(b.date ?? "")) * dir;
		});

		if (!allItems.length) {
			wrap.createDiv({
			cls: "media-home-empty",
			text: "No diary entries yet.",
			});
			return;
		}

		const pageSize = LibraryView.DIARY_PAGE_SIZE;
		const start = this.diaryPage * pageSize;
		const items = allItems.slice(start, start + pageSize);

		const list = wrap.createDiv({ cls: "media-diary-list" });

		for (const item of items) {
			const row = list.createDiv({ cls: "media-diary-row" });

			// Date block: Month/Year + Day
			const dateCell = row.createDiv({ cls: "media-diary-date" });
			const dateValue = item.date ? new Date(item.date) : null;
			const month =
			dateValue && !Number.isNaN(dateValue.getTime())
				? dateValue.toLocaleString("en-US", { month: "short" }).toUpperCase()
				: "---";
			const year =
			dateValue && !Number.isNaN(dateValue.getTime())
				? String(dateValue.getFullYear())
				: "----";
			const day =
			dateValue && !Number.isNaN(dateValue.getTime())
				? String(dateValue.getDate()).padStart(2, "0")
				: "--";

			const monthYearWrap = dateCell.createDiv({ cls: "media-diary-date-month-year" });
			monthYearWrap.createDiv({ cls: "media-diary-date-month", text: month });
			monthYearWrap.createDiv({ cls: "media-diary-date-year", text: year });
			dateCell.createDiv({ cls: "media-diary-date-day", text: day });

			// Poster + title
			const mainCell = row.createDiv({ cls: "media-diary-main" });

			const posterHost = mainCell.createDiv({ cls: "media-diary-poster" });
			new Poster(item, this.app).render(posterHost);

			const text = mainCell.createDiv({ cls: "media-diary-text" });
			const title = item.title ?? "";
			const maxChars = 32;
			const shortTitle =
				title.length > maxChars
					? `${title.slice(0, maxChars).trimEnd()}…`
					: title;
			const titleDiv = text.createDiv({ cls: "media-diary-film-title", text: shortTitle });
			if (item.year) {
			text.createDiv({
				cls: "media-diary-film-meta",
				text: String(item.year),
			});
			}

			// Make title clickable to open file
			titleDiv.addEventListener("click", (event) => {
				event.stopPropagation();
				this.selectItem(item);
				void this.app.workspace.openLinkText(item.path, "", false);
			});

			// Released year
			const yearCell = row.createDiv({ cls: "media-diary-year" });
			yearCell.createSpan({ text: item.year ? String(item.year) : "—" });

			// Rating stars use the configured display scale while ratings remain out of 10.
			const ratingCell = row.createDiv({ cls: "media-diary-rating" });
			if (item.rating != null) {
				const stars = this.getRatingStars(item.rating);
				ratingCell.createSpan({
					cls: "media-diary-rating-stars",
					text: stars,
				});
			} else {
				ratingCell.createSpan({ text: "—" });
			}

			// Review / actions
			const reviewCell = row.createDiv({ cls: "media-diary-review" });
			const openBtn = reviewCell.createEl("button", {
			cls: "media-diary-review-button",
			text: "Review",
			});
			openBtn.type = "button";
			openBtn.addEventListener("click", () => {
			this.selectItem(item);
			this.openActivityModal(item);
			});

			row.addEventListener("click", (event) => {
			if (event.target === openBtn) return;
			if (text.contains(event.target as Node)) return;
			this.selectItem(item);
			this.openActivityModal(item);
			});
		}

		this.renderPaginationControls(
			wrap,
			this.diaryPage,
			pageSize,
			allItems.length,
			(nextPage) => {
			this.diaryPage = nextPage;
			this.renderDiaryTablePage();
			},
		);
	}
	// Home page composition
	private renderHomePage(): void {
		this.contentHost.empty();
		const allItems = this.library.getAll();
		const byPath = new Map(allItems.map((item) => [item.path, item]));

		const shell = this.contentHost.createDiv({ cls: "media-home-shell" });
		const favorites = this.getFavoritesHomeItems(byPath);
		const recent = this.getRecentHomeItems();

		this.renderHomeShelf(shell, "Favorites", favorites);
		this.renderHomeShelf(shell, "Recent activity", recent.map((entry) => entry.item), true, recent);

		this.renderHomeSidebar(byPath);
	}

	//home shelf 
	private renderHomeShelf(
		container: HTMLElement,
		title: string,
		items: MediaItem[],
		_compact: boolean = false,
		recentItems: HomeRecentItem[] = [],
	): void {
		const section = container.createDiv({ cls: "media-home-section" });
		const header = section.createDiv({ cls: "media-home-section-header" });
		header.createDiv({ cls: "media-home-section-title", text: title });

		if (!items.length) {
			section.createDiv({
				cls: "media-home-empty",
				text: `No items in ${title.toLowerCase()} yet.`,
			});
			return;
		}

		const row = section.createDiv({ cls: "media-home-poster-row" });
		for (const [index, item] of items.entries()) {
			const card = row.createDiv({ cls: "media-home-poster-card" });
			card.setAttr("title", `${item.title} • ${item.creator}`);
			card.addEventListener("click", () => {
				this.selectItem(item);
				this.openActivityModal(item);
			});
			new Poster(item, this.app).render(card);

			if (title === "Recent activity") {
				const iconBar = card.createDiv({ cls: "media-activity-type-icons" });
				for (const activity of recentItems[index]?.activities ?? []) {
					const iconSpan = iconBar.createSpan({ cls: `media-activity-type-icon is-${activity}` });
					const mediaIcon = this.getHomeActivityIcon(activity, item);
					if (mediaIcon) {
						iconSpan.addClass("is-media-icon");
						setIcon(iconSpan, mediaIcon);
						iconSpan.setAttr("role", "img");
						iconSpan.setAttr("aria-label", this.getHomeActivityLabel(activity));
					} else {
						iconSpan.textContent = activity === "rated"
							? this.getHomeRatingStars(item.rating)
							: this.getHomeActivitySymbol(activity);
					}
					iconSpan.title = this.getHomeActivityLabel(activity);
					const progress = recentItems[index]?.progress;
					if ((activity === "reading" || activity === "watching") && progress != null) {
						iconBar.createSpan({
							cls: "media-activity-progress",
							text: `${progress}%`,
						}).setAttr("aria-label", `${this.getHomeActivityLabel(activity)}: ${progress}%`);
					}
				}
			}
		}
	}


	// Home right rail
	private renderHomeSidebar(allItemsByPath: Map<string, MediaItem>): void {
		this.sidebarHost.empty();
		const rail = this.sidebarHost.createDiv({ cls: "media-home-sidebar" });

		const upNextSection = rail.createDiv({ cls: "media-home-sidebar-section" });
		const watchlistHeader = upNextSection.createDiv({ cls: "media-home-sidebar-header" });

		const upNextMode: "up-next" | "currently" = this.settings.homeUpNextMode ?? "up-next";
		const watchlistTitle = watchlistHeader.createDiv({ cls: "media-home-sidebar-title-group" });
		watchlistTitle.createDiv({
			cls: "media-home-sidebar-title",
			text: upNextMode === "currently" ? "Currently" : "Up next",
		});

		const upNextModeButton = watchlistTitle.createEl("button", {
			cls: "media-home-sidebar-mode-toggle",
			text: "▾",
		});
		upNextModeButton.setAttr(
			"aria-label",
			upNextMode === "currently" ? "Show up next" : "Show currently reading or watching",
		);
		upNextModeButton.setAttr(
			"title",
			upNextMode === "currently" ? "Show up next" : "Show currently reading or watching",
		);

		upNextModeButton.addEventListener("click", (event) => {
			event.stopPropagation();
			const newMode: "up-next" | "currently" =
				this.settings.homeUpNextMode === "currently" ? "up-next" : "currently";
			this.settings.homeUpNextMode = newMode;
			void this.persistSettings();
			this.renderHomeSidebar(allItemsByPath);
		});

		const upNextItems =
			upNextMode === "currently"
				? this.getUpNextOrCurrentHomeItems(allItemsByPath)
				: this.getUpNextItems(allItemsByPath);

		if (!upNextItems.length) {
			upNextSection.createDiv({ cls: "media-home-empty", text: "No titles in this view." });
		} else {
			const strip = upNextSection.createDiv({ cls: "media-home-watchlist-stack" });
			for (const item of upNextItems.slice(0, 6)) {
				const card = strip.createDiv({ cls: "media-home-watchlist-card" });
				card.setAttr("title", item.title);
				card.addEventListener("click", () => {
					this.selectItem(item);
					this.openActivityModal(item);
				});
				new Poster(item, this.app).render(card);
			}
		}

		const diaryItems = this.getHomeDiaryItems();
		const diarySection = rail.createDiv({ cls: "media-home-sidebar-section" });
		const diaryHeader = diarySection.createDiv({ cls: "media-home-sidebar-header" });
		diaryHeader.createDiv({ cls: "media-home-sidebar-title", text: "Diary" });
		const diaryHeaderRight = diaryHeader.createDiv({ cls: "media-home-sidebar-header-right" });
		const diaryAllButton = diaryHeaderRight.createEl("button", { cls: "media-home-sidebar-all", text: "All" });
		diaryAllButton.type = "button";
		diaryAllButton.addEventListener("click", () => {
			this.currentPageTab = "diary";
			this.renderToolbarArea();
			this.renderHeaderArea();
			this.renderActivePage();
		});
		if (!diaryItems.length) {
			diarySection.createDiv({ cls: "media-home-empty", text: "No diary entries yet." });
		} else {
			const diaryList = diarySection.createDiv({ cls: "media-home-diary-list" });
			let previousMonth = "";
			for (const [index, item] of diaryItems.entries()) {
				void index;
				const row = diaryList.createDiv({ cls: "media-home-diary-item" });
				const badge = row.createDiv({ cls: "media-home-diary-badge" });
				const monthAbbrev = getMonthAbbreviation(item.date);
				const showMonth = monthAbbrev !== previousMonth;
				badge.createDiv({
					cls: showMonth ? "media-home-diary-badge-month" : "media-home-diary-badge-month is-muted",
					text: showMonth ? monthAbbrev : "",
				});
				previousMonth = monthAbbrev;
				const label = row.createDiv({ cls: "media-home-diary-label" });
				label.createSpan({ cls: "media-home-diary-index", text: getDayOfMonth(item.date) });
				label.createSpan({ cls: "media-home-diary-title", text: item.title });
				row.addEventListener("click", () => {
					this.selectItem(item);
					this.openActivityModal(item);
				});
			}
		}
		//get activity items and render them in the sidebar
		const activityItems = this.getHomeActivityItems(upNextItems);
		const activitySection = rail.createDiv({ cls: "media-home-sidebar-section" });
		const activityHeader = activitySection.createDiv({ cls: "media-home-sidebar-header" });
		activityHeader.createDiv({ cls: "media-home-sidebar-title", text: "Activity" });
		const allButton = activityHeader.createEl("button", { cls: "media-home-sidebar-all", text: "All" });
		allButton.type = "button";
		allButton.addEventListener("click", () => {
			this.currentPageTab = "activity";
			this.renderToolbarArea();
			this.renderHeaderArea();
			this.renderActivePage();
		});

		const activityList = activitySection.createDiv({ cls: "media-home-activity-list" });
		if (!activityItems.length) {
			activityList.createDiv({ cls: "media-home-empty", text: "No recent activity yet." });
		} else {
			for (const event of activityItems) {
				const row = activityList.createDiv({ cls: "media-home-activity-item" });

				// timeline dot + stem
				const node = row.createDiv({ cls: "media-home-activity-node" });
				if (event.icon) {
					const icon = node.createSpan({ cls: "media-home-activity-marker-icon" });
					setIcon(icon, event.icon);
				} else {
					node.createDiv({ cls: "media-home-activity-dot" });
				}
				node.createDiv({ cls: "media-home-activity-stem" });

				// text column
				const textCol = row.createDiv({ cls: "media-home-activity-page" });
				const line = textCol.createDiv({ cls: "media-home-activity-line" });
				line.createSpan({ text: event.prefix });
				line.createSpan({
					cls: "media-home-activity-title-emphasis",
					text: event.item.title,
				});
				if (event.suffix) {
					line.createSpan({ text: event.suffix });
				}

				textCol.createDiv({
					cls: "media-home-activity-meta",
					text: event.when,
				});

				row.addEventListener("click", () => {
					this.selectItem(event.item);
					this.currentPageTab = "activity";
					this.renderToolbarArea();
					this.renderHeaderArea();
					this.renderActivePage();
				});
			}
		}
	}

	private getHomeDiaryItems(): MediaItem[] {
		return this.library
			.getAll()
			.filter((item) => Boolean(item.date) && this.isCompleted(item))
			.sort((left, right) => (right.date ?? "").localeCompare(left.date ?? ""))
			.slice(0, 4);
	}

	private getHomeActivityItems(
		_upNextItems: MediaItem[],
		limit = 4,
	): Array<{
		item: MediaItem;
		prefix: string;
		suffix: string;
		when: string;
		date: string;
		icon: string | null;
	}> {
		return this.library.getAll().flatMap((item) => {
			const favoriteDate = this.settings.favoriteDates?.[item.path];
			return buildActivityEvents(item, favoriteDate).map((event) => ({
				item,
				prefix: event.prefix,
				suffix: event.suffix,
				when: formatEventAge(event.timestamp),
				date: event.timestamp,
				icon: event.activity ? this.getHomeActivityIcon(event.activity, item) : null,
			}));
		})
		.filter((event) => Boolean(event.when))
		.sort((left, right) => right.date.localeCompare(left.date))
		.slice(0, limit);
	}

	// Home data providers
	private getFavoritesHomeItems(allItemsByPath: Map<string, MediaItem>): MediaItem[] {
		const favorites = ListService.getFavoritesList(this.settings);
		const favoriteItems = favorites?.itemPaths
			.map((path) => allItemsByPath.get(path))
			.filter((item): item is MediaItem => Boolean(item)) ?? [];
		if (favoriteItems.length) {
			return favoriteItems
				.slice(0, 4);
		}

		return [...this.library
			.getAll()
			.filter((item) => item.rating != null)
			.sort((left, right) => (right.rating ?? -Infinity) - (left.rating ?? -Infinity))
			]
			.slice(0, 4);
	}

	private getUpNextOrCurrentHomeItems(allItemsByPath: Map<string, MediaItem>): MediaItem[] {
		const mode: "up-next" | "currently" = this.settings.homeUpNextMode ?? "up-next";

		if (mode === "currently") {
			// filter items that are currently being read/watched
			return this.library
				.getAll()
				.filter((item) => {
					const s = (item.status ?? "").toLowerCase().trim();
					return s === "reading" || s === "watching";
				})
				.slice(0, 5);
		}

		// default: Up next list / queue
		const upNext = ListService.getUpNextList(this.settings);
		if (upNext?.itemPaths.length) {
			return upNext.itemPaths
				.map((path) => allItemsByPath.get(path))
				.filter((item): item is MediaItem => Boolean(item))
				.slice(0, 5);
		}

		return this.library
			.getAll()
			.filter((item) => item.status === null)
			.slice(0, 5);
	}

    //show 4 recent items on home page
	private getRecentHomeItems(): HomeRecentItem[] {
		return this.library
			.getAll()
			.map((item) => {
				const activities = this.getHomeActivityKinds(item);
				const latestEntry = [...(item.activityEntries ?? [])].sort((left, right) =>
					(right.recordedAt ?? right.date).localeCompare(left.recordedAt ?? left.date),
				)[0];
				return { item, activities, latestDate: this.getHomeActivityDate(item), progress: latestEntry?.progress ?? null };
			})
			.sort((left, right) => right.latestDate.localeCompare(left.latestDate))
			.slice(0, 4);
	}

	private getHomeActivityKinds(item: MediaItem): HomeActivityKind[] {
		const isReading = item.mediaType === "book" || item.mediaType === "essay";
		const favorites = ListService.getFavoritesList(this.settings);
		const favoriteDate = this.settings.favoriteDates?.[item.path] ?? "";
		const latestEntry = [...(item.activityEntries ?? [])].sort((left, right) =>
			(right.recordedAt ?? right.date).localeCompare(left.recordedAt ?? left.date),
		)[0];

		if (latestEntry) {
			const status = (latestEntry.status ?? "").toLowerCase().trim();
			const kinds: HomeActivityKind[] = status === "reading"
				? ["reading"]
				: status === "watching"
					? ["watching"]
					: [isReading ? "read" : "watched"];
			if (latestEntry.rating != null && status !== "reading" && status !== "watching") kinds.push("rated");
			if (latestEntry.note) kinds.push("note");
			return kinds;
		}
		if (favoriteDate && favorites?.itemPaths.includes(item.path)) return ["favorited"];
		return item.addedDate ? ["added"] : [];
	}

	private getHomeActivityDate(item: MediaItem): string {
		const favoriteDate = this.settings.favoriteDates?.[item.path] ?? "";
		return latestEventTimestamp(buildActivityEvents(item, favoriteDate));
	}

	private getHomeActivityIcon(activity: HomeActivityKind, item: MediaItem): string | null {
		if (activity !== "read" && activity !== "watched" && activity !== "reading" && activity !== "watching") {
			return null;
		}

		if (item.mediaType === "movie") {
			return "film";
		}

		if (item.mediaType === "series") {
			return "tv";
		}

		return "book-open";
	}

	private getHomeActivitySymbol(activity: HomeActivityKind): string {
		return { added: "+", favorited: "♥", rated: "★", note: "✎", read: "", watched: "", reading: "", watching: "" }[activity];
	}

	private getHomeRatingStars(rating: number | null | undefined): string {
		return this.getRatingStars(rating);
	}

	private getRatingStars(rating: number | null | undefined): string {
		if (rating == null || !Number.isFinite(rating)) {
			return "";
		}

		const scale = this.settings.ratingDisplayScale ?? 10;
		const stars = scale === 5 ? Math.round(rating / 2) : Math.round(rating);
		return "★".repeat(Math.max(0, Math.min(scale, stars)));
	}

	private getHomeActivityLabel(activity: HomeActivityKind): string {
		return { added: "Added", favorited: "Favorited", rated: "Rated", note: "Added a note", read: "Read", watched: "Watched", reading: "Currently reading", watching: "Currently watching" }[activity];
	}

	private getUpNextItems(allItemsByPath: Map<string, MediaItem>): MediaItem[] {
		const upNext = ListService.getUpNextList(this.settings);
		if (upNext?.itemPaths.length) {
			return upNext.itemPaths
				.map((path) => allItemsByPath.get(path))
				.filter((item): item is MediaItem => Boolean(item))
				.slice(0, 5);
		}

		return this.library
			.getAll()
			.filter((item) => item.status === null)
			.sort(() => Math.random() - 0.5)
			.slice(0, 5);
	}

	// Media gallery/cards/dashboard renderers
	private renderGalleryLibraryView(): void {
		this.currentLibraryItems = this.getVisibleItems();
		const renderedItems = this.currentLibraryItems.slice(0, this.visibleItemCount);
		this.galleryView.render({
			carouselHost: this.spotlightHost,
			contentHost: this.contentHost,
		}, renderedItems, {
			onSelectItem: (item) => {
				this.selectItem(item);
				this.renderActivePage();
			},
			onOpenNote: (item) => {
				this.selectItem(item);
				void this.app.workspace.openLinkText(item.path, "", false);
			},
			onOpenModal: (item) => {
				this.selectItem(item);
				this.openActivityModal(item);
			},
			onToggleFavorite: (item) => {
				this.toggleFavorite(item);
			},
		}, {
			activePath: this.selectedItem?.path ?? this.featuredPath,
			isFavorite: (path) => ListService.isFavorite(this.settings, path),
		});
		if (this.topUpVisibleToCompleteRow(".media-gallery-grid", this.currentLibraryItems.length)) {
			this.renderGalleryLibraryView();
			return;
		}
		this.renderVisibleMediaCount(renderedItems.length, this.currentLibraryItems.length);
		this.renderShowMoreControl(this.currentLibraryItems.length, renderedItems.length, () => {
			this.renderGalleryLibraryView();
		});
		this.sidebarHost.addClass("is-hidden");
	}

	private renderCurrentView(): void {
		this.contentHost.empty();

		this.currentLibraryItems = this.getVisibleItems();
		const renderedItems = this.currentLibraryItems.slice(0, this.visibleItemCount);
		this.cardView.render(this.contentHost, renderedItems, this.selectedItem, (item) => {
			this.selectItem(item);
			this.openActivityModal(item);
		}, {
			onOpenNote: (item) => {
				this.selectItem(item);
				void this.app.workspace.openLinkText(item.path, "", false);
			},
			onOpenModal: (item) => {
				this.selectItem(item);
				this.openActivityModal(item);
			},
			onToggleFavorite: (item) => {
				this.toggleFavorite(item);
			},
			isFavorite: (path) => ListService.isFavorite(this.settings, path),
			onCreatorClick: (creator) => {
				this.searchQuery = creator;
				this.resetVisibleItemCount();
				this.renderToolbarArea();
				this.renderActivePage();
			},
		});
		if (this.topUpVisibleToCompleteRow(".media-library-grid", this.currentLibraryItems.length)) {
			this.renderCurrentView();
			return;
		}
		this.renderVisibleMediaCount(renderedItems.length, this.currentLibraryItems.length);
		this.renderShowMoreControl(this.currentLibraryItems.length, renderedItems.length, () => {
			this.renderCurrentView();
		});
	}

	private renderTableLibraryView(): void {
		this.contentHost.empty();

		this.currentLibraryItems = this.getVisibleItems();
		const renderedItems = this.currentLibraryItems.slice(0, this.visibleItemCount);

		this.tableView.render(this.contentHost, renderedItems, this.selectedItem, (item) => {
			this.selectItem(item);
			this.openActivityModal(item);
		}, {
			onOpenNote: (item) => {
			this.selectItem(item);
			void this.app.workspace.openLinkText(item.path, "", false);
			},
			onToggleFavorite: (item) => this.toggleFavorite(item),
			isFavorite: (path) => ListService.isFavorite(this.settings, path),
			onCreatorClick: (creator) => {
			this.searchQuery = creator;
			this.resetVisibleItemCount();
			this.renderToolbarArea();
			this.renderActivePage();
			},
		});

		this.renderVisibleMediaCount(renderedItems.length, this.currentLibraryItems.length);
		this.renderShowMoreControl(this.currentLibraryItems.length, renderedItems.length, () => {
			this.renderTableLibraryView();
		});
	}

	private renderVisibleMediaCount(showing: number, total: number): void {
		const count = this.contentHost.createDiv({ cls: "media-library-visible-count" });
		const text = count.createDiv({ cls: "media-library-visible-text" });

		if (showing >= total) {
			text.createSpan({ cls: "media-library-visible-number", text: total.toLocaleString() });
			text.appendText(total === 1 ? " title" : " titles");
		} else {
			text.appendText("Showing ");
			text.createSpan({ cls: "media-library-visible-number", text: showing.toLocaleString() });
			text.appendText(" of ");
			text.createSpan({ cls: "media-library-visible-number", text: total.toLocaleString() });
			text.appendText(" titles");

			const bar = count.createDiv({ cls: "media-library-visible-bar" });
			bar.createDiv().style.width = `${(showing / total) * 100}%`;
		}

		this.contentHost.prepend(count);
	}

	private renderDashboardPage(): void {
		renderMediaDashboard({
			heroHost: this.spotlightHost,
			contentHost: this.contentHost,
			sidebarHost: this.sidebarHost,
		}, {
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
			onCreatorClick: (creator, mediaType) => {
				this.currentPageTab = "media";
				this.searchQuery = creator;
				this.currentFilter = mediaType ?? "all";
				this.currentStatus = this.dashboardConsumption === "consumed"
					? "completed"
					: this.dashboardConsumption === "unconsumed" ? "uncompleted" : "all";
				this.resetVisibleItemCount();
				this.renderToolbarArea();
				this.renderHeaderArea();
				this.renderActivePage();
			},
			onConsumptionChange: (filter) => {
				this.dashboardConsumption = filter;
				this.renderActivePage();
			},
			onScopeChange: (scope) => {
				this.dashboardScope = scope;
				this.renderActivePage();
			},
			onFilterChange: (filter) => {
				this.dashboardFilter = filter;
				this.renderActivePage();
			},
		});
	}

	private renderYearInMediaPage(): void {
		this.spotlightHost.empty();
		this.spotlightHost.addClass("is-hidden");
		this.sidebarHost.addClass("is-hidden");
		this.bodyHost?.addClass("is-sidebar-hidden");

		renderYearInMedia(this.contentHost, {
			app: this.app,
			items: this.library.getAll(),
			settings: this.settings,
			year: this.yearInMediaYear,
		}, {
			onYearChange: (year) => {
				this.yearInMediaYear = year;
				this.renderYearInMediaPage();
			},
			onOpenItem: (item) => {
				this.selectedItem = item;
				this.featuredPath = item.path;
				void this.app.workspace.openLinkText(item.path, "", false);
			},
		});
	}

	// Selection + modal helpers
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

	// Sidebar + status helpers
	private renderSidebar(variant: "default" | "airy" = "default"): void {
		renderLibrarySidebar(this.sidebarHost, {
			visibleItems: this.getVisibleItems(),
			variant,
		});
	}

	// Layout mode + tab normalization
	private updateLayoutMode(): void {
		const isGalleryLayout = this.isGalleryViewActive();
		this.contentEl.toggleClass("is-gallery-mode", isGalleryLayout);
		this.toolbarHost.toggleClass("is-gallery-mode", isGalleryLayout);
		this.bodyHost?.toggleClass("is-gallery-mode", isGalleryLayout);
		this.mainHost?.toggleClass("is-gallery-mode", isGalleryLayout);
	}

	private isGalleryViewActive(): boolean {
		return this.currentPageTab === "media" && this.activeLibraryViewId === "gallery";
	}

	private normalizePageTab(tab: LibraryPageTab): LibraryPageTab {
		if (tab === "library") {
			return "media";
		}

		return tab;
	}

	private ensureCoreLists(): void {
		const before = this.settings.customLists.length;
		ListService.ensureFavoritesList(this.settings);
		ListService.ensureUpNextList(this.settings);
		if (this.settings.customLists.length !== before) {
			void this.persistSettings();
		}
	}

	private applySidebarVisibility(): void {
		const hidden = !this.isSidebarVisible;
		this.sidebarHost.toggleClass("is-hidden", hidden);
		this.bodyHost?.toggleClass("is-sidebar-hidden", hidden);
	}

	// Social/list/tag actions
	private getSocialHubState() {
		const allItems = this.library.getAll();
		return {
			app: this.app,
			activeTab: this.activeSocialTab,
			items: allItems,
			lists: this.settings.customLists,
			favorites: ListService.getFavoritesList(this.settings) ?? null,
			allItemsByPath: new Map(allItems.map((item) => [item.path, item])),
			selectedItem: this.selectedItem,
			listViewMode: this.listViewMode, // NEW
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
		onOpenList: (list: MediaLibraryCustomList) => {
				const all = this.library.getAll();
				const allMap = new Map(all.map((item) => [item.path, item]));
				new MediaListModal({
					app: this.app,
					list,
					allItemsByPath: allMap,
					onSave: async (updated) => {
					// write changes back into settings.customLists
					const idx = this.settings.customLists.findIndex(
						(l) => l.id === updated.id,
					);
					if (idx !== -1) {
						this.settings.customLists[idx] = { ...updated };
						await this.persistSettings();
						this.renderActivePage();
					}
					},
				}).open();
				},
			onListViewModeChange: (mode: "lists" | "currently") => { // NEW
				this.listViewMode = mode;
				this.renderActivePage();
			},
		};
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

	private renderShowMoreControl(totalItems: number, renderedItems: number, onShowMore?: () => void): void {
		const pageSize = this.getPageSizeStep();
		if (renderedItems >= totalItems || totalItems === 0) {
			return;
		}

		const footer = this.contentHost.createDiv({ cls: "media-library-load-more" });
		footer.createDiv({
			text: `${renderedItems} of ${totalItems} loaded`,
			cls: "media-library-load-more-label",
		});

		const button = footer.createEl("button", {
			text: `Show more (${Math.min(totalItems - renderedItems, pageSize)})`,
		});
		button.addEventListener("click", () => {
			this.visibleItemCount += pageSize;
			onShowMore?.();
		});
	}

	private resetVisibleItemCount(): void {
		this.visibleItemCount = this.getPageSizeStep();
	}

	private getPageSizeStep(): number {
		return this.isGalleryViewActive() ? LibraryView.GALLERY_PAGE_SIZE : LibraryView.LIBRARY_PAGE_SIZE;
	}

	private isCompleted(item: MediaItem): boolean {
		if (!item.status) return false;
		const s = item.status.toLowerCase().trim();
		return s === "read" || s === "watched";
	}

	private isCurrentlyReadingOrWatching(item: MediaItem): boolean {
		if (!item.status) return false;
		const s = item.status.toLowerCase().trim();
		return s.includes("reading") || s.includes("watching");
	}

	private getAvailableGenres(): string[] {
		const genreSet = new Set<string>();
		for (const item of this.library.getAll()) {
			for (const genre of item.genres) {
				genreSet.add(genre);
			}
		}
		return Array.from(genreSet).sort();
	}

	private getAvailableDecades(): string[] {
		return Array.from(new Set(this.library.getAll()
			.map((item) => item.year)
			.filter((year): year is number => typeof year === "number")
			.map((year) => `${Math.floor(year / 10) * 10}s`)))
			.sort((left, right) => Number(right.slice(0, 4)) - Number(left.slice(0, 4)));
	}

	private getVisibleItems(): MediaItem[] {
		let items = this.library.getAll();

		if (this.currentFilter !== "all") {
			items = items.filter((item) => item.mediaType === this.currentFilter);
		}
		if (this.currentGenre !== "all") {
			items = items.filter((item) => item.genres.includes(this.currentGenre));
		}
		if (this.currentDecade !== "all") {
			items = items.filter((item) => String(item.year ?? "").slice(0, 3) === this.currentDecade.slice(0, 3));
		}
		if (this.currentRating === "rated") {
			items = items.filter((item) => typeof item.rating === "number" && item.rating > 0);
		} else if (this.currentRating === "unrated") {
			items = items.filter((item) => !(typeof item.rating === "number" && item.rating > 0));
		} else if (this.currentRating === "high") {
			items = items.filter((item) => typeof item.rating === "number" && item.rating >= 8);
		}
		if (this.currentStatus !== "all") {
			// Convert "completed"/"uncompleted"/"currently" filter to actual status matching
			if (this.currentStatus === "completed") {
				items = items.filter((item) => this.isCompleted(item));
			} else if (this.currentStatus === "uncompleted") {
				items = items.filter((item) => !this.isCompleted(item));
			} else if (this.currentStatus === "currently") {
				items = items.filter((item) => this.isCurrentlyReadingOrWatching(item));
			}
		}

		if (this.searchQuery.trim()) {
			const query = this.searchQuery.trim().toLowerCase();
			items = items.filter((item) => item.title.toLowerCase().includes(query) || item.creator.toLowerCase().includes(query));
		}

		return this.library.sort(items, this.currentSort);
	}

	private topUpVisibleToCompleteRow(gridSelector: string, totalItems: number): boolean {
		const grid = this.contentHost.querySelector<HTMLElement>(gridSelector);
		if (!grid || totalItems <= this.visibleItemCount) {
			return false;
		}

		const styles = window.getComputedStyle(grid);
		const columns = styles.gridTemplateColumns
			.split(" ")
			.map((value) => value.trim())
			.filter((value) => value.length > 0).length;
		if (columns <= 1) {
			return false;
		}

		const rendered = Math.min(this.visibleItemCount, totalItems);
		const remainder = rendered % columns;
		if (remainder === 0) {
			return false;
		}

		const topUp = Math.min(totalItems, rendered + (columns - remainder));
		if (topUp <= this.visibleItemCount) {
			return false;
		}

		this.visibleItemCount = topUp;
		return true;
	}

}

function normalizeMediaCardSize(value: number): number {
	if (!Number.isFinite(value)) {
		return 180;
	}

	return Math.min(320, Math.max(120, Math.round(value / 10) * 10));
}

function getMonthAbbreviation(dateValue: string | undefined): string {
	if (!dateValue) {
		return "---";
	}

	const parsed = new Date(dateValue);
	if (Number.isNaN(parsed.getTime())) {
		return "---";
	}

	return parsed.toLocaleString("en-US", { month: "short" }).toUpperCase();
}

function getDayOfMonth(dateValue: string | undefined): string {
	if (!dateValue) {
		return "--";
	}

	const parsed = new Date(dateValue);
	if (Number.isNaN(parsed.getTime())) {
		return "--";
	}

	return String(parsed.getDate()).padStart(2, "0");
}
