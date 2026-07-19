// src/views/ViewSwitcher.ts

import { setIcon } from "obsidian";
import { ViewRegistry } from "../core/ViewRegistry";

export interface ViewSwitcherOptions {
	container: HTMLElement;
	viewRegistry: ViewRegistry;
	initialView?: string;
	onChange?: (viewId: string) => void;
}

/**
 * Controls switching between registered library views.
 *
 * Responsibilities:
 * - Render available views
 * - Highlight active view
 * - Notify LibraryView when selection changes
 *
 * Does NOT:
 * - Render views
 * - Manage MediaItems
 * - Access the vault
 * - Handle filtering/search
 */
export class ViewSwitcher {
	private container: HTMLElement;
	private viewRegistry: ViewRegistry;

	private activeView: string;

	private onChange?: (viewId: string) => void;

	private buttons: Map<string, HTMLButtonElement> = new Map();


	constructor(options: ViewSwitcherOptions) {
		this.container = options.container;
		this.viewRegistry = options.viewRegistry;

		this.activeView =
			options.initialView ??
			this.viewRegistry.getDefault().id;

		this.onChange = options.onChange;

		this.render();
	}


	/**
	 * Render view buttons.
	 */
	private render(): void {
		this.container.empty();

		const wrapper = this.container.createDiv({
			cls: "media-view-switcher",
		});


		for (const view of this.viewRegistry.getAll()) {

			const button = wrapper.createEl("button", {
				cls: "media-view-switcher-button",
			});


			button.dataset.viewId = view.id;


			const icon = button.createSpan({
				cls: "media-view-switcher-icon",
			});

			setIcon(
				icon,
				view.icon
			);


			button.createSpan({
				text: view.name,
				cls: "media-view-switcher-label",
			});


			button.addEventListener(
				"click",
				() => {
					this.setActiveView(view.id);
				}
			);


			this.buttons.set(
				view.id,
				button
			);
		}


		this.updateActiveState();
	}


	/**
	 * Set active view.
	 */
	public setActiveView(viewId: string): void {

		if (!this.viewRegistry.has(viewId)) {
			console.warn(
				`ViewSwitcher: View "${viewId}" does not exist.`
			);

			return;
		}


		if (this.activeView === viewId) {
			return;
		}


		this.activeView = viewId;

		this.updateActiveState();

		this.onChange?.(viewId);
	}


	/**
	 * Update selected button styling.
	 */
	private updateActiveState(): void {

		for (const [id, button] of this.buttons) {

			if (id === this.activeView) {
				button.addClass("is-active");
			}
			else {
				button.removeClass("is-active");
			}
		}
	}


	/**
	 * Current active view id.
	 */
	public getActiveView(): string {
		return this.activeView;
	}


	/**
	 * Rebuild buttons after registry changes.
	 */
	public refresh(): void {

		this.buttons.clear();

		this.render();
	}


	/**
	 * Remove component.
	 */
	public destroy(): void {

		this.buttons.clear();

		this.container.empty();
	}
}