// src/models/SortType.ts

/**
 * Every supported sorting option for the Media Library.
 *
 * These values are used by the toolbar, settings,
 * and sorting utilities.
 */
export type SortType =
	| "title-asc"
	| "title-desc"
	| "creator-asc"
	| "creator-desc"
	| "year-asc"
	| "year-desc"
	| "rating-asc"
	| "rating-desc"
	| "date-added-asc"
	| "date-added-desc"
	| "date-created-asc"
	| "date-created-desc"
	| "date-completed-asc"
	| "date-completed-desc"
	| "media-type"
	| "random";

/**
 * List of every supported sort type.
 *
 * Useful for:
 * - Dropdown menus
 * - Settings
 * - Validation
 */
export const SORT_TYPES: readonly SortType[] = [
	"title-asc",
	"title-desc",

	"creator-asc",
	"creator-desc",

	"year-asc",
	"year-desc",

	"rating-asc",
	"rating-desc",

	"date-added-asc",
	"date-added-desc",

	"date-created-asc",
	"date-created-desc",

	"date-completed-asc",
	"date-completed-desc",

	"media-type",

	"random",
];

/**
 * Returns true if a value is a valid SortType.
 */
export function isSortType(value: string): value is SortType {
	return SORT_TYPES.includes(value as SortType);
}

/**
 * Default sort order used when opening the library.
 *
 * This can later be overridden by plugin settings.
 */
export const DEFAULT_SORT: SortType = "date-completed-desc";