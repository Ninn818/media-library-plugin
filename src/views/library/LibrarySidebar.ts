import { MediaItem } from "../../models/MediaItem";
import { timeAgoFromDate } from "../../utils/TimeAgo";

interface SidebarMetric {
	label: string;
	value: string;
}

interface SidebarFeedItem {
	title: string;
	meta: string;
}

interface ActivityEvent {
	date: string;
	title: string;
	meta: string;
}

export interface LibrarySidebarState {
	visibleItems: MediaItem[];
	variant?: "default" | "airy";
	mode?: "default" | "home";
}

export function renderLibrarySidebar(
	container: HTMLElement,
	state: LibrarySidebarState
): void {
	container.empty();

	const rail = container.createDiv({ cls: "media-library-sidebar-rail" });
	if (state.variant === "airy") {
		rail.addClass("is-airy");
	}

	renderMetricsSection(rail, state);
	renderQueueSection(rail, state.visibleItems, state.variant);
	renderActivitySection(rail, state.visibleItems, state.variant, state.mode);
}

function renderMetricsSection(container: HTMLElement, state: LibrarySidebarState): void {
	const section = createSection(container, "Library snapshot", state.variant);
	const metrics = getMetrics(state.visibleItems, state.mode ?? "default");
	const grid = section.createDiv({ cls: "media-library-sidebar-metrics" });
	if ((state.mode ?? "default") === "home") {
		grid.addClass("is-home-metrics");
	}

	for (const metric of metrics) {
		const card = grid.createDiv({ cls: "media-library-sidebar-metric" });
		card.createDiv({ text: metric.value, cls: "media-library-sidebar-metric-value" });
		card.createDiv({ text: metric.label, cls: "media-library-sidebar-metric-label" });
	}
}
/*
function renderQueueSection(container: HTMLElement, items: MediaItem[], variant?: "default" | "airy"): void {
	const section = createSection(container, "Up next", variant);
	const queuedItems = items
		.filter((item) => item.status === null)
		.slice(0, 4);

	if (!queuedItems.length) {
		renderEmptyState(section, "No queued titles in this view.");
		return;
	}

	renderFeed(section, queuedItems.map((item) => ({
		title: item.title,
		meta: [item.creator, item.year ? String(item.year) : null].filter(Boolean).join(" • "),
	})));
}
*/
function renderActivitySection(
	container: HTMLElement,
	items: MediaItem[],
	variant?: "default" | "airy",
	mode: "default" | "home" = "default"
): void {
	const section = createSection(container, "Recent activity", variant);
	const recentEvents = getRecentActivityEvents(items, mode).slice(0, 6);

	if (!recentEvents.length) {
		renderEmptyState(section, "No activity logged yet.");
		return;
	}

	renderFeed(section, recentEvents.map((event) => ({
		title: event.title,
		meta: event.meta,
	})));
	renderRatingGraph(section, items);
}

function renderRatingGraph(container: HTMLElement, items: MediaItem[]): void {
	const ratings = items
		.map((item) => item.rating)
		.filter((rating): rating is number => typeof rating === "number" && Number.isFinite(rating) && rating > 0);

	if (!ratings.length) {
		return;
	}

	const graphSection = container.createDiv({ cls: "media-library-sidebar-rating-graph" });
	graphSection.createDiv({ text: "Rating distribution", cls: "media-library-sidebar-rating-title" });

	const buckets = getRatingDistributionBuckets(ratings);
	const peak = Math.max(...buckets.map((bucket) => bucket.count), 1);
	const total = ratings.length;
	const chart = graphSection.createDiv({ cls: "media-library-sidebar-rating-columns" });

	for (const bucket of buckets) {
		const percentage = Math.round((bucket.count / total) * 100);
		const column = chart.createDiv({ cls: "media-library-sidebar-rating-column" });
		column.createDiv({ text: `${percentage}%`, cls: "media-library-sidebar-rating-percent" });

		const track = column.createDiv({ cls: "media-library-sidebar-rating-vertical-track" });
		const fill = track.createDiv({ cls: "media-library-sidebar-rating-vertical-fill" });
		fill.style.height = `${Math.max(10, Math.round((bucket.count / peak) * 100))}%`;

		column.createDiv({ text: bucket.label, cls: "media-library-sidebar-rating-range" });
	}
}


function createSection(container: HTMLElement, title: string, variant?: "default" | "airy"): HTMLElement {
	const section = container.createDiv({ cls: "media-library-sidebar-section" });
	if (variant === "airy") {
		section.addClass("is-airy");
	}
	section.createEl("h3", { text: title, cls: "media-library-sidebar-title" });
	return section;
}

function renderFeed(container: HTMLElement, items: SidebarFeedItem[]): void {
	const list = container.createDiv({ cls: "media-library-sidebar-feed" });

	for (const item of items) {
		const row = list.createDiv({ cls: "media-library-sidebar-feed-item" });
		row.createDiv({ text: item.title, cls: "media-library-sidebar-feed-title" });
		row.createDiv({ text: item.meta, cls: "media-library-sidebar-feed-meta" });
	}
}

function renderEmptyState(container: HTMLElement, message: string): void {
	container.createDiv({ text: message, cls: "media-library-sidebar-empty" });
}

