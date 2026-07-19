import { App } from "obsidian";

import { Poster } from "../../components/Poster";
import { MediaActivityEntry } from "../../models/MediaActivityEntry";
import { MediaItem } from "../../models/MediaItem";
import { MediaLibrarySettings } from "../../settings";
import { isMediaStatus } from "../../models/MediaStatus";
import { getFallbackActivityEntries } from "../../services/ActivityLogService";

export interface LibraryDetailPanelCallbacks {
	onReviewChange(review: string): void;
	onSaveReview(review: string): Promise<void>;
	onSaveStatus(status: string | null): Promise<void>;
	onSaveRating(rating: number | null): Promise<void>;
	onMarkCompletedAgain(): Promise<void>;
}

export function renderLibraryDetailPanel(
	container: HTMLElement,
	item: MediaItem | null,
	app: App,
	settings: MediaLibrarySettings,
	getReviewDraft: () => string,
	callbacks: LibraryDetailPanelCallbacks
): void {
	container.empty();

	if (!item) {
		const empty = container.createDiv({ cls: "media-library-spotlight-empty" });
		empty.createEl("h3", { text: "Select a title" });
		empty.createEl("p", { text: "Pick a book, movie, series, or essay to see a featured view with cover art and quick actions." });
		return;
	}

	const spotlight = container.createDiv({ cls: "media-library-spotlight" });
	const posterCol = spotlight.createDiv({ cls: "media-library-spotlight-poster" });
	const infoCol = spotlight.createDiv({ cls: "media-library-spotlight-info" });

	const posterWrap = posterCol.createDiv({ cls: "media-library-spotlight-cover" });
	new Poster(item, app).render(posterWrap);

	const header = infoCol.createDiv({ cls: "media-library-detail-header" });
	header.createEl("h3", { text: item.title });
	header.createDiv({ text: item.creator, cls: "media-library-detail-subtitle" });
	header.createDiv({ text: `${item.mediaType} • ${item.year ?? "Unknown year"}`, cls: "media-library-detail-meta" });

	renderActionRow(infoCol, item, callbacks);

	if (settings.showReviewSection) {
		renderReviewSection(infoCol, item, getReviewDraft, callbacks);
	}

	const meta = infoCol.createDiv({ cls: "media-library-detail-body" });
	if (item.summary) {
		meta.createEl("p", { text: item.summary });
	}
	if (item.genres?.length) {
		meta.createDiv({ text: `Genres: ${item.genres.join(", ")}`, cls: "media-library-detail-meta" });
	}
	if (item.releaseDate) {
		meta.createDiv({ text: `Release date: ${item.releaseDate}`, cls: "media-library-detail-meta" });
	}
	if (item.date) {
		meta.createDiv({ text: `Completed: ${item.date}`, cls: "media-library-detail-meta" });
	}
	if (item.pages) {
		meta.createDiv({ text: `Pages: ${item.pages}`, cls: "media-library-detail-meta" });
	}
	if (item.isbn) {
		meta.createDiv({ text: `ISBN: ${item.isbn}`, cls: "media-library-detail-meta" });
	}
	if (item.duration) {
		meta.createDiv({ text: `Duration: ${item.duration}`, cls: "media-library-detail-meta" });
	}

	renderStatusHistory(infoCol, item);
}

function renderReviewSection(
	container: HTMLElement,
	item: MediaItem,
	getReviewDraft: () => string,
	callbacks: LibraryDetailPanelCallbacks
): void {
	const section = container.createDiv({ cls: "media-library-review" });
	section.createEl("h4", { text: "My Review" });

	const textarea = section.createEl("textarea", { cls: "media-library-review-textarea" });
	textarea.value = getReviewDraft();
	textarea.addEventListener("input", () => {
		callbacks.onReviewChange(textarea.value);
	});

	const actions = section.createDiv({ cls: "media-library-review-actions" });
	const saveButton = actions.createEl("button", { text: "Save review" });
	saveButton.addEventListener("click", async () => {
		await callbacks.onSaveReview(getReviewDraft());
	});

	if (item.review) {
		section.createDiv({ text: item.review, cls: "media-library-review-preview" });
	}
}

function renderActionRow(
	container: HTMLElement,
	item: MediaItem,
	callbacks: LibraryDetailPanelCallbacks
): void {
	const row = container.createDiv({ cls: "media-library-detail-actions" });

	const statusSelect = row.createEl("select");
	const statusOptions = getStatusOptionsForItem(item);
	for (const status of statusOptions) {
		statusSelect.createEl("option", { text: status, value: status });
	}
	statusSelect.value = item.status ?? statusOptions[0] ?? "";

	const statusButton = row.createEl("button", { text: "Save status" });
	statusButton.addEventListener("click", async () => {
		await callbacks.onSaveStatus(statusSelect.value || null);
	});

	const ratingSelect = row.createEl("select");
	for (const value of ["", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]) {
		ratingSelect.createEl("option", { text: value === "" ? "No rating" : value, value });
	}
	ratingSelect.value = item.rating != null ? String(item.rating) : "";

	const ratingButton = row.createEl("button", { text: "Save rating" });
	ratingButton.addEventListener("click", async () => {
		await callbacks.onSaveRating(ratingSelect.value === "" ? null : Number(ratingSelect.value));
	});

	const actionButton = row.createEl("button", { text: getActionLabel(item) });
	actionButton.addEventListener("click", async () => {
		await callbacks.onMarkCompletedAgain();
	});
}

function renderStatusHistory(container: HTMLElement, item: MediaItem): void {
	const history = getHistoryEntries(item);
	if (history.length === 0) return;

	const historyEl = container.createDiv({ cls: "media-library-detail-history-panel" });
	historyEl.createEl("strong", { text: "Activity" });
	for (const entry of history.slice(-5).reverse()) {
		const row = historyEl.createDiv({ cls: "media-library-detail-history" });
		row.createDiv({ text: `${entry.label}: ${entry.date}` });
		if (entry.rating != null) {
			row.createDiv({ text: `Rating ${entry.rating}/10`, cls: "media-library-detail-history-meta" });
		}
		if (entry.note) {
			row.createDiv({ text: entry.note, cls: "media-library-detail-history-meta" });
		}
	}
}

function getStatusOptionsForItem(item: MediaItem): string[] {
	const defaults = item.mediaType === "book" || item.mediaType === "essay"
		? ["read", "reading", "want to read", "finished", "dropped", "paused", "favorite"]
		: ["watched", "watching", "want to watch", "completed", "dropped", "paused", "favorite"];
	return defaults.filter((value): value is string => isMediaStatus(value));
}

function getActionLabel(item: MediaItem): string {
	return item.mediaType === "book" || item.mediaType === "essay"
		? "Mark as read again"
		: "Mark as watched again";
}

function getHistoryEntries(item: MediaItem): Array<{ label: string; date: string; rating: number | null; note?: string }> {
	const entries = item.activityEntries?.length ? item.activityEntries : getFallbackActivityEntries(item);
	return entries.map((entry: MediaActivityEntry) => ({
		label: entry.kind === "read" ? "Read" : "Watched",
		date: entry.date,
		rating: entry.rating,
		note: entry.note,
	}));
}