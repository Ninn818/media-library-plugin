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
	"reading",
	"read",
	"unwatched",
	"watching",
	"watched",
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
	"unread",
	"reading",
	"read",
];

/**
 * Movie-specific statuses.
 */
export const MOVIE_STATUSES: readonly MediaStatus[] = [
	"unwatched",
	"watching",
	"watched",
];

/**
 * Series-specific statuses.
 */
export const SERIES_STATUSES: readonly MediaStatus[] = [
	"unwatched",
	"watching",
	"watched",
];