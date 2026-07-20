import { MediaLibraryCustomList, MediaLibrarySettings } from "../settings";

const FAVORITES_LIST_NAME = "Favorites";

function nowIso(): string {
	return new Date().toISOString();
}

function normalizeName(name: string): string {
	return name.trim().replace(/\s+/g, " ");
}

function makeListId(name: string): string {
	const base = normalizeName(name)
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return `${base || "list"}-${Date.now().toString(36)}`;
}

function findByName(settings: MediaLibrarySettings, listName: string): MediaLibraryCustomList | undefined {
	const target = normalizeName(listName).toLowerCase();
	return settings.customLists.find((list) => list.name.toLowerCase() === target);
}

export function getFavoritesList(settings: MediaLibrarySettings): MediaLibraryCustomList | undefined {
	return findByName(settings, FAVORITES_LIST_NAME);
}

export function ensureFavoritesList(settings: MediaLibrarySettings): MediaLibraryCustomList {
	const existing = getFavoritesList(settings);
	if (existing) {
		return existing;
	}

	const created: MediaLibraryCustomList = {
		id: makeListId(FAVORITES_LIST_NAME),
		name: FAVORITES_LIST_NAME,
		itemPaths: [],
		createdAt: nowIso(),
		updatedAt: nowIso(),
	};
	settings.customLists = [...settings.customLists, created];
	return created;
}

export function createCustomList(settings: MediaLibrarySettings, rawName: string): MediaLibraryCustomList | null {
	const name = normalizeName(rawName);
	if (!name) {
		return null;
	}

	const existing = findByName(settings, name);
	if (existing) {
		return existing;
	}

	const created: MediaLibraryCustomList = {
		id: makeListId(name),
		name,
		itemPaths: [],
		createdAt: nowIso(),
		updatedAt: nowIso(),
	};
	settings.customLists = [...settings.customLists, created];
	return created;
}

export function deleteCustomList(settings: MediaLibrarySettings, listId: string): boolean {
	const before = settings.customLists.length;
	settings.customLists = settings.customLists.filter((list) => list.id !== listId);
	return settings.customLists.length < before;
}

export function addMediaToCustomList(settings: MediaLibrarySettings, listId: string, itemPath: string): boolean {
	const list = settings.customLists.find((entry) => entry.id === listId);
	if (!list || list.itemPaths.includes(itemPath)) {
		return false;
	}

	list.itemPaths = [...list.itemPaths, itemPath];
	list.updatedAt = nowIso();
	return true;
}

export function removeMediaFromCustomList(settings: MediaLibrarySettings, listId: string, itemPath: string): boolean {
	const list = settings.customLists.find((entry) => entry.id === listId);
	if (!list || !list.itemPaths.includes(itemPath)) {
		return false;
	}

	list.itemPaths = list.itemPaths.filter((path) => path !== itemPath);
	list.updatedAt = nowIso();
	return true;
}

export function toggleItemInList(settings: MediaLibrarySettings, listId: string, itemPath: string): boolean {
	const list = settings.customLists.find((entry) => entry.id === listId);
	if (!list) {
		return false;
	}

	const hasItem = list.itemPaths.includes(itemPath);
	list.itemPaths = hasItem
		? list.itemPaths.filter((path) => path !== itemPath)
		: [...list.itemPaths, itemPath];
	list.updatedAt = nowIso();
	return !hasItem;
}

export function addItemToFavorites(settings: MediaLibrarySettings, itemPath: string): boolean {
	const favorites = ensureFavoritesList(settings);
	if (favorites.itemPaths.includes(itemPath)) {
		return false;
	}

	favorites.itemPaths = [...favorites.itemPaths, itemPath];
	favorites.updatedAt = nowIso();
	return true;
}

export function removeItemFromFavorites(settings: MediaLibrarySettings, itemPath: string): boolean {
	const favorites = getFavoritesList(settings);
	if (!favorites || !favorites.itemPaths.includes(itemPath)) {
		return false;
	}

	favorites.itemPaths = favorites.itemPaths.filter((path) => path !== itemPath);
	favorites.updatedAt = nowIso();
	return true;
}

export function isFavorite(settings: MediaLibrarySettings, itemPath: string): boolean {
	const favorites = getFavoritesList(settings);
	return favorites ? favorites.itemPaths.includes(itemPath) : false;
}
