# Media Library Plugin

A modular Obsidian plugin for tracking books, essays, movies, and series with:

- A Library page (cards + showcase view)
- A Dashboard page (charts, quick picks, progress)
- Activity logging stored directly in note body callouts
- Frontmatter parsing with resilient status/cover normalization

## What This Plugin Is

This plugin scans media notes in your vault, normalizes each note into a shared `MediaItem` model, and renders a polished interface for browsing, filtering, and logging reading/watching activity.

It is intentionally split into layers:

1. Plugin boot/lifecycle
2. Domain/core (scan + parse + model)
3. UI rendering (library/dashboard/showcase)
4. Persistence helpers (activity callouts + frontmatter updates)

## Build And Run

- Install: `npm install`
- Dev build: `npm run dev`
- Production build: `npm run build`

Compiled output used by Obsidian:

- `main.js`
- `manifest.json`
- `styles.css`

## Architecture Walkthrough

### Runtime Flow

1. `src/main.ts` loads settings and registers the custom view.
2. `MediaLibrary` refreshes by scanning files through `VaultScanner`.
3. `VaultScanner` delegates frontmatter parsing to `ParserRegistry` + media-specific parsers.
4. Parsed objects become normalized `MediaItem` entries.
5. `LibraryView` orchestrates page tabs, toolbar state, active view, and sidebar/dashboard rendering.
6. Activity logs are read/written via `ActivityLogService` and edited through `MediaActivityModal`.

### UI Flow

- `LibraryView` decides between Library tab and Dashboard tab.
- Library tab uses:
  - `CardView` for card grid
  - `ShowcaseView` for editorial shelf layout
  - `LibrarySidebar` for metrics, queue, activity, and rating graph
- Dashboard tab uses:
  - `MediaDashboardToolbar` for filter controls
  - `MediaDashboard` for charts, summary, quick picks, and status line

## Root File Guide

### Runtime + Metadata

- `main.js`: bundled plugin runtime loaded by Obsidian (generated).
- `manifest.json`: plugin identity, version, compatibility, metadata.
- `styles.css`: global stylesheet for all plugin UI.
- `data.json`: persisted plugin data file in vault plugin folder.

### Source + Tooling

- `package.json`: scripts, dependencies, project metadata.
- `package-lock.json`: deterministic dependency lock file.
- `tsconfig.json`: TypeScript compiler configuration.
- `esbuild.config.mjs`: esbuild bundling config.
- `eslint.config.mts`: lint rules/config.
- `version-bump.mjs`: helper script for version bump flow.
- `versions.json`: maps plugin versions to minimum Obsidian app versions.

### Project Docs/Policy

- `README.md`: this documentation.
- `AGENTS.md`: local coding-agent guidance and project conventions.
- `LICENSE`: license text.
- `media.md`: vault/sample content notes used during development.

## Source File Guide (In Depth)

## `src/main.ts`

- Plugin entrypoint and Obsidian lifecycle hooks.
- Loads settings, registers custom view, ribbon icon, and refresh command.
- Creates/holds `MediaLibrary` and `ViewRegistry` instances.

## `src/settings.ts`

- Defines settings types and defaults.
- Implements settings tab UI for dashboard defaults and toggles.
- Persists user choices through plugin save flow.

## `src/controllers/PluginControllers.ts`

- Plugin-level coordinator for startup orchestration.
- Initializes media library refresh and event/command registration.
- Acts as a lifecycle wrapper around core systems.

## `src/core/MediaLibrary.ts`

- In-memory store and query layer for normalized media data.
- Handles refresh, sorting, filtering support, and count helpers.
- Central read API consumed by views.

## `src/core/MediaRegistry.ts`

- Registry describing supported media types and metadata.
- Ensures media type handling remains centralized and extendable.

## `src/core/VaultScanner.ts`

- Reads vault markdown files relevant to media tracking.
- Extracts frontmatter/body data and builds `MediaItem` objects.
- Integrates callout-based activity parsing into scan results.

## `src/core/ViewRegistry.ts`

- Registers available Library sub-views.
- Provides default/available view IDs used by `ViewSwitcher`.

## `src/models/BookFrontmatter.ts`

- Type contract for book-specific frontmatter fields.

## `src/models/EssayFrontmatter.ts`

- Type contract for essay-specific frontmatter fields.

## `src/models/MovieFrontmatter.ts`

- Type contract for movie-specific frontmatter fields.

## `src/models/SeriesFrontmatter.ts`

- Type contract for series-specific frontmatter fields.

## `src/models/MediaActivityEntry.ts`

- Model for one activity event (date/status/rating/note/kind).

## `src/models/MediaItem.ts`

- Canonical normalized model used by all UI layers.
- Merges common media fields from different source note types.

## `src/models/MediaStatus.ts`

- Status union type + guards/validation helpers.

## `src/models/MediaType.ts`

- Media type union (book/movie/series/essay) and related typing.

## `src/models/SortType.ts`

- Sort mode union used by toolbars and list rendering.

## `src/models/index.ts`

- Barrel exports for model imports.

## `src/parsers/BaseParser.ts`

