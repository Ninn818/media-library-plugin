// src/components/Toolbar.ts

export interface ToolbarOptions {

	container: HTMLElement;
}


export class Toolbar {

	private container: HTMLElement;


	constructor(options: ToolbarOptions) {

		this.container = options.container;

		this.render();
	}


	private render(): void {

		this.container.empty();

		this.container.createDiv({
			cls: "media-toolbar",
		});
	}


	public getElement(): HTMLElement {

		return this.container;
	}


	public destroy(): void {

		this.container.empty();
	}
}