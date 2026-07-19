// src/utils/Number.ts

/**
 * NumberUtils
 *
 * Generic number helpers.
 */
export class NumberUtils {


	/**
	 * Safely converts a value
	 * into a number.
	 */
	static parse(
		value: unknown
	): number | undefined {

		const number =
			Number(value);


		if (
			Number.isNaN(number)
		) {
			return undefined;
		}


		return number;
	}



	/**
	 * Clamps a number between
	 * minimum and maximum values.
	 */
	static clamp(
		value: number,
		min: number,
		max: number
	): number {

		return Math.min(
			max,
			Math.max(
				min,
				value
			)
		);
	}
}