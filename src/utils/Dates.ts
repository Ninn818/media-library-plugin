// src/utils/Date.ts

/**
 * DateUtils
 *
 * Collection of generic date helpers.
 *
 * These utilities are not media specific.
 *
 * They can be used for:
 *
 * - Release dates
 * - Reading dates
 * - Watching dates
 * - Activity history
 * - Statistics
 */
export class DateUtils {


	/**
	 * Extracts a year from a date-like value.
	 *
	 * Examples:
	 *
	 * "2026-05-10" -> 2026
	 *
	 * "May 2026" -> 2026
	 *
	 * "2026" -> 2026
	 *
	 * Objects are ignored because:
	 *
	 * String({}) === "[object Object]"
	 *
	 * which is not useful date information.
	 */
	static getYear(
		value: unknown
	): number | undefined {


		if (
			value === null ||
			value === undefined
		) {
			return undefined;
		}


		/**
		 * Dates can be handled directly.
		 */
		if (value instanceof Date) {

			if (
				!isNaN(
					value.getTime()
				)
			) {

				return value.getFullYear();
			}

			return undefined;
		}



		/**
		 * Only process primitive values.
		 *
		 * This prevents accidental
		 * "[object Object]" conversion.
		 */
		if (
			typeof value !== "string" &&
			typeof value !== "number"
		) {
			return undefined;
		}



		const match =
			String(value).match(
				/(19|20)\d{2}/
			);



		if (!match) {
			return undefined;
		}



		return Number(
			match[0]
		);
	}



	/**
	 * Formats a date for display.
	 *
	 * Example:
	 *
	 * Date object
	 *
	 * becomes:
	 *
	 * January 2026
	 */
	static formatMonthYear(
		date: Date
	): string {

		return date.toLocaleDateString(
			undefined,
			{
				month: "long",
				year: "numeric",
			}
		);
	}



	/**
	 * Checks if a value is a valid date.
	 */
	static isValid(
		value: unknown
	): boolean {

		return (
			value instanceof Date &&
			!isNaN(
				value.getTime()
			)
		);
	}
}