// src/views/library/YearInMedia.ts
//
// "Wrapped" tab: a Spotify Wrapped x Goodreads Year in Books recap of your
// whole media library (books, films, series, essays).
//
// Availability rule: the wrap for year N unlocks on December 10 of year N.
// Before that date you see year N-1 (see getUnlockedWrappedYear).

import { App, Menu, Notice, TFile, normalizePath, setIcon } from "obsidian";

import { Poster } from "../../PluginControllers";
import { MediaItem, MediaType } from "../../models";
import { MediaLibrarySettings } from "../../settings";

/* ---------------------------------------------------------------------------
 * Config
 * ------------------------------------------------------------------------ */

/** The wrap for year N unlocks on this date of year N. Month is 0-indexed. */
const UNLOCK_MONTH = 11; // December
const UNLOCK_DAY = 10;

/** Vault folder the saved note and image go into. */
const OUTPUT_FOLDER = "Year in Media";

const COVER_WALL_LIMIT = 150;

/** Time estimates: used when an item has no duration. Tweak to taste. */
const PAGES_PER_HOUR: Record<"book" | "essay", number> = { book: 45, essay: 20 };
const FALLBACK_MINUTES: Record<MediaType, number> = { book: 360, movie: 120, series: 300, essay: 30 };

const TYPES: MediaType[] = ["book", "movie", "series", "essay"];

const TYPE_META: Record<MediaType, { label: string; singular: string; icon: string; color: string }> = {
	book: { label: "Books", singular: "book", icon: "book-open", color: "#ffb454" },
	movie: { label: "Films", singular: "film", icon: "film", color: "#ff5c8a" },
	series: { label: "Series", singular: "series", icon: "tv", color: "#9b7bff" },
	essay: { label: "Essays", singular: "essay", icon: "file-text", color: "#3dd9c0" },
};

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
	"January", "February", "March", "April", "May", "June",
	"July", "August", "September", "October", "November", "December",
];
const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SEASON_BY_MONTH = [
	"Winter", "Winter", "Spring", "Spring", "Spring", "Summer",
	"Summer", "Summer", "Autumn", "Autumn", "Autumn", "Winter",
];

const DONE_STATUSES = new Set(["read", "watched", "finished", "completed"]);
const IN_PROGRESS_STATUSES = new Set(["reading", "watching"]);

/* ---------------------------------------------------------------------------
 * Public API
 * ------------------------------------------------------------------------ */

export interface YearInMediaState {
	app: App;
	items: MediaItem[];
	settings: MediaLibrarySettings;
	/** Year picked in the selector, or null for the latest unlocked year. */
	year: number | null;
}

export interface YearInMediaCallbacks {
	onYearChange(year: number): void;
	onOpenItem(item: MediaItem): void;
}

/**
 * The newest year whose wrap is available.
 * Before Dec 10 of year N this returns N-1; from Dec 10 of year N it returns N.
 */
export function getUnlockedWrappedYear(now: Date = new Date()): number {
	const year = now.getFullYear();
	return now.getTime() >= unlockDateFor(year).getTime() ? year : year - 1;
}

export function renderYearInMedia(
	container: HTMLElement,
	state: YearInMediaState,
	callbacks: YearInMediaCallbacks,
): void {
	container.empty();

	const now = new Date();
	const unlockedYear = getUnlockedWrappedYear(now);
	const all = collectAllCompletions(state.items);

	const years = [...new Set(all.map((entry) => entry.date.getFullYear()))].filter((year) => year <= unlockedYear);
	if (!years.includes(unlockedYear)) {
		years.push(unlockedYear);
	}
	years.sort((left, right) => right - left);

	const year = state.year !== null && years.includes(state.year) ? state.year : unlockedYear;
	const wrapped = buildWrapped(all, year, state.settings);

	const ctx: WrappedContext = {
		app: state.app,
		years,
		unlockedYear,
		now,
		callbacks,
	};

	const root = container.createDiv({ cls: "ml-wrapped" });
	renderHero(root, wrapped, ctx);

	if (wrapped.total === 0) {
		return;
	}

	renderNumbers(root, wrapped);
	renderByType(root, wrapped);
	renderMonths(root, wrapped);

	const duo = root.createDiv({ cls: "ml-wrap-duo" });
	renderGenres(duo, wrapped);
	renderRatings(duo, wrapped);

	renderCreators(root, wrapped);
	renderTopRated(root, wrapped, ctx);
	renderHabits(root, wrapped, ctx);
	renderTimeCapsule(root, wrapped, ctx);
	renderBigAndSmall(root, wrapped, ctx);
	renderPersona(root, wrapped);
	renderYearOverYear(root, wrapped);
	renderCoverWall(root, wrapped, ctx);
	renderLog(root, wrapped, ctx);
}

/* ---------------------------------------------------------------------------
 * Types
 * ------------------------------------------------------------------------ */

interface WrappedContext {
	app: App;
	years: number[];
	unlockedYear: number;
	now: Date;
	callbacks: YearInMediaCallbacks;
}

/** One finished read/watch. Rewatches and rereads produce one entry each. */
interface Completion {
	item: MediaItem;
	day: string; // YYYY-MM-DD
	date: Date;
	rating: number | null;
	isRepeat: boolean;
	note: string | null;
	minutes: number;
}

interface Ranked {
	label: string;
	count: number;
}

interface Span {
	length: number;
	start: string;
	end: string;
}

interface MonthBucket {
	counts: Record<MediaType, number>;
	total: number;
}

interface Persona {
	title: string;
	blurb: string;
	traits: string[];
}

interface Wrapped {
	year: number;
	completions: Completion[];
	total: number;
	uniqueTitles: number;
	repeats: number;
	byType: Record<MediaType, number>;
	minutes: number;
	minutesByType: Record<MediaType, number>;
	pages: number;
	notes: number;
	favorites: number;
	activeDays: number;
	goals: Record<MediaType, number>;

	average: number | null;
	ratedCount: number;
	perfectTens: number;
	histogram: number[];
	averageByType: Record<MediaType, number | null>;
	highest: Completion[];
	lowest: Completion[];
	bestByType: Array<{ type: MediaType; completion: Completion }>;

	months: MonthBucket[];
	weekdays: number[];
	season: Ranked | null;

	genres: Ranked[];
	genreByType: Record<MediaType, string | null>;
	authors: Ranked[];
	directors: Ranked[];
	essayists: Ranked[];
	actors: Ranked[];

	streak: Span | null;
	gap: Span | null;
	busiestDay: { day: string; count: number } | null;
	busiestWeek: { start: string; end: string; count: number } | null;
	first: Completion | null;
	last: Completion | null;

	decades: Ranked[];
	oldest: Completion | null;
	newest: Completion | null;
	averageReleaseYear: number | null;
	recentCount: number;
	classicCount: number;

	longestBook: Completion | null;
	shortestBook: Completion | null;
	averagePages: number | null;
	longestFilm: Completion | null;
	shortestFilm: Completion | null;

	previous: { total: number; minutes: number; average: number | null };
	persona: Persona;
}

/* ---------------------------------------------------------------------------
 * Date helpers
 * ------------------------------------------------------------------------ */

function unlockDateFor(year: number): Date {
	return new Date(year, UNLOCK_MONTH, UNLOCK_DAY, 0, 0, 0, 0);
}

function pad2(value: number): string {
	return String(value).padStart(2, "0");
}

function toDayKey(date: Date): string {
	return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseDay(value: unknown): { day: string; date: Date } | null {
	if (typeof value !== "string") {
		return null;
	}

	const trimmed = value.trim();
	const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (match) {
		const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
		if (Number.isNaN(date.getTime())) {
			return null;
		}
		return { day: `${match[1]}-${match[2]}-${match[3]}`, date };
	}

	if (trimmed.length <= 4) {
		return null;
	}

	const parsed = new Date(trimmed);
	if (Number.isNaN(parsed.getTime())) {
		return null;
	}

	const date = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
	return { day: toDayKey(date), date };
}

/** Whole days since 1970-01-01, immune to DST. */
function dayNumber(day: string): number {
	const parsed = parseDay(day);
	if (!parsed) {
		return 0;
	}

	const { date } = parsed;
	return Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
}

function formatDay(day: string, withYear = false): string {
	const parsed = parseDay(day);
	if (!parsed) {
		return day;
	}

	return parsed.date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		...(withYear ? { year: "numeric" } : {}),
	});
}

function formatRange(start: string, end: string): string {
	return start === end ? formatDay(start) : `${formatDay(start)} to ${formatDay(end)}`;
}

function isLeap(year: number): boolean {
	return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
	return `${count.toLocaleString("en-US")} ${count === 1 ? singular : pluralForm}`;
}

