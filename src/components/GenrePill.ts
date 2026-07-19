// src/components/GenrePill.ts

/**
 * GenrePill
 *
 * Displays a media genre as a styled pill.
 *
 * Similar to Tag, but separated because
 * genres are a core media concept and may
 * receive special handling later.
 *
 * Examples:
 *
 * - Fantasy
 * - Horror
 * - Romance
 * - Science Fiction
 * - Documentary
 *
 *
 * Future possibilities:
 *
 * - Clicking a genre filters the library
 * - Genre colors
 * - Genre icons
 * - Genre statistics
 */
export class GenrePill {

	private readonly genre: string;


	constructor(genre: string) {

		this.genre = genre;
	}


	/**
	 * Render the genre pill.
	 */
	render(container: HTMLElement): HTMLElement {

		const pill = container.createSpan({
			text: this.genre,

			cls: "media-genre-pill",
		});


		return pill;
	}


	/**
	 * Returns the genre name.
	 */
	getGenre(): string {

		return this.genre;
	}
}