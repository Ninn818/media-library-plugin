// src/parsers/BaseParser.ts
import {
	MediaItem,
	MediaStatus,
	isMediaStatus,
} from "../models";

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
        datePublished?: unknown;
        dateReleased?: unknown;
        year?: unknown;
        releaseYear?: unknown;
    }): string | undefined {
        return this.normalizeDate(
            frontmatter.releaseDate ??
                frontmatter.publishDate ??
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
     */
    protected getTitle(frontmatter: {
        title?: unknown;
        name?: unknown;
    }): string {
        return this.firstString(
            frontmatter.title,
            frontmatter.name
        );
    }
}