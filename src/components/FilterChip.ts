// src/components/FilterChip.ts

export interface FilterChipOptions {

	container: HTMLElement;

	label: string;

	active?: boolean;

	onClick?: () => void;
}


export class FilterChip {

	private button: HTMLButtonElement;


	constructor(options: FilterChipOptions) {


		this.button =
			options.container.createEl(
				"button",
				{
					text: options.label,
					cls: "media-filter-chip",
				}
			);


		if (options.active) {

			this.button.addClass(
				"is-active"
			);
		}


		this.button.addEventListener(
			"click",
			() => {

				options.onClick?.();

			}
		);
	}


	setActive(active: boolean): void {

		if (active) {

			this.button.addClass(
				"is-active"
			);

		} else {

			this.button.removeClass(
				"is-active"
			);
		}
	}


	destroy(): void {

		this.button.remove();
	}
}