- Shared parsing logic across media types.
- Normalizes status aliases, completion dates, and cover sources.
- Handles URL/path cleanup and frontmatter fallback strategy.

## `src/parsers/BookParser.ts`

- Book-specific parser mapping frontmatter to `MediaItem` fields.

## `src/parsers/EssayParser.ts`

- Essay-specific parser mapping frontmatter to `MediaItem` fields.

## `src/parsers/MovieParser.ts`

- Movie-specific parser mapping frontmatter to `MediaItem` fields.

## `src/parsers/SeriesParser.ts`

- Series-specific parser mapping frontmatter to `MediaItem` fields.

## `src/parsers/ParserRegistry.ts`

- Routes raw files/frontmatter to the right parser by media type.

## `src/services/ActivityLogService.ts`

- Reads/writes activity callout blocks in note body.
- Syncs completion fields/history in frontmatter when saving activity.
- Provides fallback reconstruction from historical frontmatter fields.

## `src/ui/MediaActivityModal.ts`

- Activity editor modal opened from card interactions.
- Lets you log read/watch events with date/status/rating/note.
- Re-renders timeline after save.

## `src/utils/Array.ts`

- Array-related helper utilities.

## `src/utils/Dates.ts`

- Date helpers for formatting/comparison/normalization.

## `src/utils/Logger.ts`

- Logging helper abstraction.

## `src/utils/Number.ts`

- Number utilities used across parsing or UI.

## `src/utils/String.ts`

- String normalization/formatting utilities.

## `src/utils/index.ts`

- Barrel exports for shared utility modules.

## `src/components/Badge.ts`

- Small presentational badge component.

## `src/components/Card.ts`

- Generic card-style presentational helper.

## `src/components/EmptyState.ts`

- Reusable empty state visual component.

## `src/components/FilterBar.ts`

- Generic filtering UI wrapper/component.

## `src/components/FilterChip.ts`

- Compact chip-style filter control.

## `src/components/GenrePill.ts`

- Genre pill/tag visual component.

## `src/components/Poster.ts`

- Cover art renderer and source resolver.
- Handles vault-local links and external cover URLs.

## `src/components/RatingStars.ts`

- Star-based rating display helper.

## `src/components/SearchBar.ts`

- Generic search input component abstraction.

## `src/components/Tag.ts`

- Simple tag-style presentational component.

## `src/components/Toolbar.ts`

- Base toolbar rendering abstraction.

## `src/views/LibraryView.ts`

- Main orchestration view for the plugin UI.
- Owns page tab state, search/filter/sort state, active subview, and refresh behavior.
- Coordinates dashboard render vs library render and modal entry points.

## `src/views/CardView.ts`

- Library card-grid renderer.
- Connects item click behavior to higher-level callbacks.

## `src/views/ShowcaseView.ts`

- Alternate curated "showcase" library layout.
- Renders shelf, try-these picks, featured blocks, and edge-to-edge presentation.

## `src/views/ViewSwitcher.ts`

- Control for switching between registered library views.

## `src/views/cards/LibraryCard.ts`

- Concrete media card renderer (title/creator/chips/cover/rating metadata).

## `src/views/cards/LibraryCardTrack.ts`

- Card list/grid track helper and card sequencing logic.

## `src/views/library/LibraryHeader.ts`

- Header banner and top-level library context text/stats.

## `src/views/library/LibraryPageTabs.ts`

- Top-level tab control (Library vs Dashboard).

## `src/views/library/LibraryShell.ts`

- Structural layout shell for main column + sidebar hosts.

## `src/views/library/LibrarySidebar.ts`

- Sidebar module for snapshot metrics, queue, activity feed.
- Includes grayscale vertical rating distribution graph.

## `src/views/library/LibraryToolbar.ts`

- Library tab controls: search, filter, sort, reset, shuffle.

## `src/views/library/MediaDashboard.ts`

- Dashboard renderer: hero, metrics, charts, quick picks, goals, status line.
- Includes chart mode controls (bar/pie/focus) and activity phrasing.

## `src/views/library/MediaDashboardToolbar.ts`

- Dashboard filter toolbar controls:
  - Focus (Completed/Backlog/Everything)
  - Scope (This year/All time)
  - Media type grouping

## Recent Cleanup Notes

Removed dead files that had no incoming imports/usages and were replaced by newer modules:

- Legacy sidebar/detail/spotlight files no longer used by current library flow.
- Empty placeholder service/style/ui/view utility files with zero content and zero references.

## Design Direction

Current UI direction is:

- Soft professional visual hierarchy
- Subtle feminine accents (blush tones) without sacrificing readability
- Rounded components, layered panel depth, cleaner chart affordances
- Grayscale activity rating graph for minimal, editorial clarity

## Safe Extension Points

If you want to keep extending the plugin cleanly:

1. Add new data extraction in `VaultScanner` + `BaseParser` first.
2. Keep UI decisions inside `src/views/...` modules only.
3. Add note-body persistence logic in services, not in views.
4. Register new view modes via `ViewRegistry` + `ViewSwitcher`.
5. Keep `main.ts` thin and orchestration-focused.
