import { Notice, setIcon } from "obsidian";

import { MediaItem, MediaType } from "../../models";
import {
	DashboardConsumptionFilter,
	DashboardMediaFilter,
	DashboardScopeMode,
	MediaDashboardGoals,
	MediaLibrarySettings,
	getGoalsForYear,
} from "../../settings";

type DashboardDatum = [string, number, (() => void)?];
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

interface DashboardChartConfig {
	title: string;
	description: string;
	data: DashboardDatum[];
	/** Small line under the chart, for things the chart cannot show. */
	note?: string;
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
	onCreatorClick(creator: string, mediaType?: MediaType): void;
	onConsumptionChange(filter: DashboardConsumptionFilter): void;
	onScopeChange(scope: DashboardScopeMode): void;
	onFilterChange(filter: DashboardMediaFilter): void;
	onReset(): void;
}

const MEDIA_ORDER: MediaType[] = ["book", "movie", "series", "essay"];
const MEDIA_LABELS: Record<MediaType, string> = { book: "Books", movie: "Films", series: "Series", essay: "Essays" };
const MEDIA_SINGULAR: Record<MediaType, string> = { book: "book", movie: "film", series: "series", essay: "essay" };

const CHART_ICONS = {
	bar: `<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
<rect x="2" y="8" width="2.5" height="6" rx="1"></rect>
<rect x="6.75" y="5" width="2.5" height="9" rx="1"></rect>
<rect x="11.5" y="2" width="2.5" height="12" rx="1"></rect>
</svg>`,
	pie: `<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
<path d="M8 1a7 7 0 1 0 7 7H8z"></path>
<path d="M9 1.07A7 7 0 0 1 14.93 7H9z" opacity="0.6"></path>
</svg>`,
	focus: `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
<circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.6"></circle>
<circle cx="8" cy="8" r="2" fill="currentColor"></circle>
</svg>`,
	info: `<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
<circle cx="8" cy="8" r="6" opacity="0.3"></circle>
<rect x="7.25" y="6.5" width="1.5" height="4.5" rx=".75"></rect>
<circle cx="8" cy="4.3" r="1"></circle>
</svg>`,
};

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
	renderFilterBar(hosts.contentHost, state, callbacks);
	renderContent(hosts.contentHost, activeItems, state);
	renderSidebar(hosts.sidebarHost, state, activeItems, callbacks);
}

