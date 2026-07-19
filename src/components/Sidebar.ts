// src/components/Sidebar.ts

/**
 * Sidebar
 *
 * Provides the layout container for the library sidebar.
 *
 * The sidebar is a structural component.
 *
 * It does NOT:
 *
 * - Load media
 * - Filter items
 * - Search media
 * - Manage collections
 * - Know about views
 *
 *
 * Other components can be placed inside it:
 *
 * Sidebar
 *    |
 *    ├── SearchBar
 *    |
 *    ├── FilterBar
 *    |
 *    ├── Collections
 *    |
 *    ├── Statistics
 *    |
 *    └── Tags
 *
 *
 * This keeps the sidebar flexible as the plugin grows.
 */
export class Sidebar {

	private readonly container: HTMLElement;

	private readonly content: HTMLElement;


	constructor(container: HTMLElement) {

		this.container = container;


		/**
		 * Main sidebar wrapper.
		 *
		 * All sidebar content lives here.
		 */
		this.content =
			container.createDiv({
				cls: "media-sidebar",
			});


		this.render();
	}


	/**
	 * Creates the basic sidebar structure.
	 *
	 * The sidebar intentionally starts empty.
	 *
	 * Other components should request a section
	 * and mount themselves into it.
	 */
	private render(): void {

		this.content.createDiv({
			cls: "media-sidebar-header",
		});


		this.content.createDiv({
			cls: "media-sidebar-content",
		});
	}


	/**
	 * Returns the sidebar content area.
	 *
	 * Components can use this to mount themselves.
	 *
	 * Example:
	 *
	 * const search =
	 *     new SearchBar({
	 *         container:
	 *             sidebar.getContent()
	 *     });
	 */
	getContent(): HTMLElement {

		const content =
			this.content.querySelector(
				".media-sidebar-content"
			);


		return (
			content as HTMLElement
		);
	}


	/**
	 * Adds a titled section.
	 *
	 * Useful for organizing sidebar areas:
	 *
	 * Filters
	 * Collections
	 * Statistics
	 */
	addSection(
		title: string
	): HTMLElement {

		const section =
			this.getContent()
				.createDiv({
					cls: "media-sidebar-section",
				});


		section.createEl("h4", {
			text: title,

			cls: "media-sidebar-section-title",
		});


		return section;
	}


	/**
	 * Clears sidebar contents.
	 *
	 * Useful when rebuilding the layout.
	 */
	clear(): void {

		this.getContent().empty();
	}


	/**
	 * Remove sidebar DOM.
	 */
	destroy(): void {

		this.container.empty();
	}
}