// src/parsers/SeriesParser.ts

import { BaseParser } from "./BaseParser";

import {
	MediaItem,
	SeriesFrontmatter,
} from "../models";

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

		const title = this.getTitle(frontmatter);

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