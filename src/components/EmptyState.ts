// src/components/EmptyState.ts

export interface EmptyStateOptions {
	container: HTMLElement;
	title: string;
	message?: string;
	icon?: string;
	actionLabel?: string;
	onAction?: () => void;
}


export class EmptyState {

	private container: HTMLElement;

	private options: EmptyStateOptions;


	constructor(options: EmptyStateOptions) {

		this.container = options.container;
		this.options = options;

		this.render();
	}


	private render(): void {

		this.container.empty();

		const wrapper = this.container.createDiv({
			cls: "media-empty-state",
		});


		if (this.options.icon) {

			const icon = wrapper.createDiv({
				cls: "media-empty-state-icon",
			});

			icon.setText(
				this.options.icon
			);
		}


		wrapper.createEl("h3", {
			text: this.options.title,
		});


		if (this.options.message) {

			wrapper.createEl("p", {
				text: this.options.message,
			});
		}


		if (this.options.actionLabel) {

			const button = wrapper.createEl("button", {
				text: this.options.actionLabel,
				cls: "media-empty-state-button",
			});


			button.addEventListener(
				"click",
				() => {
					this.options.onAction?.();
				}
			);
		}
	}


	public destroy(): void {

		this.container.empty();
	}
}