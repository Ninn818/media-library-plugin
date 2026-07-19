// src/utils/Array.ts

/**
 * ArrayUtils
 *
 * Generic array helpers.
 *
 * Keeps repeated array operations
 * in one place.
 */
export class ArrayUtils {


	/**
	 * Removes duplicate values.
	 */
	static unique<T>(
		items: T[]
	): T[] {

		return [
			...new Set(items),
		];
	}



	/**
	 * Returns a random item.
	 */
	static random<T>(
		items: T[]
	): T | undefined {

		if (items.length === 0) {
			return undefined;
		}


		const index =
			Math.floor(
				Math.random() *
				items.length
			);


		return items[index];
	}



	/**
	 * Sorts without modifying
	 * the original array.
	 */
	static sortBy<T>(
		items: T[],
		getValue: (item: T) => string
	): T[] {

		return [...items]
			.sort(
				(a, b) =>
					getValue(a)
						.localeCompare(
							getValue(b)
						)
			);
	}
}