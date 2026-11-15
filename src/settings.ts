import { App, DropdownComponent, PluginSettingTab, Setting, ToggleComponent } from 'obsidian';
import MediaLibraryPlugin from './main';
import type { SortMode, SortType } from "./models";

export type LibrarySortMode = SortMode; // "latest" | "title" | "creator" | "year" | "rating" | "random"
export type LibraryPageTab = 'home' | 'dashboard' | 'media' | 'diary' | 'activity' | 'lists' | 'tags' | 'library';
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
	openInSidebar: boolean;
	defaultSortMode: LibrarySortMode;
	defaultSort: SortType;        
	mediaCardSize: number;
	defaultPageTab: LibraryPageTab;
	defaultSocialTab: SocialHubTab;
	homeUpNextMode: "up-next" | "currently";
	tagStorageFormat: TagStorageFormat;
	ratingDisplayScale: RatingDisplayScale;
	showCounts: boolean;
	showReviewSection: boolean;
	enableUiAnimations: boolean;
	dashboardDefaultScope: DashboardScopeMode;
	dashboardDefaultFilter: DashboardMediaFilter;
	dashboardDefaultConsumptionFilter: DashboardConsumptionFilter;
	dashboardShowSummary: boolean;
	dashboardShowGoals: boolean;
	dashboardShowQuickPicks: boolean;
	dashboardShowRatingsChart: boolean;
	dashboardGoals: MediaDashboardGoals;
	customLists: MediaLibraryCustomList[];
	favoriteDates?: Record<string, string>;
}

export const DEFAULT_SETTINGS: MediaLibrarySettings = {
	openInSidebar: false,
	defaultSortMode: 'latest',
	defaultSort: { mode: 'latest', direction: 'asc' },
	mediaCardSize: 180,
	defaultPageTab: 'home',
	defaultSocialTab: 'media',
	homeUpNextMode: "up-next",
	tagStorageFormat: 'hashtag',
	ratingDisplayScale: 10,
	showCounts: true,
	showReviewSection: false,
	enableUiAnimations: true,
	dashboardDefaultScope: 'year',
	dashboardDefaultFilter: 'all',
	dashboardDefaultConsumptionFilter: 'consumed',
	dashboardShowSummary: true,
	dashboardShowGoals: true,
	dashboardShowQuickPicks: true,
	dashboardShowRatingsChart: true,
	customLists: [],
	favoriteDates: {},
	dashboardGoals: {
		book: 20,
		movie: 24,
		series: 8,
		essay: 12,
	},
};

export class MediaLibrarySettingTab extends PluginSettingTab {
	plugin: MediaLibraryPlugin;

