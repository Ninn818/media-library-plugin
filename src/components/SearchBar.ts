// src/components/SearchBar.ts

export interface SearchBarOptions {

	container: HTMLElement;

	placeholder?: string;

	value?: string;

	onSearch?: (query: string) => void;
}


export class SearchBar {

	private input: HTMLInputElement;


	constructor(options: SearchBarOptions) {

		options.container.empty();


		this.input = options.container.createEl(
			"input",
			{
				type: "search",
				placeholder:
					options.placeholder ?? "Search media...",
				cls: "media-search-bar",
			}
		);


		this.input.value =
			options.value ?? "";


		this.input.addEventListener(
			"input",
			() => {

				options.onSearch?.(
					this.input.value
				);

			}
		);
	}


	public getValue(): string {

		return this.input.value;
	}


	public setValue(value: string): void {

		this.input.value = value;
	}


	public destroy(): void {

		this.input.remove();
	}
}