// src/components/FilterBar.ts

import { FilterChip } from "./FilterChip";


export interface FilterOption {

	id: string;

	label: string;
}


export interface FilterBarOptions {

	container: HTMLElement;

	filters: FilterOption[];

	activeFilter?: string;

	onChange?: (filterId: string) => void;
}


export class FilterBar {


	private chips: Map<string, FilterChip> = new Map();

	private activeFilter: string;


	constructor(
		private options: FilterBarOptions
	) {

		this.activeFilter =
			options.activeFilter ??
			options.filters[0]?.id ??
			"";


		this.render();
	}


	private render(): void {

		this.options.container.empty();


		const wrapper =
			this.options.container.createDiv({
				cls: "media-filter-bar",
			});


		for (const filter of this.options.filters) {


			const chip =
				new FilterChip({

					container: wrapper,

					label: filter.label,

					active:
						filter.id === this.activeFilter,

					onClick:
						() =>
						this.select(filter.id),
				});


			this.chips.set(
				filter.id,
				chip
			);
		}
	}


	private select(id: string): void {


		this.activeFilter = id;


		for (const [
			filterId,
			chip
		] of this.chips) {

			chip.setActive(
				filterId === id
			);
		}


		this.options.onChange?.(
			id
		);
	}


	public getValue(): string {

		return this.activeFilter;
	}


	public destroy(): void {

		for (const chip of this.chips.values()) {

			chip.destroy();
		}


		this.chips.clear();

		this.options.container.empty();
	}
}