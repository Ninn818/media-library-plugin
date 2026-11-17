import { App, setIcon } from "obsidian";

import { ViewRegistry } from "../core";
import { Poster } from "../PluginControllers";
import { MediaItem } from "../models";

export interface ViewSwitcherOptions {
	container: HTMLElement;
	viewRegistry: ViewRegistry;
	initialView?: string;
	onChange?: (viewId: string) => void;
}

/** Builds controls for switching between registered views. */
export class ViewSwitcher {
	private readonly container: HTMLElement;
	private readonly viewRegistry: ViewRegistry;
	private readonly buttons = new Map<string, HTMLButtonElement>();
	private activeView: string;
	private readonly onChange?: (viewId: string) => void;

	constructor(options: ViewSwitcherOptions) {
		this.container = options.container;
		this.viewRegistry = options.viewRegistry;
		this.activeView = options.initialView ?? this.viewRegistry.getDefault().id;
		this.onChange = options.onChange;
		this.render();
	}

	private render(): void {
		this.container.empty();
		const wrapper = this.container.createDiv({ cls: "media-view-switcher" });

		for (const view of this.viewRegistry.getAll()) {
			const button = wrapper.createEl("button", {
				cls: "media-view-switcher-button",
				attr: { title: view.name, "aria-label": view.name },
			});
			button.dataset.viewId = view.id;

			setIcon(button.createSpan({ cls: "media-view-switcher-icon" }), view.icon);
			button.createSpan({ text: view.name, cls: "media-view-switcher-label" });
			button.addEventListener("click", () => this.setActiveView(view.id));
			this.buttons.set(view.id, button);
		}

		this.updateActiveState();
	}

	setActiveView(viewId: string): void {
		if (!this.viewRegistry.has(viewId)) {
			console.warn(`ViewSwitcher: View "${viewId}" does not exist.`);
			return;
		}
		if (this.activeView === viewId) {
			return;
		}

		this.activeView = viewId;
		this.updateActiveState();
		this.onChange?.(viewId);
	}

	private updateActiveState(): void {
		for (const [id, button] of this.buttons) {
			button.toggleClass("is-active", id === this.activeView);
		}
	}

	getActiveView(): string {
		return this.activeView;
	}

	refresh(): void {
		this.buttons.clear();
		this.render();
	}

	destroy(): void {
		this.buttons.clear();
		this.container.empty();
	}
}

export type CardSelectionHandler = (item: MediaItem | null) => void;

export interface CardViewCallbacks {
	onOpenNote?: (item: MediaItem) => void;
	onOpenModal?: (item: MediaItem) => void;
	onToggleFavorite?: (item: MediaItem) => void;
	isFavorite?: (itemPath: string) => boolean;
	onCreatorClick?: (creator: string) => void;
}

export interface LibraryCardOptions {
	selected?: boolean;
	onSelect?: (item: MediaItem) => void;
	onOpenNote?: (item: MediaItem) => void;
	onOpenModal?: (item: MediaItem) => void;
	onToggleFavorite?: (item: MediaItem) => void;
	isFavorite?: boolean;
	onCreatorClick?: (creator: string) => void;
}

export interface LibraryCardTrackOptions extends Omit<LibraryCardOptions, "selected" | "isFavorite"> {
	selectedItem?: MediaItem | null;
	isFavorite?: (itemPath: string) => boolean;
}

/** Renders a card grid, including the empty-library state. */
export function renderLibraryCardTrack(
	container: HTMLElement,
	items: MediaItem[],
	app: App,
	options: LibraryCardTrackOptions = {}
): void {
	container.empty();
	if (!items.length) {
		const empty = container.createDiv({ cls: "media-library-empty" });
		empty.createEl("h2", { text: "Your library is empty" });
		empty.createEl("p", { text: "No supported media notes were found in your vault." });
		return;
	}

	const grid = container.createDiv({ cls: "media-library-grid" });
	for (const item of items) {
		renderLibraryCard(grid, item, app, {
			selected: options.selectedItem?.path === item.path,
			onSelect: options.onSelect,
			onOpenNote: options.onOpenNote,
			onOpenModal: options.onOpenModal,
			onToggleFavorite: options.onToggleFavorite,
			isFavorite: options.isFavorite?.(item.path) ?? false,
			onCreatorClick: options.onCreatorClick,
		});
	}
}

