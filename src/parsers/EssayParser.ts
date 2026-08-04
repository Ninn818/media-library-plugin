// src/parsers/EssayParser.ts

import { BaseParser } from "./BaseParser";

import {
	EssayFrontmatter,
	MediaItem,
} from "../models";

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