// src/controllers/PluginController.ts

import { App, Plugin } from "obsidian";

import { MediaLibrary } from "../core/MediaLibrary";
import { MediaRegistry } from "../core/MediaRegistry";
import { ViewRegistry } from "../core/ViewRegistry";

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
 * This class should NOT:
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