import { MediaItem } from "../models/MediaItem";

export interface CompletionEvent {
	date: string;
	isRepeat: boolean;
}

export function getCompletionEvents(item: MediaItem): CompletionEvent[] {
	const raw = item.raw ?? {};
	const historyField = isReadingItem(item) ? "readHistory" : "watchHistory";
	const history = Array.isArray(raw[historyField])
		? raw[historyField].filter((value): value is string => typeof value === "string" && value.trim().length > 0)
		: [];

	if (history.length) {
		return history.map((date, index) => ({ date: date.trim(), isRepeat: index > 0 }));
	}

	const directCandidates = [
		raw[isReadingItem(item) ? "dateRead" : "dateWatched"],
		raw[isReadingItem(item) ? "dateFinished" : "lastWatched"],
		raw[isReadingItem(item) ? "finishDate" : "watchDate"],
	];
	const directDate = directCandidates.find(
		(value): value is string => typeof value === "string" && value.trim().length > 0,
	);

	return directDate || item.date ? [{ date: (directDate ?? item.date) as string, isRepeat: false }] : [];
}

export function getCompletionLabel(item: MediaItem, isRepeat: boolean): string {
	if (isReadingItem(item)) {
		return isRepeat ? "reread" : "read";
	}

	return isRepeat ? "rewatched" : "watched";
}

function isReadingItem(item: MediaItem): boolean {
	return item.mediaType === "book" || item.mediaType === "essay";
}