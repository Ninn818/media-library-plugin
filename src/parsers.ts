import { TFile } from "obsidian";

import {
	BookFrontmatter,
	EssayFrontmatter,
	MediaItem,
	MediaStatus,
	MediaType,
	MovieFrontmatter,
	SeriesFrontmatter,
	isMediaStatus,
} from "./models";

/**
 * BaseParser
 *
 * Every media parser (Book, Movie, Series, Essay, etc.)
 * extends this class.
 *
 * It contains helper methods for converting inconsistent
 * frontmatter into normalized values.
 *
 * No parser should duplicate this logic.
 */
export abstract class BaseParser<TFrontmatter> {
	/**
	 * Every parser must implement parse().
	 */
	abstract parse(
		path: string,
		frontmatter: TFrontmatter
	): MediaItem | null;

	/**
	 * Returns the first non-empty string.
	 *
	 * Useful for aliases:
	 *
	 * author
	 * authors
	 * creator
	 * director
	 */
    protected firstString(...values: unknown[]): string {
    for (const value of values) {
        if (Array.isArray(value)) {
        for (const v of value) {
            if (typeof v === "string") {
            const trimmed = v.trim();
            if (trimmed.length > 0) return trimmed;
            }
        }
        } else if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed.length > 0) return trimmed;
        }
    }
    return "";
    }

	/**
	 * Converts
	 *
	 * "Fantasy"
	 *
	 * or
	 *
	 * ["Fantasy","Adventure"]
	 *
	 * into
	 *
	 * ["Fantasy","Adventure"]
	 */
	protected normalizeStringArray(
		value: unknown
	): string[] {
		if (Array.isArray(value)) {
			return value
				.filter(
					(item): item is string =>
						typeof item === "string"
				)
				.map((item) => item.trim())
				.filter(Boolean);
		}

		if (typeof value === "string") {
			return value
				.split(",")
				.map((item) => item.trim())
				.filter(Boolean);
		}

		return [];
	}

	/**
	 * Normalizes creators.
	 *
	 * Accepts:
	 *
	 * "Frank Herbert"
	 *
	 * or
	 *
	 * ["Frank Herbert"]
	 */
	protected normalizeCreator(
		value: unknown
	): string {
		if (Array.isArray(value)) {
			return value
				.filter(
					(item): item is string =>
						typeof item === "string"
				)
				.join(", ");
		}

		if (typeof value === "string") {
			return value.trim();
		}

		return "";
	}

	/**
	 * Converts ratings into numbers.
	 *
	 * Accepts:
	 *
	 * 8
	 * "8"
	 * "8.5"
	 */
	protected normalizeRating(
		value: unknown
	): number | null {
		if (typeof value === "number") {
			return Number.isFinite(value)
				? value
				: null;
		}

		if (typeof value === "string") {
			const parsed = Number(value);

			return Number.isFinite(parsed)
				? parsed
				: null;
		}

		return null;
	}

	/**
	 * Returns a normalized string date.
	 *
	 * Currently this simply trims the value.
	 *
	 * Later this could convert
	 *
	 * January 2, 2025
	 *
	 * into
	 *
	 * 2025-01-02
	 */
	protected normalizeDate(
		value: unknown
	): string | undefined {
		if (typeof value === "number") {
			return Number.isFinite(value) ? String(value) : undefined;
		}

		if (typeof value !== "string") {
			return undefined;
		}

		const trimmed = value.trim();

		return trimmed.length > 0
			? trimmed
			: undefined;
	}

	/**
	 * Extracts the first four-digit year.
	 *
	 * Example
	 *
	 * "1965-08-02"
	 *
	 * ->
	 *
	 * 1965
	 */
    protected extractYear(value: unknown): number | undefined {
        if (typeof value === "number") {
            return Number.isInteger(value) ? value : undefined;
        }

        if (value instanceof Date) {
            return value.getFullYear();
        }

        if (typeof value !== "string") {
            return undefined;
        }

        const match = value.match(/\b(18|19|20)\d{2}\b/);

        return match ? Number(match[0]) : undefined;
    }
	/**
	 * Returns the first valid cover path.
	 *
	 * Supports aliases.
	 */
	protected normalizeCover(
		...values: unknown[]
	): {
		coverLocal?: string;
		coverUrl?: string;
	} {
		for (const value of values) {
            const cover = this.extractCoverSource(value);

			if (!cover) {
				continue;
			}

			if (
				cover.startsWith("http://") ||
				cover.startsWith("https://")
			) {
				return {
                    coverUrl: cover.replace(/^http:\/\/books\.google\.com/i, "https://books.google.com"),
				};
			}

			return {
				coverLocal: cover,
			};
		}

		return {};
	}

    private extractCoverSource(value: unknown): string | null {
        const raw = this.extractStringValue(value);
        if (!raw) {
            return null;
        }

        const normalized = this.normalizeCoverString(raw);

        return normalized.length > 0 ? normalized : null;
    }

    private normalizeCoverString(value: string): string {
        let normalized = value.trim();

        for (let index = 0; index < 4; index += 1) {
            const next = normalized
                .replace(/^!\[[^\]]*\]\((.+)\)$/, "$1")
                .replace(/^\[[^\]]*\]\((.+)\)$/, "$1")
                .replace(/^!\[\[([^|\]#]+)(?:#[^|\]]+)?(?:\|[^\]]*)?\]\]$/, "$1")
                .replace(/^\[\[([^|\]#]+)(?:#[^|\]]+)?(?:\|[^\]]*)?\]\]$/, "$1")
                .replace(/^<(.*)>$/, "$1")
                .replace(/^"(.*)"$/, "$1");

            if (next === normalized) {
                break;
            }

            normalized = next.trim();
        }

        return normalized
            .replace(/^http:\/\/books\.google\.com/i, "https://books.google.com")
            .replace(/^https:\/\/books\.google\.com\/books\/content\?/i, "https://books.google.com/books/content?");
    }

    private extractStringValue(value: unknown): string | null {
        if (typeof value === "string") {
            return value;
        }

        if (Array.isArray(value)) {
            for (const entry of value) {
                const extracted = this.extractStringValue(entry);
                if (extracted) {
                    return extracted;
                }
            }
            return null;
        }

        if (value && typeof value === "object") {
            const candidate = value as { path?: unknown; url?: unknown; raw?: unknown };
            return this.extractStringValue(candidate.path ?? candidate.url ?? candidate.raw);
        }

        return null;
    }

	/**
	 * Returns the first summary available.
	 */
	protected normalizeSummary(
		...values: unknown[]
	): string | undefined {
		for (const value of values) {
			if (
				typeof value === "string" &&
				value.trim().length > 0
			) {
				return value.trim();
			}
		}

		return undefined;
	}

	/**
	 * Normalizes status.
	 */
	protected normalizeStatus(
		value: unknown
	): string | null {
        if (typeof value === "boolean") {
            return value ? "completed" : null;
        }

		// Handle arrays (take first element)
		if (Array.isArray(value)) {
			if (value.length === 0) return null;
			return this.normalizeStatus(value[0]);
		}

		if (typeof value !== "string") {
			return null;
		}

		const trimmed = value.trim();

		return trimmed.length > 0
            ? this.canonicalizeStatus(trimmed.toLowerCase())
			: null;
	}

    private canonicalizeStatus(value: string): string {
        const normalized = value.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();

        if (normalized === "to watch") {
            return "want to watch";
        }

        if (normalized === "to read") {
            return "want to read";
        }

        if (normalized.includes("to watch")) {
            return "unwatched";
        }

        if (normalized.includes("to read")) {
            return "unread";
        }

        if (normalized.includes("currently watching")) {
            return "watching";
        }

        if (normalized.includes("currently reading")) {
            return "reading";
        }

        if (normalized.includes("finished watching")) {
            return "watched";
        }

        if (normalized.includes("finished reading")) {
            return "read";
        }

        if (normalized.includes("want to watch") || normalized.includes("plan to watch")) {
            return "want to watch";
        }

        if (normalized.includes("want to read") || normalized.includes("plan to read")) {
            return "want to read";
        }

        return normalized;
    }

    /**
     * Returns the first valid cover.
     *
     * Checks common aliases used across media types.
     */
    protected getCover(frontmatter: {
        localCover?: unknown;
        cover?: unknown;
        coverUrl?: unknown;
        image?: unknown;
        poster?: unknown;
    }): {
        coverLocal?: string;
        coverUrl?: string;
    } {
        return this.normalizeCover(
            frontmatter.localCover,
            frontmatter.cover,
            frontmatter.coverUrl,
            frontmatter.image,
            frontmatter.poster
        );
    }

    /**
     * Returns the first available description.
     *
     * Supports common aliases.
     */
    protected getSummary(frontmatter: {
        summary?: unknown;
        description?: unknown;
        synopsis?: unknown;
        plot?: unknown;
        blurb?: unknown;
    }): string | undefined {
        return this.normalizeSummary(
            frontmatter.summary,
            frontmatter.description,
            frontmatter.synopsis,
            frontmatter.plot,
            frontmatter.blurb
        );
    }

    protected getReview(frontmatter: {
        review?: unknown;
        myReview?: unknown;
    }): string | undefined {
        return this.normalizeSummary(
            frontmatter.review,
            frontmatter.myReview
        );
    }

    /**
     * Returns normalized genres.
     */
    protected getGenres(frontmatter: {
        genres?: unknown;
        genre?: unknown;
        category?: unknown;
    }): string[] {
        return this.normalizeStringArray(
            frontmatter.genres ??
                frontmatter.genre ??
                frontmatter.category
        );
    }

    /**
     * Returns the primary creator.
     *
     * Works for:
     *
     * authors
     * author
     * creator
     * director
     */
    protected getCreator(frontmatter: {
        authors?: unknown;
        author?: unknown;
        creator?: unknown;
        director?: unknown;
    }): string {
        return this.normalizeCreator(
            frontmatter.authors ??
                frontmatter.author ??
                frontmatter.creator ??
                frontmatter.director
        );
    }

    /**
     * Returns the user's personal rating.
     */
    protected getRating(frontmatter: {
        personalRating?: unknown;
        rating?: unknown;
        score?: unknown;
    }): number | null {
        return this.normalizeRating(
            frontmatter.personalRating ??
                frontmatter.rating ??
                frontmatter.score
        );
    }

    /**
     * Returns the media's release/publish date.
     */
    protected getReleaseDate(frontmatter: {
        releaseDate?: unknown;
        publishDate?: unknown;
        publishdate?: unknown;
        datePublished?: unknown;
        dateReleased?: unknown;
        year?: unknown;
        releaseYear?: unknown;
    }): string | undefined {
        return this.normalizeDate(
            frontmatter.releaseDate ??
                frontmatter.publishDate ??
                frontmatter.publishdate ??
                frontmatter.datePublished ??
                frontmatter.dateReleased ??
                frontmatter.releaseYear ??
                frontmatter.year
        );
    }

    /**
     * Returns the note creation date.
     */
    protected getCreatedDate(frontmatter: {
        created?: unknown;
        createdAt?: unknown;
        dateCreated?: unknown;
    }): string | undefined {
        return this.normalizeDate(
            frontmatter.created ??
                frontmatter.createdAt ??
                frontmatter.dateCreated
        );
    }

    /**
     * Returns a numeric pages value if available.
     */
    protected getPages(frontmatter: { pages?: unknown; pageCount?: unknown }): number | null {
        const value = frontmatter.pages ?? frontmatter.pageCount;

        if (typeof value === "number") return Number.isFinite(value) ? value : null;
        if (typeof value === "string") {
            const parsed = parseInt(value.replace(/[^0-9]/g, ""), 10);
            return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
        }

        return null;
    }

    protected getIsbn(frontmatter: { isbn?: unknown; ISBN?: unknown; isbn13?: unknown }): string | null {
        const value = this.firstString(frontmatter.isbn, frontmatter.ISBN, frontmatter.isbn13);
        return value ? value : null;
    }

    protected getDuration(frontmatter: { duration?: unknown; runtime?: unknown }): string | null {
        const value = this.firstString(frontmatter.duration, frontmatter.runtime);
        return value ? value : null;
    }

    protected getExternalId(frontmatter: { id?: unknown; imdbId?: unknown; tmdbId?: unknown }): string | null {
        const value = this.firstString(frontmatter.id, frontmatter.imdbId, frontmatter.tmdbId);
        return value ? value : null;
    }

    protected getUrl(frontmatter: { url?: unknown; link?: unknown; source?: unknown }): string | null {
        const value = this.firstString(frontmatter.url, frontmatter.link, frontmatter.source);
        return value ? value : null;
    }

    protected getActors(frontmatter: { actors?: unknown; cast?: unknown }): string[] {
        return this.normalizeStringArray(frontmatter.actors ?? frontmatter.cast);
    }

    protected getPublisher(frontmatter: { publisher?: unknown; press?: unknown }): string | null {
        const v = this.firstString(frontmatter.publisher, frontmatter.press);
        return v || null;
    }

    protected getStudio(frontmatter: { studio?: unknown; production?: unknown }): string | null {
        const v = this.firstString(frontmatter.studio, frontmatter.production);
        return v || null;
    }

    /**
     * Returns the completion date.
     *
     * Works for books, movies, series, games, etc.
     */
    protected getCompletedDate(frontmatter: {
        dateRead?: unknown;
        dateWatched?: unknown;
        lastWatched?: unknown;
        dateFinished?: unknown;
        finishDate?: unknown;
        completed?: unknown;
    }): string | undefined {
        return this.normalizeDate(
            frontmatter.dateRead ??
                frontmatter.dateWatched ??
                frontmatter.lastWatched ??
                frontmatter.dateFinished ??
                frontmatter.finishDate ??
                frontmatter.completed
        );
    }

    /**
     * Returns the normalized media status.
     */
    protected getStatus(frontmatter: {
        status?: unknown;
        read?: unknown;
        watched?: unknown;
        completed?: unknown;
    }): MediaStatus | null {

        const watchedStatus =
            typeof frontmatter.watched === "boolean"
                ? frontmatter.watched
                    ? "watched"
                    : "unwatched"
                : frontmatter.watched;

        const readStatus =
            typeof frontmatter.read === "boolean"
                ? frontmatter.read
                    ? "read"
                    : "unread"
                : frontmatter.read;

        const completedStatus =
            typeof frontmatter.completed === "boolean"
                ? frontmatter.completed
                    ? "completed"
                    : null
                : frontmatter.completed;

        const status = this.normalizeStatus(
            frontmatter.status ??
            readStatus ??
            watchedStatus ??
            completedStatus
        );

        if (!status) {
            return null;
        }

        return isMediaStatus(status)
            ? status
            : null;
    }

    /**
     * Returns the media title.
     *
     * Falls back to the note's filename when frontmatter has no title/name.
     */
    protected getTitle(
        frontmatter: {
            title?: unknown;
            name?: unknown;
        },
        path?: string
    ): string {
        const explicit = this.firstString(
            frontmatter.title,
            frontmatter.name
        );

        if (explicit) {
            return explicit;
        }

        return path ? this.getFilenameStem(path) : "";
    }

    private getFilenameStem(path: string): string {
        const fileName = path.split("/").pop() ?? path;
        return fileName.replace(/\.md$/i, "").trim();
    }
}

/**
 * BookParser
 *
 * Responsible for converting a Book note's frontmatter
 * into a normalized MediaItem.
 *
 * This class should NEVER:
 *
 * - Read files
 * - Scan the vault
 * - Create HTML
 * - Open notes
 *
 * It only translates metadata.
 */
export class BookParser extends BaseParser<BookFrontmatter> {
    parse(path: string, frontmatter: BookFrontmatter): MediaItem | null {

        const title = this.getTitle(frontmatter, path);

        if (!title) {
            return null;
        }

        const releaseDate = this.getReleaseDate(frontmatter);

        return {
            path,
            title,
            creator: this.getCreator(frontmatter),
            mediaType: "book",
            //
            status: this.getStatus(frontmatter),
            //
            genres: this.getGenres(frontmatter),

            summary: this.getSummary(frontmatter),

            review: this.getReview(frontmatter),

            synopsis: frontmatter.synopsis,

            rating: this.getRating(frontmatter),
            //date 
            date: this.getCompletedDate(frontmatter),

            year: this.extractYear(releaseDate),

            releaseDate,

            createdDate: this.getCreatedDate(frontmatter),

            addedDate: undefined,

            ...this.getCover(frontmatter),

            pages: this.getPages(frontmatter),

            isbn: this.getIsbn(frontmatter),

            publisher: this.getPublisher(frontmatter),

            raw: frontmatter,
        };
    }
}

/**
 * MovieParser
 *
 * Converts a Movie note's frontmatter into a MediaItem.
 *
 * This parser is responsible ONLY for translating metadata.
 */
export class MovieParser extends BaseParser<MovieFrontmatter> {
	parse(
		path: string,
		frontmatter: MovieFrontmatter
	): MediaItem | null {

		// -----------------------------
		// Title
		// -----------------------------

		const title = this.getTitle(frontmatter, path);

		if (!title) {
			return null;
		}

		// -----------------------------
		// Release Date
		// -----------------------------

		const releaseDate = this.getReleaseDate(frontmatter);

		// -----------------------------
		// Cover
		// -----------------------------

		const cover = this.getCover(frontmatter);

		// -----------------------------
		// Build MediaItem
		// -----------------------------

		return {
			path,

			title,

			creator: this.getCreator(frontmatter),

			mediaType: "movie",

			status: this.getStatus(frontmatter),

			genres: this.getGenres(frontmatter),

			summary: this.getSummary(frontmatter),

			review: this.getReview(frontmatter),

			synopsis: frontmatter.synopsis,

			rating: this.getRating(frontmatter),

			date: this.getCompletedDate(frontmatter),

			year: this.extractYear(releaseDate),

			releaseDate,

			createdDate: this.getCreatedDate(frontmatter),

			addedDate: undefined,

			coverLocal: cover.coverLocal ?? null,

			coverUrl: cover.coverUrl ?? null,

			duration: this.getDuration(frontmatter),

			externalId: this.getExternalId(frontmatter as any),

			url: this.getUrl(frontmatter as any),

			actors: this.getActors(frontmatter),

			studio: this.getStudio(frontmatter),

			raw: frontmatter,
		};
	}
}

/**
 * SeriesParser
 *
 * Converts a TV Series note into a MediaItem.
 *
 * This parser should ONLY translate metadata.
 */
export class SeriesParser extends BaseParser<SeriesFrontmatter> {
	parse(
		path: string,
		frontmatter: SeriesFrontmatter
	): MediaItem | null {

		const title = this.getTitle(frontmatter, path);

		if (!title) {
			return null;
		}

		const releaseDate = this.getReleaseDate(frontmatter);

		const cover = this.getCover(frontmatter);

		return {
			path,

			title,

			creator: this.getCreator(frontmatter),

			mediaType: "series",

			status: this.getStatus(frontmatter),

			genres: this.getGenres(frontmatter),

			summary: this.getSummary(frontmatter),

			review: this.getReview(frontmatter),

			synopsis: frontmatter.synopsis,

			rating: this.getRating(frontmatter),

			date: this.getCompletedDate(frontmatter),

			year: this.extractYear(releaseDate),

			releaseDate,

			createdDate: this.getCreatedDate(frontmatter),

			addedDate: undefined,

			coverLocal: cover.coverLocal ?? null,

			coverUrl: cover.coverUrl ?? null,

			raw: frontmatter,
		};
	}
}

/**
 * EssayParser
 *
 * Converts an Essay note into a MediaItem.
 */
export class EssayParser extends BaseParser<EssayFrontmatter> {
	parse(
		path: string,
		frontmatter: EssayFrontmatter
	): MediaItem | null {

		const title = this.getTitle(frontmatter, path);

		if (!title) {
			return null;
		}

		const releaseDate = this.getReleaseDate(frontmatter);

		const cover = this.getCover(frontmatter);

		return {
			path,

			title,

			creator: this.getCreator(frontmatter),

			mediaType: "essay",

			status: this.getStatus(frontmatter),

			genres: this.getGenres(frontmatter),

			rating: this.getRating(frontmatter),

			review: this.getReview(frontmatter),

			date: this.getCompletedDate(frontmatter),

			year: this.extractYear(releaseDate),

			releaseDate,

			createdDate: this.getCreatedDate(frontmatter),

			addedDate: undefined,

			coverLocal: cover.coverLocal ?? null,

			coverUrl: cover.coverUrl ?? null,

			raw: frontmatter,
		};
	}
}

/**
 * ParserRegistry
 *
 * Responsible for selecting the correct parser
 * for a piece of frontmatter.
 *
 * The rest of the plugin should NEVER import
 * BookParser, MovieParser, etc.
 *
 * Instead:
 *
 * ParserRegistry.parse(file, frontmatter)
 */
export class ParserRegistry {
	private readonly bookParser = new BookParser();

	private readonly movieParser = new MovieParser();

	private readonly essayParser = new EssayParser();

	private readonly seriesParser = new SeriesParser();

	/**
	 * Parse frontmatter into a MediaItem.
	 *
	 * Returns null if the media type
	 * isn't supported.
	 */
	parse(
		file: TFile,
		frontmatter: Record<string, unknown>
	): MediaItem | null {

		const mediaType = this.detectMediaType(frontmatter);

		if (!mediaType) {
			return null;
		}

		switch (mediaType) {
			case "book":
				return this.bookParser.parse(
					file.path,
					frontmatter
				);

			case "movie":
				return this.movieParser.parse(
					file.path,
					frontmatter
				);

			case "essay":
				return this.essayParser.parse(
					file.path,
					frontmatter
				);

			case "series":
				return this.seriesParser.parse(
					file.path,
					frontmatter
				);

			default:
				return null;
		}
	}

	/**
	 * Determines the media type.
	 *
	 * Supported aliases:
	 *
	 * mediaType
	 * media
	 * type
	 */
	private detectMediaType(
		frontmatter: Record<string, unknown>
	): MediaType | null {

		const value =
			frontmatter.mediaType ??
			frontmatter.media ??
			frontmatter.type;

		const candidates: string[] = [];

		if (typeof value === "string") {
			candidates.push(value);
		} else if (Array.isArray(value)) {
			for (const item of value) {
				if (typeof item === "string") {
					candidates.push(item);
				}
			}
		}

		if (candidates.length === 0) {
			return null;
		}

		for (const candidate of candidates) {
			switch (candidate.trim().toLowerCase()) {

			case "book":
				return "book";

			case "movie":
			case "film":
				return "movie";

			case "series":
			case "tv":
			case "show":
				return "series";

			case "essay":
				return "essay";

			default:
				continue;
			}
		}

		return null;
	}
}
