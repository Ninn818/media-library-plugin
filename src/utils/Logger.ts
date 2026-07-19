// src/utils/Logger.ts

/**
 * Logger
 *
 * Central logging utility.
 *
 * Instead of scattering:
 *
 * console.log()
 *
 * everywhere, the plugin can control
 * logging from one place.
 *
 * Future:
 *
 * - Debug mode setting
 * - Log levels
 * - File logging
 */
export class Logger {


	static enabled = true;



	static log(
		message: string,
		...args: unknown[]
	): void {

		if (!this.enabled) {
			return;
		}
        
	}



	static warn(
		message: string,
		...args: unknown[]
	): void {

		console.warn(
			`[Media Library] ${message}`,
			...args
		);
	}



	static error(
		message: string,
		...args: unknown[]
	): void {

		console.error(
			`[Media Library] ${message}`,
			...args
		);
	}
}