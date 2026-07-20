import { MediaLibrary } from "../../core/MediaLibrary";
import { LibraryPageTab, MediaLibrarySettings } from "../../settings";

export function renderLibraryHeader(
	container: HTMLElement,
	library: MediaLibrary,
	settings: MediaLibrarySettings,
	activeTab: LibraryPageTab
): void {
	const avgRating = getAverageRating(library);
	const counts = {
		books: library.getBookCount(),
		movies: library.getMovieCount(),
		series: library.getSeriesCount(),
		essays: library.getEssayCount(),
	};

	const header = container.createDiv({ cls: "media-library-header" });
	if (activeTab !== "dashboard") {
		header.createDiv({ cls: "media-library-header-eyebrow", text: "Your media home" });
	}
	const title = header.createDiv({ cls: "media-library-header-title" });
	title.setText("Media library");
	header.createDiv({
		cls: "media-library-header-subtitle",
		text: activeTab === "dashboard"
			? "A sharper dashboard for books, films, series, and essays."
			: "A vault of books, films, series & essays.",
	});

	if (settings.showCounts) {
		const stats = header.createDiv({ cls: "media-library-header-stat-grid" });
		renderStat(stats, "Average", `${avgRating ?? "—"}/10`);
		renderStat(stats, "Books", String(counts.books));
		renderStat(stats, "Films", String(counts.movies));
		renderStat(stats, "Series", String(counts.series));
		renderStat(stats, "Essays", String(counts.essays));
	}
}

function renderStat(container: HTMLElement, label: string, value: string): void {
	const card = container.createDiv({ cls: "media-library-header-stat" });
	card.createDiv({ cls: "media-library-header-stat-label", text: label });
	card.createDiv({ cls: "media-library-header-stat-value", text: value });
}

function getAverageRating(library: MediaLibrary): number | null {
	const ratings = library
		.getAll()
		.map((item) => item.rating)
		.filter((rating): rating is number => typeof rating === "number" && Number.isFinite(rating) && rating > 0);

	if (!ratings.length) return null;
	return Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 10) / 10;
}