function renderHero(
	container: HTMLElement,
	activeItems: MediaItem[],
	state: MediaDashboardState,
	callbacks: MediaDashboardCallbacks
): void {
	const hero = container.createDiv({ cls: "media-dashboard-hero" });
	hero.createEl("h3", { text: "Media dashboard", cls: "media-dashboard-title" });

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

/* ---------------------------------------------------------------------------
 * Filters
 * ------------------------------------------------------------------------ */

let filtersOpen = false;

function renderFilterBar(
	container: HTMLElement,
	state: MediaDashboardState,
	callbacks: MediaDashboardCallbacks
): void {
	const { settings } = state;
	const changed = [
		state.consumption !== settings.dashboardDefaultConsumptionFilter,
		state.scope !== settings.dashboardDefaultScope,
		state.filter !== settings.dashboardDefaultFilter,
	].filter(Boolean).length;

	const wrap = container.createDiv({ cls: "media-dashboard-filters" });

	/* Toolbar row with the dropdown toggle */
	const toolbar = wrap.createDiv({ cls: "media-dashboard-filters-toolbar" });
	const toggle = toolbar.createEl("button", { cls: "media-dashboard-filters-toggle" });
	toggle.type = "button";
	toggle.setAttr("aria-label", "Toggle filters");
	toggle.setAttr("aria-expanded", String(filtersOpen));
	toggle.toggleClass("is-open", filtersOpen);
	createIcon(toggle, "sliders-horizontal", "media-dashboard-filters-toggle-icon");
	toggle.createSpan({ text: "Filters" });
	if (changed > 0) {
		toggle.createSpan({ text: String(changed), cls: "media-dashboard-filters-badge" });
	}

	/* Collapsible panel */
	const panel = wrap.createDiv({ cls: "media-dashboard-filters-panel" });
	panel.toggleClass("is-open", filtersOpen);

	toggle.addEventListener("click", () => {
		filtersOpen = !filtersOpen;
		panel.toggleClass("is-open", filtersOpen);
		toggle.toggleClass("is-open", filtersOpen);
		toggle.setAttr("aria-expanded", String(filtersOpen));
	});

	const fields = panel.createDiv({ cls: "media-dashboard-filterbar" });

	renderSegmented(
		fields,
		"Show",
		[
			{ value: "consumed", label: "Finished" },
			{ value: "unconsumed", label: "Not finished" },
			{ value: "all", label: "Everything" },
		],
		state.consumption,
		(value) => callbacks.onConsumptionChange(value as DashboardConsumptionFilter)
	);

	renderSegmented(
		fields,
		"Type",
		[
			{ value: "all", label: "All media" },
			{ value: "text", label: "Books and essays" },
			{ value: "screen", label: "Films and series" },
		],
		state.filter,
		(value) => callbacks.onFilterChange(value as DashboardMediaFilter)
	);

	const period = fields.createDiv({ cls: "media-dashboard-filter-group media-dashboard-filter-period" });
	period.createSpan({ text: "Period", cls: "media-dashboard-filter-label" });
	const select = period.createEl("select", { cls: "media-dashboard-filter-select" });
	const options = [
		{ value: "year", label: "This year" },
		...getConsumptionYears(state.items).map((year) => ({ value: year, label: year })),
		{ value: "all", label: "All time" },
	];
	for (const option of options) {
		select.createEl("option", { text: option.label, value: option.value });
	}
	select.value = state.scope;
	select.addEventListener("change", () => callbacks.onScopeChange(select.value as DashboardScopeMode));

	// Titles you have not finished have no finish date, so a period does not apply to them.
	if (state.consumption === "unconsumed") {
		select.disabled = true;
		select.setAttr("title", "Period only applies to finished titles");
	}

	/* Footer with reset */
	const footer = panel.createDiv({ cls: "media-dashboard-filters-footer" });
	const reset = footer.createEl("button", { cls: "media-dashboard-filter-reset" });
	reset.type = "button";
	reset.setAttr("aria-label", "Reset filters");
	reset.toggleClass("is-default", changed === 0);
	reset.disabled = changed === 0;
	createIcon(reset, "rotate-ccw", "media-dashboard-reset-icon");
	reset.createSpan({ text: "Reset filters" });
	reset.addEventListener("click", () => callbacks.onReset());
}

function renderSegmented(
	container: HTMLElement,
	label: string,
	options: Array<{ value: string; label: string }>,
	active: string,
	onChange: (value: string) => void
): void {
	const group = container.createDiv({ cls: "media-dashboard-filter-group" });
	group.createSpan({ text: label, cls: "media-dashboard-filter-label" });

	const track = group.createDiv({ cls: "media-dashboard-segmented" });
	track.setAttr("role", "group");
	track.setAttr("aria-label", label);

	for (const option of options) {
		const button = track.createEl("button", { text: option.label, cls: "media-dashboard-segment" });
		button.type = "button";
		const isActive = option.value === active;
		button.toggleClass("is-active", isActive);
		button.setAttr("aria-pressed", isActive ? "true" : "false");
		button.addEventListener("click", () => {
			if (!isActive) {
				onChange(option.value);
			}
		});
	}
}

/* ---------------------------------------------------------------------------
 * Content and sidebar
 * ------------------------------------------------------------------------ */

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

	const configs = getChartConfigs(activeItems, state.settings, (creator, mediaType) => {
		void creator;
		void mediaType;
	});

	const undated = describeUndated(state);
	const breakdown = configs[0];
	if (undated && breakdown) {
		breakdown.note = undated;
	}

	const grid = container.createDiv({ cls: "media-dashboard-chart-grid" });
	for (const config of configs) {
		renderDashboardChart(grid, config);
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
		const goalYear = state.scope === "year" || state.scope === "all" ? new Date().getFullYear() : Number(state.scope);
		renderGoalProgress(sidebar, activeItems, getGoalsForYear(state.settings, goalYear), state.consumption);
	}
}

