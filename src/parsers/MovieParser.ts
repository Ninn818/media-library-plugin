// src/parsers/MovieParser.ts

import { BaseParser } from "./BaseParser";

import {
	MediaItem,
	MovieFrontmatter,
} from "../models";

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

		const title = this.getTitle(frontmatter);

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