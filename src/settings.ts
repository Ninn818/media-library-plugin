import { App, DropdownComponent, PluginSettingTab, Setting, ToggleComponent } from 'obsidian';
import MediaLibraryPlugin from './main';

export type LibrarySortMode = 'date-created-desc' | 'title-asc' | 'rating-desc' | 'year-desc';
export type LibraryPageTab = 'home' | 'dashboard' | 'media' | 'diary' | 'activity' | 'lists' | 'tags' | 'library';
export type DashboardScopeMode = 'year' | 'all';
export type DashboardMediaFilter = 'all' | 'text' | 'screen';
export type DashboardConsumptionFilter = 'all' | 'consumed' | 'unconsumed';
export type SocialHubTab = 'media' | 'activity' | 'lists' | 'favorites' | 'tags';
export type TagStorageFormat = 'wikilink' | 'hashtag';

export interface MediaLibraryCustomList {
	id: string;
	name: string;
	itemPaths: string[];
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
	defaultPageTab: LibraryPageTab;
	defaultSocialTab: SocialHubTab;
	homeHeroEnabled: boolean;
	homeHeroTitle: string;
	homeHeroSubtitle: string;
	homeHeroFont: "default" | "serif" | "sans" | "mono" | "custom";
	homeHeroCustomFontFamily: string;
	homeHeroTextColor: string;
	homeHeroImage: string;
	homeHeroBlur: number;
	homeHeroHeight: number;
	tagStorageFormat: TagStorageFormat;
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
}

export const DEFAULT_SETTINGS: MediaLibrarySettings = {
	openInSidebar: false,
	defaultSortMode: 'date-created-desc',
	defaultPageTab: 'home',
	defaultSocialTab: 'media',
	homeHeroEnabled: true,
	homeHeroTitle: 'My media world',
	homeHeroSubtitle: 'Track what you love and what is up next.',
	homeHeroFont: 'default',
	homeHeroCustomFontFamily: '',
	homeHeroTextColor: '#ffffff',
	homeHeroImage: '',
	homeHeroBlur: 14,
	homeHeroHeight: 230,
	tagStorageFormat: 'hashtag',
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
					.addOption('date-created-desc', 'Newest added')
					.addOption('title-asc', 'Title a–z')
					.addOption('rating-desc', 'Highest rating')
					.addOption('year-desc', 'Newest year')
					.setValue(this.plugin.settings.defaultSortMode)
					.onChange(async (value: string) => {
						this.plugin.settings.defaultSortMode = value as LibrarySortMode;
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

			new Setting(containerEl).setName('Home hero').setHeading();

			new Setting(containerEl)
				.setName('Enable home hero')
				.setDesc('Show a custom hero banner at the top of Home.')
				.addToggle((toggle: ToggleComponent) =>
					toggle
						.setValue(this.plugin.settings.homeHeroEnabled)
						.onChange(async (value: boolean) => {
							this.plugin.settings.homeHeroEnabled = value;
							await this.plugin.saveSettings();
						}),
				);

			new Setting(containerEl)
				.setName('Hero title')
				.setDesc('Main text shown over the hero image.')
				.addText((text) =>
					text
						.setPlaceholder('My media world')
						.setValue(this.plugin.settings.homeHeroTitle)
						.onChange(async (value: string) => {
							this.plugin.settings.homeHeroTitle = value;
							await this.plugin.saveSettings();
						}),
				);

			new Setting(containerEl)
				.setName('Hero subtitle')
				.setDesc('Secondary text shown under the title.')
				.addText((text) =>
					text
						.setPlaceholder('Track what you love and what is up next.')
						.setValue(this.plugin.settings.homeHeroSubtitle)
						.onChange(async (value: string) => {
							this.plugin.settings.homeHeroSubtitle = value;
							await this.plugin.saveSettings();
						}),
				);

			new Setting(containerEl)
				.setName('Hero font')
				.setDesc('Choose a font style for hero text.')
				.addDropdown((dropdown: DropdownComponent) =>
					dropdown
						.addOption('default', 'Theme default')
						.addOption('serif', 'Serif')
						.addOption('sans', 'Sans serif')
						.addOption('mono', 'Monospace')
						.addOption('custom', 'Custom font family')
						.setValue(this.plugin.settings.homeHeroFont)
						.onChange(async (value: string) => {
							this.plugin.settings.homeHeroFont = value as MediaLibrarySettings['homeHeroFont'];
							await this.plugin.saveSettings();
						}),
				);

			new Setting(containerEl)
				.setName('Hero custom font family')
				.setDesc('Used when Hero font is set to Custom font family.')
				.addText((text) =>
					text
						.setPlaceholder('Playfair Display, Georgia, serif')
						.setValue(this.plugin.settings.homeHeroCustomFontFamily)
						.onChange(async (value: string) => {
							this.plugin.settings.homeHeroCustomFontFamily = value.trim();
							await this.plugin.saveSettings();
						}),
				);

			new Setting(containerEl)
				.setName('Hero text color')
				.setDesc('Use a hex color like #ffffff for hero text.')
				.addText((text) =>
					text
						.setPlaceholder('#ffffff')
						.setValue(this.plugin.settings.homeHeroTextColor)
						.onChange(async (value: string) => {
							this.plugin.settings.homeHeroTextColor = value.trim() || '#ffffff';
							await this.plugin.saveSettings();
						}),
				);

			new Setting(containerEl)
				.setName('Hero image')
				.setDesc('Paste a URL or vault image path.')
				.addText((text) =>
					text
						.setPlaceholder('https://example.com/image.jpg or Folder/image.png')
						.setValue(this.plugin.settings.homeHeroImage)
						.onChange(async (value: string) => {
							this.plugin.settings.homeHeroImage = value;
							await this.plugin.saveSettings();
						}),
				);

			new Setting(containerEl)
				.setName('Hero blur')
				.setDesc('Blur amount in pixels. Suggested 8 to 24.')
				.addText((text) =>
					text
						.setPlaceholder('14')
						.setValue(String(this.plugin.settings.homeHeroBlur))
						.onChange(async (value: string) => {
							const parsed = Number.parseInt(value, 10);
							this.plugin.settings.homeHeroBlur = Number.isFinite(parsed) ? Math.max(0, parsed) : 14;
							await this.plugin.saveSettings();
						}),
				);

			new Setting(containerEl)
				.setName('Hero height')
				.setDesc('Height in pixels. Suggested 180 to 320.')
				.addText((text) =>
					text
						.setPlaceholder('230')
						.setValue(String(this.plugin.settings.homeHeroHeight))
						.onChange(async (value: string) => {
							const parsed = Number.parseInt(value, 10);
							this.plugin.settings.homeHeroHeight = Number.isFinite(parsed) ? Math.max(120, parsed) : 230;
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