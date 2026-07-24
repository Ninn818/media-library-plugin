import { App, Notice } from "obsidian";

import { MediaItem } from "../../models/MediaItem";
import { MediaType } from "../../models/MediaType";
import {
	DashboardConsumptionFilter,
	DashboardMediaFilter,
	DashboardScopeMode,
	MediaDashboardGoals,
	MediaLibrarySettings,
} from "../../settings";
type DashboardDatum = [string, number];
type DashboardChartMode = "bar" | "pie" | "spotlight";

interface DashboardMetric {
	label: string;
	value: string;
	note?: string;
	item?: MediaItem | null;
}

interface DashboardQuickPick {
	label: string;
	types: MediaType[];
	buttonLabel: string;
}

export interface MediaDashboardHosts {
	heroHost: HTMLElement;
	contentHost: HTMLElement;
	sidebarHost: HTMLElement;
}

export interface MediaDashboardState {
	items: MediaItem[];
	consumption: DashboardConsumptionFilter;
	scope: DashboardScopeMode;
	filter: DashboardMediaFilter;
	settings: MediaLibrarySettings;
}

export interface MediaDashboardCallbacks {
	onOpenItem(item: MediaItem): void;
}

export function renderMediaDashboard(
	hosts: MediaDashboardHosts,
	state: MediaDashboardState,
	callbacks: MediaDashboardCallbacks
): void {
	const activeItems = getDashboardItems(state.items, state.consumption, state.scope, state.filter);

	hosts.heroHost.empty();
	hosts.contentHost.empty();
	hosts.sidebarHost.empty();

	renderHero(hosts.heroHost, activeItems, state, callbacks);
	renderContent(hosts.contentHost, activeItems, state);
	renderSidebar(hosts.sidebarHost, state, activeItems, callbacks);
	// renderStatus(hosts.statusHost, state.items, activeItems, state.scope, state.consumption);
}

function renderHero(
	container: HTMLElement,
	activeItems: MediaItem[],
	state: MediaDashboardState,
	callbacks: MediaDashboardCallbacks
): void {
	const hero = container.createDiv({ cls: "media-dashboard-hero" });
	hero.createDiv({ text: "Insights", cls: "media-dashboard-eyebrow" });
	hero.createEl("h3", { text: "Media dashboard", cls: "media-dashboard-title" });
	hero.createDiv({
		text: getHeroSubtitle(state.scope, state.consumption),
		cls: "media-dashboard-subtitle",
	});

	const metricGrid = hero.createDiv({ cls: "media-dashboard-metric-grid" });
	for (const metric of getHeroMetrics(state.items, activeItems, state.scope, state.consumption)) {
		const card = metricGrid.createDiv({ cls: "media-dashboard-metric-card" });
		card.createDiv({ text: metric.label, cls: "media-dashboard-metric-label" });
		card.createDiv({ text: metric.value, cls: "media-dashboard-metric-value" });
		if (metric.note) {
			card.createDiv({ text: metric.note, cls: "media-dashboard-metric-note" });
		}

		if (metric.item) {
			card.addClass("is-clickable");
			card.addEventListener("click", () => callbacks.onOpenItem(metric.item as MediaItem));
		}
	}
}

function renderContent(
	container: HTMLElement,
	activeItems: MediaItem[],
	state: MediaDashboardState
): void {
	if (!activeItems.length) {
		const empty = container.createDiv({ cls: "media-library-empty media-dashboard-empty" });
		empty.createEl("h3", { text: getEmptyTitle(state.consumption) });
		empty.createEl("p", {
			text: getEmptyCopy(state.scope, state.consumption),
		});
		return;
	}

	const grid = container.createDiv({ cls: "media-dashboard-chart-grid" });
	for (const config of getChartConfigs(activeItems, state.settings)) {
		renderDashboardChart(grid, config.title, config.description, config.data);
	}
}

