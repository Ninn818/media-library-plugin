// src/models/SortType.ts

/**
 * Every supported sorting option for the Media Library.
 *
 * These values are used by the toolbar, settings,
 * and sorting utilities.
 */
// SortType.ts

// Which field we sort by (recency = "latest" is handled by the sorter using your data, e.g. year)
export type SortMode = "latest" | "read" | "title" | "creator" | "year" | "rating" | "random";

// Sort direction
export type SortDirection = "asc" | "desc";

// Sort options:
// - For deterministic sorting: provide { mode, direction }
// - For random ordering: use { mode: "random" }
export type SortType =
  | { mode: SortMode; direction: SortDirection }
  | { mode: "random" };

/**
 * Default sort order used when opening the library.
 *
 * This can later be overridden by plugin settings.
 */
export const DEFAULT_SORT: SortType = { mode: "latest", direction: "desc" };