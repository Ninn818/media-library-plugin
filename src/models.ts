export type MediaType = "book" | "movie" | "series" | "essay";

export const MEDIA_TYPES: readonly MediaType[] = ["book", "movie", "series", "essay"];

export function isMediaType(value: string): value is MediaType {
	return MEDIA_TYPES.includes(value as MediaType);
}

export const MEDIA_STATUSES = [
	"unread",
	"reading",
	"read",
	"unwatched",
	"watching",
	"watched",
] as const;

export type MediaStatus = typeof MEDIA_STATUSES[number];

export function isMediaStatus(value: string): value is MediaStatus {
	return MEDIA_STATUSES.includes(value as MediaStatus);
}

export const BOOK_STATUSES: readonly MediaStatus[] = ["unread", "reading", "read"];
export const MOVIE_STATUSES: readonly MediaStatus[] = ["unwatched", "watching", "watched"];
export const SERIES_STATUSES: readonly MediaStatus[] = ["unwatched", "watching", "watched"];

export type MediaActivityKind = "read" | "watch";

export type MediaActivityChange = "date" | "status" | "rating" | "progress" | "note";

export interface MediaActivityEntry {
	date: string;
	status: string | null;
	rating: number | null;
	progress?: number | null;
	note?: string;
	kind: MediaActivityKind;
	recordedAt?: string;
	editedAt?: string;
	changes?: MediaActivityChange[];
}

/** Normalized media data shared by parsers, services, and views. */
export interface MediaItem {
	path: string;
	title: string;
	creator: string;
	mediaType: MediaType;
	status: MediaStatus | null;
	genres: string[];
	summary?: string;
	synopsis?: string;
	rating?: number | null;
	year?: number;
	releaseDate?: string;
	review?: string;
	date?: string;
	createdDate?: string;
	addedDate?: string;
	coverLocal?: string | null;
	coverUrl?: string | null;
	raw?: Record<string, unknown>;
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

export type SortMode = "latest" | "read" | "title" | "creator" | "year" | "rating" | "random";
export type SortDirection = "asc" | "desc";
export type SortType =
	| { mode: SortMode; direction: SortDirection }
	| { mode: "random" };

export const DEFAULT_SORT: SortType = { mode: "latest", direction: "desc" };

type TextList = string | string[];
type TextOrNumber = string | number;

interface BaseMediaFrontmatter {
	title?: string;
	genres?: TextList;
	genre?: TextList;
	category?: TextList;
	status?: string;
	cover?: string;
	coverUrl?: string;
	image?: string;
	localCover?: string;
	summary?: string;
	description?: string;
	plot?: string;
	review?: string;
	personalRating?: number | string;
	created?: string;
	createdAt?: string;
	dateFinished?: string;
	finishDate?: string;
	[key: string]: unknown;
}

export interface BookFrontmatter extends BaseMediaFrontmatter {
	authors?: TextList;
	author?: TextList;
	publisher?: string;
	isbn?: string;
	pages?: number;
	publishDate?: string;
	datePublished?: string;
	read?: string;
	synopsis?: string;
	blurb?: string;
	dateCreated?: string;
	dateRead?: string;
}

export interface MovieFrontmatter extends BaseMediaFrontmatter {
	director?: TextList;
	directors?: TextList;
	actors?: TextList;
	cast?: TextList;
	studio?: string;
	runtime?: TextOrNumber;
	watched?: string | boolean;
	synopsis?: string;
	releaseYear?: TextOrNumber;
	releaseDate?: string;
	year?: TextOrNumber;
	lastWatched?: string;
}

export interface SeriesFrontmatter extends BaseMediaFrontmatter {
	creator?: TextList;
	creators?: TextList;
	watched?: string | boolean;
	inProgress?: boolean;
	dropped?: boolean;
	synopsis?: string;
	releaseYear?: TextOrNumber;
	year?: TextOrNumber;
	releaseDate?: string;
	publishDate?: string;
	datePublished?: string;
	firstAired?: string;
	lastAired?: string;
	airDate?: string;
	dateCreated?: string;
	lastWatched?: string;
}

export interface EssayFrontmatter extends BaseMediaFrontmatter {
	authors?: TextList;
	author?: TextList;
	publication?: string;
	publicationUrl?: string;
	read?: string | boolean;
	blurb?: string;
	year?: TextOrNumber;
	publishDate?: string;
	publishdate?: string;
	datePublished?: string;
	dateCreated?: string;
	dateRead?: string;
}