function renderSidebar(
	container: HTMLElement,
	state: MediaDashboardState,
	activeItems: MediaItem[],
	callbacks: MediaDashboardCallbacks
): void {
	const sidebar = container.createDiv({ cls: "media-dashboard-sidebar" });

	if (state.settings.dashboardShowSummary) {
		renderSummaryPanel(sidebar, activeItems, state.scope, state.consumption);
	}

	if (state.settings.dashboardShowQuickPicks) {
		renderQuickPicks(sidebar, state.items, callbacks);
	}

	if (state.settings.dashboardShowGoals) {
		renderGoalProgress(sidebar, activeItems, state.settings.dashboardGoals, state.consumption);
	}
}

function renderStatus(
	container: HTMLElement,
	allItems: MediaItem[],
	activeItems: MediaItem[],
	scope: DashboardScopeMode,
	consumption: DashboardConsumptionFilter
): void {
	const queued = allItems.filter((item) => isQueued(item.status)).length;
	const consumedCount = allItems.filter((item) => isConsumed(item)).length;
	const unconsumedCount = allItems.length - consumedCount;
	const daysLeft = daysLeftInYear();

	container.setText(
		`${activeItems.length} ${getStatusLineLabel(consumption)} in view • ${consumedCount} completed • ${unconsumedCount} backlog • ${queued} queued${scope === "year" && consumption !== "unconsumed" ? ` • ${daysLeft} days left this year` : ""}`
	);
}

function renderDashboardChart(
	container: HTMLElement,
	title: string,
	description: string,
	data: DashboardDatum[]
): void {
	if (!data.length) {
		return;
	}

	const panel = container.createDiv({ cls: "media-dashboard-panel" });
	const header = panel.createDiv({ cls: "media-dashboard-panel-header" });
	const titleWrap = header.createDiv({ cls: "media-dashboard-panel-title-wrap" });
	titleWrap.createDiv({ text: title, cls: "media-dashboard-panel-title" });
	titleWrap.createDiv({ text: description, cls: "media-dashboard-panel-description" });

	const controls = header.createDiv({ cls: "media-dashboard-chart-controls" });
	controls.createDiv({ text: "Chart type", cls: "media-dashboard-chart-controls-label" });
	const area = panel.createDiv({ cls: "media-dashboard-chart-area" });

	let mode: DashboardChartMode = data.length === 1 ? "spotlight" : "bar";
	const buttons = new Map<DashboardChartMode, HTMLButtonElement>();

	for (const option of [
		{ mode: "bar" as DashboardChartMode, label: "Bar" },
		{ mode: "pie" as DashboardChartMode, label: "Pie" },
		{ mode: "spotlight" as DashboardChartMode, label: "Focus" },
	]) {
		const button = controls.createEl("button", { text: option.label, cls: "media-dashboard-chart-button" });
		button.type = "button";
		button.addEventListener("click", () => {
			mode = option.mode;
			updateButtons();
			draw();
		});
		buttons.set(option.mode, button);
	}

	const updateButtons = () => {
		for (const [key, button] of buttons) {
			button.toggleClass("is-active", key === mode);
			button.setAttr("aria-pressed", key === mode ? "true" : "false");
		}
	};

	const draw = () => {
		area.empty();
		if (mode === "bar") {
			renderBarChart(area, data);
			return;
		}

		if (mode === "pie") {
			renderPieChart(area, data);
			return;
		}

		renderSpotlightChart(area, data);
	};

	updateButtons();
	draw();
}

function renderBarChart(container: HTMLElement, data: DashboardDatum[]): void {
	const max = Math.max(...data.map(([, value]) => value), 1);
	const list = container.createDiv({ cls: "media-dashboard-bar-list" });

	for (const [index, [label, value]] of data.entries()) {
		const row = list.createDiv({ cls: "media-dashboard-bar-row" });
		row.createDiv({ text: label, cls: "media-dashboard-bar-label" });

		const track = row.createDiv({ cls: "media-dashboard-bar-track" });
		const fill = track.createDiv({ cls: "media-dashboard-bar-fill" });
		window.setTimeout(() => {
			fill.style.width = `${(value / max) * 100}%`;
		}, index * 50);

		row.createDiv({ text: String(value), cls: "media-dashboard-bar-value" });
	}
}

