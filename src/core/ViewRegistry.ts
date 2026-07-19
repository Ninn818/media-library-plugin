// src/core/ViewRegistry.ts

/**
 * Represents a view available in the Media Library.
 *
 * Examples:
 * - Cards
 * - Table
 * - Gallery
 * - Timeline
 * - Bookshelf
 */
export interface ViewDefinition {
	/**
	 * Internal identifier.
	 */
	id: string;

	/**
	 * Display name.
	 */
	name: string;

	/**
	 * Obsidian icon.
	 */
	icon: string;
}

/**
 * Registry of every available library view.
 *
 * The rest of the plugin should ask this class
 * which views exist instead of hardcoding them.
 */
export class ViewRegistry {
	private readonly views: ViewDefinition[] = [
		{
			id: "cards",
			name: "Cards",
			icon: "layout-grid",
		},
		{
			id: "showcase",
			name: "Showcase",
			icon: "layout-template",
		},

		// Future views

		// {
		// 	id: "table",
		// 	name: "Table",
		// 	icon: "table",
		// },

		// {
		// 	id: "gallery",
		// 	name: "Gallery",
		// 	icon: "image",
		// },

		// {
		// 	id: "bookshelf",
		// 	name: "Bookshelf",
		// 	icon: "library",
		// },

		// {
		// 	id: "timeline",
		// 	name: "Timeline",
		// 	icon: "calendar-range",
		// },
	];

	/**
	 * Returns every registered view.
	 */
	getAll(): ViewDefinition[] {
		return [...this.views];
	}

	/**
	 * Returns a single view.
	 */
	get(id: string): ViewDefinition | undefined {
		return this.views.find(
			(view) => view.id === id
		);
	}

	/**
	 * Returns true if a view exists.
	 */
	has(id: string): boolean {
		return this.views.some(
			(view) => view.id === id
		);
	}

	/**
	 * Returns the default view.
	 */
    getDefault(): ViewDefinition {
        const view = this.views[0];

        if (!view) {
            throw new Error("No views have been registered.");
        }

        return view;
    }

	/**
	 * Returns all ids.
	 */
	getIds(): string[] {
		return this.views.map(
			(view) => view.id
		);
	}
}