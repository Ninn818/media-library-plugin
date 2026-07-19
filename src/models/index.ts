// src/models/index.ts

/**
 * Barrel exports for every shared model.
 *
 * Instead of:
 *
 * import { MediaItem } from "./MediaItem";
 * import { BookFrontmatter } from "./BookFrontmatter";
 *
 * You can simply do:
 *
 * import { MediaItem, BookFrontmatter } from "../models";
 */

export * from "./MediaItem";
export * from "./SortType";
export * from "./BookFrontmatter";
export * from "./MovieFrontmatter";
export * from "./EssayFrontmatter";
export * from "./SeriesFrontmatter";
export * from "./MediaType";
export * from "./MediaStatus";
export * from "./MediaActivityEntry";