function renderPieChart(container: HTMLElement, data: DashboardDatum[]): void {
	const total = data.reduce((sum, [, value]) => sum + value, 0);
	if (!total) {
		container.createDiv({ text: "No data yet.", cls: "media-dashboard-chart-empty" });
		return;
	}

	const colors = [
		"rgba(120, 194, 255, 0.92)",
		"rgba(78, 143, 255, 0.82)",
		"rgba(94, 212, 181, 0.8)",
		"rgba(255, 189, 89, 0.82)",
		"rgba(255, 132, 132, 0.78)",
	];

	let angle = 0;
	const parts = data.map(([label, value], index) => {
		const start = angle;
		const size = (value / total) * 360;
		angle += size;
		return {
			label,
			value,
			start,
			end: angle,
			color: colors[index % colors.length] ?? colors[0] ?? "rgba(122, 195, 255, 0.92)",
		};
	});

	const wrap = container.createDiv({ cls: "media-dashboard-pie-wrap" });
	const pie = wrap.createDiv({ cls: "media-dashboard-pie" });
	const legend = wrap.createDiv({ cls: "media-dashboard-pie-legend" });

	const renderPie = (highlight?: string) => {
		pie.style.background = `conic-gradient(${parts.map((part) => {
			const color = highlight && highlight !== part.label
				? fadeColor(part.color, 0.3)
				: part.color;
			return `${color} ${part.start}deg ${part.end}deg`;
		}).join(", ")})`;
	};

	renderPie();

	for (const part of parts) {
		const row = legend.createDiv({ cls: "media-dashboard-pie-row" });
		const dot = row.createDiv({ cls: "media-dashboard-pie-dot" });
		dot.style.background = part.color;
		row.createDiv({ text: part.label, cls: "media-dashboard-pie-label" });
		row.createDiv({ text: String(part.value), cls: "media-dashboard-pie-value" });
		row.addEventListener("mouseenter", () => renderPie(part.label));
		row.addEventListener("mouseleave", () => renderPie());
	}
}

function renderSpotlightChart(container: HTMLElement, data: DashboardDatum[]): void {
	const primary = data[0];
	if (!primary) {
		container.createDiv({ text: "No data yet.", cls: "media-dashboard-chart-empty" });
		return;
	}

	const [label, value] = primary;
	const total = data.reduce((sum, [, amount]) => sum + amount, 0);

	const wrap = container.createDiv({ cls: "media-dashboard-spotlight" });
	const valueEl = wrap.createDiv({ text: String(value), cls: "media-dashboard-spotlight-value" });
	valueEl.setAttr("aria-hidden", "true");
	wrap.createDiv({ text: label, cls: "media-dashboard-spotlight-label" });
	if (total > 0) {
		wrap.createDiv({
			text: `${Math.round((value / total) * 100)}% of this chart`,
			cls: "media-dashboard-spotlight-note",
		});
	}
}

function renderSummaryPanel(
	container: HTMLElement,
	activeItems: MediaItem[],
	scope: DashboardScopeMode,
	consumption: DashboardConsumptionFilter
): void {
	const section = createSidebarSection(container, "Summary");
	const topGenre = countBy(activeItems.flatMap((item) => item.genres), (genre) => genre)[0]?.[0] ?? "varied tastes";
	const topCreator = countBy(activeItems.map((item) => item.creator), (creator) => creator)[0]?.[0] ?? "different creators";
	const averageRating = getAverageRating(activeItems);
	const books = activeItems.filter((item) => item.mediaType === "book").length;
	const screen = activeItems.filter((item) => item.mediaType === "movie" || item.mediaType === "series").length;

	section.createEl("p", {
		text: getSummaryCopy(scope, consumption, topGenre, topCreator, books, screen, averageRating),
		cls: "media-dashboard-summary-copy",
	});
}

