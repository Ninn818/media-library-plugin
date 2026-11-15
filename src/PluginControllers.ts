// Plugin coordination and poster rendering.

import { App, Plugin, setIcon } from "obsidian";

import { MediaLibrary, MediaRegistry, ViewRegistry } from "./core";
import { MediaItem } from "./models";
import { resolveCoverSource } from "./utils/Covers";

/**
 * PluginController
 *
 * The central coordinator for the plugin.
 *
 * Responsibilities:
 * - Create core services
 * - Load the media library
 * - Register commands
 * - Register events
 * - Open the library view (later)
 *
 * The coordinator should NOT:
 * - Parse frontmatter
 * - Scan the vault directly
 * - Render UI
 * - Manage card layouts
 */
export class PluginController {
	private readonly plugin: Plugin;

	private readonly app: App;

	private readonly mediaLibrary: MediaLibrary;

	private readonly mediaRegistry: MediaRegistry;

	private readonly viewRegistry: ViewRegistry;

	constructor(plugin: Plugin) {
		this.plugin = plugin;
		this.app = plugin.app;

		this.mediaLibrary = new MediaLibrary(this.app);

		this.mediaRegistry = new MediaRegistry();

		this.viewRegistry = new ViewRegistry();
	}

	/**
	 * Called from main.ts when the plugin loads.
	 */
	async initialize(): Promise<void> {

		await this.mediaLibrary.refresh();

		this.registerVaultEvents();

		this.registerWorkspaceEvents();
	}

	/**
	 * Called from main.ts when the plugin unloads.
	 */
	dispose(): void {
		// Reserved for future cleanup.
	}

	/**
	 * Alias used by the plugin entrypoint.
	 */
	destroy(): void {
		this.dispose();
	}

	/**
	 * Gives access to the media library.
	 */
	getLibrary(): MediaLibrary {
		return this.mediaLibrary;
	}

	/**
	 * Gives access to supported media types.
	 */
	getMediaRegistry(): MediaRegistry {
		return this.mediaRegistry;
	}

	/**
	 * Gives access to supported views.
	 */
	getViewRegistry(): ViewRegistry {
		return this.viewRegistry;
	}

	/**
	 * Registers vault events.
	 *
	 * We'll expand these later so the library updates
	 * automatically when media notes change.
	 */
	private registerVaultEvents(): void {
		this.plugin.registerEvent(
			this.app.vault.on("create", async () => {
				await this.mediaLibrary.refresh();
			})
		);

		this.plugin.registerEvent(
			this.app.vault.on("delete", async () => {
				await this.mediaLibrary.refresh();
			})
		);

		this.plugin.registerEvent(
			this.app.vault.on("rename", async () => {
				await this.mediaLibrary.refresh();
			})
		);

		this.plugin.registerEvent(
			this.app.vault.on("modify", async () => {
				await this.mediaLibrary.refresh();
			})
		);
	}

	/**
	 * Registers workspace events.
	 *
	 * Placeholder for future UI behavior.
	 */
	private registerWorkspaceEvents(): void {
		// Reserved for future use.
	}
}
// Poster rendering
const PLACEHOLDER_ICONS: Record<string, string> = {
	book: "book",
	movie: "clapperboard",
	series: "tv",
	essay: "scroll-text",
};

/**
 * Renders a media item's cover image, or a type-specific placeholder.
 */
export class Poster {
	private readonly item: MediaItem;
	private readonly app?: App;

	constructor(item: MediaItem, app?: App) {
		this.item = item;
		this.app = app;
	}

	render(container: HTMLElement): HTMLElement {
		const wrapper = container.createDiv({ cls: "media-poster" });
		this.renderImage(wrapper);
		return wrapper;
	}

	private renderImage(container: HTMLElement): void {
		const sources = [this.item.coverLocal, this.item.coverUrl]
			.filter((value): value is string => typeof value === "string" && value.trim().length > 0);

		if (!sources.length) {
			this.renderPlaceholder(container);
			return;
		}

		this.createImage(container, sources, 0);
	}

	private createImage(container: HTMLElement, sources: string[], index: number): void {
		const source = sources[index];
		if (!source) {
			container.empty();
			this.renderPlaceholder(container);
			return;
		}

		const resolvedSource = resolveCoverSource(this.app, this.item.path, source);
		const image = container.createEl("img");
		image.src = resolvedSource;
		image.alt = this.item.title;
		image.addClass("media-poster-image");
		image.addEventListener("error", () => {
			image.remove();
			this.createImage(container, sources, index + 1);
		});
	}

	private renderPlaceholder(container: HTMLElement): void {
		container.addClass("media-poster-placeholder");
		const icon = container.createDiv({ cls: "media-poster-placeholder-icon" });
		setIcon(icon, PLACEHOLDER_ICONS[this.item.mediaType] ?? "image-off");
		container.createDiv({ cls: "media-poster-placeholder-title", text: this.item.title });
	}
}