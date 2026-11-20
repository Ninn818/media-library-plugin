import { App, TFile } from "obsidian";

import type { MediaActivityChange, MediaActivityEntry, MediaItem } from "./models";
import { MediaLibraryCustomList, MediaLibrarySettings, TagStorageFormat } from "./settings";

/** Activity logging. */
const ACTIVITY_CALLOUT_HEADER = "> [!media-activity]+ Activity log";

export class ActivityLogService {
	readonly app: App;

	constructor(app: App) {
		this.app = app;
	}

	async loadEntries(file: TFile, item: MediaItem): Promise<MediaActivityEntry[]> {
		const content = await this.app.vault.cachedRead(file);
		const entries = parseActivityEntries(content, item);
		return entries.length ? entries : getFallbackActivityEntries(item);
	}

	async appendEntry(file: TFile, item: MediaItem, entry: MediaActivityEntry): Promise<void> {
		const recordedAt = entry.recordedAt ?? new Date().toISOString();
		await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
			frontmatter.status = entry.status ?? getCompletedStatus(item);
			frontmatter.personalRating = entry.rating ?? undefined;
			frontmatter.progress = entry.progress ?? undefined;
			const historyField = isReadingItem(item) ? "readHistory" : "watchHistory";

			if (isReadingItem(item)) {
				frontmatter.dateRead = entry.date;
				frontmatter.dateFinished = entry.date;
			} else {
				// Preserve the first recorded lastWatched date.
				// If lastWatched is already set, don't overwrite it when
				// new watch history entries are added from the activity modal.
				if (!frontmatter.lastWatched) {
					frontmatter.lastWatched = entry.date;
				}
			}

			const history = Array.isArray(frontmatter[historyField])
				? [...(frontmatter[historyField] as unknown[])]
				: [];
			history.push(entry.date);
			frontmatter[historyField] = history;
		});

		const content = await this.app.vault.cachedRead(file);
		let entries = parseActivityEntries(content, item);
		
		// If there's no activity log yet, populate with fallback entries (including lastWatched)
		if (entries.length === 0) {
			entries = getFallbackActivityEntries(item);
		}
		
		entries.push(normalizeEntry({ ...entry, recordedAt }, item));
		const updated = upsertActivityCallout(content, entries);
		await this.app.vault.modify(file, updated);
	}

	async replaceEntries(file: TFile, item: MediaItem, entries: MediaActivityEntry[]): Promise<void> {
		const latestEntry = [...entries].sort((left, right) =>
			(left.recordedAt ?? left.date).localeCompare(right.recordedAt ?? right.date),
		)[entries.length - 1];
		await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
			frontmatter.status = latestEntry?.status ?? undefined;
			frontmatter.personalRating = latestEntry?.rating ?? undefined;
			frontmatter.progress = latestEntry?.progress ?? undefined;

			const historyField = isReadingItem(item) ? "readHistory" : "watchHistory";
			frontmatter[historyField] = entries.map((entry) => entry.date);
			if (isReadingItem(item)) {
				frontmatter.dateRead = latestEntry?.date ?? undefined;
				frontmatter.dateFinished = latestEntry?.date ?? undefined;
			} else {
				frontmatter.lastWatched = latestEntry?.date ?? undefined;
			}
		});

		const content = await this.app.vault.cachedRead(file);
		const updated = upsertActivityCallout(content, entries.map((entry) => normalizeEntry(entry, item)));
		await this.app.vault.modify(file, updated);
	}
}

export function parseActivityEntries(content: string, item: MediaItem): MediaActivityEntry[] {
	const lines = content.split(/\r?\n/);
	const startIndex = lines.findIndex((line) => line.trim().startsWith("> [!media-activity]"));
	if (startIndex === -1) {
		return [];
	}

	const blockLines: string[] = [];
	for (let index = startIndex + 1; index < lines.length; index += 1) {
		const line = lines[index] ?? "";
		if (!line.trim().startsWith(">")) {
			break;
		}
		blockLines.push(line);
	}

	return blockLines
		.map((line) => parseActivityLine(line, item))
		.filter((entry): entry is MediaActivityEntry => entry !== null)
		.sort((left, right) => left.date.localeCompare(right.date));
}