function renderQuickPicks(
	container: HTMLElement,
	items: MediaItem[],
	callbacks: MediaDashboardCallbacks
): void {
	const section = createSidebarSection(container, "Quick picks");
	const picks: DashboardQuickPick[] = [
		{ label: "Read next", types: ["book", "essay"], buttonLabel: "Read next" },
		{ label: "Watch next", types: ["movie", "series"], buttonLabel: "Watch next" },
		{ label: "Wildcard", types: ["book", "movie", "series", "essay"], buttonLabel: "Surprise me" },
	];
	const buttonRow = section.createDiv({ cls: "media-dashboard-quick-picks" });

	for (const pick of picks) {
		const button = buttonRow.createEl("button", {
			text: pick.buttonLabel,
			cls: "media-dashboard-action-button media-dashboard-quick-pick-button",
		});
		button.type = "button";
		button.setAttr("aria-label", pick.label);
		button.addEventListener("click", () => {
			const chosen = pickRandomQueuedItem(items, pick.types);
			if (!chosen) {
				new Notice("No matching queued titles right now.");
				return;
			}

			callbacks.onOpenItem(chosen);
		});
	}
}

function renderGoalProgress(
	container: HTMLElement,
	activeItems: MediaItem[],
	goals: MediaDashboardGoals,
	consumption: DashboardConsumptionFilter
): void {
	if (consumption === "unconsumed") {
		return;
	}

	const section = createSidebarSection(container, "Year progress");
	const types: MediaType[] = ["book", "movie", "series", "essay"];

	for (const type of types) {
		const goal = goals[type] ?? 0;
		const current = activeItems.filter((item) => item.mediaType === type).length;
		const remaining = Math.max(goal - current, 0);

		const row = section.createDiv({ cls: "media-dashboard-goal-row" });
		row.createDiv({ text: `${capitalize(type)} ${current}/${goal}`, cls: "media-dashboard-goal-label" });
		const track = row.createDiv({ cls: "media-dashboard-goal-track" });
		const fill = track.createDiv({ cls: "media-dashboard-goal-fill" });
		fill.style.width = `${goal > 0 ? Math.min(current / goal, 1) * 100 : 0}%`;
		row.createDiv({ text: goal > 0 ? `${remaining} left` : "No goal set", cls: "media-dashboard-goal-note" });
	}
}

function createSidebarSection(container: HTMLElement, title: string): HTMLElement {
	const section = container.createDiv({ cls: "media-dashboard-sidebar-section" });
	section.createEl("h3", { text: title, cls: "media-dashboard-sidebar-title" });
	return section;
}

function getHeroMetrics(
	allItems: MediaItem[],
	activeItems: MediaItem[],
	scope: DashboardScopeMode,
	consumption: DashboardConsumptionFilter
): DashboardMetric[] {
	const recommendation = pickRandomQueuedItem(allItems, ["book", "movie", "series", "essay"]);
	const averageRating = getAverageRating(activeItems);
	const consumedThisYear = getDashboardItems(allItems, "consumed", "year", "all").length;

	return [
		{
			label: getHeroCountLabel(scope, consumption),
			value: String(activeItems.length),
			note: scope === "year" && consumption !== "unconsumed" ? `${daysLeftInYear()} days left` : `${consumedThisYear} completed this year`,
		},
		{
			label: "Average rating",
			value: averageRating != null ? `${averageRating}` : "-",
			note: averageRating != null ? `Across ${getHeroCountLabel(scope, consumption).toLowerCase()}` : "No ratings yet",
		},
		{
			label: "Top genre",
			value: countBy(activeItems.flatMap((item) => item.genres), (genre) => genre)[0]?.[0] ?? "Varied",
			note: "Most repeated in this view",
		},
		{
			label: "Next pick",
			value: recommendation?.title ?? "Nothing queued",
			note: recommendation ? capitalize(recommendation.mediaType) : "Queue is empty",
			item: recommendation,
		},
	];
}