function formatHours(minutes: number): string {
	return Math.round(minutes / 60).toLocaleString("en-US");
}

function formatRuntime(minutes: number): string {
	const hours = Math.floor(minutes / 60);
	const rest = minutes % 60;
	return hours > 0 ? `${hours}h ${rest}m` : `${rest}m`;
}

/* ---------------------------------------------------------------------------
 * Collecting completions
 * ------------------------------------------------------------------------ */

function isReadingType(item: MediaItem): boolean {
	return item.mediaType === "book" || item.mediaType === "essay";
}

function normStatus(value: string | null | undefined): string {
	return (value ?? "").toLowerCase().trim();
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

function estimateMinutes(item: MediaItem): number {
	const fromDuration = parseDurationToMinutes(item.duration);
	if (fromDuration != null) {
		return fromDuration;
	}

	if ((item.mediaType === "book" || item.mediaType === "essay") && typeof item.pages === "number" && item.pages > 0) {
		return Math.max(30, Math.round((item.pages / PAGES_PER_HOUR[item.mediaType]) * 60));
	}

	return FALLBACK_MINUTES[item.mediaType];
}

/**
 * Every day this item was finished. Pulls from the activity log, the
 * readHistory/watchHistory frontmatter, and the item's completion date.
 * Days logged as "reading"/"watching" are not counted as finished.
 */
function collectCompletionDays(item: MediaItem): string[] {
	const days = new Set<string>();
	const inProgressDays = new Set<string>();

	for (const entry of item.activityEntries ?? []) {
		const parsed = parseDay(entry.date);
		if (!parsed) {
			continue;
		}

		const status = normStatus(entry.status);
		if (IN_PROGRESS_STATUSES.has(status)) {
			inProgressDays.add(parsed.day);
		} else if (DONE_STATUSES.has(status)) {
			days.add(parsed.day);
		}
	}

	const historyField = isReadingType(item) ? "readHistory" : "watchHistory";
	const history = item.raw?.[historyField];
	if (Array.isArray(history)) {
		for (const value of history) {
			const parsed = parseDay(value);
			if (parsed && !inProgressDays.has(parsed.day)) {
				days.add(parsed.day);
			}
		}
	}

	if (item.date && !IN_PROGRESS_STATUSES.has(normStatus(item.status))) {
		const parsed = parseDay(item.date);
		if (parsed) {
			days.add(parsed.day);
		}
	}

	return [...days].sort();
}

function entriesOnDay(item: MediaItem, day: string) {
	return (item.activityEntries ?? []).filter((entry) => parseDay(entry.date)?.day === day);
}

function ratingForDay(item: MediaItem, day: string): number | null {
	const rated = entriesOnDay(item, day).filter((entry) => typeof entry.rating === "number" && entry.rating > 0);
	const last = rated[rated.length - 1];
	if (last && last.rating != null) {
		return last.rating;
	}

	return typeof item.rating === "number" && item.rating > 0 ? item.rating : null;
}

function noteForDay(item: MediaItem, day: string): string | null {
	const match = entriesOnDay(item, day).find((entry) => entry.note && entry.note.trim().length > 0);
	return match?.note?.trim() ?? null;
}

function collectAllCompletions(items: MediaItem[]): Completion[] {
	const out: Completion[] = [];

	for (const item of items) {
		const minutes = estimateMinutes(item);
		const days = collectCompletionDays(item);

		days.forEach((day, index) => {
			const parsed = parseDay(day);
			if (!parsed) {
				return;
			}

			out.push({
				item,
				day,
				date: parsed.date,
				rating: ratingForDay(item, day),
				isRepeat: index > 0,
				note: noteForDay(item, day),
				minutes,
			});
		});
	}

	return out.sort((left, right) => left.day.localeCompare(right.day) || left.item.title.localeCompare(right.item.title));
}

/* ---------------------------------------------------------------------------
 * Number crunching
 * ------------------------------------------------------------------------ */

function emptyCounts(): Record<MediaType, number> {
	return { book: 0, movie: 0, series: 0, essay: 0 };
}

function mean(values: number[]): number | null {
	if (!values.length) {
		return null;
	}

	return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function countBy(values: string[]): Ranked[] {
	const counts = new Map<string, number>();
	for (const raw of values) {
		const label = raw.trim();
		if (!label) {
			continue;
		}
		counts.set(label, (counts.get(label) ?? 0) + 1);
	}

	return [...counts.entries()]
		.map(([label, count]) => ({ label, count }))
		.sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

function best<T>(list: T[], score: (value: T) => number, mode: "max" | "min" = "max"): T | null {
	let winner: T | null = null;
	let winnerScore = 0;

	for (const value of list) {
		const current = score(value);
		if (winner === null || (mode === "max" ? current > winnerScore : current < winnerScore)) {
			winner = value;
			winnerScore = current;
		}
	}

	return winner;
}

function uniqueByPath(list: Completion[]): Completion[] {
	const seen = new Set<string>();
	return list.filter((entry) => {
		if (seen.has(entry.item.path)) {
			return false;
		}
		seen.add(entry.item.path);
		return true;
	});
}

function splitCreators(item: MediaItem): string[] {
	return item.creator
		.split(",")
		.map((name) => name.trim())
		.filter(Boolean);
}

function buildWrapped(all: Completion[], year: number, settings: MediaLibrarySettings): Wrapped {
	const completions = all.filter((entry) => entry.date.getFullYear() === year);
	const previousCompletions = all.filter((entry) => entry.date.getFullYear() === year - 1);
	const total = completions.length;

	// Totals ---------------------------------------------------------------
	const byType = emptyCounts();
	const minutesByType = emptyCounts();
	let minutes = 0;
	let pages = 0;
	let notes = 0;
	let repeats = 0;

	for (const entry of completions) {
		byType[entry.item.mediaType] += 1;
		minutesByType[entry.item.mediaType] += entry.minutes;
		minutes += entry.minutes;
		if (entry.isRepeat) repeats += 1;
		if (entry.note) notes += 1;
		if (isReadingType(entry.item) && typeof entry.item.pages === "number" && entry.item.pages > 0) {
			pages += entry.item.pages;
		}
	}

	const favorites = Object.values(settings.favoriteDates ?? {}).filter(
		(value) => typeof value === "string" && value.startsWith(String(year)),
	).length;

	const goals = emptyCounts();
	for (const type of TYPES) {
		goals[type] = settings.dashboardGoals?.[type] ?? 0;
	}

	// Ratings --------------------------------------------------------------
	const rated = completions.filter((entry) => entry.rating !== null);
	const histogram: number[] = new Array<number>(10).fill(0);
	for (const entry of rated) {
		const bucket = Math.min(10, Math.max(1, Math.round(entry.rating ?? 1))) - 1;
		histogram[bucket] = (histogram[bucket] ?? 0) + 1;
	}

	const averageByType: Record<MediaType, number | null> = { book: null, movie: null, series: null, essay: null };
	for (const type of TYPES) {
		averageByType[type] = mean(
			rated.filter((entry) => entry.item.mediaType === type).map((entry) => entry.rating ?? 0),
		);
	}

	const byRating = [...rated].sort(
		(left, right) => (right.rating ?? 0) - (left.rating ?? 0) || right.day.localeCompare(left.day),
	);
	const highest = uniqueByPath(byRating).slice(0, 5);
	const lowest = rated.length >= 6
		? uniqueByPath([...byRating].reverse()).filter((entry) => !highest.includes(entry)).slice(0, 3)
		: [];

	const bestByType: Array<{ type: MediaType; completion: Completion }> = [];
	for (const type of TYPES) {
		const top = byRating.find((entry) => entry.item.mediaType === type);
		if (top) {
			bestByType.push({ type, completion: top });
		}
	}

	// Calendar -------------------------------------------------------------
	const months: MonthBucket[] = Array.from({ length: 12 }, () => ({ counts: emptyCounts(), total: 0 }));
	const weekdays: number[] = new Array<number>(7).fill(0);
	const dayCounts = new Map<string, number>();
	const weekCounts = new Map<number, number>();
	const seasonCounts = new Map<string, number>();

	for (const entry of completions) {
		const month = entry.date.getMonth();
		const bucket = months[month];
		if (bucket) {
			bucket.counts[entry.item.mediaType] += 1;
			bucket.total += 1;
		}

		const weekday = entry.date.getDay();
		weekdays[weekday] = (weekdays[weekday] ?? 0) + 1;

		dayCounts.set(entry.day, (dayCounts.get(entry.day) ?? 0) + 1);

		// Monday-based week index (1970-01-01 was a Thursday).
		const week = Math.floor((dayNumber(entry.day) + 3) / 7);
		weekCounts.set(week, (weekCounts.get(week) ?? 0) + 1);

		const season = SEASON_BY_MONTH[month] ?? "Winter";
		seasonCounts.set(season, (seasonCounts.get(season) ?? 0) + 1);
	}

	const uniqueDays = [...dayCounts.keys()].sort();
	const dayNumbers = uniqueDays.map((day) => dayNumber(day));

	let streak: Span | null = null;
	let runStart = 0;
	for (let index = 1; index <= dayNumbers.length; index += 1) {
		const previous = dayNumbers[index - 1] ?? 0;
		const current = dayNumbers[index];
		if (current === undefined || current - previous !== 1) {
			const length = index - runStart;
			if (!streak || length > streak.length) {
				streak = { length, start: uniqueDays[runStart] ?? "", end: uniqueDays[index - 1] ?? "" };
			}
			runStart = index;
		}
	}

	let gap: Span | null = null;
	for (let index = 1; index < dayNumbers.length; index += 1) {
		const quiet = (dayNumbers[index] ?? 0) - (dayNumbers[index - 1] ?? 0) - 1;
		if (quiet > 0 && (!gap || quiet > gap.length)) {
			gap = { length: quiet, start: uniqueDays[index - 1] ?? "", end: uniqueDays[index] ?? "" };
		}
	}

	let busiestDay: { day: string; count: number } | null = null;
	for (const [day, count] of dayCounts) {
		if (!busiestDay || count > busiestDay.count) {
			busiestDay = { day, count };
		}
	}

	let busiestWeek: { start: string; end: string; count: number } | null = null;
	for (const [week, count] of weekCounts) {
		if (!busiestWeek || count > busiestWeek.count) {
			const startNumber = week * 7 - 3;
			busiestWeek = {
				start: toDayKey(new Date(1970, 0, 1 + startNumber)),
				end: toDayKey(new Date(1970, 0, 1 + startNumber + 6)),
				count,
			};
		}
	}

	const season = [...seasonCounts.entries()]
		.map(([label, count]) => ({ label, count }))
		.sort((left, right) => right.count - left.count)[0] ?? null;

	// Genres + creators ----------------------------------------------------
	const genres = countBy(completions.flatMap((entry) => entry.item.genres ?? []));
	const genreByType: Record<MediaType, string | null> = { book: null, movie: null, series: null, essay: null };
	for (const type of TYPES) {
		genreByType[type] = countBy(
			completions.filter((entry) => entry.item.mediaType === type).flatMap((entry) => entry.item.genres ?? []),
		)[0]?.label ?? null;
	}

	const authors = countBy(completions.filter((entry) => entry.item.mediaType === "book").flatMap((entry) => splitCreators(entry.item)));
	const essayists = countBy(completions.filter((entry) => entry.item.mediaType === "essay").flatMap((entry) => splitCreators(entry.item)));
	const directors = countBy(
		completions
			.filter((entry) => entry.item.mediaType === "movie" || entry.item.mediaType === "series")
			.flatMap((entry) => splitCreators(entry.item)),
	);
	const actors = countBy(completions.flatMap((entry) => entry.item.actors ?? []));

	// Time capsule ---------------------------------------------------------
	const releaseYears: number[] = [];
	const decadeCounts = new Map<number, number>();
	for (const entry of completions) {
		const releaseYear = entry.item.year;
		if (typeof releaseYear !== "number" || !Number.isFinite(releaseYear)) {
			continue;
		}
		releaseYears.push(releaseYear);
		const decade = Math.floor(releaseYear / 10) * 10;
		decadeCounts.set(decade, (decadeCounts.get(decade) ?? 0) + 1);
	}

	const decades = [...decadeCounts.entries()]
		.sort((left, right) => left[0] - right[0])
		.map(([decade, count]) => ({ label: `${decade}s`, count }));
	const withYear = completions.filter((entry) => typeof entry.item.year === "number");
	const averageReleaseYear = releaseYears.length
		? Math.round(releaseYears.reduce((sum, value) => sum + value, 0) / releaseYears.length)
		: null;

	// Big and small --------------------------------------------------------
	const bookPages = completions.filter(
		(entry) => entry.item.mediaType === "book" && typeof entry.item.pages === "number" && (entry.item.pages ?? 0) > 0,
	);
	const films = completions.filter(
		(entry) => entry.item.mediaType === "movie" && parseDurationToMinutes(entry.item.duration) != null,
	);
	const averagePages = bookPages.length
		? Math.round(bookPages.reduce((sum, entry) => sum + (entry.item.pages ?? 0), 0) / bookPages.length)
		: null;

	// Persona --------------------------------------------------------------
	const average = mean(rated.map((entry) => entry.rating ?? 0));
	const goalTypes = TYPES.filter((type) => goals[type] > 0);
	const persona = buildPersona({
		year,
		total,
		byType,
		repeats,
		streakLength: streak?.length ?? 0,
		average,
		averageReleaseYear,
		notes,
		busiestCount: busiestDay?.count ?? 0,
		goalsMet: goalTypes.filter((type) => byType[type] >= goals[type]).length,
		goalsTotal: goalTypes.length,
	});

	return {
		year,
		completions,
		total,
		uniqueTitles: new Set(completions.map((entry) => entry.item.path)).size,
		repeats,
		byType,
		minutes,
		minutesByType,
		pages,
		notes,
		favorites,
		activeDays: uniqueDays.length,
		goals,

		average,
		ratedCount: rated.length,
		perfectTens: rated.filter((entry) => (entry.rating ?? 0) >= 10).length,
		histogram,
		averageByType,
		highest,
		lowest,
		bestByType,

		months,
		weekdays,
		season,

		genres,
		genreByType,
		authors,
		directors,
		essayists,
		actors,

		streak,
		gap,
		busiestDay,
		busiestWeek,
		first: completions[0] ?? null,
		last: completions[completions.length - 1] ?? null,

		decades,
		oldest: best(withYear, (entry) => entry.item.year ?? 0, "min"),
		newest: best(withYear, (entry) => entry.item.year ?? 0, "max"),
		averageReleaseYear,
		recentCount: releaseYears.filter((value) => value >= year - 5).length,
		classicCount: releaseYears.filter((value) => value <= year - 30).length,

		longestBook: best(bookPages, (entry) => entry.item.pages ?? 0, "max"),
		shortestBook: best(bookPages, (entry) => entry.item.pages ?? 0, "min"),
		averagePages,
		longestFilm: best(films, (entry) => entry.minutes, "max"),
		shortestFilm: best(films, (entry) => entry.minutes, "min"),

		previous: {
			total: previousCompletions.length,
			minutes: previousCompletions.reduce((sum, entry) => sum + entry.minutes, 0),
			average: mean(
				previousCompletions.filter((entry) => entry.rating !== null).map((entry) => entry.rating ?? 0),
			),
		},
		persona,
	};
}

function buildPersona(args: {
	year: number;
	total: number;
	byType: Record<MediaType, number>;
	repeats: number;
	streakLength: number;
	average: number | null;
	averageReleaseYear: number | null;
	notes: number;
	busiestCount: number;
	goalsMet: number;
	goalsTotal: number;
}): Persona {
	const { year, total, byType, repeats, streakLength, average, averageReleaseYear, notes, busiestCount } = args;

	if (total === 0) {
		return { title: "The blank page", blurb: "Nothing logged yet. Your story starts with the next title.", traits: [] };
	}

	const share = (count: number): number => count / total;
	let top: MediaType = "book";
	for (const type of TYPES) {
		if (byType[type] > byType[top]) {
			top = type;
		}
	}

	let title = "The omnivore";
	let blurb = "A bit of everything. No single medium owns you.";

	if (share(byType[top]) >= 0.45) {
		const byTop: Record<MediaType, [string, string]> = {
			book: ["The bookworm", "Pages were your natural habitat this year."],
			movie: ["The cinephile", "The lights went down a lot. Films carried your year."],
			series: ["The serial devotee", "You commit to a world for the long haul."],
			essay: ["The essayist", "You went looking for arguments and found plenty."],
		};
		[title, blurb] = byTop[top];
	} else if (share(byType.book) + share(byType.essay) >= 0.6) {
		title = "The reader";
		blurb = "Most of your year happened on the page.";
	} else if (share(byType.movie) + share(byType.series) >= 0.8) {
		title = "The screen devotee";
		blurb = "Your year was lit by a screen.";
	}

	const traits: string[] = [];
	if (total >= 8 && repeats / total >= 0.2) traits.push("Comfort rewatcher");
	if (streakLength >= 7) traits.push(`${streakLength}-day streak`);
	if (busiestCount >= 3) traits.push("Binge mode");
	if (average !== null && average >= 8) traits.push("Generous critic");
	if (average !== null && average <= 5.5) traits.push("Tough critic");
	if (averageReleaseYear !== null && averageReleaseYear <= year - 30) traits.push("Old soul");
	if (averageReleaseYear !== null && averageReleaseYear >= year - 4) traits.push("Fresh-release hunter");
	if (notes >= 5) traits.push("Note taker");
	if (args.goalsTotal > 0 && args.goalsMet === args.goalsTotal) traits.push("Goal crusher");

	return { title, blurb, traits: traits.slice(0, 6) };
}

/* ---------------------------------------------------------------------------
 * Rendering helpers
 * ------------------------------------------------------------------------ */

function panel(parent: HTMLElement, scheme: string, title: string, punch?: string): HTMLElement {
	const el = parent.createDiv({ cls: `ml-wrap-panel is-${scheme}` });
	el.createDiv({ cls: "ml-wrap-title", text: title });
	if (punch) {
		el.createDiv({ cls: "ml-wrap-punch", text: punch });
	}
	return el.createDiv({ cls: "ml-wrap-body" });
}

function subhead(parent: HTMLElement, text: string): void {
	parent.createDiv({ cls: "ml-wrap-subhead", text });
}

function typeLabel(item: MediaItem): string {
	return TYPE_META[item.mediaType].singular;
}

function posterCard(parent: HTMLElement, entry: Completion, ctx: WrappedContext, caption?: string): HTMLElement {
	const card = parent.createDiv({ cls: "ml-wrap-poster" });
	card.style.setProperty("--wrap-type", TYPE_META[entry.item.mediaType].color);
	new Poster(entry.item, ctx.app).render(card.createDiv({ cls: "ml-wrap-poster-art" }));
	card.createDiv({ cls: "ml-wrap-poster-title", text: entry.item.title });
	if (caption) {
		card.createDiv({ cls: "ml-wrap-poster-caption", text: caption });
	}
	card.addEventListener("click", () => ctx.callbacks.onOpenItem(entry.item));
	return card;
}

function kvRow(parent: HTMLElement, label: string, value: string, onClick?: () => void): void {
	const row = parent.createDiv({ cls: "ml-wrap-kv" });
	row.createSpan({ cls: "ml-wrap-kv-label", text: label });
	row.createSpan({ cls: "ml-wrap-kv-value", text: value });
	if (onClick) {
		row.addClass("is-clickable");
		row.addEventListener("click", onClick);
	}
}

function renderRanked(parent: HTMLElement, title: string, list: Ranked[], emptyText: string, limit = 5): void {
	const block = parent.createDiv({ cls: "ml-wrap-ranked" });
	subhead(block, title);

	if (!list.length) {
		block.createDiv({ cls: "ml-wrap-empty", text: emptyText });
		return;
	}

	const shown = list.slice(0, limit);
	const max = shown[0]?.count ?? 1;
	for (const [index, entry] of shown.entries()) {
		const row = block.createDiv({ cls: "ml-wrap-ranked-row" });
		row.createSpan({ cls: "ml-wrap-rank", text: String(index + 1) });
		const body = row.createDiv({ cls: "ml-wrap-ranked-body" });
		const line = body.createDiv({ cls: "ml-wrap-ranked-line" });
		line.createSpan({ cls: "ml-wrap-ranked-label", text: entry.label });
		line.createSpan({ cls: "ml-wrap-ranked-count", text: String(entry.count) });
		const track = body.createDiv({ cls: "ml-wrap-bar-track" });
		track.createDiv({ cls: "ml-wrap-bar-fill" }).style.width = `${Math.max(6, (entry.count / max) * 100)}%`;
	}
}

function renderColumns(
	parent: HTMLElement,
	data: Array<{ label: string; value: number; title?: string }>,
): void {
	const max = Math.max(1, ...data.map((entry) => entry.value));
	const chart = parent.createDiv({ cls: "ml-wrap-columns" });
	chart.style.setProperty("--wrap-cols", String(data.length));

	for (const entry of data) {
		const col = chart.createDiv({ cls: "ml-wrap-col" });
		col.setAttr("title", entry.title ?? `${entry.label}: ${entry.value}`);
		if (entry.value === max) {
			col.addClass("is-peak");
		}
		col.createDiv({ cls: "ml-wrap-col-value", text: entry.value ? String(entry.value) : "" });
		const track = col.createDiv({ cls: "ml-wrap-col-track" });
		track.createDiv({ cls: "ml-wrap-col-fill" }).style.height = `${(entry.value / max) * 100}%`;
		col.createDiv({ cls: "ml-wrap-col-label", text: entry.label });
	}
}

/* ---------------------------------------------------------------------------
 * Sections
 * ------------------------------------------------------------------------ */

function renderHero(root: HTMLElement, w: Wrapped, ctx: WrappedContext): void {
	const hero = root.createDiv({ cls: "ml-wrap-hero" });

	const top = hero.createDiv({ cls: "ml-wrap-hero-top" });
	const yearLine = top.createDiv({ cls: "ml-wrap-hero-yearline" });
	yearLine.createSpan({ cls: "ml-wrap-hero-year", text: String(w.year) });
	yearLine.createSpan({ cls: "ml-wrap-hero-suffix", text: "in media" });

	const controls = top.createDiv({ cls: "ml-wrap-controls" });
	const select = controls.createEl("select", { cls: "ml-wrap-select" });
	select.setAttr("aria-label", "Choose year");
	for (const year of ctx.years) {
		select.createEl("option", { text: String(year), value: String(year) });
	}
	select.value = String(w.year);
	select.addEventListener("change", () => ctx.callbacks.onYearChange(Number(select.value)));

	const save = controls.createEl("button", { cls: "ml-wrap-save" });
	save.type = "button";
	setIcon(save.createSpan({ cls: "ml-wrap-save-icon" }), "download");
	save.createSpan({ text: "Save" });
	save.addEventListener("click", (event) => openSaveMenu(event, ctx.app, w));

	if (w.total === 0) {
		hero.createDiv({ cls: "ml-wrap-headline", text: `Nothing logged for ${w.year}.` });
		hero.createDiv({
			cls: "ml-wrap-sub",
			text: "Log a read or a watch from any title and it will show up here.",
		});
	} else {
		const headline = hero.createDiv({ cls: "ml-wrap-headline" });
		headline.appendText("You finished ");
		headline.createSpan({ cls: "ml-wrap-headline-number", text: w.total.toLocaleString("en-US") });
		headline.appendText(w.total === 1 ? " title." : " titles.");

		const days = (w.minutes / 1440).toFixed(1);
		hero.createDiv({
			cls: "ml-wrap-sub",
			text: `About ${formatHours(w.minutes)} hours of reading and watching, or ${days} full days.`,
		});

		const pills = hero.createDiv({ cls: "ml-wrap-pills" });
		for (const type of TYPES) {
			if (!w.byType[type]) continue;
			const pill = pills.createDiv({ cls: "ml-wrap-pill" });
			pill.style.setProperty("--wrap-type", TYPE_META[type].color);
			pill.createSpan({ cls: "ml-wrap-pill-dot" });
			pill.createSpan({ text: `${w.byType[type].toLocaleString("en-US")} ${TYPE_META[type].label.toLowerCase()}` });
		}
	}

	const nextYear = ctx.unlockedYear + 1;
	const unlockAt = unlockDateFor(nextYear);
	const daysLeft = Math.max(1, Math.ceil((unlockAt.getTime() - ctx.now.getTime()) / 86400000));
	const dateLabel = unlockAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
	hero.createDiv({
		cls: "ml-wrap-unlock",
		text: `Your ${nextYear} wrap unlocks on ${dateLabel}, ${plural(daysLeft, "day")} from now.`,
	});
}

function renderNumbers(root: HTMLElement, w: Wrapped): void {
	const body = panel(root, "ink", `${w.year} at a glance`);
	const daysInYear = isLeap(w.year) ? 366 : 365;

	const tiles: Array<{ value: string; label: string; sub?: string }> = [
		{ value: w.total.toLocaleString("en-US"), label: "Titles finished", sub: `${w.uniqueTitles.toLocaleString("en-US")} unique` },
		{ value: formatHours(w.minutes), label: "Hours", sub: `${(w.minutes / 1440).toFixed(1)} full days` },
	];
	if (w.pages > 0) {
		tiles.push({ value: w.pages.toLocaleString("en-US"), label: "Pages read" });
	}
	tiles.push(
		{ value: String(w.repeats), label: "Rewatches and rereads" },
		{ value: w.average !== null ? w.average.toFixed(1) : "-", label: "Average rating", sub: `${w.ratedCount} rated` },
		{ value: String(w.perfectTens), label: "Perfect 10s" },
		{ value: String(w.activeDays), label: "Days with a finish", sub: `${Math.round((w.activeDays / daysInYear) * 100)}% of the year` },
		{ value: String(w.streak?.length ?? 0), label: "Day streak", sub: w.streak ? formatRange(w.streak.start, w.streak.end) : undefined },
		{ value: String(w.notes), label: "Notes written" },
		{ value: String(w.favorites), label: "Favorited" },
	);

	const grid = body.createDiv({ cls: "ml-wrap-tiles" });
	for (const tile of tiles) {
		const el = grid.createDiv({ cls: "ml-wrap-tile" });
		el.createDiv({ cls: "ml-wrap-tile-value", text: tile.value });
		el.createDiv({ cls: "ml-wrap-tile-label", text: tile.label });
		if (tile.sub) {
			el.createDiv({ cls: "ml-wrap-tile-sub", text: tile.sub });
		}
	}
}

function renderByType(root: HTMLElement, w: Wrapped): void {
	let top: MediaType = "book";
	for (const type of TYPES) {
		if (w.byType[type] > w.byType[top]) top = type;
	}

	const body = panel(
		root,
		"plum",
		"What filled your year",
		`${TYPE_META[top].label} led with ${plural(w.byType[top], TYPE_META[top].singular)}.`,
	);

	const share = body.createDiv({ cls: "ml-wrap-share" });
	for (const type of TYPES) {
		if (!w.byType[type]) continue;
		const segment = share.createDiv({ cls: "ml-wrap-share-seg" });
		segment.style.flexGrow = String(w.byType[type]);
		segment.style.background = TYPE_META[type].color;
		segment.setAttr("title", `${TYPE_META[type].label}: ${w.byType[type]}`);
	}

	const grid = body.createDiv({ cls: "ml-wrap-type-grid" });
	for (const type of TYPES) {
		const meta = TYPE_META[type];
		const count = w.byType[type];
		const card = grid.createDiv({ cls: "ml-wrap-type-card" });
		card.style.setProperty("--wrap-type", meta.color);

		const head = card.createDiv({ cls: "ml-wrap-type-head" });
		setIcon(head.createSpan({ cls: "ml-wrap-type-icon" }), meta.icon);
		head.createSpan({ text: meta.label });

		card.createDiv({ cls: "ml-wrap-type-count", text: String(count) });

		const goal = w.goals[type];
		if (goal > 0) {
			const track = card.createDiv({ cls: "ml-wrap-bar-track" });
			track.createDiv({ cls: "ml-wrap-bar-fill" }).style.width = `${Math.min(100, (count / goal) * 100)}%`;
			card.createDiv({
				cls: "ml-wrap-type-sub",
				text: count >= goal ? `Goal of ${goal} reached` : `${goal - count} short of your goal of ${goal}`,
			});
		}

		const genre = w.genreByType[type];
		card.createDiv({
			cls: "ml-wrap-type-sub",
			text: `${formatHours(w.minutesByType[type])} hours${genre ? `, mostly ${genre}` : ""}`,
		});
	}
}

function renderMonths(root: HTMLElement, w: Wrapped): void {
	const totals = w.months.map((month) => month.total);
	const max = Math.max(1, ...totals);
	const peakIndex = totals.indexOf(max);
	const quietIndex = totals.indexOf(Math.min(...totals));

	const body = panel(
		root,
		"navy",
		"Your year, month by month",
		`${MONTHS_LONG[peakIndex] ?? ""} was your biggest month with ${plural(max, "finish", "finishes")}. ${MONTHS_LONG[quietIndex] ?? ""} was the quietest with ${totals[quietIndex] ?? 0}.`,
	);

	const chart = body.createDiv({ cls: "ml-wrap-months" });
	for (const [index, month] of w.months.entries()) {
		const col = chart.createDiv({ cls: "ml-wrap-month" });
		col.toggleClass("is-peak", index === peakIndex);
		col.setAttr("title", `${MONTHS_LONG[index] ?? ""}: ${month.total}`);
		col.createDiv({ cls: "ml-wrap-col-value", text: month.total ? String(month.total) : "" });

		const track = col.createDiv({ cls: "ml-wrap-month-track" });
		for (const type of TYPES) {
			if (!month.counts[type]) continue;
			const seg = track.createDiv({ cls: "ml-wrap-month-seg" });
			seg.style.height = `${(month.counts[type] / max) * 100}%`;
			seg.style.background = TYPE_META[type].color;
		}
		col.createDiv({ cls: "ml-wrap-col-label", text: MONTHS_SHORT[index] ?? "" });
	}

	const legend = body.createDiv({ cls: "ml-wrap-legend" });
	for (const type of TYPES) {
		const item = legend.createDiv({ cls: "ml-wrap-legend-item" });
		item.style.setProperty("--wrap-type", TYPE_META[type].color);
		item.createSpan({ cls: "ml-wrap-pill-dot" });
		item.createSpan({ text: TYPE_META[type].label });
	}
}

function renderGenres(parent: HTMLElement, w: Wrapped): void {
	const top = w.genres[0];
	const body = panel(
		parent,
		"wine",
		"Genres you kept coming back to",
		top ? `${top.label} led the way with ${plural(top.count, "title")}.` : undefined,
	);
	renderRanked(body, "Top genres", w.genres, "No genres on the notes you finished this year.", 6);
}

function renderRatings(parent: HTMLElement, w: Wrapped): void {
	const body = panel(
		parent,
		"teal",
		"How you rated",
		w.average !== null
			? `Your average was ${w.average.toFixed(1)} out of 10 across ${plural(w.ratedCount, "rating")}.`
			: "No ratings for this year yet.",
	);

	if (w.average === null) {
		return;
	}

	renderColumns(body, w.histogram.map((value, index) => ({ label: String(index + 1), value })));

	const chips = body.createDiv({ cls: "ml-wrap-chips" });
	for (const type of TYPES) {
		const value = w.averageByType[type];
		if (value === null) continue;
		const chip = chips.createDiv({ cls: "ml-wrap-chip" });
		chip.style.setProperty("--wrap-type", TYPE_META[type].color);
		chip.createSpan({ cls: "ml-wrap-pill-dot" });
		chip.createSpan({ text: `${TYPE_META[type].label} ${value.toFixed(1)}` });
	}
}

function renderCreators(root: HTMLElement, w: Wrapped): void {
	if (!w.authors.length && !w.directors.length && !w.essayists.length && !w.actors.length) {
		return;
	}

	const top = best(
		[
			{ label: w.authors[0]?.label, count: w.authors[0]?.count ?? 0 },
			{ label: w.directors[0]?.label, count: w.directors[0]?.count ?? 0 },
			{ label: w.essayists[0]?.label, count: w.essayists[0]?.count ?? 0 },
		],
		(entry) => entry.count,
		"max",
	);

	const body = panel(
		root,
		"ink",
		"The names you saw most",
		top && top.label ? `${top.label} showed up ${top.count} ${top.count === 1 ? "time" : "times"}.` : undefined,
	);

	const grid = body.createDiv({ cls: "ml-wrap-ranked-grid" });
	if (w.authors.length) renderRanked(grid, "Authors", w.authors, "", 5);
	if (w.directors.length) renderRanked(grid, "Directors and creators", w.directors, "", 5);
	if (w.essayists.length) renderRanked(grid, "Essayists", w.essayists, "", 5);
	if (w.actors.length) renderRanked(grid, "Actors", w.actors, "", 5);
}

function renderTopRated(root: HTMLElement, w: Wrapped, ctx: WrappedContext): void {
	if (!w.highest.length) {
		return;
	}

	const lead = w.highest[0];
	const body = panel(
		root,
		"plum",
		"Your highest rated",
		lead ? `${lead.item.title} came out on top with ${lead.rating}/10.` : undefined,
	);

	const row = body.createDiv({ cls: "ml-wrap-poster-row" });
	for (const [index, entry] of w.highest.entries()) {
		const card = posterCard(row, entry, ctx, `${entry.rating}/10`);
		card.createDiv({ cls: "ml-wrap-poster-rank", text: String(index + 1) });
	}

	if (w.bestByType.length > 1) {
		subhead(body, "Best of each type");
		const bestRow = body.createDiv({ cls: "ml-wrap-poster-row" });
		for (const { type, completion } of w.bestByType) {
			posterCard(bestRow, completion, ctx, `${TYPE_META[type].label}, ${completion.rating}/10`);
		}
	}

	if (w.lowest.length) {
		subhead(body, "Lowest rated");
		const list = body.createDiv({ cls: "ml-wrap-plainlist" });
		for (const entry of w.lowest) {
			kvRow(list, entry.item.title, `${entry.rating}/10`, () => ctx.callbacks.onOpenItem(entry.item));
		}
	}
}

function renderHabits(root: HTMLElement, w: Wrapped, ctx: WrappedContext): void {
	const duo = root.createDiv({ cls: "ml-wrap-duo" });

	const peakCount = Math.max(...w.weekdays);
	const peakWeekday = w.weekdays.indexOf(peakCount);
	const left = panel(
		duo,
		"navy",
		"When you finish things",
		peakCount > 0 ? `${WEEKDAYS_LONG[peakWeekday] ?? ""} was your day, with ${plural(peakCount, "finish", "finishes")}.` : undefined,
	);
	renderColumns(left, WEEKDAYS_SHORT.map((label, index) => ({ label, value: w.weekdays[index] ?? 0 })));

	const right = panel(duo, "wine", "Streaks and standouts");
	const list = right.createDiv({ cls: "ml-wrap-plainlist" });

	if (w.streak) {
		kvRow(list, "Longest streak", `${plural(w.streak.length, "day")}, ${formatRange(w.streak.start, w.streak.end)}`);
	}
	if (w.busiestDay) {
		kvRow(list, "Busiest day", `${formatDay(w.busiestDay.day)}, ${plural(w.busiestDay.count, "finish", "finishes")}`);
	}
	if (w.busiestWeek) {
		kvRow(list, "Busiest week", `${formatRange(w.busiestWeek.start, w.busiestWeek.end)}, ${w.busiestWeek.count}`);
	}
	if (w.gap) {
		kvRow(list, "Quietest stretch", `${plural(w.gap.length, "day")}, ${formatRange(w.gap.start, w.gap.end)}`);
	}
	if (w.season) {
		kvRow(list, "Favorite season", `${w.season.label}, ${w.season.count}`);
	}
	if (w.first) {
		const first = w.first;
		kvRow(list, "First finish", `${first.item.title}, ${formatDay(first.day)}`, () => ctx.callbacks.onOpenItem(first.item));
	}
	if (w.last && w.last !== w.first) {
		const last = w.last;
		kvRow(list, "Latest finish", `${last.item.title}, ${formatDay(last.day)}`, () => ctx.callbacks.onOpenItem(last.item));
	}
}

function renderTimeCapsule(root: HTMLElement, w: Wrapped, ctx: WrappedContext): void {
	if (!w.decades.length) {
		return;
	}

	const duo = root.createDiv({ cls: "ml-wrap-duo" });
	const left = panel(
		duo,
		"teal",
		"The decades you lived in",
		w.averageReleaseYear !== null ? `The average title you finished came out in ${w.averageReleaseYear}.` : undefined,
	);
	renderColumns(left, w.decades.map((entry) => ({ label: entry.label, value: entry.count })));

	const right = panel(duo, "ink", "Time capsule");
	const list = right.createDiv({ cls: "ml-wrap-plainlist" });
	if (w.oldest) {
		const oldest = w.oldest;
		kvRow(list, "Oldest", `${oldest.item.title}, ${oldest.item.year}`, () => ctx.callbacks.onOpenItem(oldest.item));
	}
	if (w.newest) {
		const newest = w.newest;
		kvRow(list, "Newest", `${newest.item.title}, ${newest.item.year}`, () => ctx.callbacks.onOpenItem(newest.item));
	}
	kvRow(list, "From the last 5 years", String(w.recentCount));
	kvRow(list, "30 years old or more", String(w.classicCount));
}

function renderBigAndSmall(root: HTMLElement, w: Wrapped, ctx: WrappedContext): void {
	if (!w.longestBook && !w.longestFilm) {
		return;
	}

	const punch = w.pages > 0
		? `${w.pages.toLocaleString("en-US")} pages in total${w.averagePages ? `, ${w.averagePages} per book on average` : ""}.`
		: undefined;
	const body = panel(root, "teal", "Biggest and smallest", punch);
	const row = body.createDiv({ cls: "ml-wrap-features" });

	const feature = (label: string, entry: Completion | null, detail: string): void => {
		if (!entry) return;
		const card = row.createDiv({ cls: "ml-wrap-feature" });
		card.style.setProperty("--wrap-type", TYPE_META[entry.item.mediaType].color);
		new Poster(entry.item, ctx.app).render(card.createDiv({ cls: "ml-wrap-feature-art" }));
		const text = card.createDiv({ cls: "ml-wrap-feature-text" });
		text.createDiv({ cls: "ml-wrap-feature-label", text: label });
		text.createDiv({ cls: "ml-wrap-feature-title", text: entry.item.title });
		text.createDiv({ cls: "ml-wrap-feature-detail", text: detail });
		card.addEventListener("click", () => ctx.callbacks.onOpenItem(entry.item));
	};

	feature("Longest book", w.longestBook, `${(w.longestBook?.item.pages ?? 0).toLocaleString("en-US")} pages`);
	if (w.shortestBook && w.shortestBook !== w.longestBook) {
		feature("Shortest book", w.shortestBook, `${(w.shortestBook.item.pages ?? 0).toLocaleString("en-US")} pages`);
	}
	feature("Longest film", w.longestFilm, formatRuntime(w.longestFilm?.minutes ?? 0));
	if (w.shortestFilm && w.shortestFilm !== w.longestFilm) {
		feature("Shortest film", w.shortestFilm, formatRuntime(w.shortestFilm.minutes));
	}
}

function renderPersona(root: HTMLElement, w: Wrapped): void {
	const persona = root.createDiv({ cls: "ml-wrap-persona" });
	persona.createDiv({ cls: "ml-wrap-persona-lead", text: `Your ${w.year} media personality is` });
	persona.createDiv({ cls: "ml-wrap-persona-title", text: w.persona.title });
	persona.createDiv({ cls: "ml-wrap-persona-blurb", text: w.persona.blurb });

	if (w.persona.traits.length) {
		const chips = persona.createDiv({ cls: "ml-wrap-chips" });
		for (const trait of w.persona.traits) {
			chips.createDiv({ cls: "ml-wrap-chip is-plain", text: trait });
		}
	}
}

function renderYearOverYear(root: HTMLElement, w: Wrapped): void {
	const body = panel(root, "ink", `${w.year} compared with ${w.year - 1}`);

	if (w.previous.total === 0) {
		body.createDiv({ cls: "ml-wrap-empty", text: `Nothing logged for ${w.year - 1}, so there is nothing to compare yet.` });
		return;
	}

	const grid = body.createDiv({ cls: "ml-wrap-tiles" });
	const delta = (label: string, current: number, previous: number, unit = ""): void => {
		const diff = current - previous;
		const pct = previous > 0 ? Math.round((diff / previous) * 100) : null;
		const tile = grid.createDiv({ cls: "ml-wrap-tile" });
		tile.createDiv({
			cls: `ml-wrap-tile-value ${diff > 0 ? "is-up" : diff < 0 ? "is-down" : ""}`.trim(),
			text: `${diff > 0 ? "+" : ""}${unit === "" ? diff : diff.toFixed(1)}${unit}`,
		});
		tile.createDiv({ cls: "ml-wrap-tile-label", text: label });
		tile.createDiv({
			cls: "ml-wrap-tile-sub",
			text: `${previous.toLocaleString("en-US")} last year${pct !== null ? `, ${pct > 0 ? "+" : ""}${pct}%` : ""}`,
		});
	};

	delta("Titles finished", w.total, w.previous.total);
	delta("Hours", Math.round(w.minutes / 60), Math.round(w.previous.minutes / 60));
	if (w.average !== null && w.previous.average !== null) {
		delta("Average rating", w.average, w.previous.average, " pts");
	}
}

function renderCoverWall(root: HTMLElement, w: Wrapped, ctx: WrappedContext): void {
	const items = uniqueByPath(w.completions);
	const shown = items.slice(0, COVER_WALL_LIMIT);
	const hidden = items.length - shown.length;

	const body = panel(
		root,
		"plum",
		`Everything you finished in ${w.year}`,
		hidden > 0 ? `Showing ${shown.length} of ${items.length} titles.` : `${plural(items.length, "title")}.`,
	);

	const wall = body.createDiv({ cls: "ml-wrap-wall" });
	for (const entry of shown) {
		const tile = wall.createDiv({ cls: "ml-wrap-wall-tile" });
		tile.setAttr("title", `${entry.item.title} (${typeLabel(entry.item)})`);
		new Poster(entry.item, ctx.app).render(tile);
		tile.addEventListener("click", () => ctx.callbacks.onOpenItem(entry.item));
	}
}

function renderLog(root: HTMLElement, w: Wrapped, ctx: WrappedContext): void {
	const details = root.createEl("details", { cls: "ml-wrap-log" });
	details.createEl("summary", { text: `Full log, ${plural(w.total, "entry", "entries")}` });

	const list = details.createDiv({ cls: "ml-wrap-log-list" });
	for (const entry of w.completions) {
		const row = list.createDiv({ cls: "ml-wrap-log-row" });
		row.style.setProperty("--wrap-type", TYPE_META[entry.item.mediaType].color);
		row.createSpan({ cls: "ml-wrap-log-date", text: formatDay(entry.day) });
		row.createSpan({ cls: "ml-wrap-pill-dot" });
		const title = row.createSpan({ cls: "ml-wrap-log-title", text: entry.item.title });
		if (entry.isRepeat) {
			title.createSpan({ cls: "ml-wrap-log-repeat", text: " again" });
		}
		row.createSpan({ cls: "ml-wrap-log-creator", text: entry.item.creator });
		row.createSpan({ cls: "ml-wrap-log-rating", text: entry.rating !== null ? `${entry.rating}/10` : "" });
		row.addEventListener("click", () => ctx.callbacks.onOpenItem(entry.item));
	}
}

/* ---------------------------------------------------------------------------
 * Saving: Markdown note and share image
 * ------------------------------------------------------------------------ */

function openSaveMenu(event: MouseEvent, app: App, w: Wrapped): void {
	const menu = new Menu();

	menu.addItem((item) =>
		item.setTitle("Save as note").setIcon("file-text").onClick(() => runSave(app, w, ["note"])),
	);
	menu.addItem((item) =>
		item.setTitle("Save as share image").setIcon("image").onClick(() => runSave(app, w, ["image"])),
	);
	menu.addItem((item) =>
		item.setTitle("Save both").setIcon("download").onClick(() => runSave(app, w, ["note", "image"])),
	);

	menu.showAtMouseEvent(event);
}

function runSave(app: App, w: Wrapped, kinds: Array<"note" | "image">): void {
	void (async () => {
		try {
			const saved: string[] = [];
			if (kinds.includes("note")) {
				saved.push(await writeText(app, `${OUTPUT_FOLDER}/${w.year} Year in Media.md`, buildMarkdown(w)));
			}
			if (kinds.includes("image")) {
				const blob = await renderShareImage(w);
				saved.push(await writeBinary(app, `${OUTPUT_FOLDER}/${w.year} Year in Media.png`, await blob.arrayBuffer()));
			}
			new Notice(`Saved ${saved.join(" and ")}`);
		} catch (error) {
			console.error("Year in Media: save failed", error);
			new Notice("Could not save the file. Check the developer console for details.");
		}
	})();
}

async function ensureFolder(app: App, folder: string): Promise<void> {
	const path = normalizePath(folder);
	if (app.vault.getAbstractFileByPath(path)) {
		return;
	}

	try {
		await app.vault.createFolder(path);
	} catch {
		// Created by something else in the meantime.
	}
}

async function writeText(app: App, path: string, content: string): Promise<string> {
	await ensureFolder(app, OUTPUT_FOLDER);
	const normalized = normalizePath(path);
	const existing = app.vault.getAbstractFileByPath(normalized);

	if (existing instanceof TFile) {
		await app.vault.modify(existing, content);
	} else {
		await app.vault.create(normalized, content);
	}

	return normalized;
}

async function writeBinary(app: App, path: string, data: ArrayBuffer): Promise<string> {
	await ensureFolder(app, OUTPUT_FOLDER);
	const normalized = normalizePath(path);
	const existing = app.vault.getAbstractFileByPath(normalized);

	if (existing instanceof TFile) {
		await app.vault.modifyBinary(existing, data);
	} else {
		await app.vault.createBinary(normalized, data);
	}

	return normalized;
}

function wikilink(item: MediaItem): string {
	const target = item.path.replace(/\.md$/i, "");
	const title = item.title.replace(/[|[\]]/g, " ");
	return `[[${target}|${title}]]`;
}

function buildMarkdown(w: Wrapped): string {
	const lines: string[] = [];
	const add = (...values: string[]): void => {
		lines.push(...values);
	};

	add(`# ${w.year} Year in Media`, "", `> **${w.persona.title}.** ${w.persona.blurb}`, "");
	if (w.persona.traits.length) {
		add(w.persona.traits.map((trait) => `\`${trait}\``).join(" "), "");
	}

	add(
		"## The numbers",
		"",
		`- **${w.total}** titles finished (${w.uniqueTitles} unique, ${w.repeats} rewatches or rereads)`,
		`- **${formatHours(w.minutes)}** hours, about ${(w.minutes / 1440).toFixed(1)} full days`,
	);
	if (w.pages > 0) add(`- **${w.pages.toLocaleString("en-US")}** pages read`);
	add(
		`- **${w.average !== null ? w.average.toFixed(1) : "-"}/10** average rating across ${w.ratedCount} ratings, with ${w.perfectTens} perfect 10s`,
		`- **${w.activeDays}** days with a finish, longest streak ${w.streak ? `${w.streak.length} days (${formatRange(w.streak.start, w.streak.end)})` : "none"}`,
		`- **${w.notes}** notes written, **${w.favorites}** items favorited`,
		"",
		"## By type",
		"",
		"| Type | Finished | Goal | Hours | Avg rating | Top genre |",
		"| --- | ---: | ---: | ---: | ---: | --- |",
	);
	for (const type of TYPES) {
		add(
			`| ${TYPE_META[type].label} | ${w.byType[type]} | ${w.goals[type] || "-"} | ${formatHours(w.minutesByType[type])} | ${w.averageByType[type]?.toFixed(1) ?? "-"} | ${w.genreByType[type] ?? "-"} |`,
		);
	}

	add("", "## Month by month", "", "| Month | Books | Films | Series | Essays | Total |", "| --- | ---: | ---: | ---: | ---: | ---: |");
	for (const [index, month] of w.months.entries()) {
		add(`| ${MONTHS_LONG[index] ?? ""} | ${month.counts.book} | ${month.counts.movie} | ${month.counts.series} | ${month.counts.essay} | ${month.total} |`);
	}

	const ranked = (title: string, list: Ranked[], limit = 5): void => {
		if (!list.length) return;
		add("", `## ${title}`, "");
		list.slice(0, limit).forEach((entry, index) => add(`${index + 1}. ${entry.label} (${entry.count})`));
	};
	ranked("Top genres", w.genres, 8);
	ranked("Top authors", w.authors);
	ranked("Top directors and creators", w.directors);
	ranked("Top essayists", w.essayists);
	ranked("Most seen actors", w.actors);

	if (w.highest.length) {
		add("", "## Highest rated", "");
		w.highest.forEach((entry, index) => add(`${index + 1}. ${wikilink(entry.item)} (${entry.rating}/10)`));
	}
	if (w.lowest.length) {
		add("", "## Lowest rated", "");
		w.lowest.forEach((entry) => add(`- ${wikilink(entry.item)} (${entry.rating}/10)`));
	}

	if (w.average !== null) {
		add("", "## Rating spread", "", "| Rating | Count |", "| ---: | ---: |");
		w.histogram.forEach((count, index) => add(`| ${index + 1} | ${count} |`));
	}

	add("", "## Habits", "");
	const peakCount = Math.max(...w.weekdays);
	if (peakCount > 0) add(`- Favorite weekday: ${WEEKDAYS_LONG[w.weekdays.indexOf(peakCount)] ?? ""} (${peakCount})`);
	if (w.busiestDay) add(`- Busiest day: ${formatDay(w.busiestDay.day, true)} (${w.busiestDay.count})`);
	if (w.busiestWeek) add(`- Busiest week: ${formatRange(w.busiestWeek.start, w.busiestWeek.end)} (${w.busiestWeek.count})`);
	if (w.gap) add(`- Quietest stretch: ${w.gap.length} days (${formatRange(w.gap.start, w.gap.end)})`);
	if (w.season) add(`- Favorite season: ${w.season.label} (${w.season.count})`);
	if (w.first) add(`- First finish: ${wikilink(w.first.item)} on ${formatDay(w.first.day, true)}`);
	if (w.last) add(`- Latest finish: ${wikilink(w.last.item)} on ${formatDay(w.last.day, true)}`);

	if (w.decades.length) {
		add("", "## Time capsule", "");
		add(w.decades.map((entry) => `${entry.label}: ${entry.count}`).join(", "), "");
		if (w.averageReleaseYear !== null) add(`- Average release year: ${w.averageReleaseYear}`);
		if (w.oldest) add(`- Oldest: ${wikilink(w.oldest.item)} (${w.oldest.item.year})`);
		if (w.newest) add(`- Newest: ${wikilink(w.newest.item)} (${w.newest.item.year})`);
	}

	if (w.longestBook || w.longestFilm) {
		add("", "## Biggest and smallest", "");
		if (w.longestBook) add(`- Longest book: ${wikilink(w.longestBook.item)} (${w.longestBook.item.pages} pages)`);
		if (w.shortestBook && w.shortestBook !== w.longestBook) add(`- Shortest book: ${wikilink(w.shortestBook.item)} (${w.shortestBook.item.pages} pages)`);
		if (w.longestFilm) add(`- Longest film: ${wikilink(w.longestFilm.item)} (${formatRuntime(w.longestFilm.minutes)})`);
		if (w.shortestFilm && w.shortestFilm !== w.longestFilm) add(`- Shortest film: ${wikilink(w.shortestFilm.item)} (${formatRuntime(w.shortestFilm.minutes)})`);
	}

	if (w.previous.total > 0) {
		add("", `## Compared with ${w.year - 1}`, "");
		add(`- Titles: ${w.total} vs ${w.previous.total}`);
		add(`- Hours: ${formatHours(w.minutes)} vs ${formatHours(w.previous.minutes)}`);
		if (w.average !== null && w.previous.average !== null) {
			add(`- Average rating: ${w.average.toFixed(1)} vs ${w.previous.average.toFixed(1)}`);
		}
	}

	add("", "## Everything you finished", "");
	for (const entry of w.completions) {
		add(`- ${entry.day} ${wikilink(entry.item)} (${typeLabel(entry.item)}${entry.isRepeat ? ", again" : ""})${entry.rating !== null ? `, ${entry.rating}/10` : ""}`);
	}

	return `${lines.join("\n")}\n`;
}

/* ---------------------------------------------------------------------------
 * Share image (1080 x 1920, typographic, no posters)
 * ------------------------------------------------------------------------ */

const IMAGE_FONT = "'Inter', 'SF Pro Display', system-ui, -apple-system, 'Segoe UI', sans-serif";

function drawText(
	g: CanvasRenderingContext2D,
	text: string,
	x: number,
	y: number,
	size: number,
	weight: number,
	fill: string,
	align: CanvasTextAlign = "left",
	spacing = 0,
): void {
	g.font = `${weight} ${size}px ${IMAGE_FONT}`;
	g.fillStyle = fill;
	g.textAlign = align;
	g.textBaseline = "alphabetic";
	(g as unknown as { letterSpacing: string }).letterSpacing = `${spacing}px`;
	g.fillText(text, x, y);
}

function fitText(g: CanvasRenderingContext2D, text: string, maxWidth: number, size: number, weight: number): string {
	g.font = `${weight} ${size}px ${IMAGE_FONT}`;
	(g as unknown as { letterSpacing: string }).letterSpacing = "0px";
	if (g.measureText(text).width <= maxWidth) {
		return text;
	}

	let trimmed = text;
	while (trimmed.length > 1 && g.measureText(`${trimmed}…`).width > maxWidth) {
		trimmed = trimmed.slice(0, -1);
	}
	return `${trimmed.trimEnd()}…`;
}

function roundedRect(g: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
	g.beginPath();
	g.moveTo(x + radius, y);
	g.arcTo(x + width, y, x + width, y + height, radius);
	g.arcTo(x + width, y + height, x, y + height, radius);
	g.arcTo(x, y + height, x, y, radius);
	g.arcTo(x, y, x + width, y, radius);
	g.closePath();
}

function glow(g: CanvasRenderingContext2D, x: number, y: number, radius: number, rgb: string, alpha: number): void {
	const gradient = g.createRadialGradient(x, y, 0, x, y, radius);
	gradient.addColorStop(0, `rgba(${rgb},${alpha})`);
	gradient.addColorStop(1, `rgba(${rgb},0)`);
	g.fillStyle = gradient;
	g.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

async function renderShareImage(w: Wrapped): Promise<Blob> {
	const W = 1080;
	const H = 1920;
	const PAD = 90;

	const canvas = document.createElement("canvas");
	canvas.width = W;
	canvas.height = H;
	const g = canvas.getContext("2d");
	if (!g) {
		throw new Error("Canvas 2D is not available.");
	}

	const background = g.createLinearGradient(0, 0, W, H);
	background.addColorStop(0, "#1a0b3d");
	background.addColorStop(0.55, "#4a1a8c");
	background.addColorStop(1, "#b4208a");
	g.fillStyle = background;
	g.fillRect(0, 0, W, H);
	glow(g, 900, 260, 520, "255,92,138", 0.35);
	glow(g, 100, 1500, 620, "61,217,192", 0.2);

	drawText(g, "in media", PAD, 150, 34, 600, "rgba(255,255,255,0.75)");
	drawText(g, String(w.year), PAD - 8, 430, 330, 900, "#ffffff", "left", -12);

	drawText(g, w.total.toLocaleString("en-US"), PAD, 690, 190, 900, "#ffffff", "left", -4);
	drawText(g, w.total === 1 ? "title finished" : "titles finished", PAD, 765, 52, 600, "rgba(255,255,255,0.9)");
	drawText(
		g,
		`About ${formatHours(w.minutes)} hours, or ${(w.minutes / 1440).toFixed(1)} full days`,
		PAD,
		840,
		36,
		500,
		"rgba(255,255,255,0.72)",
	);

	// Type breakdown
	drawText(g, "By type", PAD, 960, 28, 600, "rgba(255,255,255,0.6)");
	const maxCount = Math.max(1, ...TYPES.map((type) => w.byType[type]));
	for (const [index, type] of TYPES.entries()) {
		const y = 1020 + index * 84;
		drawText(g, TYPE_META[type].label, PAD, y, 38, 600, "#ffffff");
		drawText(g, String(w.byType[type]), W - PAD, y, 38, 800, "#ffffff", "right");

		g.fillStyle = "rgba(255,255,255,0.16)";
		roundedRect(g, PAD, y + 16, W - PAD * 2, 14, 7);
		g.fill();

		const fillWidth = Math.max(w.byType[type] > 0 ? 14 : 0, ((W - PAD * 2) * w.byType[type]) / maxCount);
		if (fillWidth > 0) {
			g.fillStyle = TYPE_META[type].color;
			roundedRect(g, PAD, y + 16, fillWidth, 14, 7);
			g.fill();
		}
	}

	// Stat boxes
	const topCreator = best(
		[w.authors[0], w.directors[0], w.essayists[0]].filter((entry): entry is Ranked => Boolean(entry)),
		(entry) => entry.count,
		"max",
	);
	const boxes: Array<{ label: string; value: string; sub: string }> = [
		{ label: "Top genre", value: w.genres[0]?.label ?? "-", sub: w.genres[0] ? plural(w.genres[0].count, "title") : "" },
		{ label: "Most seen", value: topCreator?.label ?? "-", sub: topCreator ? plural(topCreator.count, "title") : "" },
		{ label: "Average rating", value: w.average !== null ? `${w.average.toFixed(1)}/10` : "-", sub: `${w.ratedCount} rated` },
		{
			label: "Longest streak",
			value: w.streak ? plural(w.streak.length, "day") : "-",
			sub: w.streak ? formatRange(w.streak.start, w.streak.end) : "",
		},
	];

	const boxWidth = (W - PAD * 2 - 24) / 2;
	for (const [index, box] of boxes.entries()) {
		const x = PAD + (index % 2) * (boxWidth + 24);
		const y = 1350 + Math.floor(index / 2) * 164;

		g.fillStyle = "rgba(255,255,255,0.12)";
		roundedRect(g, x, y, boxWidth, 140, 22);
		g.fill();

		drawText(g, box.label, x + 28, y + 42, 24, 600, "rgba(255,255,255,0.62)");
		drawText(g, fitText(g, box.value, boxWidth - 56, 44, 800), x + 28, y + 92, 44, 800, "#ffffff");
		drawText(g, fitText(g, box.sub, boxWidth - 56, 24, 500), x + 28, y + 125, 24, 500, "rgba(255,255,255,0.66)");
	}

	// Persona
	drawText(g, w.persona.title, W / 2, 1770, 66, 800, "#ffffff", "center");
	drawText(g, fitText(g, w.persona.blurb, W - PAD * 2, 28, 500), W / 2, 1822, 28, 500, "rgba(255,255,255,0.75)", "center");
	drawText(g, "Media Library", W / 2, 1884, 22, 500, "rgba(255,255,255,0.4)", "center");

	return await new Promise<Blob>((resolve, reject) => {
		canvas.toBlob((blob) => {
			if (blob) {
				resolve(blob);
			} else {
				reject(new Error("Could not create the image."));
			}
		}, "image/png");
	});
}