// src/models/MovieFrontmatter.ts

/**
 * Frontmatter shape for a Movie note.
 */
export interface MovieFrontmatter {
	title?: string;

	director?: string | string[];
	directors?: string | string[];

	actors?: string | string[];
	cast?: string | string[];

	studio?: string;
	runtime?: number | string; // or "2h 10m"

	genres?: string[] | string;
	genre?: string | string[];
	category?: string | string[];

	status?: string;          // e.g. "finished watching"
	watched?: string | boolean;

	cover?: string;
	coverUrl?: string;
	image?: string;
	localCover?: string;

	summary?: string;
	description?: string;
    plot?: string;
	synopsis?: string;
	review?: string;

	personalRating?: number | string ;
	releaseYear?: string | number;
	releaseDate?: string;
    created?: string; // date the note was created, not the movie
	year?: string | number; // release year
	createdAt?: string;

	lastWatched?: string;
	dateFinished?: string;
	finishDate?: string;

	[key: string]: unknown;
}