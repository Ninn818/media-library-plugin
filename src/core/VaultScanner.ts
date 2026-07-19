// src/core/VaultScanner.ts

import {
	App,
	CachedMetadata,
	TFile,
} from "obsidian";

import { MediaItem } from "../models";
import { ParserRegistry } from "../parsers/ParserRegistry";
import { ActivityLogService } from "../services/ActivityLogService";

/**
 * VaultScanner
 *
 * Responsible for scanning the Obsidian vault and
 * converting supported media notes into MediaItems.
 *
 * This is the ONLY class that should communicate
 * directly with:
 *
 * - Vault
 * - MetadataCache
 * - TFile
 *
 * Everything else in the plugin works with MediaItems.
 */
export class VaultScanner {
	private readonly app: App;

	private readonly parserRegistry: ParserRegistry;
	private readonly activityLogService: ActivityLogService;

	constructor(app: App) {
		this.app = app;
		this.parserRegistry = new ParserRegistry();
		this.activityLogService = new ActivityLogService(app);
	}

	/**
	 * Scan the entire vault.
	 *
	 * Returns every supported media note.
	 */
	async scanVault(): Promise<MediaItem[]> {
		const mediaItems: MediaItem[] = [];

		const files = this.app.vault.getMarkdownFiles();

		for (const file of files) {
			const item = await this.scanFile(file);

			if (item) {
				mediaItems.push(item);
			}
		}

		return mediaItems;
	}

	/**
	 * Scan one markdown file.
	 *
	 * Returns null if the file
	 * isn't a supported media note.
	 */
	async scanFile(file: TFile): Promise<MediaItem | null> {
		const metadata =
			this.app.metadataCache.getFileCache(file);

		if (!metadata) {
			return null;
		}

		const frontmatter =
			this.getFrontmatter(metadata);

		if (!frontmatter) {
			return null;
		}

		const hasMediaTypeProperty =
			frontmatter.type !== undefined ||
			frontmatter.mediaType !== undefined ||
			frontmatter.media !== undefined;

		if (!hasMediaTypeProperty) {
			return null;
		}

		const item =
			this.parserRegistry.parse(
				file,
				frontmatter
			);

		if (!item) {
			return null;
		}

		item.activityEntries = await this.activityLogService.loadEntries(file, item);

		// Add file dates

		item.addedDate = this.toISODate(
			new Date(file.stat.ctime)
		);

		if (!item.createdDate) {
			item.createdDate = item.addedDate;
		}

		return item;
	}

	/**
	 * Returns the frontmatter.
	 */
	private getFrontmatter(
		metadata: CachedMetadata
	): Record<string, unknown> | null {
		if (!metadata.frontmatter) {
			return null;
		}

		return metadata.frontmatter;
	}

	/**
	 * Converts a Date to yyyy-mm-dd.
	 */
	private toISODate(
		date: Date
	): string {
		return date
			.toISOString()
			.substring(0, 10);
	}

	/**
	 * Refresh a single file.
	 *
	 * Useful later when responding
	 * to vault events.
	 */
	async refreshFile(
		file: TFile
	): Promise<MediaItem | null> {
		return this.scanFile(file);
	}

	/**
	 * Refresh the entire library.
	 */
	async refresh(): Promise<MediaItem[]> {
		return this.scanVault();
	}
}