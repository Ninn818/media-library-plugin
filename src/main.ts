// src/main.ts

import {
	ItemView,
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

	view!: ItemView;

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
				this.view = new LibraryView(leaf, this.library, this.viewRegistry, this.settings);
				return this.view;
			}
		);

		this.addRibbonIcon(
			"library",
			"Media Library",
			() => {
				void this.openLibrary();
			}
		);

		this.addCommand({

			id: "refresh-media-library",

			name: "Refresh Media Library",

			callback: async () => {

				await this.library.refresh();
				if (this.view instanceof LibraryView) {
					this.view.refresh();
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
		if (this.view instanceof LibraryView) {
			this.view.refresh();
		}
	}



	onunload(): void {


		this.controller?.destroy();

	}



	async loadSettings(): Promise<void> {

		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}



	async saveSettings(): Promise<void> {

		await this.saveData(
			this.settings
		);
	}
}