/* ---------------------------------------------------------------------------
 * Charts
 * ------------------------------------------------------------------------ */

function renderDashboardChart(container: HTMLElement, config: DashboardChartConfig): void {
	const { title, description, data, note } = config;
	if (!data.length) {
		return;
	}

	const panel = container.createDiv({ cls: "media-dashboard-panel" });
	const header = panel.createDiv({ cls: "media-dashboard-panel-header" });
	const titleWrap = header.createDiv({ cls: "media-dashboard-panel-title-wrap" });
	titleWrap.createDiv({ text: title, cls: "media-dashboard-panel-title" });

	const controls = header.createDiv({ cls: "media-dashboard-chart-controls" });
	const info = panel.createDiv({ text: description, cls: "media-dashboard-chart-meta" });
	const area = panel.createDiv({ cls: "media-dashboard-chart-area" });
	if (note) {
		panel.createDiv({ text: note, cls: "media-dashboard-chart-note" });
	}

	let mode: DashboardChartMode = data.length === 1 ? "spotlight" : "bar";
	const buttons = new Map<DashboardChartMode, HTMLButtonElement>();

	const modes: Array<{ mode: DashboardChartMode; label: string; icon: string }> = [
		{ mode: "bar", label: "Bar chart", icon: CHART_ICONS.bar },
		{ mode: "pie", label: "Pie chart", icon: CHART_ICONS.pie },
		{ mode: "spotlight", label: "Focus chart", icon: CHART_ICONS.focus },
	];

	for (const option of modes) {
		const button = controls.createEl("button", { cls: "media-dashboard-chart-button" });
		button.type = "button";
		button.setAttr("aria-label", option.label);
		button.setAttr("title", option.label);
		button.innerHTML = option.icon;
		button.addEventListener("click", () => {
			mode = option.mode;
			updateButtons();
			draw();
		});
		buttons.set(option.mode, button);
	}

	const infoButton = controls.createEl("button", { cls: "media-dashboard-chart-button" });
	infoButton.type = "button";
	infoButton.setAttr("aria-label", "About this chart");
	infoButton.setAttr("title", "About this chart");
	infoButton.setAttr("aria-pressed", "false");
	infoButton.innerHTML = CHART_ICONS.info;
	infoButton.addEventListener("click", () => {
		const visible = !info.hasClass("is-visible");
		info.toggleClass("is-visible", visible);
		infoButton.toggleClass("is-active", visible);
		infoButton.setAttr("aria-pressed", visible ? "true" : "false");
	});

	const updateButtons = (): void => {
		for (const [key, button] of buttons) {
			const active = key === mode;
			button.toggleClass("is-active", active);
			button.setAttr("aria-pressed", active ? "true" : "false");
		}
	};

	const draw = (): void => {
		area.empty();
		if (mode === "bar") {
			renderBarChart(area, data);
		} else if (mode === "pie") {
			renderPieChart(area, data);
		} else {
			renderSpotlightChart(area, data);
		}
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
		const onClick = data[index]?.[2];
		if (onClick) {
			row.addClass("is-clickable");
			row.addEventListener("click", onClick);
		}

		const track = row.createDiv({ cls: "media-dashboard-bar-track" });
		const fill = track.createDiv({ cls: "media-dashboard-bar-fill" });
		window.setTimeout(() => {
			fill.style.width = `${(value / max) * 100}%`;
		}, index * 50);

		row.createDiv({ text: String(value), cls: "media-dashboard-bar-value" });
	}
}

