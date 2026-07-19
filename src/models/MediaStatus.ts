// src/models/MediaStatus.ts

/**
 * Every supported media status.
 *
 * If you add a new status,
 * add it here and the rest of the plugin
 * will automatically recognize it.
 */
export const MEDIA_STATUSES = [
	"unread",
	"read",
	"reading",
	"finished",
	"want to read",
	"unwatched",
	"watched",
	"watching",
	"want to watch",
	"completed",
	"dropped",
	"paused",
	"on hold",
	"abandoned",
	"planned",
	"favorite",
] as const;

/**
 * MediaStatus is automatically inferred
 * from MEDIA_STATUSES.
 */
export type MediaStatus = typeof MEDIA_STATUSES[number];

/**
 * Returns true if a string is a valid MediaStatus.
 */
export function isMediaStatus(value: string): value is MediaStatus {
	return MEDIA_STATUSES.includes(value as MediaStatus);
}

/**
 * Book-specific statuses.
 */
export const BOOK_STATUSES: readonly MediaStatus[] = [
	"want to read",
	"reading",
	"finished",
	"dropped",
	"paused",
	"favorite",
];

/**
 * Movie-specific statuses.
 */
export const MOVIE_STATUSES: readonly MediaStatus[] = [
	"want to watch",
	"watched",
	"favorite",
];

/**
 * Series-specific statuses.
 */
export const SERIES_STATUSES: readonly MediaStatus[] = [
	"want to watch",
	"watching",
	"completed",
	"paused",
	"dropped",
	"favorite",
];