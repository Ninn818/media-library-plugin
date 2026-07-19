// src/utils/String.ts

/**
 * StringUtils
 *
 * Generic string manipulation helpers.
 *
 * Used anywhere text needs normalization.
 *
 * Examples:
 *
 * - Search
 * - Sorting
 * - Matching
 * - Display cleanup
 */
export class StringUtils {


    /**
     * Converts a value into normalized searchable text.
     *
     * Objects are ignored because:
     *
     * String({})
     *
     * becomes:
     *
     * "[object Object]"
     *
     * which is almost never useful for searching.
     */
    static normalize(
        value: unknown
    ): string {

        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }


        if (
            typeof value !== "string" &&
            typeof value !== "number" &&
            typeof value !== "boolean"
        ) {
            return "";
        }


        return String(value)
            .toLowerCase()
            .trim();
    }


	/**
	 * Creates a slug.
	 *
	 * Example:
	 *
	 * "Science Fiction"
	 *
	 * becomes:
	 *
	 * "science-fiction"
	 */
	static slugify(
		value: string
	): string {

		return value
			.toLowerCase()
			.trim()
			.replace(
				/[^a-z0-9]+/g,
				"-"
			)
			.replace(
			(/^-|-$/g),
				""
			);
	}



	/**
	 * Checks whether text contains
	 * another string safely.
	 */
	static includes(
		text: unknown,
		search: unknown
	): boolean {

		return this.normalize(text)
			.includes(
				this.normalize(search)
			);
	}
}