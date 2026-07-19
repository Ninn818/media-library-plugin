// src/core/MediaRegistry.ts

import { MediaType } from "../models";

/**
 * Information describing a media type.
 *
 * This is used throughout the plugin for:
 * - Filter buttons
 * - View labels
 * - Icons
 * - Statistics
 * - Future settings
 */
export interface MediaDefinition {
	/**
	 * Internal media identifier.
	 */
	type: MediaType;

	/**
	 * Human-readable name.
	 */
	name: string;

	/**
	 * Obsidian icon name.
	 */
	icon: string;
}

/**
 * Registry of all supported media types.
 *
 * Add new media types here when expanding the plugin.
 */
export class MediaRegistry {
	private readonly media: MediaDefinition[] = [
		{
			type: "book",
			name: "Books",
			icon: "book-open",
		},
		{
			type: "movie",
			name: "Movies",
			icon: "film",
		},
		{
			type: "series",
			name: "Series",
			icon: "tv",
		},
		{
			type: "essay",
			name: "Essays",
			icon: "file-text",
		},
	];

	/**
	 * Returns every supported media type.
	 */
	getAll(): MediaDefinition[] {
		return [...this.media];
	}

	/**
	 * Returns one media definition.
	 */
	get(type: MediaType): MediaDefinition | undefined {
		return this.media.find(
			(media) => media.type === type
		);
	}

	/**
	 * Returns true if the media type exists.
	 */
	has(type: MediaType): boolean {
		return this.media.some(
			(media) => media.type === type
		);
	}

	/**
	 * Returns every media type.
	 */
	getTypes(): MediaType[] {
		return this.media.map(
			(media) => media.type
		);
	}

	/**
	 * Returns every display name.
	 */
	getNames(): string[] {
		return this.media.map(
			(media) => media.name
		);
	}
}