import { App } from "obsidian";

import { Poster } from "../../components/Poster";
import { MediaItem } from "../../models/MediaItem";
import { MediaLibraryCustomList, SocialHubTab } from "../../settings";
import { getCompletionEvents, getCompletionLabel } from "../../utils/ActivityLabels";
import { timeAgoFromDate } from "../../utils/TimeAgo";

export interface LibrarySocialHubState {
	app: App;
	activeTab: SocialHubTab;
	items: MediaItem[];
	lists: MediaLibraryCustomList[];
	favorites: MediaLibraryCustomList | null;
	allItemsByPath: Map<string, MediaItem>;
	selectedItem: MediaItem | null;
}

export interface LibrarySocialHubCallbacks {
	onTabChange(tab: SocialHubTab): void;
	onCreateList(name: string): void;
	onDeleteList(listId: string): void;
	onAddItemToList(listId: string, itemPath: string): void;
	onRemoveItemFromList(listId: string, itemPath: string): void;
	onOpenItem(item: MediaItem): void;
	onAddTag(item: MediaItem, tag: string): void;
	onOpenList?(list: MediaLibraryCustomList): void;
}

const TAB_DEFINITIONS: Array<{ id: SocialHubTab; label: string }> = [
	{ id: "activity", label: "Activity" },
	{ id: "lists", label: "Lists" },
	{ id: "favorites", label: "Favorites" },
	{ id: "tags", label: "Tags" },
];

export interface LibrarySocialHubOptions {
	showTabs?: boolean;
}

export function renderLibrarySocialHub(
	container: HTMLElement,
	state: LibrarySocialHubState,
	callbacks: LibrarySocialHubCallbacks,
	options: LibrarySocialHubOptions = {}
): void {
	const shell = container.createDiv({ cls: "media-social-hub" });

	if (options.showTabs !== false) {
		const tabs = shell.createDiv({ cls: "media-social-tabs" });

		for (const tab of TAB_DEFINITIONS) {
			const button = tabs.createEl("button", {
				text: tab.label,
				cls: "media-social-tab",
			});
			button.type = "button";
			if (state.activeTab === tab.id) {
				button.addClass("is-active");
			}
			button.addEventListener("click", () => callbacks.onTabChange(tab.id));
		}
	}

	const panel = shell.createDiv({ cls: "media-social-panel" });
	if (state.activeTab === "activity") {
		renderActivityPanel(panel, state, callbacks);
		return;
	}

	if (state.activeTab === "lists") {
		renderListsPanel(panel, state, callbacks);
		return;
	}

	if (state.activeTab === "tags") {
		renderTagsPanel(panel, state, callbacks);
		return;
	}

	renderFavoritesPanel(panel, state, callbacks);
}

function renderActivityPanel(container: HTMLElement, state: LibrarySocialHubState, callbacks: LibrarySocialHubCallbacks): void {
	const events = state.items
		.flatMap((item) => {
			const rows: Array<{ date: string; title: string; item: MediaItem; elapsed: string }> = [];
			for (const event of getCompletionEvents(item)) {
				rows.push({
					date: event.date,
					title: `${item.title} • ${getCompletionLabel(item, event.isRepeat)}`,
					item,
					 elapsed: timeAgoFromDate(event.date),
				});
			}
			if (item.addedDate) {
				rows.push({ date: item.addedDate, title: `${item.title} • added`, item, elapsed: timeAgoFromDate(item.addedDate) });
			}
			return rows;
		})
		.sort((left, right) => right.date.localeCompare(left.date))
		.slice(0, 6);

	if (!events.length) {
		container.createDiv({ cls: "media-social-empty", text: "No recent activity in this filtered view." });
		return;
	}

	const list = container.createDiv({ cls: "media-social-list" });
	for (const event of events) {
		const row = list.createDiv({ cls: "media-social-row" });
		row.createDiv({ cls: "media-social-row-title", text: event.title });
		row.createDiv({ cls: "media-social-row-meta", text: `${event.date} • ${event.elapsed}` });
		row.addEventListener("click", () => callbacks.onOpenItem(event.item));
	}
}

