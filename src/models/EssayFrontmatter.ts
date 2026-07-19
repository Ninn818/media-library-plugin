// src/models/EssayFrontmatter.ts

/**
 * Frontmatter shape Essay note.
 */
export interface EssayFrontmatter {
	title?: string;

	authors?: string | string[];
	author?: string | string[];

	publication?: string;      // magazine / blog / journal
	publicationUrl?: string;

	genres?: string[] | string;
	genre?: string | string[];
	category?: string | string[];

	status?: string;           // e.g. "finished reading"
	read?: string | boolean;

	cover?: string;
	coverUrl?: string;
	image?: string;
	localCover?: string;

	summary?: string;
	description?: string;
	plot?: string;
	blurb?: string;
	review?: string;

	personalRating?: number | string;

	year?: string | number;
	publishDate?: string;
	datePublished?: string;

	created?: string;
	dateCreated?: string;
	createdAt?: string;

	dateRead?: string;
	dateFinished?: string;
	finishDate?: string;

	[key: string]: unknown;
}