	constructor(app: App, plugin: MediaLibraryPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Open library in sidebar')
			.setDesc('If enabled, the library page opens in the sidebar instead of the main workspace.')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.openInSidebar)
					.onChange(async (value) => {
						this.plugin.settings.openInSidebar = value;
						await this.plugin.saveSettings();
					}),
			);

			new Setting(containerEl)
				.setName('Default page tab')
				.setDesc('Choose which page opens first.')
				.addDropdown((dropdown: DropdownComponent) =>
					dropdown
						.addOption('home', 'Home')
						.addOption('dashboard', 'Dashboard')
						.addOption('media', 'Media')
						.addOption('diary', 'Diary')
						.addOption('activity', 'Activity')
						.addOption('lists', 'Lists')
						.addOption('tags', 'Tags')
						.setValue(this.plugin.settings.defaultPageTab)
						.onChange(async (value: string) => {
							this.plugin.settings.defaultPageTab = value as LibraryPageTab;
							await this.plugin.saveSettings();
						}),
				);

				new Setting(containerEl)
					.setName('Default social tab')
					.setDesc('Choose which social tab opens first in the gallery view.')
					.addDropdown((dropdown: DropdownComponent) =>
						dropdown
							.addOption('media', 'Media')
							.addOption('activity', 'Activity')
							.addOption('lists', 'Lists')
							.addOption('favorites', 'Favorites')
							.addOption('tags', 'Tags')
							.setValue(this.plugin.settings.defaultSocialTab)
							.onChange(async (value: string) => {
								this.plugin.settings.defaultSocialTab = value as SocialHubTab;
								await this.plugin.saveSettings();
							}),
					);

		new Setting(containerEl)
			.setName('Tag style')
			.setDesc('Choose how tags added from poster actions are stored in frontmatter.')
			.addDropdown((dropdown: DropdownComponent) =>
				dropdown
					.addOption('hashtag', 'Hashtag (#tag)')
					.addOption('wikilink', 'Wiki link ([[tag]])')
					.setValue(this.plugin.settings.tagStorageFormat)
					.onChange(async (value: string) => {
						this.plugin.settings.tagStorageFormat = value as TagStorageFormat;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Default sort')
			.setDesc('Choose the default sorting when the library opens.')
			.addDropdown((dropdown: DropdownComponent) =>
				dropdown
					.addOption('latest', 'Newest added')
					.addOption('read', 'Most recently read/watched')
					.addOption('title', 'Title a–z')
					.addOption('rating', 'Highest rating')
					.addOption('year', 'Newest year')
					.addOption('creator', 'Creator')
					.setValue(this.plugin.settings.defaultSortMode)
					.onChange(async (value: string) => {
						this.plugin.settings.defaultSortMode = value as LibrarySortMode;
						// keep defaultSort in sync, if you want:
						this.plugin.settings.defaultSort = {
						mode: this.plugin.settings.defaultSortMode,
						direction:
							this.plugin.settings.defaultSortMode === "title" ||
							this.plugin.settings.defaultSortMode === "creator"
							? "asc"
							: "desc",
						};
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Show counts')
			.setDesc('Show totals for books, movies, series, and essays in the library view.')
			.addToggle((toggle: ToggleComponent) =>
				toggle
					.setValue(this.plugin.settings.showCounts)
					.onChange(async (value: boolean) => {
						this.plugin.settings.showCounts = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Show review section')
			.setDesc('Add a “my review” section to the spotlight view so you can write and save reviews into the note.')
			.addToggle((toggle: ToggleComponent) =>
				toggle
					.setValue(this.plugin.settings.showReviewSection)
					.onChange(async (value: boolean) => {
						this.plugin.settings.showReviewSection = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Enable animations')
			.setDesc('Toggle hover transitions and motion effects in the library UI.')
			.addToggle((toggle: ToggleComponent) =>
				toggle
					.setValue(this.plugin.settings.enableUiAnimations)
					.onChange(async (value: boolean) => {
						this.plugin.settings.enableUiAnimations = value;
						await this.plugin.saveSettings();
					}),
			);

				new Setting(containerEl).setName('Ratings').setHeading();

				new Setting(containerEl)
					.setName('Rating display scale')
					.setDesc('Choose whether visible stars use a 5-star or 10-star scale. Stored ratings remain out of 10.')
					.addDropdown((dropdown: DropdownComponent) =>
						dropdown
							.addOption('10', '10 stars')
							.addOption('5', '5 stars')
							.setValue(String(this.plugin.settings.ratingDisplayScale))
							.onChange(async (value: string) => {
								this.plugin.settings.ratingDisplayScale = value === '5' ? 5 : 10;
								await this.plugin.saveSettings();
							}),
					);

		new Setting(containerEl).setName('Dashboard').setHeading();

		new Setting(containerEl)
			.setName('Default dashboard scope')
			.setDesc('Start the dashboard in this year or all time mode.')
			.addDropdown((dropdown: DropdownComponent) =>
				dropdown
					.addOption('year', 'This year')
					.addOption('all', 'All time')
					.setValue(this.plugin.settings.dashboardDefaultScope)
					.onChange(async (value: string) => {
						this.plugin.settings.dashboardDefaultScope = value as DashboardScopeMode;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Default dashboard media filter')
			.setDesc('Choose which media grouping the dashboard should open with.')
			.addDropdown((dropdown: DropdownComponent) =>
				dropdown
					.addOption('all', 'All media')
					.addOption('text', 'Books + essays')
					.addOption('screen', 'Movies + series')
					.setValue(this.plugin.settings.dashboardDefaultFilter)
					.onChange(async (value: string) => {
						this.plugin.settings.dashboardDefaultFilter = value as DashboardMediaFilter;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Default dashboard focus filter')
			.setDesc('Choose whether the dashboard starts with completed items, backlog items, or everything.')
			.addDropdown((dropdown: DropdownComponent) =>
				dropdown
					.addOption('consumed', 'Completed')
					.addOption('unconsumed', 'Backlog')
					.addOption('all', 'Everything')
					.setValue(this.plugin.settings.dashboardDefaultConsumptionFilter)
					.onChange(async (value: string) => {
						this.plugin.settings.dashboardDefaultConsumptionFilter = value as DashboardConsumptionFilter;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Show dashboard summary')
			.setDesc('Display a written summary card in the dashboard sidebar.')
			.addToggle((toggle: ToggleComponent) =>
				toggle
					.setValue(this.plugin.settings.dashboardShowSummary)
					.onChange(async (value: boolean) => {
						this.plugin.settings.dashboardShowSummary = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Show dashboard goals')
			.setDesc('Show yearly goal progress bars in the dashboard sidebar.')
			.addToggle((toggle: ToggleComponent) =>
				toggle
					.setValue(this.plugin.settings.dashboardShowGoals)
					.onChange(async (value: boolean) => {
						this.plugin.settings.dashboardShowGoals = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Show quick picks')
			.setDesc('Add quick pick buttons that open a queued title directly from the dashboard.')
			.addToggle((toggle: ToggleComponent) =>
				toggle
					.setValue(this.plugin.settings.dashboardShowQuickPicks)
					.onChange(async (value: boolean) => {
						this.plugin.settings.dashboardShowQuickPicks = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Show ratings chart')
			.setDesc('Include the ratings distribution chart in the dashboard.')
			.addToggle((toggle: ToggleComponent) =>
				toggle
					.setValue(this.plugin.settings.dashboardShowRatingsChart)
					.onChange(async (value: boolean) => {
						this.plugin.settings.dashboardShowRatingsChart = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl).setName('Yearly goals').setHeading();
		this.addGoalSetting(containerEl, 'Books goal', 'book');
		this.addGoalSetting(containerEl, 'Movies goal', 'movie');
		this.addGoalSetting(containerEl, 'Series goal', 'series');
		this.addGoalSetting(containerEl, 'Essays goal', 'essay');
	}

	private addGoalSetting(containerEl: HTMLElement, label: string, key: keyof MediaDashboardGoals): void {
		new Setting(containerEl)
			.setName(label)
			.setDesc('Used by the dashboard year progress panel.')
			.addText((text) =>
				text
					.setPlaceholder('0')
					.setValue(String(this.plugin.settings.dashboardGoals[key]))
					.onChange(async (value: string) => {
						const next = Number.parseInt(value, 10);
						this.plugin.settings.dashboardGoals[key] = Number.isFinite(next) && next >= 0 ? next : 0;
						await this.plugin.saveSettings();
					}),
			);
	}
}