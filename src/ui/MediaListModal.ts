import { App, Modal, Notice, setIcon } from "obsidian";

import { MediaItem } from "../models";
import { MediaLibraryCustomList } from "../settings";
import { Poster } from "../PluginControllers";

export interface MediaListModalOptions {
	app: App;
	list: MediaLibraryCustomList;
	allItemsByPath: Map<string, MediaItem>;
	onSave(list: MediaLibraryCustomList): Promise<void> | void;
}

function cloneList(list: MediaLibraryCustomList): MediaLibraryCustomList {
	return { ...list, itemPaths: [...list.itemPaths] };
}

/**
 * MediaListModal
 *
 * A small gallery for one list.
 * - View mode: poster grid. Clicking a title opens its note and closes the modal.
 * - Edit mode: rename, describe, search to add titles, drag to reorder, remove.
 *   Nothing is written until Save. Cancel puts everything back.
 */
export class MediaListModal extends Modal {
	private list: MediaLibraryCustomList;
	private snapshot: MediaLibraryCustomList;
	private readonly allItemsByPath: Map<string, MediaItem>;
	private readonly onSave: (list: MediaLibraryCustomList) => Promise<void> | void;

	private isEditing = false;
	private itemsHost: HTMLElement | null = null;
	private countEl: HTMLElement | null = null;
	private dragPath: string | null = null;

	constructor(opts: MediaListModalOptions) {
		super(opts.app);
		this.list = cloneList(opts.list);
		this.snapshot = cloneList(opts.list);
		this.allItemsByPath = opts.allItemsByPath;
		this.onSave = opts.onSave;
	}

