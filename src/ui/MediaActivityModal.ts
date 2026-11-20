import { Modal, Notice, TFile, TFolder, setIcon } from "obsidian";

import { Poster } from "../PluginControllers";
import { isMediaStatus, MediaActivityChange, MediaActivityEntry, MediaItem } from "../models";
import { ActivityLogService, addTagToMediaNote } from "../services";
import { TagStorageFormat } from "../settings";

//give me a button that will generate a mla 9 format citation of the file currently being viewed

interface MediaActivityModalOptions {
	item: MediaItem;
	activityLogService: ActivityLogService;
	tagStorageFormat: TagStorageFormat;
	onSaved: () => Promise<void>;
}

const RATING_OPTIONS = ["", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

/** Where "Create review note" saves its files. Created on demand. */
const REVIEW_FOLDER = "Personal/Review";

export class MediaActivityModal extends Modal {
	private readonly item: MediaItem;
	private readonly activityLogService: ActivityLogService;
	private readonly tagStorageFormat: TagStorageFormat;
	private readonly onSaved: () => Promise<void>;

	constructor(options: MediaActivityModalOptions) {
		super(options.activityLogService.app);
		this.item = options.item;
		this.activityLogService = options.activityLogService;
		this.tagStorageFormat = options.tagStorageFormat;
		this.onSaved = options.onSaved;
	}

	async onOpen(): Promise<void> {
		this.modalEl.addClass("ml-activity-shell");
		await this.render();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	/* ------------------------------------------------------------------ */
	/* Layout                                                              */
	/* ------------------------------------------------------------------ */

	private async render(): Promise<void> {
		this.contentEl.empty();

		const file = this.app.vault.getAbstractFileByPath(this.item.path);
		if (!(file instanceof TFile)) {
			this.contentEl.createDiv({
				cls: "ml-am-missing",
				text: "Could not find the note for this item. It may have been moved or deleted.",
			});
			return;
		}

		const entries = await this.activityLogService.loadEntries(file, this.item);
		const layout = this.contentEl.createDiv({ cls: "ml-am" });
		this.renderHero(layout, file, entries);

		const body = layout.createDiv({ cls: "ml-am-body" });
		const side = body.createDiv({ cls: "ml-am-side" });
		this.renderEntryForm(side, file);
		this.renderTagManager(side);
		this.renderTimeline(body.createDiv({ cls: "ml-am-main" }), file, entries);
	}

	private renderHero(container: HTMLElement, file: TFile, entries: MediaActivityEntry[]): void {
		const hero = container.createDiv({ cls: "ml-am-hero" });
		new Poster(this.item, this.app).render(hero.createDiv({ cls: "ml-am-poster" }));

		const info = hero.createDiv({ cls: "ml-am-info" });
		info.createEl("h2", { text: this.item.title, cls: "ml-am-title" });
		if (this.item.creator) {
			info.createDiv({ text: this.item.creator, cls: "ml-am-creator" });
		}

		const facts = info.createDiv({ cls: "ml-am-facts" });
		facts.createSpan({ text: capitalize(this.item.mediaType), cls: "ml-am-chip" });
		const year = getDisplayYear(this.item);
		if (year) {
			facts.createSpan({ text: year, cls: "ml-am-chip" });
		}
		if (this.item.status) {
			facts.createSpan({
				text: capitalize(this.item.status),
				cls: `ml-am-chip is-status${isInProgress(this.item.status) ? " is-active" : ""}`,
			});
		}
		if (this.item.rating != null) {
			facts.createSpan({ text: `\u2605 ${this.item.rating}/10`, cls: "ml-am-chip is-rating" });
		}
		for (const genre of this.item.genres.slice(0, 3)) {
			facts.createSpan({ text: genre, cls: "ml-am-chip is-genre" });
		}

		const tags = readTagsFromFileCache(this.app, file);
		if (tags.length) {
			const row = info.createDiv({ cls: "ml-am-tags" });
			for (const tag of tags) {
				row.createSpan({ text: tag, cls: "ml-am-tag" });
			}
		}

		if (this.item.summary) {
			info.createEl("p", { text: this.item.summary, cls: "ml-am-summary" });
		}

		const last = latestEntry(entries);
		if (last) {
			info.createDiv({
				cls: "ml-am-stat",
				text: `${entries.length} log ${entries.length === 1 ? "entry" : "entries"}, last on ${formatDate(last.date)}`,
			});
		}
	}

	/* ------------------------------------------------------------------ */
	/* Log form                                                            */
	/* ------------------------------------------------------------------ */

	private renderEntryForm(container: HTMLElement, file: TFile): void {
		const section = container.createDiv({ cls: "ml-am-section" });
		section.createEl("h3", {
			text: `Log ${isReadingItem(this.item) ? "reading" : "watching"} activity`,
			cls: "ml-am-heading",
		});

		const grid = section.createDiv({ cls: "ml-am-grid" });
		const dateInput = createLabeledInput(grid, "Date", "date", todayLocal());
		const startStatus =
			this.item.status && isInProgress(this.item.status) ? this.item.status : getCompletedStatus(this.item);
		const statusSelect = createLabeledSelect(grid, "Status", getStatusOptions(this.item), startStatus);
		const ratingSelect = createLabeledSelect(
			grid,
			"Rating",
			RATING_OPTIONS,
			this.item.rating != null ? String(Math.round(this.item.rating)) : "",
		);
		const progressInput = createLabeledInput(grid, "Progress (%)", "number", "");
		progressInput.min = "0";
		progressInput.max = "100";
		progressInput.step = "1";
		progressInput.placeholder = "0 to 100";

		const noteField = section.createDiv({ cls: "ml-am-field" });
		noteField.createEl("label", { text: "Note" });
		const noteInput = noteField.createEl("textarea", { cls: "ml-am-textarea" });
		noteInput.placeholder = `Optional note for this ${isReadingItem(this.item) ? "read" : "watch"}`;

		const actions = section.createDiv({ cls: "ml-am-actions" });
		const saveButton = actions.createEl("button", { text: "Save activity", cls: "mod-cta" });
		saveButton.type = "button";
		const reviewButton = actions.createEl("button", { text: "Create review note" });
		reviewButton.type = "button";
		reviewButton.setAttr("title", "Save the note above as its own file, linked to this title");
		const openButton = actions.createEl("button", { text: "Open note" });
		openButton.type = "button";

		openButton.addEventListener("click", () => {
			void this.app.workspace.openLinkText(this.item.path, "", false);
			this.close();
		});

		reviewButton.addEventListener("click", () => {
			const note = noteInput.value.trim();
			if (!note) {
				new Notice("Write a note before creating a review note.");
				return;
			}
			if (!dateInput.value) {
				new Notice("Choose a date first.");
				return;
			}
			void this.createReviewFile(note, dateInput.value, reviewButton);
		});

		saveButton.addEventListener("click", () => {
			void (async () => {
				if (!dateInput.value) {
					new Notice("Choose a date before saving activity.");
					return;
				}

				saveButton.disabled = true;
				try {
					await this.activityLogService.appendEntry(file, this.item, {
						date: dateInput.value,
						status: statusSelect.value || getCompletedStatus(this.item),
						rating: ratingSelect.value ? Number(ratingSelect.value) : null,
						progress: parseProgress(progressInput.value),
						note: noteInput.value,
						kind: isReadingItem(this.item) ? "read" : "watch",
					});

					this.syncItem(await this.activityLogService.loadEntries(file, this.item));
					await this.onSaved();
					await this.render();
				} catch (error) {
					console.error("Media activity: could not save", error);
					new Notice("Could not save the activity.");
					saveButton.disabled = false;
				}
			})();
		});
	}

	private async createReviewFile(note: string, date: string, button: HTMLButtonElement): Promise<void> {
		button.disabled = true;
		try {
			await this.ensureFolder(REVIEW_FOLDER);

			const baseName = `Review for ${this.item.title} - ${date}`.replace(/[\\/:*?"<>|#^[\]]/g, "-").trim();
			let path = `${REVIEW_FOLDER}/${baseName}.md`;
			let suffix = 2;
			while (this.app.vault.getAbstractFileByPath(path)) {
				path = `${REVIEW_FOLDER}/${baseName} (${suffix}).md`;
				suffix += 1;
			}

			const mediaLink = this.item.path.replace(/\.md$/i, "");
			await this.app.vault.create(path, `# Review for ${this.item.title}\n\nMedia: [[${mediaLink}]]\n\n${note}\n`);
			new Notice(`Created ${path}.`);
		} catch (error) {
			console.error("Media activity: could not create review note", error);
			new Notice("Could not create the review note.");
		} finally {
			button.disabled = false;
		}
	}

	/** Creates every missing folder along a path such as "Personal/Review". */
	private async ensureFolder(folder: string): Promise<void> {
		let current = "";
		for (const segment of folder.split("/").filter(Boolean)) {
			current = current ? `${current}/${segment}` : segment;
			const existing = this.app.vault.getAbstractFileByPath(current);
			if (existing instanceof TFolder) {
				continue;
			}
			if (existing) {
				throw new Error(`Cannot create review folder because "${current}" is not a folder.`);
			}

			try {
				await this.app.vault.createFolder(current);
			} catch (error) {
				if (this.app.vault.getAbstractFileByPath(current) instanceof TFolder) {
					continue;
				}
				throw error;
			}
		}
	}

	/* ------------------------------------------------------------------ */
	/* Tags                                                                */
	/* ------------------------------------------------------------------ */

	private renderTagManager(container: HTMLElement): void {
		const section = container.createDiv({ cls: "ml-am-section" });
		section.createEl("h3", { text: "Tags", cls: "ml-am-heading" });

		const row = section.createDiv({ cls: "ml-am-inline" });
		const tagInput = row.createEl("input", { type: "text" });
		tagInput.placeholder = "comfort-watch, rewatch, cozy";
		const addButton = row.createEl("button", { text: "Add" });
		addButton.type = "button";

		const submit = async (): Promise<void> => {
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
				let added = 0;
				for (const tag of tags) {
					const result = await addTagToMediaNote(this.app, this.item.path, tag, this.tagStorageFormat);
					if (result.added) {
						added += 1;
					}
				}

				new Notice(added === 0 ? "No new tags were added." : `Saved ${added} tag${added === 1 ? "" : "s"}.`);
				tagInput.value = "";
				await this.onSaved();
				await this.render();
			} catch (error) {
				console.error("Media activity: could not save tags", error);
				new Notice("Could not save the tags.");
				addButton.disabled = false;
			}
		};

		addButton.addEventListener("click", () => void submit());
		tagInput.addEventListener("keydown", (event) => {
			if (event.key === "Enter") {
				event.preventDefault();
				void submit();
			}
		});
	}

	/* ------------------------------------------------------------------ */
	/* Timeline                                                            */
	/* ------------------------------------------------------------------ */

	private renderTimeline(container: HTMLElement, file: TFile, entries: MediaActivityEntry[]): void {
		const section = container.createDiv({ cls: "ml-am-section" });
		section.createEl("h3", { text: "Activity log", cls: "ml-am-heading" });

		if (!entries.length) {
			section.createDiv({
				cls: "ml-am-empty",
				text: `No ${isReadingItem(this.item) ? "reading" : "watching"} activity logged yet.`,
			});
			return;
		}

		const timeline = section.createDiv({ cls: "ml-am-timeline" });
		const newestFirst = entries.map((entry, index) => ({ entry, index })).reverse();
		for (const { entry, index } of newestFirst) {
			const row = timeline.createDiv({ cls: "ml-am-entry" });
			row.toggleClass("is-active", isInProgress(entry.status));
			row.createDiv({ cls: "ml-am-entry-dot" });
			this.renderEntryView(row.createDiv({ cls: "ml-am-entry-body" }), file, entries, entry, index);
		}
	}

	private renderEntryView(
		body: HTMLElement,
		file: TFile,
		entries: MediaActivityEntry[],
		entry: MediaActivityEntry,
		index: number,
	): void {
		body.empty();

		const head = body.createDiv({ cls: "ml-am-entry-head" });
		head.createSpan({ text: formatDate(entry.date), cls: "ml-am-entry-date" });
		if (entry.status) {
			head.createSpan({
				text: capitalize(entry.status),
				cls: `ml-am-chip is-status${isInProgress(entry.status) ? " is-active" : ""}`,
			});
		}
		if (entry.rating != null) {
			head.createSpan({ text: `\u2605 ${entry.rating}/10`, cls: "ml-am-chip is-rating" });
		}

		const edit = head.createEl("button", { cls: "ml-am-edit clickable-icon" });
		edit.type = "button";
		edit.setAttr("aria-label", "Edit entry");
		setIcon(edit, "pencil");
		edit.addEventListener("click", () => this.renderEntryEdit(body, file, entries, entry, index));

		if (entry.progress != null) {
			const track = body.createDiv({ cls: "ml-am-progress" });
			track.createDiv({ cls: "ml-am-progress-fill" }).style.width = `${entry.progress}%`;
			body.createDiv({ cls: "ml-am-progress-label", text: `${entry.progress}% through` });
		}

		if (entry.note) {
			body.createEl("p", { text: entry.note, cls: "ml-am-entry-note" });
		}
	}

	private renderEntryEdit(
		body: HTMLElement,
		file: TFile,
		entries: MediaActivityEntry[],
		entry: MediaActivityEntry,
		index: number,
	): void {
		body.empty();
		const form = body.createDiv({ cls: "ml-am-edit-form" });

		const grid = form.createDiv({ cls: "ml-am-grid" });
		const dateInput = createLabeledInput(grid, "Date", "date", entry.date.slice(0, 10));
		const statusOptions = getStatusOptions(this.item);
		if (entry.status && !statusOptions.includes(entry.status)) {
			statusOptions.push(entry.status);
		}
		const statusSelect = createLabeledSelect(
			grid,
			"Status",
			statusOptions,
			entry.status ?? getCompletedStatus(this.item),
		);
		const ratingSelect = createLabeledSelect(
			grid,
			"Rating",
			RATING_OPTIONS,
			entry.rating != null ? String(Math.round(entry.rating)) : "",
		);
		const progressInput = createLabeledInput(
			grid,
			"Progress (%)",
			"number",
			entry.progress != null ? String(entry.progress) : "",
		);
		progressInput.min = "0";
		progressInput.max = "100";
		progressInput.step = "1";
		progressInput.placeholder = "0 to 100";

		const noteField = form.createDiv({ cls: "ml-am-field" });
		noteField.createEl("label", { text: "Note" });
		const noteInput = noteField.createEl("textarea", { cls: "ml-am-textarea" });
		noteInput.value = entry.note ?? "";

		const actions = form.createDiv({ cls: "ml-am-actions" });
		const saveButton = actions.createEl("button", { text: "Save", cls: "mod-cta" });
		const reviewButton = actions.createEl("button", { text: "Create review note" });
		const cancelButton = actions.createEl("button", { text: "Cancel" });
		const deleteButton = actions.createEl("button", { text: "Delete", cls: "mod-warning ml-am-delete" });
		for (const button of [saveButton, reviewButton, cancelButton, deleteButton]) {
			button.type = "button";
		}

		reviewButton.setAttr("title", "Save the note above as its own file, linked to this title");
		reviewButton.addEventListener("click", () => {
			const note = noteInput.value.trim();
			if (!note) {
				new Notice("Write a note before creating a review note.");
				return;
			}
			if (!dateInput.value) {
				new Notice("Choose a date first.");
				return;
			}
			void this.createReviewFile(note, dateInput.value, reviewButton);
		});

		cancelButton.addEventListener("click", () => this.renderEntryView(body, file, entries, entry, index));

		saveButton.addEventListener("click", () => {
			void (async () => {
				if (!dateInput.value) {
					new Notice("Choose a date first.");
					return;
				}

				saveButton.disabled = true;
				try {
					const updatedEntry: MediaActivityEntry = {
						...entry,
						date: dateInput.value,
						status: statusSelect.value || getCompletedStatus(this.item),
						rating: ratingSelect.value ? Number(ratingSelect.value) : null,
						progress: parseProgress(progressInput.value),
						note: noteInput.value,
					};
					const changes = getChangedActivityFields(entry, updatedEntry);
					if (changes.length) {
						updatedEntry.editedAt = new Date().toISOString();
						updatedEntry.changes = changes;
					}
					entries[index] = updatedEntry;

					await this.activityLogService.replaceEntries(file, this.item, entries);
					this.syncItem(entries);
					await this.onSaved();
					await this.render();
				} catch (error) {
					console.error("Media activity: could not update entry", error);
					new Notice("Could not update the entry.");
					saveButton.disabled = false;
				}
			})();
		});

		// Two clicks to delete, so a stray click cannot remove a log entry.
		let confirming = false;
		let resetTimer: number | undefined;
		deleteButton.addEventListener("click", () => {
			if (!confirming) {
				confirming = true;
				deleteButton.setText("Click again to delete");
				deleteButton.addClass("is-confirming");
				resetTimer = window.setTimeout(() => {
					confirming = false;
					deleteButton.setText("Delete");
					deleteButton.removeClass("is-confirming");
				}, 4000);
				return;
			}

			window.clearTimeout(resetTimer);
			void (async () => {
				deleteButton.disabled = true;
				try {
					entries.splice(index, 1);
					await this.activityLogService.replaceEntries(file, this.item, entries);
					this.syncItem(entries);
					await this.onSaved();
					await this.render();
				} catch (error) {
					console.error("Media activity: could not delete entry", error);
					new Notice("Could not delete the entry.");
					deleteButton.disabled = false;
				}
			})();
		});
	}

	/** Keeps the in-memory item in step with the log after any change. */
	private syncItem(entries: MediaActivityEntry[]): void {
		const latest = latestEntry(entries);
		if (!latest) {
			this.item.rating = null;
			return;
		}

		this.item.date = latest.date;
		this.item.rating = latest.rating;
		if (latest.status && isMediaStatus(latest.status)) {
			this.item.status = latest.status;
		}
		if (this.item.raw && latest.progress != null) {
			this.item.raw.progress = latest.progress;
		}
	}
}

/* ---------------------------------------------------------------------- */
/* Helpers                                                                 */
/* ---------------------------------------------------------------------- */

function createLabeledInput(container: HTMLElement, label: string, type: string, value: string): HTMLInputElement {
	const field = container.createDiv({ cls: "ml-am-field" });
	field.createEl("label", { text: label });
	return field.createEl("input", { type, value });
}

function createLabeledSelect(container: HTMLElement, label: string, options: string[], value: string): HTMLSelectElement {
	const field = container.createDiv({ cls: "ml-am-field" });
	field.createEl("label", { text: label });
	const select = field.createEl("select", { cls: "dropdown" });
	for (const option of options) {
		select.createEl("option", { text: option === "" ? "No rating" : option, value: option });
	}
	select.value = options.includes(value) ? value : (options[0] ?? "");
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

function isInProgress(status: string | null | undefined): boolean {
	const normalized = (status ?? "").toLowerCase().trim();
	return normalized === "reading" || normalized === "watching";
}

function getCompletedStatus(item: MediaItem): string {
	return isReadingItem(item) ? "read" : "watched";
}

function parseProgress(value: string): number | null {
	if (!value.trim()) {
		return null;
	}

	const progress = Number(value);
	return Number.isFinite(progress) ? Math.max(0, Math.min(100, Math.round(progress))) : null;
}

function getChangedActivityFields(
	previous: MediaActivityEntry,
	updated: MediaActivityEntry,
): MediaActivityChange[] {
	const changes: MediaActivityChange[] = [];
	if (previous.date !== updated.date) changes.push("date");
	if (previous.status !== updated.status) changes.push("status");
	if (previous.rating !== updated.rating) changes.push("rating");
	if ((previous.progress ?? null) !== (updated.progress ?? null)) changes.push("progress");
	if ((previous.note ?? "").trim() !== (updated.note ?? "").trim()) changes.push("note");
	return changes;
}

function capitalize(value: string): string {
	return value.charAt(0).toUpperCase() + value.slice(1);
}

function latestEntry(entries: MediaActivityEntry[]): MediaActivityEntry | undefined {
	return [...entries]
		.sort((left, right) => (left.recordedAt ?? left.date).localeCompare(right.recordedAt ?? right.date))
		.pop();
}

/** Today in the user's own timezone. toISOString() would give the UTC date, which is tomorrow in the evening. */
function todayLocal(): string {
	const now = new Date();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	return `${now.getFullYear()}-${month}-${day}`;
}

function formatDate(value: string): string {
	const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (!match) {
		return value;
	}

	const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
	if (Number.isNaN(date.getTime())) {
		return value;
	}

	return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getDisplayYear(item: MediaItem): string | null {
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

	return null;
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