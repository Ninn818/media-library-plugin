import { Modal, Notice, TFile } from "obsidian";

import { Poster } from "../components/Poster";
import { MediaActivityEntry, MediaItem } from "../models";
import { isMediaStatus } from "../models/MediaStatus";
import { ActivityLogService, getFallbackActivityEntries } from "../services/ActivityLogService";

interface MediaActivityModalOptions {
	item: MediaItem;
	activityLogService: ActivityLogService;
	onSaved: () => Promise<void>;
}

export class MediaActivityModal extends Modal {
	private readonly item: MediaItem;
	private readonly activityLogService: ActivityLogService;
	private readonly onSaved: () => Promise<void>;

	constructor(options: MediaActivityModalOptions) {
		super(options.activityLogService["app"]);
		this.item = options.item;
		this.activityLogService = options.activityLogService;
		this.onSaved = options.onSaved;
	}

	async onOpen(): Promise<void> {
		this.modalEl.addClass("media-activity-modal-shell");
		this.titleEl.setText(this.item.title);
		await this.render();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private async render(): Promise<void> {
		this.contentEl.empty();
		const file = this.app.vault.getAbstractFileByPath(this.item.path);
		if (!(file instanceof TFile)) {
			this.contentEl.createDiv({ text: "Could not find the note for this item." });
			return;
		}

		const entries = await this.activityLogService.loadEntries(file, this.item);
		const layout = this.contentEl.createDiv({ cls: "media-activity-modal" });
		const hero = layout.createDiv({ cls: "media-activity-modal-hero" });
		const poster = hero.createDiv({ cls: "media-activity-modal-poster" });
		new Poster(this.item, this.app).render(poster);

		const info = hero.createDiv({ cls: "media-activity-modal-info" });
		info.createEl("h2", { text: this.item.title });
		info.createDiv({ text: this.item.creator, cls: "media-activity-modal-creator" });
		info.createDiv({ text: `${capitalize(this.item.mediaType)} • ${this.item.year ?? "Unknown year"}`, cls: "media-activity-modal-meta" });
		if (this.item.summary) {
			info.createEl("p", { text: this.item.summary, cls: "media-activity-modal-summary" });
		}

		const body = layout.createDiv({ cls: "media-activity-modal-body" });
		this.renderEntryForm(body, file);
		this.renderTimeline(body, entries);
	}

	private renderEntryForm(container: HTMLElement, file: TFile): void {
		const section = container.createDiv({ cls: "media-activity-section" });
		section.createEl("h3", { text: `Log ${isReadingItem(this.item) ? "reading" : "watching"} activity` });

		const grid = section.createDiv({ cls: "media-activity-form-grid" });
		const dateInput = createLabeledInput(grid, "Date", "date", new Date().toISOString().slice(0, 10));
		const statusSelect = createLabeledSelect(grid, "Status", getStatusOptions(this.item), this.item.status ?? getCompletedStatus(this.item));
		const ratingSelect = createLabeledSelect(
			grid,
			"Rating",
			["", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
			this.item.rating != null ? String(this.item.rating) : ""
		);

		const noteField = section.createDiv({ cls: "media-activity-note-field" });
		noteField.createEl("label", { text: "Note" });
		const noteInput = noteField.createEl("textarea", { cls: "media-activity-note-input" });
		noteInput.placeholder = "Optional note for this read or watch";

		const actions = section.createDiv({ cls: "media-activity-form-actions" });
		const saveButton = actions.createEl("button", { text: "Save activity", cls: "mod-cta" });
		actions.createEl("button", { text: "Open note" }).addEventListener("click", () => {
			void this.app.workspace.openLinkText(this.item.path, "", false);
		});

		saveButton.addEventListener("click", async () => {
			const date = dateInput.value;
			if (!date) {
				new Notice("Choose a date before saving activity.");
				return;
			}

			saveButton.disabled = true;
			try {
				const rating = ratingSelect.value ? Number(ratingSelect.value) : null;
				await this.activityLogService.appendEntry(file, this.item, {
					date,
					status: statusSelect.value || getCompletedStatus(this.item),
					rating: Number.isFinite(rating) ? rating : null,
					note: noteInput.value,
					kind: isReadingItem(this.item) ? "read" : "watch",
				});
				await this.onSaved();
				await this.render();
			} finally {
				saveButton.disabled = false;
			}
		});
	}

	private renderTimeline(container: HTMLElement, entries: MediaActivityEntry[]): void {
		const section = container.createDiv({ cls: "media-activity-section" });
		section.createEl("h3", { text: "Activity log" });

		const timeline = section.createDiv({ cls: "media-activity-timeline" });
		const displayEntries = entries.length ? [...entries].reverse() : getFallbackActivityEntries(this.item).reverse();

		if (!displayEntries.length) {
			timeline.createDiv({
				text: `No ${isReadingItem(this.item) ? "reading" : "watching"} activity logged yet.`,
				cls: "media-activity-empty",
			});
			return;
		}

		for (const entry of displayEntries) {
			const card = timeline.createDiv({ cls: "media-activity-entry" });
			card.createDiv({ text: entry.date, cls: "media-activity-entry-date" });
			card.createDiv({
				text: [entry.kind === "read" ? "Read" : "Watched", entry.status ?? null].filter(Boolean).join(" • "),
				cls: "media-activity-entry-meta",
			});
			if (entry.rating != null) {
				card.createDiv({ text: `Rating ${entry.rating}/10`, cls: "media-activity-entry-rating" });
			}
			if (entry.note) {
				card.createEl("p", { text: entry.note, cls: "media-activity-entry-note" });
			}
		}
	}
}

function createLabeledInput(container: HTMLElement, label: string, type: string, value: string): HTMLInputElement {
	const field = container.createDiv({ cls: "media-activity-field" });
	field.createEl("label", { text: label });
	const input = field.createEl("input", { type, value });
	return input;
}

function createLabeledSelect(container: HTMLElement, label: string, options: string[], value: string): HTMLSelectElement {
	const field = container.createDiv({ cls: "media-activity-field" });
	field.createEl("label", { text: label });
	const select = field.createEl("select");
	for (const option of options) {
		select.createEl("option", { text: option === "" ? "No rating" : option, value: option });
	}
	select.value = value;
	return select;
}

function getStatusOptions(item: MediaItem): string[] {
	const statuses = isReadingItem(item)
		? ["read", "reading", "want to read", "finished", "favorite"]
		: ["watched", "watching", "want to watch", "completed", "favorite"];
	return statuses.filter((status) => isMediaStatus(status));
}

function isReadingItem(item: MediaItem): boolean {
	return item.mediaType === "book" || item.mediaType === "essay";
}

function getCompletedStatus(item: MediaItem): string {
	return isReadingItem(item) ? "read" : "watched";
}

function capitalize(value: string): string {
	return value.charAt(0).toUpperCase() + value.slice(1);
}