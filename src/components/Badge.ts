// src/components/Badge.ts

/**
 * Badge
 *
 * Small reusable label component.
 *
 * Used for displaying short pieces of information:
 *
 * Examples:
 *
 * - Book
 * - Movie
 * - Completed
 * - Favorite
 * - New
 * - 2026
 *
 *
 * This component only creates the UI element.
 *
 * It does NOT:
 *
 * - Decide what badges exist
 * - Determine status
 * - Read MediaItems
 *
 * The parent component decides
 * what information should become a badge.
 */
export class Badge {

	private text: string;

	private readonly variant?: string;


	constructor(
		text: string,
		variant?: string
	) {

		this.text = text;

		this.variant = variant;
	}


	/**
	 * Render the badge.
	 */
	render(container: HTMLElement): HTMLElement {

		const badge = container.createSpan({
			text: this.text,

			cls: "media-badge",
		});


		if (this.variant) {

			badge.addClass(
				`media-badge-${this.variant}`
			);
		}


		return badge;
	}


	/**
	 * Update badge text.
	 *
	 * Useful for dynamic UI later.
	 */
	setText(text: string): void {

		this.text = text;
	}
}