/**
 * Slice colors are tones of the theme's accent color, mixed toward its border
 * color, so the chart follows whatever theme is active. Nothing here is a fixed color.
 */
const PIE_TONES = [100, 76, 56, 42, 30, 20];

function pieColor(index: number): string {
	const tone = PIE_TONES[index % PIE_TONES.length] ?? 100;
	return `color-mix(in srgb, var(--interactive-accent) ${tone}%, var(--background-modifier-border))`;
}

function renderPieChart(container: HTMLElement, data: DashboardDatum[]): void {
	const total = data.reduce((sum, [, value]) => sum + value, 0);
	if (!total) {
		container.createDiv({ text: "No data yet.", cls: "media-dashboard-chart-empty" });
		return;
	}

	let angle = 0;
	const slices = data.map(([label, value], index) => {
		const start = angle;
		angle += (value / total) * 360;
		return { label, value, start, end: angle, color: pieColor(index), onClick: data[index]?.[2] };
	});
	const visible = slices.filter((slice) => slice.value > 0);

	const wrap = container.createDiv({ cls: "media-dashboard-pie-wrap" });
	const holder = wrap.createDiv({ cls: "media-dashboard-pie-holder" });
	const pie = holder.createDiv({ cls: "media-dashboard-pie" });
	pie.setAttr("role", "img");
	pie.setAttr("aria-label", slices.map((slice) => `${slice.label} ${slice.value}`).join(", "));

	const center = holder.createDiv({ cls: "media-dashboard-pie-center" });
	const centerValue = center.createDiv({ cls: "media-dashboard-pie-center-value" });
	const centerLabel = center.createDiv({ cls: "media-dashboard-pie-center-label" });
	const showCenter = (value: number, label: string): void => {
		centerValue.setText(String(value));
		centerLabel.setText(label);
	};
	showCenter(total, "total");

	const legend = wrap.createDiv({ cls: "media-dashboard-pie-legend" });

	const renderPie = (highlight?: string): void => {
		const stops: string[] = [];
		for (const slice of visible) {
			const color =
				highlight && highlight !== slice.label
					? `color-mix(in srgb, ${slice.color} 28%, transparent)`
					: slice.color;

			// A hairline gap between slices, so neighbouring tones stay distinct.
			const gap = visible.length > 1 ? Math.min(0.8, (slice.end - slice.start) / 4) : 0;
			if (gap > 0) {
				stops.push(
					`transparent ${slice.start}deg ${slice.start + gap}deg`,
					`${color} ${slice.start + gap}deg ${slice.end - gap}deg`,
					`transparent ${slice.end - gap}deg ${slice.end}deg`
				);
			} else {
				stops.push(`${color} ${slice.start}deg ${slice.end}deg`);
			}
		}

		pie.style.setProperty("--media-dashboard-pie-background", `conic-gradient(${stops.join(", ")})`);
	};

	renderPie();

	for (const slice of slices) {
		const row = legend.createDiv({ cls: "media-dashboard-pie-row" });
		const dot = row.createDiv({ cls: "media-dashboard-pie-dot" });
		dot.style.setProperty("--media-dashboard-pie-dot-color", slice.color);
		row.createDiv({ text: slice.label, cls: "media-dashboard-pie-label" });
		row.createDiv({ text: String(slice.value), cls: "media-dashboard-pie-value" });

		if (slice.onClick) {
			row.addClass("is-clickable");
			row.addEventListener("click", slice.onClick);
		}

		row.addEventListener("mouseenter", () => {
			renderPie(slice.label);
			showCenter(slice.value, slice.label);
		});
		row.addEventListener("mouseleave", () => {
			renderPie();
			showCenter(total, "total");
		});
	}
}

