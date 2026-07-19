import {
	DashboardConsumptionFilter,
	DashboardMediaFilter,
	DashboardScopeMode,
} from "../../settings";

export interface MediaDashboardToolbarState {
	consumption: DashboardConsumptionFilter;
	scope: DashboardScopeMode;
	filter: DashboardMediaFilter;
}

export interface MediaDashboardToolbarCallbacks {
	onConsumptionChange(filter: DashboardConsumptionFilter): void;
	onScopeChange(scope: DashboardScopeMode): void;
	onFilterChange(filter: DashboardMediaFilter): void;
}

export function renderMediaDashboardToolbar(
	container: HTMLElement,
	state: MediaDashboardToolbarState,
	callbacks: MediaDashboardToolbarCallbacks
): void {
	const toolbar = container.createDiv({ cls: "media-library-toolbar media-dashboard-toolbar" });
	toolbar.createEl("h2", { text: "Media Dashboard" });

	const controls = toolbar.createDiv({ cls: "media-dashboard-toolbar-groups" });

	renderToggleGroup(
		controls,
		"Focus",
		[
			{ value: "consumed", label: "Completed" },
			{ value: "unconsumed", label: "Backlog" },
			{ value: "all", label: "Everything" },
		],
		state.consumption,
		(value) => callbacks.onConsumptionChange(value as DashboardConsumptionFilter)
	);

	renderToggleGroup(
		controls,
		"Scope",
		[
			{ value: "year", label: "This year" },
			{ value: "all", label: "All time" },
		],
		state.scope,
		(value) => callbacks.onScopeChange(value as DashboardScopeMode)
	);

	renderToggleGroup(
		controls,
		"Media",
		[
			{ value: "all", label: "All media" },
			{ value: "text", label: "Books + essays" },
			{ value: "screen", label: "Movies + series" },
		],
		state.filter,
		(value) => callbacks.onFilterChange(value as DashboardMediaFilter)
	);
}

function renderToggleGroup(
	container: HTMLElement,
	title: string,
	options: Array<{ value: string; label: string }>,
	activeValue: string,
	onChange: (value: string) => void
): void {
	const group = container.createDiv({ cls: "media-dashboard-toggle-group" });
	group.createDiv({ text: title, cls: "media-dashboard-toggle-title" });

	const row = group.createDiv({ cls: "media-dashboard-toggle-row" });
	for (const option of options) {
		const button = row.createEl("button", {
			text: option.label,
			cls: "media-dashboard-toggle-button",
		});
		button.type = "button";

		if (option.value === activeValue) {
			button.addClass("is-active");
		}
		button.setAttr("aria-pressed", option.value === activeValue ? "true" : "false");

		button.addEventListener("click", () => {
			onChange(option.value);
		});
	}
}