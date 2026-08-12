import { Modal, Notice, TFile } from "obsidian";

import { Poster } from "../components/Poster";
import { MediaActivityEntry, MediaItem } from "../models";
import { isMediaStatus } from "../models/MediaStatus";
import { ActivityLogService, getFallbackActivityEntries } from "../services/ActivityLogService";
import { addTagToMediaNote } from "../services/TagService";
import { TagStorageFormat } from "../settings";

interface MediaActivityModalOptions {
	item: MediaItem;
	activityLogService: ActivityLogService;
	tagStorageFormat: TagStorageFormat;
	onSaved: () => Promise<void>;
}

export class MediaActivityModal extends Modal {
	private readonly item: MediaItem;
	private readonly activityLogService: ActivityLogService;
	private readonly tagStorageFormat: TagStorageFormat;
	private readonly onSaved: () => Promise<void>;

	constructor(options: MediaActivityModalOptions) {
		super(options.activityLogService["app"]);
		this.item = options.item;
		this.activityLogService = options.activityLogService;
		this.tagStorageFormat = options.tagStorageFormat;
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
		info.createDiv({ text: `${capitalize(this.item.mediaType)} • ${getDisplayYear(this.item)}`, cls: "media-activity-modal-meta" });
		const tags = readTagsFromFileCache(this.app, file);
		if (tags.length) {
			const tagRow = info.createDiv({ cls: "media-activity-modal-tags" });
			tagRow.createDiv({ text: "Tags", cls: "media-activity-modal-tags-label" });
			const chips = tagRow.createDiv({ cls: "media-activity-modal-tags-row" });
			for (const tag of tags) {
				chips.createDiv({ text: tag, cls: "media-activity-modal-tag-chip" });
			}
		}
		if (this.item.summary) {
			info.createEl("p", { text: this.item.summary, cls: "media-activity-modal-summary" });
		}

		const body = layout.createDiv({ cls: "media-activity-modal-body" });
		this.renderEditSection(body, file);
		this.renderTimeline(body, entries);
	}

	private renderEditSection(container: HTMLElement, file: TFile): void {
		const section = container.createDiv({ cls: "media-activity-section" });
		this.renderEntryForm(section, file);
		this.renderTagManager(section);
	}