function renderSpotlightChart(container: HTMLElement, data: DashboardDatum[]): void {
	const primary = data[0];
	if (!primary) {
		container.createDiv({ text: "No data yet.", cls: "media-dashboard-chart-empty" });
		return;
	}

	const [label, value, onClick] = primary;
	const total = data.reduce((sum, [, amount]) => sum + amount, 0);

	const wrap = container.createDiv({ cls: "media-dashboard-spotlight" });
	if (onClick) {
		wrap.addClass("is-clickable");
		wrap.addEventListener("click", onClick);
	}
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

/* ---------------------------------------------------------------------------
 * Sidebar panels
 * ------------------------------------------------------------------------ */

function renderSummaryPanel(
	container: HTMLElement,
	activeItems: MediaItem[],
	scope: DashboardScopeMode,
	consumption: DashboardConsumptionFilter
): void {
	const section = createSidebarSection(container, "Summary", "sparkles");
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
	const section = createSidebarSection(container, "Quick picks", "dice-5");
	const picks: DashboardQuickPick[] = [
		{ label: "Next book", types: ["book"], buttonLabel: "Next book" },
		{ label: "Next essay", types: ["essay"], buttonLabel: "Next essay" },
		{ label: "Next film", types: ["movie"], buttonLabel: "Next film" },
		{ label: "Next show", types: ["series"], buttonLabel: "Next show" },
	];
	const icons: Record<string, string> = {
		"Next book": "book-open",
		"Next essay": "feather",
		"Next film": "film",
		"Next show": "tv",
	};
	const buttonRow = section.createDiv({ cls: "media-dashboard-quick-picks" });

	for (const pick of picks) {
		const button = buttonRow.createEl("button", { cls: "media-dashboard-action-button media-dashboard-quick-pick-button" });
		button.type = "button";
		button.setAttr("aria-label", pick.label);
		createIcon(button, icons[pick.label] ?? "sparkles", "media-dashboard-action-icon");
		button.createSpan({ text: pick.buttonLabel, cls: "media-dashboard-action-label" });
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

	const section = createSidebarSection(container, "Year progress", "goal");

	for (const type of MEDIA_ORDER) {
		const goal = goals[type] ?? 0;
		const current = activeItems.filter((item) => item.mediaType === type).length;
		const remaining = Math.max(goal - current, 0);

		const row = section.createDiv({ cls: "media-dashboard-goal-row" });
		row.createDiv({ text: `${MEDIA_LABELS[type]} ${current}/${goal}`, cls: "media-dashboard-goal-label" });
		const track = row.createDiv({ cls: "media-dashboard-goal-track" });
		const fill = track.createDiv({ cls: "media-dashboard-goal-fill" });
		fill.style.width = `${goal > 0 ? Math.min(current / goal, 1) * 100 : 0}%`;
		row.createDiv({ text: goal > 0 ? `${remaining} left` : "No goal set", cls: "media-dashboard-goal-note" });
	}
}

function createSidebarSection(container: HTMLElement, title: string, icon?: string): HTMLElement {
	const section = container.createDiv({ cls: "media-dashboard-sidebar-section" });
	const header = section.createDiv({ cls: "media-dashboard-sidebar-header" });
	if (icon) {
		createIcon(header, icon, "media-dashboard-sidebar-title-icon");
	}
	header.createEl("h3", { text: title, cls: "media-dashboard-sidebar-title" });
	return section;
}

function createIcon(container: HTMLElement, icon: string, cls: string): void {
	const iconEl = container.createSpan({ cls });
	setIcon(iconEl, icon);
	iconEl.setAttr("aria-hidden", "true");
}

/* ---------------------------------------------------------------------------
 * Data
 * ------------------------------------------------------------------------ */

function getHeroMetrics(
	allItems: MediaItem[],
	activeItems: MediaItem[],
	scope: DashboardScopeMode,
	consumption: DashboardConsumptionFilter
): DashboardMetric[] {
	const recommendation = pickRandomQueuedItem(allItems, MEDIA_ORDER);
	const averageRating = getAverageRating(activeItems);
	const consumedThisYear = getDashboardItems(allItems, "consumed", "year", "all").length;

	return [
		{
			label: getHeroCountLabel(scope, consumption),
			value: String(activeItems.length),
			note: scope === "year" && consumption !== "unconsumed" ? `${daysLeftInYear()} days left` : `${consumedThisYear} finished this year`,
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

function getChartConfigs(
	items: MediaItem[],
	settings: MediaLibrarySettings,
	onCreator: (creator: string, mediaType?: MediaType) => void
): DashboardChartConfig[] {
	const creatorData = (mediaItems: MediaItem[], mediaType?: MediaType): DashboardDatum[] =>
		countBy(
			mediaItems.flatMap((item) => getCreatorNames(item)),
			(creator) => creator
		).map(([creator, count]) => [creator, count, () => onCreator(creator, mediaType)]);

	// Every type is always listed, so a type with nothing in this view shows as 0
	// instead of silently disappearing.
	const breakdown: DashboardDatum[] = MEDIA_ORDER
		.map((type): DashboardDatum => [MEDIA_LABELS[type], items.filter((item) => item.mediaType === type).length])
		.sort((left, right) => right[1] - left[1]);

	const configs: DashboardChartConfig[] = [
		{
			title: "Media breakdown",
			description: "Books, films, series, and essays in this view.",
			data: breakdown,
		},
		{
			title: "Top genres",
			description: "Your most repeated genres in this view.",
			data: countBy(items.flatMap((item) => item.genres), (genre) => genre),
		},
		{
			title: "Books by length",
			description: "How your books spread across page bands.",
			data: getBookPageBuckets(items),
		},
		{
			title: "Top authors",
			description: "Authors of books.",
			data: creatorData(items.filter((item) => item.mediaType === "book"), "book"),
		},
		{
			title: "Top essayists",
			description: "Essayists that repeat most often.",
			data: creatorData(items.filter((item) => item.mediaType === "essay"), "essay"),
		},
		{
			title: "Top directors",
			description: "Directors of films and series.",
			data: creatorData(items.filter((item) => item.mediaType === "movie" || item.mediaType === "series")),
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

function matchesMediaFilter(item: MediaItem, filter: DashboardMediaFilter): boolean {
	if (filter === "text") {
		return item.mediaType === "book" || item.mediaType === "essay";
	}

	if (filter === "screen") {
		return item.mediaType === "movie" || item.mediaType === "series";
	}

	return true;
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

		if (scope !== "all" && consumption !== "unconsumed" && !isInScopeYear(item.date, scope)) {
			return false;
		}

		return matchesMediaFilter(item, filter);
	});
}

/**
 * Finished titles that a year cannot place because they have no finish date.
 * They are left out of "This year" and each past year, and this says so.
 */
function describeUndated(state: MediaDashboardState): string | null {
	if (state.consumption === "unconsumed" || state.scope === "all") {
		return null;
	}

	const counts: Record<MediaType, number> = { book: 0, movie: 0, series: 0, essay: 0 };
	for (const item of state.items) {
		if (matchesMediaFilter(item, state.filter) && isConsumed(item) && !item.date) {
			counts[item.mediaType] += 1;
		}
	}

	const parts = MEDIA_ORDER
		.filter((type) => counts[type] > 0)
		.map((type) => `${counts[type]} ${counts[type] === 1 ? MEDIA_SINGULAR[type] : MEDIA_LABELS[type].toLowerCase()}`);

	return parts.length ? `${parts.join(", ")} finished without a date, so they only appear under All time.` : null;
}

function getConsumptionYears(items: MediaItem[]): string[] {
	const currentYear = new Date().getFullYear();
	return Array.from(new Set(items
		.map((item) => item.date ? new Date(item.date).getFullYear() : null)
		.filter((year): year is number => year != null && Number.isFinite(year) && year < currentYear)
		.map(String)))
		.sort((left, right) => Number(right) - Number(left));
}

function isInScopeYear(date: string | undefined, scope: DashboardScopeMode): boolean {
	if (!date) return false;
	const year = new Date(date).getFullYear();
	const targetYear = scope === "year" ? new Date().getFullYear() : Number(scope);
	return Number.isFinite(year) && year === targetYear;
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
	const pool = items.filter((item) =>
		types.includes(item.mediaType) && !isConsumed(item)
	);
	if (!pool.length) {
		return null;
	}

	return pool[Math.floor(Math.random() * pool.length)] ?? null;
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

const FINISHED_WORDS = new Set(["read", "watched", "finished", "completed", "done"]);

function isConsumed(item: MediaItem): boolean {
	if (isInProgress(item.status)) {
		return false;
	}

	if (item.date) {
		return true;
	}

	if (FINISHED_WORDS.has(item.status?.toLowerCase() ?? "")) {
		return true;
	}

	// The parser only keeps the standard statuses. A note that says
	// "status: completed" or "completed: true" would otherwise look unfinished.
	const raw = item.raw ?? {};
	const rawStatus = typeof raw.status === "string" ? raw.status.toLowerCase().trim() : "";
	return FINISHED_WORDS.has(rawStatus) || raw.completed === true || raw.watched === true || raw.read === true;
}

function getCreatorNames(item: MediaItem): string[] {
	return item.creator
		.split(",")
		.map((creator) => creator.trim())
		.filter(Boolean);
}

function isInProgress(status: string | null | undefined): boolean {
	return status === "reading" || status === "watching" || status === "paused" || status === "on hold";
}

function daysLeftInYear(): number {
	const now = new Date();
	const nextYear = new Date(now.getFullYear() + 1, 0, 1);
	const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
	return Math.max(0, Math.floor((nextYear.getTime() - startOfTomorrow.getTime()) / 86400000));
}

function capitalize(value: string): string {
	return value.charAt(0).toUpperCase() + value.slice(1);
}

/* ---------------------------------------------------------------------------
 * Wording
 * ------------------------------------------------------------------------ */

function getEmptyTitle(consumption: DashboardConsumptionFilter): string {
	if (consumption === "unconsumed") {
		return "Everything here is finished";
	}

	if (consumption === "all") {
		return "No titles in this view";
	}

	return "Nothing finished yet";
}

function getEmptyCopy(scope: DashboardScopeMode, consumption: DashboardConsumptionFilter): string {
	if (consumption === "unconsumed") {
		return "Try changing the type, or add titles you want to get to.";
	}

	if (consumption === "all") {
		return "Try changing the period or the type to see more of your library.";
	}

	return scope === "year"
		? "Try All time, or finish a few titles this year to fill in the charts."
		: "Finish a few books, films, series, or essays to fill in the dashboard.";
}

function getHeroCountLabel(scope: DashboardScopeMode, consumption: DashboardConsumptionFilter): string {
	if (consumption === "all") {
		return "Titles in view";
	}

	if (consumption === "unconsumed") {
		return "Not finished";
	}

	if (scope === "year") {
		return "Finished this year";
	}

	return scope === "all" ? "Finished, all time" : `Finished in ${scope}`;
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
		return `What you have not finished leans ${topGenre}, with ${books} books and ${screen} screen picks waiting. ${topCreator} appears often, which makes them one of the biggest names on your list.`;
	}

	if (consumption === "all") {
		return `Across the full library, ${topGenre} shows up often, with ${books} books and ${screen} screen picks in this view. ${topCreator} is one of the most repeated creators across everything you track, and your rated items average ${averageRating ?? "-"}/10.`;
	}

	return scope === "year"
		? `This year leans ${topGenre}, with ${books} books and ${screen} screen picks finished. ${topCreator} shows up often, and your average rating is ${averageRating ?? "-"}/10.`
		: `Across what you have finished, ${topGenre} comes up often, ${topCreator} is a recurring name, and your average rating sits at ${averageRating ?? "-"}/10.`;
}
