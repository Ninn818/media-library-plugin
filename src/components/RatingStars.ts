// src/components/RatingStars.ts

/**
 * RatingStars
 *
 * Displays a numeric rating as stars.
 *
 * This component only handles visual display.
 *
 * It does NOT:
 *
 * - Calculate ratings
 * - Validate ratings
 * - Save ratings
 * - Update MediaItems
 *
 * The rating value should already be prepared
 * before reaching this component.
 *
 * Example:
 *
 * 4.5
 *
 * becomes:
 *
 * ★★★★½
 *
 * Future improvements:
 *
 * - Half star icons
 * - Click to rate
 * - Custom rating scales
 */
export class RatingStars {

	private readonly rating: number;

	private readonly maxRating: number;


	constructor(
		rating: number,
		maxRating: number = 5
	) {

		this.rating = rating;

		this.maxRating = maxRating;
	}


	/**
	 * Render the stars.
	 */
	render(container: HTMLElement): HTMLElement {

		const wrapper = container.createDiv({
			cls: "media-rating-stars",
		});


		const normalized =
			this.normalizeRating();


		for (
			let i = 1;
			i <= this.maxRating;
			i++
		) {

			const star = wrapper.createSpan({
				cls: "media-rating-star",
			});


			if (i <= normalized) {

				star.setText("★");

				star.addClass(
					"is-filled"
				);

			} else {

				star.setText("☆");
			}
		}


		return wrapper;
	}


	/**
	 * Converts the rating into the component scale.
	 *
	 * Example:
	 *
	 * Rating system:
	 * 0-10
	 *
	 * Display:
	 * 0-5 stars
	 *
	 * 8/10 becomes 4 stars.
	 */
	private normalizeRating(): number {

		const value =
			this.rating / 2;


		return Math.round(
			Math.min(
				this.maxRating,
				Math.max(
					0,
					value
				)
			)
		);
	}


	/**
	 * Allows external access to rating.
	 */
	getRating(): number {

		return this.rating;
	}
}