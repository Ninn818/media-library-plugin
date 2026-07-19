// src/models/MediaItem.ts

import { MediaStatus } from "./MediaStatus";
import { MediaActivityEntry } from "./MediaActivityEntry";
import { MediaType } from "./MediaType";

/**
 * Universal media object used throughout the plugin.
 *
 * Every parser (Book, Movie, Essay, Series, etc.)
 * converts its frontmatter into this shape.
 *
 * The UI should ONLY work with MediaItem objects and
 * should never read frontmatter directly.
 */
export interface MediaItem {
	/**
	 * Absolute vault path to the markdown file.
	 */
	path: string;

	/**
	 * Display title.
	 */
	title: string;

	/**
	 * Primary creator.
	 *
	 * Book   → Author
	 * Movie  → Director
	 * Series → Creator
	 * Essay  → Author
	 */
	creator: string;

	/**
	 * Type of media.
	 */
	mediaType: MediaType;

	/**
	 * Current user status.
	 */
	status: MediaStatus | null;

	/**
	 * Genres/categories.
	 */
	genres: string[];

	/**
	 * Short description.
	 */
	summary?: string;

	/**
	 * Longer synopsis if available.
	 */
	synopsis?: string;

	/**
	 * Personal rating.
	 */
	rating?: number | null;

	/**
	 * Release / publish year.
	 *
	 * Example:
	 * 2024
	 */
	year?: number;

	/**
	 * Full release date.
	 */
	releaseDate?: string;

	/**
	 * Optional personal review text.
	 */
	review?: string;

	/**
	 * Date the media was completed/read/watched.
	 */
	date?: string;

	/**
	 * Date the note was created.
	 */
	createdDate?: string;

	/**
	 * Date the note was added to the library.
	 */
	addedDate?: string;

	/**
	 * Local vault cover.
	 */
	coverLocal?: string | null;

	/**
	 * External cover URL.
	 */
	coverUrl?: string | null;

	/**
	 * Original frontmatter.
	 *
	 * Keeping this lets future features access
	 * media-specific properties without reparsing.
	 */
	raw?: Record<string, unknown>;

	/**
	 * Additional common properties present in many notes.
	 */
	pages?: number | null;

	isbn?: string | null;

	duration?: string | null;

	externalId?: string | null;

	url?: string | null;

	actors?: string[];

	publisher?: string | null;
	studio?: string | null;
	activityEntries?: MediaActivityEntry[];
}