	onOpen(): void {
		this.modalEl.addClass("ml-list-shell");
		this.render();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	/* ------------------------------------------------------------------ */
	/* Layout                                                              */
	/* ------------------------------------------------------------------ */

	private render(): void {
		const { contentEl } = this;
		contentEl.empty();

		const shell = contentEl.createDiv({ cls: "ml-lm" });
		shell.toggleClass("is-editing", this.isEditing);

		// Header
		const head = shell.createDiv({ cls: "ml-lm-head" });
		const titleBlock = head.createDiv({ cls: "ml-lm-title-block" });

		if (this.isEditing) {
			titleBlock.createEl("label", { text: "List name", cls: "ml-lm-label" });
			const titleInput = titleBlock.createEl("input", { type: "text", cls: "ml-lm-title-input" });
			titleInput.value = this.list.name;
			titleInput.addEventListener("input", () => {
				this.list.name = titleInput.value;
			});
		} else {
			titleBlock.createEl("h2", { text: this.list.name, cls: "ml-lm-title" });
			this.countEl = titleBlock.createDiv({ cls: "ml-lm-meta" });
		}

		if (!this.isEditing) {
			const editButton = head.createEl("button", { text: "Edit", cls: "ml-lm-edit" });
			editButton.type = "button";
			editButton.addEventListener("click", () => {
				this.isEditing = true;
				this.render();
			});
		}

		// Description
		const desc = shell.createDiv({ cls: "ml-lm-desc" });
		if (this.isEditing) {
			desc.createEl("label", { text: "Description", cls: "ml-lm-label" });
			const textarea = desc.createEl("textarea", { cls: "ml-lm-desc-input" });
			textarea.value = this.list.description ?? "";
			textarea.placeholder = "What is this list for?";
			textarea.addEventListener("input", () => {
				const value = textarea.value.trim();
				if (value) {
					this.list.description = value;
				} else {
					delete this.list.description;
				}
			});
		} else {
			const text = this.list.description?.trim();
			desc.createDiv({
				cls: text ? "ml-lm-desc-text" : "ml-lm-desc-text is-empty",
				text: text || "No description yet.",
			});
		}

		if (this.isEditing) {
			this.renderAdd(shell);
		}

		// Items
		const section = shell.createDiv({ cls: "ml-lm-section" });
		if (this.isEditing) {
			const labelRow = section.createDiv({ cls: "ml-lm-section-head" });
			labelRow.createSpan({ text: "Titles", cls: "ml-lm-label" });
			this.countEl = labelRow.createSpan({ cls: "ml-lm-count" });
			labelRow.createSpan({ text: "Drag a poster to reorder", cls: "ml-lm-hint" });
		}
		this.itemsHost = section.createDiv({ cls: "ml-lm-items" });
		this.renderItems();

		// Footer
		if (this.isEditing) {
			const footer = shell.createDiv({ cls: "ml-lm-footer" });
			const cancel = footer.createEl("button", { text: "Cancel" });
			cancel.type = "button";
			cancel.addEventListener("click", () => {
				this.list = cloneList(this.snapshot);
				this.isEditing = false;
				this.render();
			});

			const save = footer.createEl("button", { text: "Save changes", cls: "mod-cta" });
			save.type = "button";
			save.addEventListener("click", () => {
				save.disabled = true;
				void this.save().finally(() => {
					save.disabled = false;
				});
			});
		}
	}

	private renderAdd(shell: HTMLElement): void {
		const wrap = shell.createDiv({ cls: "ml-lm-add" });
		wrap.createEl("label", { text: "Add titles", cls: "ml-lm-label" });
		const input = wrap.createEl("input", { type: "search", cls: "ml-lm-add-input" });
		input.placeholder = "Search your library by title or creator";
		const results = wrap.createDiv({ cls: "ml-lm-add-results" });

		const allItems = Array.from(this.allItemsByPath.values());

		const update = (): void => {
			results.empty();
			const query = input.value.trim().toLowerCase();
			if (!query) {
				return;
			}

			const matches = allItems
				.filter((item) => !this.list.itemPaths.includes(item.path))
				.filter((item) => item.title.toLowerCase().includes(query) || item.creator.toLowerCase().includes(query))
				.sort((left, right) => left.title.localeCompare(right.title, undefined, { sensitivity: "base" }))
				.slice(0, 8);

			if (!matches.length) {
				results.createDiv({ cls: "ml-lm-add-empty", text: "No matching titles" });
				return;
			}

			for (const item of matches) {
				const row = results.createEl("button", { cls: "ml-lm-add-row" });
				row.type = "button";
				row.createSpan({ text: item.title, cls: "ml-lm-add-title" });
				row.createSpan({
					text: [item.creator, item.mediaType].filter(Boolean).join(", "),
					cls: "ml-lm-add-meta",
				});
				row.addEventListener("click", () => {
					this.list.itemPaths = [...this.list.itemPaths, item.path];
					input.value = "";
					update();
					this.renderItems();
					input.focus();
				});
			}
		};

		input.addEventListener("input", update);
		input.addEventListener("keydown", (event) => {
			if (event.key === "Enter") {
				event.preventDefault();
				results.querySelector<HTMLButtonElement>(".ml-lm-add-row")?.click();
			}
		});
	}

	private renderItems(): void {
		const host = this.itemsHost;
		if (!host) {
			return;
		}
		host.empty();

		const present = this.list.itemPaths.filter((path) => this.allItemsByPath.has(path));
		const missing = this.list.itemPaths.length - present.length;

		this.countEl?.setText(
			this.isEditing
				? `${present.length}`
				: `${present.length} ${present.length === 1 ? "title" : "titles"}`,
		);

		if (this.isEditing && missing > 0) {
			const notice = host.createDiv({ cls: "ml-lm-notice" });
			notice.createSpan({
				text: `${missing} ${missing === 1 ? "title" : "titles"} in this list no longer exist in your vault.`,
			});
			const clean = notice.createEl("button", { text: "Remove them" });
			clean.type = "button";
			clean.addEventListener("click", () => {
				this.list.itemPaths = present;
				this.renderItems();
			});
		}

		if (!present.length) {
			host.createDiv({
				cls: "ml-lm-empty",
				text: this.isEditing ? "Nothing here yet. Search above to add titles." : "No titles in this list yet.",
			});
			return;
		}

		const grid = host.createDiv({ cls: "ml-lm-grid" });
		for (const path of present) {
			const item = this.allItemsByPath.get(path);
			if (!item) {
				continue;
			}

			const card = grid.createDiv({ cls: "ml-lm-card" });
			new Poster(item, this.app).render(card.createDiv({ cls: "ml-lm-poster" }));
			card.createDiv({ cls: "ml-lm-card-title", text: item.title });
			if (item.creator) {
				card.createDiv({ cls: "ml-lm-card-meta", text: item.creator });
			}

			if (!this.isEditing) {
				card.addEventListener("click", () => {
					void this.app.workspace.openLinkText(item.path, "", false);
					this.close();
				});
				continue;
			}

			const remove = card.createEl("button", { cls: "ml-lm-remove" });
			remove.type = "button";
			remove.setAttr("aria-label", `Remove ${item.title}`);
			setIcon(remove, "x");
			remove.addEventListener("click", (event) => {
				event.preventDefault();
				event.stopPropagation();
				this.list.itemPaths = this.list.itemPaths.filter((entry) => entry !== path);
				this.renderItems();
			});

			card.draggable = true;
			card.addEventListener("dragstart", (event) => {
				this.dragPath = path;
				card.addClass("is-dragging");
				if (event.dataTransfer) {
					event.dataTransfer.effectAllowed = "move";
					event.dataTransfer.setData("text/plain", path);
				}
			});
			card.addEventListener("dragend", () => {
				this.dragPath = null;
				card.removeClass("is-dragging");
			});
			card.addEventListener("dragover", (event) => {
				if (this.dragPath && this.dragPath !== path) {
					event.preventDefault();
					card.addClass("is-drop-target");
				}
			});
			card.addEventListener("dragleave", () => card.removeClass("is-drop-target"));
			card.addEventListener("drop", (event) => {
				event.preventDefault();
				card.removeClass("is-drop-target");
				if (this.dragPath) {
					this.moveBefore(this.dragPath, path);
				}
			});
		}
	}

	/* ------------------------------------------------------------------ */
	/* Actions                                                             */
	/* ------------------------------------------------------------------ */

	private moveBefore(source: string, target: string): void {
		const paths = this.list.itemPaths.filter((entry) => entry !== source);
		const targetIndex = paths.indexOf(target);
		if (targetIndex === -1) {
			return;
		}

		paths.splice(targetIndex, 0, source);
		this.list.itemPaths = paths;
		this.renderItems();
	}

	private async save(): Promise<void> {
		const name = this.list.name.trim();
		if (!name) {
			new Notice("Give the list a name first.");
			return;
		}

		this.list.name = name;
		this.list.updatedAt = new Date().toISOString();

		try {
			await this.onSave(cloneList(this.list));
			this.snapshot = cloneList(this.list);
			this.isEditing = false;
			this.render();
		} catch (error) {
			console.error("Media list: could not save", error);
			new Notice("Could not save the list.");
		}
	}
}
