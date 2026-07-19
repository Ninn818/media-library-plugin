// src/parsers/ParserRegistry.ts

import { TFile } from "obsidian";

import {
	BookFrontmatter,
	EssayFrontmatter,
	MediaItem,
	MediaType,
	MovieFrontmatter,
	SeriesFrontmatter,
} from "../models";

import { BookParser } from "./BookParser";
import { EssayParser } from "./EssayParser";
import { MovieParser } from "./MovieParser";
import { SeriesParser } from "./SeriesParser";

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