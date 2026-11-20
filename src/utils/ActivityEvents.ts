import type { MediaActivityChange, MediaActivityEntry, MediaItem } from "../models";
import { getCompletionLabel } from "./ActivityLabels";

/**
 * Turns an item's log into the lines shown in the activity feed.
 *
 * Every event gets the time it actually happened:
 * - reading or watching something happened on the entry's own date
 * - rating it or adding a note happened when the entry was first logged
 *   (recordedAt, which an edit never changes)
 * - an edit happened when you edited it (editedAt), and says what you changed
 * - favoriting happened when you favorited it
 */

export type ActivityEventKind = "finished" | "progress" | "rated" | "noted" | "edited" | "favorited" | "added";

export interface ActivityEvent {
	item: MediaItem;
	kind: ActivityEventKind;
	prefix: string;
	suffix: string;
	/** YYYY-MM-DD when only the day is known, a full ISO time otherwise. */
	timestamp: string;
	/** Set on in-progress events so callers can pick the right icon. */
	activity?: "reading" | "watching";
}

const CHANGE_LABELS: Record<MediaActivityChange, string> = {
	date: "date",
	status: "status",
	rating: "rating",
	progress: "progress",
	note: "note",
};

export function buildActivityEvents(item: MediaItem, favoriteDate?: string): ActivityEvent[] {
	const events: ActivityEvent[] = [];
	const entries = [...(item.activityEntries ?? [])].sort(
		(left, right) => left.date.localeCompare(right.date) || (left.recordedAt ?? "").localeCompare(right.recordedAt ?? ""),
	);

	let finishedBefore = 0;
	for (const entry of entries) {
		const status = (entry.status ?? "").toLowerCase().trim();
		const changes = entry.changes ?? [];
		const recorded = entry.recordedAt ?? entry.date;

		if (status === "reading" || status === "watching") {
			events.push({
				item,
				kind: "progress",
				activity: status,
				prefix: `You're currently ${status} `,
				suffix: entry.progress != null ? ` (${entry.progress}%)` : "",
				timestamp: entry.date,
			});
		} else {
			events.push({
				item,
				kind: "finished",
				prefix: `You ${getCompletionLabel(item, finishedBefore > 0)} `,
				suffix: "",
				timestamp: entry.date,
			});
			finishedBefore += 1;
		}

		// A rating that was changed later is reported by the edit, not as a rating from back then.
		if (entry.rating != null && !changes.includes("rating")) {
			events.push({ item, kind: "rated", prefix: "You rated ", suffix: ` ${entry.rating}/10`, timestamp: recorded });
		}

		if (entry.note?.trim() && !changes.includes("note")) {
			events.push({ item, kind: "noted", prefix: "You added a note on ", suffix: "", timestamp: recorded });
		}

		if (entry.editedAt && changes.length > 0) {
			events.push({ item, kind: "edited", ...describeEdit(entry, changes), timestamp: entry.editedAt });
		}
	}

	if (favoriteDate) {
		events.push({ item, kind: "favorited", prefix: "You favorited ", suffix: "", timestamp: favoriteDate });
	}

	if (!events.length && item.addedDate) {
		events.push({ item, kind: "added", prefix: "You added ", suffix: "", timestamp: item.addedDate });
	}

	return events;
}

function describeEdit(entry: MediaActivityEntry, changes: MediaActivityChange[]): { prefix: string; suffix: string } {
	if (changes.length === 1) {
		switch (changes[0]) {
			case "note":
				return { prefix: entry.note?.trim() ? "You edited your note on " : "You removed your note on ", suffix: "" };
			case "rating":
				return entry.rating != null
					? { prefix: "You changed your rating of ", suffix: ` to ${entry.rating}/10` }
					: { prefix: "You removed your rating of ", suffix: "" };
			case "progress":
				return {
					prefix: "You updated your progress on ",
					suffix: entry.progress != null ? ` to ${entry.progress}%` : "",
				};
			case "status":
				return { prefix: "You changed the status of ", suffix: entry.status ? ` to ${entry.status}` : "" };
			case "date":
				return { prefix: "You changed the date of ", suffix: "" };
		}
	}

	const names = changes.map((change) => CHANGE_LABELS[change]);
	const last = names[names.length - 1] ?? "";
	const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${last}` : last;
	return { prefix: `You edited the ${list} on `, suffix: "" };
}

export function latestEventTimestamp(events: ActivityEvent[]): string {
	return events.reduce((latest, event) => (event.timestamp > latest ? event.timestamp : latest), "");
}

/** "now", "12m", "3h", "today", "5d", "2mo", "1y". Day-only timestamps never show hours. */
export function formatEventAge(timestamp: string, now: number = Date.now()): string {
	const value = timestamp.trim();
	const dayOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
	const parsed = dayOnly ? new Date(`${value}T00:00:00`) : new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		return "";
	}

	if (dayOnly) {
		const today = new Date(now);
		const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
		const days = Math.round((startOfToday - parsed.getTime()) / 86400000);
		return days <= 0 ? "today" : compactDays(days);
	}

	const minutes = Math.floor((now - parsed.getTime()) / 60000);
	if (minutes < 1) return "now";
	if (minutes < 60) return `${minutes}m`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h`;
	return compactDays(Math.floor(hours / 24));
}

function compactDays(days: number): string {
	if (days < 30) return `${days}d`;
	if (days < 365) return `${Math.floor(days / 30)}mo`;
	return `${Math.floor(days / 365)}y`;
}