function getMetrics(items: MediaItem[], mode: "default" | "home"): SidebarMetric[] {
	const ratedItems = items.filter((item) => typeof item.rating === "number");
	const averageRating = ratedItems.length
		? (ratedItems.reduce((sum, item) => sum + (item.rating ?? 0), 0) / ratedItems.length).toFixed(1)
		: "-";

	if (mode === "home") {
		const books = items.filter((item) => item.mediaType === "book").length;
		const films = items.filter((item) => item.mediaType === "movie").length;
		const series = items.filter((item) => item.mediaType === "series").length;
		const essays = items.filter((item) => item.mediaType === "essay").length;

		return [
			{ label: "Average", value: averageRating === "-" ? "-" : `${averageRating}/10` },
			{ label: "Books", value: String(books) },
			{ label: "Films", value: String(films) },
			{ label: "Series", value: String(series) },
			{ label: "Essays", value: String(essays) },
		];
	}

	const completedThisYear = items.filter((item) => isInCurrentYear(item.date)).length;
	const queuedCount = items.filter((item) => item.status === null).length;

	return [
		{ label: "Visible", value: String(items.length) },
		{ label: "This year", value: String(completedThisYear) },
		{ label: "Queued", value: String(queuedCount) },
		{ label: "Avg rating", value: averageRating },
	];
}

function getRecentActivityEvents(items: MediaItem[], mode: "default" | "home"): ActivityEvent[] {
	return items
		.flatMap((item) => {
			const events: ActivityEvent[] = [];
			const status = (item.status ?? "").toLowerCase();

			if (mode !== "home" && item.addedDate) {
				events.push({
					date: item.addedDate,
					title: `You added ${item.title}`,
					meta: formatActivityMeta(item, "added"),
				});
			}

			// In-progress: reading / watching
			if (status === "reading" || status === "watching") {
				events.push({
					date: item.date ?? item.addedDate ?? "",
					title: `You're currently ${status} ${item.title}`,
					meta:
						mode === "home"
							? formatHomeActivityMeta(item)
							: formatActivityMeta(item, "in-progress"),
				});
			}

			// Completed
			if (item.date) {
				events.push({
					date: item.date,
					title: `${isReadingType(item) ? "You read" : "You watched"} ${item.title}`,
					meta:
						mode === "home"
							? formatHomeActivityMeta(item)
							: formatActivityMeta(item, "completed"),
				});
			}

			return events;
		})
		.filter((event) => event.date)
		.sort((left, right) => right.date.localeCompare(left.date));
}

function formatHomeActivityMeta(item: MediaItem): string {
	const estimate = getTimeEstimate(item);
	const ago = item.date ? timeAgoFromDate(item.date) : "";
	const agoLabel = ago !== "unknown" ? ago : "";
	return [estimate, agoLabel, item.creator].filter(Boolean).join(" • ");
}

function isInCurrentYear(value: string | undefined): boolean {
	if (!value) {
		return false;
	}

	return value.startsWith(String(new Date().getFullYear()));
}

function formatActivityMeta(item: MediaItem, mode: "added" | "completed" | "in-progress"): string {
	const typeLabel = capitalize(item.mediaType);
	const estimate = getTimeEstimate(item);
	const status =
		mode === "completed"
			? isReadingType(item)
				? "read"
				: "watched"
			: mode === "in-progress"
				? isReadingType(item)
					? "reading"
					: "watching"
				: "logged";
	return [typeLabel, estimate, status, item.creator].filter(Boolean).join(" • ");
}

function getTimeEstimate(item: MediaItem): string {
	const minutes = getEstimatedMinutes(item);
	if (!minutes) {
		return "";
	}

	const roundedHours = Math.max(1, Math.round(minutes / 60));
	return `${roundedHours}h`;
}

function getEstimatedMinutes(item: MediaItem): number | null {
	const fromDuration = parseDurationToMinutes(item.duration);
	if (fromDuration != null) {
		return fromDuration;
	}

	if ((item.mediaType === "book" || item.mediaType === "essay") && typeof item.pages === "number" && item.pages > 0) {
		const pagesPerHour = item.mediaType === "essay" ? 20 : 45;
		return Math.max(30, Math.round((item.pages / pagesPerHour) * 60));
	}

	if (item.mediaType === "movie") {
		return 120;
	}

	if (item.mediaType === "series") {
		return 300;
	}

	return null;
}

function parseDurationToMinutes(duration: string | null | undefined): number | null {
	if (!duration) {
		return null;
	}

	const normalized = duration.toLowerCase();
	const hourMatch = normalized.match(/(\d+(?:\.\d+)?)\s*h/);
	const minuteMatch = normalized.match(/(\d+)\s*m/);
	const numericMatch = normalized.match(/^(\d{2,4})$/);

	if (hourMatch || minuteMatch) {
		const hours = hourMatch ? Number.parseFloat(hourMatch[1] ?? "0") : 0;
		const minutes = minuteMatch ? Number.parseInt(minuteMatch[1] ?? "0", 10) : 0;
		const total = Math.round(hours * 60) + minutes;
		return total > 0 ? total : null;
	}

	if (numericMatch) {
		const total = Number.parseInt(numericMatch[1] ?? "0", 10);
		return total > 0 ? total : null;
	}

	return null;
}

function isReadingType(item: MediaItem): boolean {
	return item.mediaType === "book" || item.mediaType === "essay";
}

function capitalize(value: string): string {
	return value.charAt(0).toUpperCase() + value.slice(1);
}

function getRatingDistributionBuckets(ratings: number[]): Array<{ label: string; count: number }> {
	const buckets = [
		{ label: "1-3", min: 1, max: 3, count: 0 },
		{ label: "4-6", min: 4, max: 6, count: 0 },
		{ label: "7-8", min: 7, max: 8, count: 0 },
		{ label: "9-10", min: 9, max: 10, count: 0 },
	];

	for (const rating of ratings) {
		const rounded = Math.max(1, Math.min(10, Math.round(rating)));
		const bucket = buckets.find((entry) => rounded >= entry.min && rounded <= entry.max);
		if (bucket) {
			bucket.count += 1;
		}
	}

	return buckets;
}
