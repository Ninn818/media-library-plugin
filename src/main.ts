// src/main.ts

import {
	Plugin,
	WorkspaceLeaf,
} from "obsidian";

import {
	PluginController,
} from "./controllers/PluginControllers";

import {
	DEFAULT_SETTINGS,
	MediaLibrarySettings,
	MediaLibrarySettingTab,
} from "./settings";
import { LibraryView } from "./views/LibraryView";
import { MediaLibrary } from "./core/MediaLibrary";
import { ViewRegistry } from "./core/ViewRegistry";



/**
 * Media Library Plugin
 *
 * Entry point only.
 *
 * Responsibilities:
 *
 * - Load settings
 * - Create PluginController
 * - Destroy PluginController
 * - Register settings
 *
 * It does NOT:
 *
 * - Scan vault
 * - Parse metadata
 * - Render UI
 */
export default class MediaLibraryPlugin extends Plugin {


	settings!: MediaLibrarySettings;


	controller!: PluginController;

	library!: MediaLibrary;

	viewRegistry!: ViewRegistry;

	private leaf?: WorkspaceLeaf;

	async onload(): Promise<void> {


		await this.loadSettings();

		this.library = new MediaLibrary(this.app);
		this.viewRegistry = new ViewRegistry();

		/**
		 * Create application controller.
		 *
		 * All other systems are created there.
		 */
		this.controller =
			new PluginController(
				this
			);

		await this.controller.initialize();



		/**
		 * Plugin settings.
		 */
		this.addSettingTab(
			new MediaLibrarySettingTab(
				this.app,
				this
			)
		);

		this.registerView(
			"media-library-view",
			(leaf: WorkspaceLeaf) => {
				this.leaf = leaf;
				return new LibraryView(leaf, this.library, this.viewRegistry, this.settings, () => this.saveSettings());
			}
		);

		this.addRibbonIcon(
			"library",
			"Media library",
			() => {
				void this.openLibrary();
			}
		);

		this.addCommand({

			id: "refresh-media-library",

			name: "Refresh media library",

			callback: async () => {

				await this.library.refresh();
				const view = this.getLibraryView();
				if (view) {
					view.refresh();
				}

			},
		});
	}

	async openLibrary(): Promise<void> {
		const leaf = this.app.workspace.getLeaf(this.settings.openInSidebar);
		await leaf.setViewState({
			type: "media-library-view",
			active: true,
		});
		await this.library.refresh();
		const view = this.getLibraryView();
		if (view) {
			view.refresh();
		}
	}



	onunload(): void {


		this.controller?.destroy();

	}



	async loadSettings(): Promise<void> {
		const loaded = (await this.loadData()) as Partial<MediaLibrarySettings> | null;
		const dashboardGoals = {
			...DEFAULT_SETTINGS.dashboardGoals,
			...(loaded?.dashboardGoals ?? {}),
		};
		const customLists = Array.isArray(loaded?.customLists) ? loaded.customLists : DEFAULT_SETTINGS.customLists;

		this.settings = {
			...DEFAULT_SETTINGS,
			...(loaded ?? {}),
			dashboardGoals,
			customLists,
		};
	}



	async saveSettings(): Promise<void> {

		await this.saveData(
			this.settings
		);
	}

	private getLibraryView(): LibraryView | null {
		const leaves = this.app.workspace.getLeavesOfType("media-library-view");
		for (const leaf of leaves) {
			if (leaf.view instanceof LibraryView) {
				return leaf.view;
			}
		}

		return null;
	}
}