export function getFallbackActivityEntries(item: MediaItem): MediaActivityEntry[] {
	const raw = item.raw ?? {};
	const historyField = isReadingItem(item) ? "readHistory" : "watchHistory";
	const lastWatchedField = isReadingItem(item) ? "dateRead" : "lastWatched";
	
	// Start with the lastWatched/dateRead as the first activity
	const entries: MediaActivityEntry[] = [];
	const lastWatched = typeof raw[lastWatchedField] === "string" ? raw[lastWatchedField] : null;
	if (lastWatched) {
		entries.push(normalizeEntry({
			date: lastWatched,
			status: item.status,
			rating: item.rating ?? null,
			progress: getRawProgress(raw),
			note: undefined,
			kind: isReadingItem(item) ? "read" : "watch",
		}, item));
	}

	// Add remaining entries from history, excluding duplicates
	const history = Array.isArray(raw[historyField]) ? raw[historyField] : [];
	const historyEntries = history
		.filter((value): value is string => typeof value === "string" && value.length > 0)
		.filter((date) => date !== lastWatched) // Don't duplicate lastWatched if it's also in history
		.map((date) => normalizeEntry({
			date,
			status: item.status,
			rating: item.rating ?? null,
			progress: getRawProgress(raw),
			note: undefined,
			kind: isReadingItem(item) ? "read" : "watch",
		}, item));
	
	entries.push(...historyEntries);

	if (!entries.length && item.date) {
		entries.push(normalizeEntry({
			date: item.date,
			status: item.status,
			rating: item.rating ?? null,
			progress: getRawProgress(raw),
			note: item.review,
			kind: isReadingItem(item) ? "read" : "watch",
		}, item));
	}

	return entries;
}

function parseActivityLine(line: string, item: MediaItem): MediaActivityEntry | null {
	const trimmed = line.trim().replace(/^>\s*-\s*/, "");
	if (!trimmed) {
		return null;
	}

	const values = new Map<string, string>();
	for (const segment of trimmed.split("|")) {
		const [rawKey, ...rawValue] = segment.split(":");
		const key = rawKey?.trim().toLowerCase();
		const value = rawValue.join(":").trim();
		if (key && value) {
			values.set(key, value);
		}
	}

	const date = values.get("date");
	if (!date) {
		return null;
	}

	const ratingValue = values.get("rating");
	const rating = ratingValue ? Number(ratingValue) : null;
	const progressValue = values.get("progress");
	const progress = progressValue ? Number(progressValue) : null;
	const recordedAt = values.get("recorded") ?? date;
	const editedAt = values.get("edited");
	const changes = parseActivityChanges(values.get("changes"));
	return normalizeEntry({
		date,
		recordedAt,
		editedAt,
		changes,
		status: values.get("status") ?? null,
		rating: Number.isFinite(rating) ? rating : null,
		progress: typeof progress === "number" && Number.isFinite(progress) ? clampProgress(progress) : null,
		note: values.get("note") ?? undefined,
		kind: values.get("kind") === "watch" ? "watch" : isReadingItem(item) ? "read" : "watch",
	}, item);
}

function upsertActivityCallout(content: string, entries: MediaActivityEntry[]): string {
	const callout = serializeActivityCallout(entries);
	const lines = content.split(/\r?\n/);
	const startIndex = lines.findIndex((line) => line.trim().startsWith("> [!media-activity]"));

	if (startIndex === -1) {
		return `${content.trimEnd()}\n\n${callout}\n`;
	}

	let endIndex = startIndex + 1;
	while (endIndex < lines.length && (lines[endIndex] ?? "").trim().startsWith(">")) {
		endIndex += 1;
	}

	const updatedLines = [
		...lines.slice(0, startIndex),
		...callout.split("\n"),
		...lines.slice(endIndex),
	];

	return `${updatedLines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`;
}

