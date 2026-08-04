// src/parsers/BookParser.ts

import { BaseParser } from "./BaseParser";

import {
	BookFrontmatter,
	MediaItem,
} from "../models";

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