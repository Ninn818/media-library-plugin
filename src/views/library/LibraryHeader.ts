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
		header.createDiv({ cls: "media-library-header-eyebrow", text: "Welcome to" });
	}
	const title = header.createDiv({ cls: "media-library-header-title" });
	title.setText("Media Library");
	header.createDiv({
		cls: "media-library-header-subtitle",
		text: activeTab === "dashboard"
			? "A sharper dashboard for books, films, series, and essays."
			: "A vault of books, films, series & essays.",
	});

	if (settings.showCounts) {
		const stats = header.createDiv({ cls: "media-library-header-stats" });
		stats.createDiv({ text: `Average ${avgRating ?? "—"}/10`, cls: "media-library-header-pill" });
		stats.createDiv({ text: `Books ${counts.books}`, cls: "media-library-header-pill" });
		stats.createDiv({ text: `Films ${counts.movies}`, cls: "media-library-header-pill" });
		stats.createDiv({ text: `Series ${counts.series}`, cls: "media-library-header-pill" });
		stats.createDiv({ text: `Essays ${counts.essays}`, cls: "media-library-header-pill" });
	}
}

function getAverageRating(library: MediaLibrary): number | null {
	const ratings = library
		.getAll()
		.map((item) => item.rating)
		.filter((rating): rating is number => typeof rating === "number" && Number.isFinite(rating) && rating > 0);

	if (!ratings.length) return null;
	return Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 10) / 10;
}