function serializeActivityCallout(entries: MediaActivityEntry[]): string {
	const normalizedEntries = [...entries].sort((left, right) => left.date.localeCompare(right.date));
	const lines = normalizedEntries.map((entry) => {
		const parts = [`date: ${entry.date}`, `recorded: ${entry.recordedAt ?? entry.date}`, `kind: ${entry.kind}`];
		if (entry.editedAt) {
			parts.push(`edited: ${entry.editedAt}`);
		}
		if (entry.changes?.length) {
			parts.push(`changes: ${entry.changes.join(",")}`);
		}
		if (entry.status) {
			parts.push(`status: ${entry.status}`);
		}
		if (entry.rating != null) {
			parts.push(`rating: ${entry.rating}`);
		}
		if (entry.progress != null) {
			parts.push(`progress: ${entry.progress}`);
		}
		if (entry.note?.trim()) {
			parts.push(`note: ${sanitizeInlineValue(entry.note)}`);
		}
		return `> - ${parts.join(" | ")}`;
	});

	return [ACTIVITY_CALLOUT_HEADER, ...lines].join("\n");
}

function normalizeEntry(entry: MediaActivityEntry, item: MediaItem): MediaActivityEntry {
	return {
		date: entry.date,
		recordedAt: entry.recordedAt ?? entry.date,
		status: entry.status ?? getCompletedStatus(item),
		rating: entry.rating ?? null,
		progress: entry.progress == null ? null : clampProgress(entry.progress),
		note: entry.note?.trim() ? entry.note.trim() : undefined,
		kind: entry.kind ?? (isReadingItem(item) ? "read" : "watch"),
		editedAt: entry.editedAt,
		changes: entry.changes?.length ? [...entry.changes] : undefined,
	};
}

function parseActivityChanges(value: string | undefined): MediaActivityEntry["changes"] {
	const allowedChanges: MediaActivityChange[] = ["date", "status", "rating", "progress", "note"];
	const changes = value
		?.split(",")
		.map((change) => change.trim())
		.filter((change): change is MediaActivityChange => allowedChanges.some((allowed) => allowed === change));
	return changes?.length ? changes : undefined;
}

function sanitizeInlineValue(value: string): string {
	return value.replace(/\|/g, "/").replace(/\s+/g, " ").trim();
}

function isReadingItem(item: MediaItem): boolean {
	return item.mediaType === "book" || item.mediaType === "essay";
}

function getCompletedStatus(item: MediaItem): string {
	return isReadingItem(item) ? "read" : "watched";
}

function getRawProgress(raw: Record<string, unknown>): number | null {
	const progress = typeof raw.progress === "number" ? raw.progress : Number(raw.progress);
	return Number.isFinite(progress) ? clampProgress(progress) : null;
}

function clampProgress(progress: number): number {
	return Math.max(0, Math.min(100, Math.round(progress)));
}

/** Custom lists and favorites. */
const FAVORITES_LIST_NAME = "Favorites";
const UP_NEXT_LIST_NAME = "Up Next";
const CURRENTLY_LIST_NAME = "Currently";

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

export function getUpNextList(settings: MediaLibrarySettings): MediaLibraryCustomList | undefined {
	return findByName(settings, UP_NEXT_LIST_NAME);
}