/** Renders one media item's poster, actions, and metadata. */
export function renderLibraryCard(
	container: HTMLElement,
	item: MediaItem,
	app: App,
	options: LibraryCardOptions = {}
): HTMLElement {
	const card = container.createDiv({ cls: "media-card media-card-grid" });
	card.toggleClass("is-selected", options.selected ?? false);
	card.addEventListener("click", () => options.onSelect?.(item));

	const posterShell = card.createDiv({ cls: "media-card-poster-shell" });
	new Poster(item, app).render(posterShell);

	const actionBar = posterShell.createDiv({ cls: "media-card-actions" });
	createActionButton(actionBar, "Open note", "eye", "media-card", () => options.onOpenNote?.(item));
	createActionButton(actionBar, "Favorite", "heart", "media-card", () => options.onToggleFavorite?.(item));
	createActionButton(actionBar, "Open modal", "more-horizontal", "media-card", () => options.onOpenModal?.(item));
	actionBar.toggleClass("is-favorite", options.isFavorite ?? false);

	const body = card.createDiv({ cls: "media-card-body" });

	const head = body.createDiv({ cls: "media-card-head" });
	head.createEl("h3", { text: item.title, attr: { title: item.title } });

	if (item.creator) {
		renderCreatorLinks(head.createDiv({ cls: "media-card-creator" }), item.creator, options.onCreatorClick);
	}

	if (item.genres?.length) {
	const chips = body.createDiv({ cls: "media-card-chip-row" });
	for (const genre of item.genres.slice(0, 2)) {
		chips.createDiv({ text: genre, cls: "media-card-chip" });
	}
	}

	const meta = body.createDiv({ cls: "media-card-meta" });
	const metaRow = meta.createDiv({ cls: "media-card-meta-row" });

	const typeYear = metaRow.createDiv({ cls: "media-card-type-year" });
	typeYear.createSpan({ text: item.mediaType, cls: "media-card-type" });
	if (item.year !== undefined) {
	typeYear.createSpan({ text: "·", cls: "media-card-dot" });
	typeYear.createSpan({ text: String(item.year), cls: "media-card-year" });
	}

	if (item.rating !== null && item.rating !== undefined) {
	metaRow.createDiv({ text: `★ ${item.rating}`, cls: "media-card-rating" });
	}

	if (item.date && (item.status === "read" || item.status === "watched")) {
	const dateRow = meta.createDiv({ cls: "media-card-date" });
	setIcon(dateRow.createSpan({ cls: "media-card-date-icon" }), "calendar-check");
	dateRow.createSpan({ text: formatMediaDate(item.date) });
	}

	return card;
}

/** Renders poster cards and actions in the gallery layout. */
export class GalleryView {
	constructor(private readonly app: App) {}

	render(
		hosts: GalleryViewHosts,
		items: MediaItem[],
		callbacks: GalleryViewCallbacks,
		options: GalleryViewOptions = {}
	): void {
		hosts.carouselHost.empty();
		hosts.carouselHost.addClass("is-hidden");
		hosts.contentHost.empty();

		if (!items.length) {
			hosts.contentHost.createDiv({ cls: "media-library-empty", text: "No media found for this view." });
			return;
		}

		const activeItem = this.pickActiveItem(items, options.activePath);
		const grid = hosts.contentHost.createDiv({ cls: "media-gallery-grid" });
		for (const item of items) {
			this.renderPosterCard(
				grid,
				item,
				activeItem.path === item.path,
				callbacks,
				options.isFavorite?.(item.path) ?? false
			);
		}
	}

	private pickActiveItem(items: MediaItem[], activePath?: string | null): MediaItem {
		const activeItem = activePath ? items.find((item) => item.path === activePath) : undefined;
		if (activeItem) {
			return activeItem;
		}

		const firstItem = items[0];
		if (!firstItem) {
			throw new Error("Cannot select an item from an empty gallery.");
		}
		return firstItem;
	}

	private renderPosterCard(
		container: HTMLElement,
		item: MediaItem,
		isActive: boolean,
		callbacks: GalleryViewCallbacks,
		isFavorite: boolean
	): void {
		const card = container.createDiv({ cls: "media-gallery-card" });
		card.toggleClass("is-active", isActive);
		card.addEventListener("click", () => callbacks.onSelectItem(item));

		new Poster(item, this.app).render(card.createDiv({ cls: "media-gallery-poster" }));
		card.createDiv({
			cls: "media-gallery-hover-title",
			text: item.year ? `${item.title} (${item.year})` : item.title,
		});

		const actionBar = card.createDiv({ cls: "media-gallery-actions" });
		createActionButton(actionBar, "Open note", "eye", "media-gallery", () => callbacks.onOpenNote(item));
		createActionButton(actionBar, "Favorite", "heart", "media-gallery", () => callbacks.onToggleFavorite(item));
		createActionButton(actionBar, "Open modal", "more-horizontal", "media-gallery", () => callbacks.onOpenModal(item));
		actionBar.toggleClass("is-favorite", isFavorite);
	}
}

export interface GalleryViewHosts {
	carouselHost: HTMLElement;
	contentHost: HTMLElement;
}

export interface GalleryViewCallbacks {
	onSelectItem(item: MediaItem): void;
	onOpenNote(item: MediaItem): void;
	onOpenModal(item: MediaItem): void;
	onToggleFavorite(item: MediaItem): void;
}

export interface GalleryViewOptions {
	activePath?: string | null;
	isFavorite?: (itemPath: string) => boolean;
}