function getChartConfigs(items: MediaItem[], settings: MediaLibrarySettings): Array<{ title: string; description: string; data: DashboardDatum[] }> {
	const configs = [
		{
			title: "Media breakdown",
			description: "Books, essays, movies, and series in the active scope.",
			data: countBy(items, (item) => capitalize(item.mediaType)),
		},
		{
			title: "Top genres",
			description: "Your most repeated genres in this view.",
			data: countBy(items.flatMap((item) => item.genres), (genre) => genre),
		},
		{
			title: "Books by length",
			description: "How your completed books spread across page bands.",
			data: getBookPageBuckets(items),
		},
		{
			title: "Top creators",
			description: "Writers, directors, and creators that repeat most often.",
			data: countBy(items.map((item) => item.creator), (creator) => creator),
		},
	];

	if (settings.dashboardShowRatingsChart) {
		configs.push({
			title: "Ratings",
			description: "How your personal ratings are distributed.",
			data: countBy(
				items.filter((item) => typeof item.rating === "number" && (item.rating ?? 0) > 0),
				(item) => `${Math.round(item.rating ?? 0)}`
			),
		});
	}

	return configs.filter((config) => config.data.length > 0);
}

function getDashboardItems(
	items: MediaItem[],
	consumption: DashboardConsumptionFilter,
	scope: DashboardScopeMode,
	filter: DashboardMediaFilter
): MediaItem[] {
	return items.filter((item) => {
		if (consumption === "consumed" && !isConsumed(item)) {
			return false;
		}

		if (consumption === "unconsumed" && isConsumed(item)) {
			return false;
		}

		if (scope === "year" && consumption !== "unconsumed" && !isInCurrentYear(item.date)) {
			return false;
		}

		if (filter === "text") {
			return item.mediaType === "book" || item.mediaType === "essay";
		}

		if (filter === "screen") {
			return item.mediaType === "movie" || item.mediaType === "series";
		}

		return true;
	});
}

function getBookPageBuckets(items: MediaItem[]): DashboardDatum[] {
	const buckets = {
		"<200": 0,
		"200-399": 0,
		"400-599": 0,
		"600+": 0,
	} satisfies Record<string, number>;

	for (const item of items.filter((entry) => entry.mediaType === "book" && typeof entry.pages === "number")) {
		const pages = item.pages ?? 0;
		if (pages < 200) {
			buckets["<200"] += 1;
		} else if (pages < 400) {
			buckets["200-399"] += 1;
		} else if (pages < 600) {
			buckets["400-599"] += 1;
		} else {
			buckets["600+"] += 1;
		}
	}

	return Object.entries(buckets).filter(([, count]) => count > 0);
}

function countBy<T>(items: T[], getKey: (item: T) => string | null | undefined): DashboardDatum[] {
	const counts = new Map<string, number>();

	for (const item of items) {
		const key = getKey(item)?.trim();
		if (!key) {
			continue;
		}

		counts.set(key, (counts.get(key) ?? 0) + 1);
	}

	return [...counts.entries()]
		.sort((left, right) => right[1] - left[1])
		.slice(0, 6);
}

function pickRandomQueuedItem(items: MediaItem[], types: MediaType[]): MediaItem | null {
	const queued = items.filter((item) => types.includes(item.mediaType) && isQueued(item.status));
	if (!queued.length) {
		return null;
	}

	return queued[Math.floor(Math.random() * queued.length)] ?? null;
}

function getAverageRating(items: MediaItem[]): number | null {
	const ratings = items
		.map((item) => item.rating)
		.filter((rating): rating is number => typeof rating === "number" && Number.isFinite(rating) && rating > 0);

	if (!ratings.length) {
		return null;
	}

	return Math.round((ratings.reduce((sum, value) => sum + value, 0) / ratings.length) * 10) / 10;
}

function isConsumed(item: MediaItem): boolean {
	if (item.date) {
		return true;
	}

	const status = item.status?.toLowerCase() ?? "";
	return status === "read" || status === "watched" || status === "finished" || status === "completed";
}

function isQueued(status: string | null | undefined): boolean {
	return status === "want to read" || status === "want to watch" || status === "planned";
}

function isInProgress(status: string | null | undefined): boolean {
	return status === "reading" || status === "watching" || status === "paused" || status === "on hold";
}

function isInCurrentYear(value: string | undefined): boolean {
	return Boolean(value?.startsWith(String(new Date().getFullYear())));
}