function renderListsPanel(
  container: HTMLElement,
  state: LibrarySocialHubState,
  callbacks: LibrarySocialHubCallbacks,
): void {
  // Simple "Lists" view only. No alternate modes.
  const createRow = container.createDiv({ cls: "media-social-create-row" });
  const nameInput = createRow.createEl("input", {
    type: "text",
    placeholder: "Create a list",
  });
  const createButton = createRow.createEl("button", { text: "Add" });
  createButton.type = "button";
  createButton.addEventListener("click", () => {
    callbacks.onCreateList(nameInput.value);
    nameInput.value = "";
  });
  nameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      callbacks.onCreateList(nameInput.value);
      nameInput.value = "";
    }
  });

  if (!state.lists.length) {
    container.createDiv({
      cls: "media-social-empty",
      text: "No lists yet. Create one above.",
    });
    return;
  }

  const listGrid = container.createDiv({ cls: "media-social-list-grid" });
  for (const list of state.lists) {
    const card = listGrid.createDiv({ cls: "media-social-list-card" });
		const listItems = list.itemPaths
			.map((path) => state.allItemsByPath.get(path))
			.filter((item): item is MediaItem => Boolean(item));

    // Header (name + delete)
    const head = card.createDiv({ cls: "media-social-list-head" });
    head.createDiv({ cls: "media-social-list-name", text: list.name });
    const deleteButton = head.createEl("button", {
      cls: "media-social-list-delete",
      text: "Delete",
    });
    deleteButton.type = "button";
    deleteButton.addEventListener("click", (ev) => {
      ev.stopPropagation();
      callbacks.onDeleteList(list.id);
    });

    // Meta line
    card.createDiv({
      cls: "media-social-list-meta",
			text: `${listItems.length} ${
				listItems.length === 1 ? "item" : "items"
      }`,
    });

    // Description preview (2 lines max via CSS)
    card.createDiv({
      cls: "media-social-list-description",
      text: list.description || "No description yet.",
    });

    // Preview: up to 5 items
	if (!listItems.length) {
      card.createDiv({
        cls: "media-social-empty",
        text: "No media in this list yet.",
      });
    } else {
      const previewGrid = card.createDiv({ cls: "media-social-mini-grid" });
      const PREVIEW_LIMIT = 5;
			const paths = list.itemPaths
				.filter((path) => state.allItemsByPath.has(path))
				.slice(0, PREVIEW_LIMIT);

      for (const path of paths) {
        const item = state.allItemsByPath.get(path);
        if (!item) {
          continue;
        }
        renderMiniCard(
          previewGrid,
          state.app,
          item,
          () => {
            callbacks.onOpenItem(item);
          },
          () => {
            callbacks.onRemoveItemFromList(list.id, path);
          },
        );
      }

	const remaining = Math.max(0, listItems.length - PREVIEW_LIMIT);
      if (remaining > 0) {
        card.createDiv({
          cls: "media-social-list-footer",
          text: `+ ${remaining} more…`,
        });
      }
    }

    // Clicking anywhere on the card (except specific buttons) opens detail modal
    card.addEventListener("click", () => {
      callbacks.onOpenList?.(list);
    });
  }
}

function renderFavoritesPanel(container: HTMLElement, state: LibrarySocialHubState, callbacks: LibrarySocialHubCallbacks): void {
	const favorites = state.favorites;
	if (!favorites || !favorites.itemPaths.length) {
		container.createDiv({ cls: "media-social-empty", text: "No favorites yet. Tap the heart on a poster." });
		return;
	}

	const list = container.createDiv({ cls: "media-social-list" });
	const previewGrid = list.createDiv({ cls: "media-social-mini-grid" });
	for (const path of favorites.itemPaths) {
		const item = state.allItemsByPath.get(path);
		if (!item) {
			continue;
		}
		renderMiniCard(previewGrid, state.app, item, () => {
			callbacks.onOpenItem(item);
		}, undefined);
	}
}

function renderTagsPanel(container: HTMLElement, state: LibrarySocialHubState, callbacks: LibrarySocialHubCallbacks): void {
	const shell = container.createDiv({ cls: "media-social-tags-shell" });
	shell.createDiv({ cls: "media-social-tags-title", text: "Tags" });

	const tagMap = buildTagMediaMap(state);
	if (!tagMap.size) {
		shell.createDiv({ cls: "media-social-empty", text: "No saved tags yet." });
		return;
	}

	const taggedWrap = shell.createDiv({ cls: "media-social-tagged-wrap" });
	taggedWrap.createDiv({ cls: "media-social-tags-title", text: "Media by tag" });

	for (const [tag, media] of [...tagMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
		const group = taggedWrap.createDiv({ cls: "media-social-tag-group" });
		group.createDiv({ cls: "media-social-tag-group-name", text: tag });
		const groupGrid = group.createDiv({ cls: "media-social-mini-grid" });
		for (const item of media) {
			renderMiniCard(groupGrid, state.app, item, () => {
				callbacks.onOpenItem(item);
			}, undefined);
		}
	}
}

function buildTagMediaMap(state: LibrarySocialHubState): Map<string, MediaItem[]> {
	const map = new Map<string, MediaItem[]>();
	for (const item of state.allItemsByPath.values()) {
		for (const tag of extractTags(item)) {
			const existing = map.get(tag) ?? [];
			existing.push(item);
			map.set(tag, existing);
		}
	}

	return map;
}

function extractTags(item: MediaItem): string[] {
	const raw = item.raw as { mediaTags?: unknown } | undefined;
	const source = raw?.mediaTags;
	const values = Array.isArray(source)
		? source.map((entry) => String(entry))
		: typeof source === "string"
			? source.split(/[\s,]+/)
			: [];

	return values
		.map((value) => value.trim())
		.filter((value) => value.length > 0)
		.map((value) => value.replace(/^#/, "").replace(/^\[\[|\]\]$/g, ""));
}

function renderMiniCard(
	container: HTMLElement,
	app: App,
	item: MediaItem,
	onOpen: () => void,
	onRemove?: () => void
): void {
	const card = container.createDiv({ cls: "media-social-mini-card" });
	const poster = card.createDiv({ cls: "media-social-mini-poster" });
	new Poster(item, app).render(poster);
	card.createDiv({ cls: "media-social-mini-title", text: item.title });
	card.addEventListener("click", () => onOpen());

	if (onRemove) {
		const removeButton = card.createEl("button", { cls: "media-social-mini-remove", text: "×" });
		removeButton.type = "button";
		removeButton.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			onRemove();
		});
	}
}
