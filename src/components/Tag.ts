// src/components/Tag.ts

/**
 * Tag
 *
 * Displays a small metadata label.
 *
 * Tags are generic pieces of information
 * attached to a media item.
 *
 * Examples:
 *
 * - Fantasy
 * - Award Winner
 * - Favorite
 * - Classic
 * - Personal Collection
 *
 *
 * This component only handles rendering.
 *
 * It does NOT:
 *
 * - Create tags
 * - Filter by tags
 * - Search tags
 * - Manage tag data
 *
 * The parent component decides
 * what information becomes a tag.
 */
export class Tag {

	private readonly text: string;


	constructor(text: string) {

		this.text = text;
	}


	/**
	 * Render the tag.
	 */
	render(container: HTMLElement): HTMLElement {

		const tag = container.createSpan({
			text: this.text,

			cls: "media-tag",
		});


		return tag;
	}


	/**
	 * Returns the displayed value.
	 */
	getText(): string {

		return this.text;
	}
}