function daysLeftInYear(): number {
	const now = new Date();
	const nextYear = new Date(now.getFullYear() + 1, 0, 1);
	const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
	return Math.max(0, Math.floor((nextYear.getTime() - startOfTomorrow.getTime()) / 86400000));
}

function fadeColor(value: string, alpha: number): string {
	return value.replace(/,\s*([01](?:\.\d+)?)\)$/, `, ${alpha})`);
}

function capitalize(value: string): string {
	return value.charAt(0).toUpperCase() + value.slice(1);
}

function getHeroSubtitle(scope: DashboardScopeMode, consumption: DashboardConsumptionFilter): string {
	if (consumption === "unconsumed") {
		return "See the authors, directors, and genres shaping your backlog before you get to them.";
	}

	if (consumption === "all") {
		return "See the patterns across everything you track, from completed favorites to titles still waiting.";
	}

	return scope === "year"
		? `A sharper read on what ${new Date().getFullYear()} looks like across the media you've completed.`
		: "A wider view of the media you've already completed.";
}

function getEmptyTitle(consumption: DashboardConsumptionFilter): string {
	if (consumption === "unconsumed") {
		return "No backlog items in this view";
	}

	if (consumption === "all") {
		return "No items in this view";
	}

	return "No completed items yet";
}

function getEmptyCopy(scope: DashboardScopeMode, consumption: DashboardConsumptionFilter): string {
	if (consumption === "unconsumed") {
		return "Try switching the media filter or review your queue to surface titles you still have left to read or watch.";
	}

	if (consumption === "all") {
		return "Try switching the scope or media filter to surface more of your library.";
	}

	return scope === "year"
		? "Try switching the dashboard to all time or finish a few titles this year to populate the charts."
		: "Finish a few books, movies, series, or essays to populate the dashboard.";
}

function getStatusLineLabel(consumption: DashboardConsumptionFilter): string {
	if (consumption === "all") {
		return "items";
	}

	return consumption === "unconsumed" ? "backlog items" : "completed items";
}

function getHeroCountLabel(scope: DashboardScopeMode, consumption: DashboardConsumptionFilter): string {
	if (consumption === "all") {
		return scope === "year" ? "Items in view" : "Items shown";
	}

	if (consumption === "unconsumed") {
		return "Backlog items";
	}

	return scope === "year" ? "Completed this year" : "Completed shown";
}

function getSummaryCopy(
	scope: DashboardScopeMode,
	consumption: DashboardConsumptionFilter,
	topGenre: string,
	topCreator: string,
	books: number,
	screen: number,
	averageRating: number | null
): string {
	if (consumption === "unconsumed") {
		return `Your backlog leans ${topGenre}, with ${books} books and ${screen} screen picks still waiting. ${topCreator} appears often, which makes them one of the biggest names in your queue.`;
	}

	if (consumption === "all") {
		return `Across the full library, ${topGenre} shows up often, with ${books} books and ${screen} screen picks in this view. ${topCreator} is one of the most repeated creators across everything you track, and your rated items average ${averageRating ?? "-"}/10.`;
	}

	return scope === "year"
		? `This year leans ${topGenre}, with ${books} books and ${screen} screen picks completed. ${topCreator} shows up often, and your average rating is ${averageRating ?? "-"}/10.`
		: `Across what you've completed, ${topGenre} comes up often, ${topCreator} is a recurring name, and your average rating sits at ${averageRating ?? "-"}/10.`;
}

function getActivitySentence(item: MediaItem): string {
	const action = item.date
		? (item.mediaType === "book" || item.mediaType === "essay" ? "You read" : "You watched")
		: "You added";
	const typeLabel = capitalize(item.mediaType);
	const estimate = getTimeEstimate(item);
	const stamp = item.date ?? item.addedDate;
	return [
		`${action} ${item.title}`,
		`${typeLabel}${estimate ? ` ${estimate}` : ""}`,
		stamp ?? item.creator,
	].filter(Boolean).join(" • ");
}

function getTimeEstimate(item: MediaItem): string | null {
	const minutes = getEstimatedMinutes(item);
	if (!minutes) {
		return null;
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