function formatMediaDate(value: string): string {
	const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
	if (Number.isNaN(date.getTime())) {
		return value;
	}

	const month = date.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
	return `${month} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

function createActionButton(
	container: HTMLElement,
	label: string,
	icon: string,
	classPrefix: string,
	onClick: () => void
): void {
	const button = container.createEl("button", {
		cls: `${classPrefix}-action-button`,
		attr: { "aria-label": label, title: label },
	});
	setIcon(button.createSpan({ cls: `${classPrefix}-action-icon` }), icon);
	button.addEventListener("click", (event) => {
		event.preventDefault();
		event.stopPropagation();
		onClick();
	});
}

/** Renders a selectable responsive card grid. */
export class CardView {
	constructor(private readonly app: App) {}

	render(
		container: HTMLElement,
		items: MediaItem[],
		selectedItem: MediaItem | null = null,
		onSelect: CardSelectionHandler | null = null,
		callbacks: CardViewCallbacks = {}
	): void {
		renderLibraryCardTrack(container, items, this.app, {
			selectedItem,
			onSelect: onSelect ?? undefined,
			onOpenNote: callbacks.onOpenNote,
			onOpenModal: callbacks.onOpenModal,
			onToggleFavorite: callbacks.onToggleFavorite,
			isFavorite: callbacks.isFavorite,
			onCreatorClick: callbacks.onCreatorClick,
		});
	}
}

/** Renders a compact, row-based table of media items. */
export class TableView {
  constructor(private readonly app: App) {}

  render(
    container: HTMLElement,
    items: MediaItem[],
    selectedItem: MediaItem | null = null,
    onSelect: CardSelectionHandler | null = null,
    callbacks: CardViewCallbacks = {}
  ): void {
    container.empty();

    if (!items.length) {
      container.createDiv({ cls: "media-library-empty", text: "No media found for this view." });
      return;
    }

    const table = container.createDiv({ cls: "media-table" });

    const head = table.createDiv({ cls: "media-table-row media-table-head" });
    for (const label of ["", "Title", "Creator", "Type", "Year", "Rating", "Status", ""]) {
      head.createDiv({ cls: "media-table-cell", text: label });
    }

    for (const item of items) {
      const row = table.createDiv({ cls: "media-table-row media-table-item" });
      row.toggleClass("is-selected", selectedItem?.path === item.path);
      row.addEventListener("click", () => onSelect?.(item));

      new Poster(item, this.app).render(row.createDiv({ cls: "media-table-cell media-table-poster" }));

      const title = row.createDiv({ cls: "media-table-cell media-table-title" });
      title.createDiv({ cls: "media-table-title-text", text: item.title });
      if (item.genres?.length) {
        title.createDiv({ cls: "media-table-subtext", text: item.genres.slice(0, 2).join(" • ") });
      }

	const creator = row.createDiv({ cls: "media-table-cell media-table-creator" });
	if (item.creator) {
		renderCreatorLinks(creator, item.creator, callbacks.onCreatorClick);
	} else {
		creator.setText("—");
	}

      row.createDiv({ cls: "media-table-cell media-table-type", text: item.mediaType });
      row.createDiv({ cls: "media-table-cell", text: item.year ? String(item.year) : "—" });
      row.createDiv({
        cls: "media-table-cell media-table-rating",
        text: item.rating != null ? `★ ${item.rating}` : "—",
      });
      row.createDiv({ cls: "media-table-cell media-table-status", text: item.status ?? "—" });

      const actions = row.createDiv({ cls: "media-table-cell media-table-actions" });
      createActionButton(actions, "Open note", "eye", "media-table", () => callbacks.onOpenNote?.(item));
      createActionButton(actions, "Favorite", "heart", "media-table", () => callbacks.onToggleFavorite?.(item));
      actions.toggleClass("is-favorite", callbacks.isFavorite?.(item.path) ?? false);
    }
  }
}

/** "A, B" becomes ["A", "B"]. A trailing "Jr." or "III" stays with the previous name. */
function splitCreatorNames(creator: string): string[] {
	const names: string[] = [];
	for (const part of creator.split(",").map((entry) => entry.trim()).filter(Boolean)) {
		const previous = names[names.length - 1];
		if (previous && /^(jr|sr|ii|iii|iv)\.?$/i.test(part)) {
			names[names.length - 1] = `${previous}, ${part}`;
		} else {
			names.push(part);
		}
	}
	return names;
}

/** Renders each creator as its own clickable name, separated by commas. */
function renderCreatorLinks(container: HTMLElement, creator: string, onClick?: (name: string) => void): void {
	const names = splitCreatorNames(creator);
	names.forEach((name, index) => {
		const link = container.createSpan({ cls: "media-card-creator-name", text: name });
		link.setAttr("role", "button");
		link.setAttr("tabindex", "0");
		const activate = (event: Event): void => {
			event.preventDefault();
			event.stopPropagation();
			onClick?.(name);
		};
		link.addEventListener("click", activate);
		link.addEventListener("keydown", (event) => {
			if (event.key === "Enter" || event.key === " ") activate(event);
		});
		if (index < names.length - 1) {
			container.appendText(", ");
		}
	});
}