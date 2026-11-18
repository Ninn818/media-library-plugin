import { App, PluginSettingTab, Setting } from 'obsidian';
import MediaLibraryPlugin from './main';
import type { SortMode } from './models';

export type LibrarySortMode = SortMode; // "latest" | "read" | "title" | "creator" | "year" | "rating" | "random"
/** 'library' is the old name for 'media'. It is kept so saved settings keep working. */
export type LibraryPageTab = 'home' | 'dashboard' | 'media' | 'diary' | 'activity' | 'lists' | 'tags' | 'year-in-media' | 'library';
export type DashboardScopeMode = 'year' | 'all' | `${number}`;
export type DashboardMediaFilter = 'all' | 'text' | 'screen';
export type DashboardConsumptionFilter = 'all' | 'consumed' | 'unconsumed';
export type SocialHubTab = 'media' | 'activity' | 'lists' | 'favorites' | 'tags';
export type TagStorageFormat = 'wikilink' | 'hashtag';
export type RatingDisplayScale = 5 | 10;

export interface MediaLibraryCustomList {
	id: string;
	name: string;
	itemPaths: string[];
	description?: string;
	createdAt: string;
	updatedAt: string;
}

export interface MediaDashboardGoals {
	book: number;
	movie: number;
	series: number;
	essay: number;
}

export interface MediaLibrarySettings {
	// General
	defaultPageTab: LibraryPageTab;
	defaultSortMode: LibrarySortMode;
	tagStorageFormat: TagStorageFormat;
	ratingDisplayScale: RatingDisplayScale;
	enableUiAnimations: boolean;

	// Dashboard
	dashboardDefaultScope: DashboardScopeMode;
	dashboardDefaultFilter: DashboardMediaFilter;
	dashboardDefaultConsumptionFilter: DashboardConsumptionFilter;
	dashboardShowSummary: boolean;
	dashboardShowGoals: boolean;
	dashboardShowQuickPicks: boolean;
	dashboardShowRatingsChart: boolean;
	dashboardGoals: MediaDashboardGoals;

	// Remembered by the plugin. These have no controls in the settings tab.
	mediaCardSize: number;
	homeUpNextMode: 'up-next' | 'currently';
	customLists: MediaLibraryCustomList[];
	favoriteDates?: Record<string, string>;
}

export const DEFAULT_SETTINGS: MediaLibrarySettings = {
	defaultPageTab: 'home',
	defaultSortMode: 'latest',
	tagStorageFormat: 'hashtag',
	ratingDisplayScale: 10,
	enableUiAnimations: true,

	dashboardDefaultScope: 'year',
	dashboardDefaultFilter: 'all',
	dashboardDefaultConsumptionFilter: 'consumed',
	dashboardShowSummary: true,
	dashboardShowGoals: true,
	dashboardShowQuickPicks: true,
	dashboardShowRatingsChart: true,
	dashboardGoals: {
		book: 20,
		movie: 24,
		series: 8,
		essay: 12,
	},

	mediaCardSize: 180,
	homeUpNextMode: 'up-next',
	customLists: [],
	favoriteDates: {},
};

/** Settings that are a plain on/off switch. */
type ToggleKey =
	| 'enableUiAnimations'
	| 'dashboardShowSummary'
	| 'dashboardShowGoals'
	| 'dashboardShowQuickPicks'
	| 'dashboardShowRatingsChart';

/** Settings that are picked from a list of text options. */
type DropdownKey =
	| 'defaultPageTab'
	| 'defaultSortMode'
	| 'tagStorageFormat'
	| 'dashboardDefaultScope'
	| 'dashboardDefaultFilter'
	| 'dashboardDefaultConsumptionFilter';

export class MediaLibrarySettingTab extends PluginSettingTab {
	plugin: MediaLibraryPlugin;

