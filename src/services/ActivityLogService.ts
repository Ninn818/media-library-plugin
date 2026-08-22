import { App, TFile } from "obsidian";

import { MediaActivityEntry } from "../models/MediaActivityEntry";
import { MediaItem } from "../models/MediaItem";

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
		await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
			frontmatter.status = entry.status ?? getCompletedStatus(item);
			frontmatter.personalRating = entry.rating ?? undefined;
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
		
		entries.push(normalizeEntry(entry, item));
		const updated = upsertActivityCallout(content, entries);
		await this.app.vault.modify(file, updated);
	}

	async replaceEntries(file: TFile, item: MediaItem, entries: MediaActivityEntry[]): Promise<void> {
		const latestEntry = entries[entries.length - 1];
		await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
			frontmatter.status = latestEntry?.status ?? undefined;
			frontmatter.personalRating = latestEntry?.rating ?? undefined;

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
			note: undefined,
			kind: isReadingItem(item) ? "read" : "watch",
		}, item));
	
	entries.push(...historyEntries);

	if (!entries.length && item.date) {
		entries.push(normalizeEntry({
			date: item.date,
			status: item.status,
			rating: item.rating ?? null,
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
	return normalizeEntry({
		date,
		status: values.get("status") ?? null,
		rating: Number.isFinite(rating) ? rating : null,
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
		const parts = [`date: ${entry.date}`, `kind: ${entry.kind}`];
		if (entry.status) {
			parts.push(`status: ${entry.status}`);
		}
		if (entry.rating != null) {
			parts.push(`rating: ${entry.rating}`);
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
		status: entry.status ?? getCompletedStatus(item),
		rating: entry.rating ?? null,
		note: entry.note?.trim() ? entry.note.trim() : undefined,
		kind: entry.kind ?? (isReadingItem(item) ? "read" : "watch"),
	};
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