export function getCurrentlyList(settings: MediaLibrarySettings): MediaLibraryCustomList | undefined {
	return findByName(settings, CURRENTLY_LIST_NAME);
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

export function ensureUpNextList(settings: MediaLibrarySettings): MediaLibraryCustomList {
	const existing = getUpNextList(settings);
	if (existing) {
		return existing;
	}

	const created: MediaLibraryCustomList = {
		id: makeListId(UP_NEXT_LIST_NAME),
		name: UP_NEXT_LIST_NAME,
		itemPaths: [],
		createdAt: nowIso(),
		updatedAt: nowIso(),
	};
	settings.customLists = [...settings.customLists, created];
	return created;
}

export function ensureCurrentlyList(settings: MediaLibrarySettings): MediaLibraryCustomList {
	const existing = getCurrentlyList(settings);
	if (existing) {
		return existing;
	}

	const created: MediaLibraryCustomList = {
		id: makeListId(CURRENTLY_LIST_NAME),
		name: CURRENTLY_LIST_NAME,
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
	settings.favoriteDates = {
		...(settings.favoriteDates ?? {}),
		[itemPath]: nowIso(),
	};
	return true;
}

export function removeItemFromFavorites(settings: MediaLibrarySettings, itemPath: string): boolean {
	const favorites = getFavoritesList(settings);
	if (!favorites || !favorites.itemPaths.includes(itemPath)) {
		return false;
	}

	favorites.itemPaths = favorites.itemPaths.filter((path) => path !== itemPath);
	favorites.updatedAt = nowIso();
	if (settings.favoriteDates?.[itemPath]) {
		const favoriteDates = { ...settings.favoriteDates };
		delete favoriteDates[itemPath];
		settings.favoriteDates = favoriteDates;
	}
	return true;
}

export function isFavorite(settings: MediaLibrarySettings, itemPath: string): boolean {
	const favorites = getFavoritesList(settings);
	return favorites ? favorites.itemPaths.includes(itemPath) : false;
}

/** Media note tags. */
const TAG_BLOCK_START = "<!-- media-library-tags:start -->";
const TAG_BLOCK_END = "<!-- media-library-tags:end -->";
const TAG_CALLOUT_HEADER = "> [!media-tags]+ Media tags";
const MEDIA_TAGS_FIELD = "mediaTags";

function normalizeTag(rawTag: string): string {
	return rawTag.trim().replace(/^#+/, "").replace(/^\[\[|\]\]$/g, "").replace(/\s+/g, "-").toLowerCase();
}

function formatTag(tag: string, format: TagStorageFormat): string {
	if (format === "wikilink") {
		return `[[${tag}]]`;
	}

	return `#${tag}`;
}

function readFrontmatterMediaTags(frontmatter: Record<string, unknown>): string[] {
	const value = frontmatter[MEDIA_TAGS_FIELD];
	if (Array.isArray(value)) {
		return value.map((entry) => String(entry));
	}

	if (typeof value === "string") {
		return value
			.split(/[\s,]+/)
			.map((entry) => entry.trim())
			.filter((entry) => entry.length > 0);
	}

	return [];
}

function renderTagBlock(tags: string[]): string {
	const line = tags.join(" ");
	return `${TAG_BLOCK_START}\n${TAG_CALLOUT_HEADER}\n> ${line}\n${TAG_BLOCK_END}\n`;
}

function upsertInlineTagBlock(content: string, nextTags: string[]): string {
	const startIndex = content.indexOf(TAG_BLOCK_START);
	const endIndex = content.indexOf(TAG_BLOCK_END);

	const deduped = [...new Set(nextTags.map((tag) => tag.trim()).filter((tag) => tag.length > 0))];
	if (deduped.length === 0) {
		return content;
	}

	if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
		const suffix = content.endsWith("\n") ? "" : "\n";
		return `${content}${suffix}\n${renderTagBlock(deduped)}`;
	}

	const before = content.slice(0, startIndex);
	const after = content.slice(endIndex + TAG_BLOCK_END.length);

	const normalizedAfter = after.startsWith("\n") ? after.slice(1) : after;
	return `${before}${renderTagBlock(deduped)}${normalizedAfter}`;
}

export async function addTagToMediaNote(app: App, itemPath: string, rawTag: string, format: TagStorageFormat): Promise<{ added: boolean; value: string; reason?: string }> {
	const file = app.vault.getAbstractFileByPath(itemPath);
	if (!(file instanceof TFile)) {
		return { added: false, value: "", reason: "note-not-found" };
	}

	const normalized = normalizeTag(rawTag);
	if (!normalized) {
		return { added: false, value: "", reason: "empty-tag" };
	}

	const formatted = formatTag(normalized, format);
	let added = false;
	let updatedMediaTags: string[] = [];
	await app.fileManager.processFrontMatter(file, (frontmatter) => {
		const mutableFrontmatter = frontmatter as Record<string, unknown>;
		const tags = readFrontmatterMediaTags(mutableFrontmatter);
		if (tags.includes(formatted)) {
			updatedMediaTags = tags;
			return;
		}
		updatedMediaTags = [...tags, formatted];
		mutableFrontmatter[MEDIA_TAGS_FIELD] = updatedMediaTags;
		added = true;
	});

	if (added) {
		const current = await app.vault.cachedRead(file);
		const updated = upsertInlineTagBlock(current, updatedMediaTags);
		if (updated !== current) {
			await app.vault.modify(file, updated);
		}
	}

	return { added, value: formatted };
}