	constructor(app: App, plugin: MediaLibraryPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// General
		this.addDropdown(containerEl, 'Default page tab', 'Choose which page opens first.', 'defaultPageTab', {
			home: 'Home',
			dashboard: 'Dashboard',
			media: 'Media',
			diary: 'Diary',
			activity: 'Activity',
			lists: 'Lists',
			tags: 'Tags',
			'year-in-media': 'Year in Media',
		});

		this.addDropdown(containerEl, 'Default sort', 'Choose the default sorting when the library opens.', 'defaultSortMode', {
			latest: 'Newest added',
			read: 'Most recently read/watched',
			title: 'Title a–z',
			rating: 'Highest rating',
			year: 'Newest year',
			creator: 'Creator',
		});

		this.addDropdown(containerEl, 'Tag style', 'Choose how tags added from poster actions are stored in frontmatter.', 'tagStorageFormat', {
			hashtag: 'Hashtag (#tag)',
			wikilink: 'Wiki link ([[tag]])',
		});

		new Setting(containerEl)
			.setName('Rating display scale')
			.setDesc('Choose whether visible stars use a 5-star or 10-star scale. Stored ratings remain out of 10.')
			.addDropdown((dropdown) =>
				dropdown
					.addOptions({ '10': '10 stars', '5': '5 stars' })
					.setValue(String(this.plugin.settings.ratingDisplayScale))
					.onChange(async (value) => {
						this.plugin.settings.ratingDisplayScale = value === '5' ? 5 : 10;
						await this.plugin.saveSettings();
					}),
			);

		this.addToggle(containerEl, 'Enable animations', 'Toggle hover transitions and motion effects in the library UI.', 'enableUiAnimations');

		// Dashboard
		new Setting(containerEl).setName('Dashboard').setHeading();

		this.addDropdown(containerEl, 'Default dashboard scope', 'Start the dashboard in this year or all time mode.', 'dashboardDefaultScope', {
			year: 'This year',
			all: 'All time',
		});

		this.addDropdown(containerEl, 'Default dashboard media filter', 'Choose which media grouping the dashboard should open with.', 'dashboardDefaultFilter', {
			all: 'All media',
			text: 'Books + essays',
			screen: 'Movies + series',
		});

		this.addDropdown(
			containerEl,
			'Default dashboard focus filter',
			'Choose whether the dashboard starts with completed items, backlog items, or everything.',
			'dashboardDefaultConsumptionFilter',
			{
				consumed: 'Completed',
				unconsumed: 'Backlog',
				all: 'Everything',
			},
		);

		this.addToggle(containerEl, 'Show dashboard summary', 'Display a written summary card in the dashboard sidebar.', 'dashboardShowSummary');
		this.addToggle(containerEl, 'Show dashboard goals', 'Show yearly goal progress bars in the dashboard sidebar.', 'dashboardShowGoals');
		this.addToggle(containerEl, 'Show quick picks', 'Add quick pick buttons that open a queued title directly from the dashboard.', 'dashboardShowQuickPicks');
		this.addToggle(containerEl, 'Show ratings chart', 'Include the ratings distribution chart in the dashboard.', 'dashboardShowRatingsChart');

		// Goals
		new Setting(containerEl).setName('Yearly goals').setHeading();
		this.addGoalSetting(containerEl, 'Books goal', 'book');
		this.addGoalSetting(containerEl, 'Movies goal', 'movie');
		this.addGoalSetting(containerEl, 'Series goal', 'series');
		this.addGoalSetting(containerEl, 'Essays goal', 'essay');
	}

	private addToggle(containerEl: HTMLElement, name: string, desc: string, key: ToggleKey): void {
		new Setting(containerEl)
			.setName(name)
			.setDesc(desc)
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings[key]).onChange(async (value) => {
					this.plugin.settings[key] = value;
					await this.plugin.saveSettings();
				}),
			);
	}

	private addDropdown(
		containerEl: HTMLElement,
		name: string,
		desc: string,
		key: DropdownKey,
		options: Record<string, string>,
	): void {
		new Setting(containerEl)
			.setName(name)
			.setDesc(desc)
			.addDropdown((dropdown) =>
				dropdown
					.addOptions(options)
					.setValue(this.plugin.settings[key])
					.onChange(async (value) => {
						Object.assign(this.plugin.settings, { [key]: value });
						await this.plugin.saveSettings();
					}),
			);
	}

	private addGoalSetting(containerEl: HTMLElement, label: string, key: keyof MediaDashboardGoals): void {
		new Setting(containerEl)
			.setName(label)
			.setDesc('Used by the dashboard and Year in Media.')
			.addText((text) =>
				text
					.setPlaceholder('0')
					.setValue(String(this.plugin.settings.dashboardGoals[key]))
					.onChange(async (value) => {
						const next = Number.parseInt(value, 10);
						this.plugin.settings.dashboardGoals[key] = Number.isFinite(next) && next >= 0 ? next : 0;
						await this.plugin.saveSettings();
					}),
			);
	}
}