	private renderEntryForm(container: HTMLElement, file: TFile): void {
		const section = container.createDiv({ cls: "media-activity-subsection" });
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

	private renderTagManager(container: HTMLElement): void {
		const section = container.createDiv({ cls: "media-activity-subsection" });
		section.createEl("h3", { text: "Manage tags" });

		const field = section.createDiv({ cls: "media-activity-note-field" });
		field.createEl("label", { text: "Add tags" });
		const tagInput = field.createEl("input", { cls: "media-activity-tag-input", type: "text" });
		tagInput.placeholder = "comfort-watch, rewatch, cozy";

		const actions = section.createDiv({ cls: "media-activity-form-actions" });
		const addButton = actions.createEl("button", { text: "Save tags", cls: "mod-cta" });

		addButton.addEventListener("click", async () => {
			const tags = tagInput.value
				.split(/[,\n]+/)
				.map((entry) => entry.trim())
				.filter((entry) => entry.length > 0);

			if (!tags.length) {
				new Notice("Enter at least one tag.");
				return;
			}

			addButton.disabled = true;
			try {
				let addedCount = 0;
				for (const tag of tags) {
					const result = await addTagToMediaNote(this.app, this.item.path, tag, this.tagStorageFormat);
					if (result.added) {
						addedCount += 1;
					}
				}

				if (addedCount === 0) {
					new Notice("No new tags were added.");
				} else {
					new Notice(`Saved ${addedCount} tag${addedCount === 1 ? "" : "s"}.`);
				}

				tagInput.value = "";
				await this.onSaved();
				await this.render();
			} finally {
				addButton.disabled = false;
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

		for (let idx = 0; idx < displayEntries.length; idx++) {
			const entry = displayEntries[idx];
			if (!entry) continue;
			
			const originalIndex = entries.length - 1 - idx; // Map back to original position
			const card = timeline.createDiv({ cls: "media-activity-entry" });
			
			// Create a wrapper for the view mode
			const viewMode = card.createDiv({ cls: "media-activity-entry-view" });
			viewMode.createDiv({ text: entry.date, cls: "media-activity-entry-date" });
			viewMode.createDiv({
				text: [entry.kind === "read" ? "Read" : "Watched", entry.status ?? null].filter(Boolean).join(" • "),
				cls: "media-activity-entry-meta",
			});
			if (entry.rating != null) {
				viewMode.createDiv({ text: `Rating ${entry.rating}/10`, cls: "media-activity-entry-rating" });
			}
			if (entry.note) {
				viewMode.createEl("p", { text: entry.note, cls: "media-activity-entry-note" });
			}

			// Add edit button
			const editBtn = viewMode.createEl("button", { text: "Edit", cls: "media-activity-entry-edit-btn" });
			editBtn.type = "button";
			editBtn.addEventListener("click", () => {
				this.openActivityEditMode(card, entry, originalIndex, entries, timeline);
			});

			card.style.cursor = "pointer";
		}
	}

	private openActivityEditMode(
		cardEl: HTMLElement,
		entry: MediaActivityEntry,
		originalIndex: number,
		allEntries: MediaActivityEntry[],
		timelineEl: HTMLElement
	): void {
		const file = this.app.vault.getAbstractFileByPath(this.item.path);
		if (!(file instanceof TFile)) {
			return;
		}

		const viewMode = cardEl.querySelector(".media-activity-entry-view") as HTMLElement;
		if (!viewMode) return;

		viewMode.style.display = "none";

		// Create edit mode
		const editMode = cardEl.createDiv({ cls: "media-activity-entry-edit" });
		
		const grid = editMode.createDiv({ cls: "media-activity-form-grid" });
		const dateInput = createLabeledInput(grid, "Date", "date", entry.date);
		const statusSelect = createLabeledSelect(grid, "Status", getStatusOptions(this.item), entry.status ?? getCompletedStatus(this.item));
		const ratingSelect = createLabeledSelect(
			grid,
			"Rating",
			["", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
			entry.rating != null ? String(entry.rating) : ""
		);

		const noteField = editMode.createDiv({ cls: "media-activity-note-field" });
		noteField.createEl("label", { text: "Note" });
		const noteInput = noteField.createEl("textarea", { cls: "media-activity-note-input" });
		noteInput.value = entry.note ?? "";
		noteInput.placeholder = "Optional note for this read or watch";

		const actions = editMode.createDiv({ cls: "media-activity-form-actions" });
		const saveBtn = actions.createEl("button", { text: "Save", cls: "mod-cta" });
		const cancelBtn = actions.createEl("button", { text: "Cancel" });

		const deleteBtn = actions.createEl("button", { text: "Delete", cls: "mod-warning" });

		saveBtn.addEventListener("click", async () => {
			saveBtn.disabled = true;
			try {
				const rating = ratingSelect.value ? Number(ratingSelect.value) : null;
				const updatedEntry: MediaActivityEntry = {
					date: dateInput.value,
					status: statusSelect.value || getCompletedStatus(this.item),
					rating: Number.isFinite(rating) ? rating : null,
					note: noteInput.value,
					kind: entry.kind,
				};

				// Update the entry at the correct position
				allEntries[originalIndex] = updatedEntry;
				await this.activityLogService.replaceEntries(file, this.item, allEntries);

				await this.onSaved();
				await this.render();
			} finally {
				saveBtn.disabled = false;
			}
		});

		cancelBtn.addEventListener("click", () => {
			editMode.remove();
			viewMode.style.display = "";
		});

		deleteBtn.addEventListener("click", async () => {
			deleteBtn.disabled = true;
			try {
				// Remove the entry at the correct position
				allEntries.splice(originalIndex, 1);
				await this.activityLogService.replaceEntries(file, this.item, allEntries);

				await this.onSaved();
				await this.render();
			} finally {
				deleteBtn.disabled = false;
			}
		});
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

function getDisplayYear(item: MediaItem): string {
	if (typeof item.year === "number" && Number.isFinite(item.year)) {
		return String(item.year);
	}

	const releaseMatch = item.releaseDate?.match(/\b(18|19|20)\d{2}\b/);
	if (releaseMatch?.[0]) {
		return releaseMatch[0];
	}

	const rawYear = item.raw?.year;
	if (typeof rawYear === "number" && Number.isFinite(rawYear)) {
		return String(rawYear);
	}
	if (typeof rawYear === "string") {
		const rawMatch = rawYear.match(/\b(18|19|20)\d{2}\b/);
		if (rawMatch?.[0]) {
			return rawMatch[0];
		}
	}

	return "Unknown year";
}

function readTagsFromFileCache(app: Modal["app"], file: TFile): string[] {
	const cache = app.metadataCache.getFileCache(file);
	const frontmatter = cache?.frontmatter as { mediaTags?: unknown } | undefined;
	if (!frontmatter) {
		return [];
	}

	if (Array.isArray(frontmatter.mediaTags)) {
		return frontmatter.mediaTags.map((entry) => String(entry)).filter((entry) => entry.trim().length > 0);
	}

	if (typeof frontmatter.mediaTags === "string") {
		return frontmatter.mediaTags
			.split(/[\s,]+/)
			.map((entry) => entry.trim())
			.filter((entry) => entry.length > 0);
	}

	return [];
}