// src/models/MediaType.ts

/**
 * Every supported media type.
 *
 * New media types should be added here
 * before implementing a parser.
 */
export type MediaType =
	| "book"
	| "movie"
	| "series"
	| "essay";

/**
 * Ordered list of supported media types.
 *
 * Useful for:
 * - Filter bars
 * - Dropdowns
 * - Settings
 * - Validation
 */
export const MEDIA_TYPES: readonly MediaType[] = [
	"book",
	"movie",
	"series",
	"essay",
];

/**
 * Returns true if the provided value
 * is a supported media type.
 */
export function isMediaType(value: string): value is MediaType {
	return MEDIA_TYPES.includes(value as MediaType);
}