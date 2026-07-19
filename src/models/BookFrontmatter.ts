// src/models/BookFrontmatter.ts

/**
 * Frontmatter shape for a single Book note.
 * All fields are optional so existing notes don’t break.
 */
export interface BookFrontmatter {
	title?: string;
	authors?: string | string[];
	author?: string | string[];

	publisher?: string;
	isbn?: string;
	pages?: number;
	publishDate?: string;   // ISO date or free-form, will be normalized
	datePublished?: string; // alias if you prefer this key

	status?: string;        // e.g. "want to read", "finished reading"
	read?: string;          // legacy boolean/string status

	cover?: string;
	coverUrl?: string;
	image?: string;
	localCover?: string;

	genres?: string[] | string;
	genre?: string | string[];
	category?: string | string[];

	summary?: string;
	description?: string;
	plot?: string;
	synopsis?: string;
	blurb?: string;
	review?: string;

	personalRating?: number | string;

	created?: string;
	dateCreated?: string;
	createdAt?: string;

	dateRead?: string;
	dateFinished?: string;
	finishDate?: string;

	// Anything else lives here without losing type safety completely
	[key: string]: unknown;
}