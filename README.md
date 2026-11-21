# Media Library Plugin

Media Library turns media notes in your Obsidian vault into a personal catalog. It scans your notes for books, movies, series, and essays, then gives you a set of views (tabs) to browse, track, and review everything you read and watch.

You keep using plain Markdown files; the plugin builds the library UI on top of your existing notes and frontmatter.

---

## What it does

- Turns frontmatter-based media notes into a searchable, filterable library.
- Tracks reading and watching activity over time (start / finish dates, status, rating, notes).
- Lets you write and store reviews as normal Markdown files linked to your media notes.
- Generates dashboards and yearly recaps (Year in Media) from your actual activity.
- Helps you organize your catalog by lists and tags (favorites, watchlists, reading plans, etc.).

---

## Features

### Library & browsing

- **Multiple library views**
  - Card view, gallery view, and table view for your catalog.
  - Search by title or metadata.
  - Filter by media type, status, tags, lists, rating, and more.
  - Sort by title, date added, completion date, rating, etc.
  - Adjustable card size and layout.

- **Vault-wide scanning**
  - Scans Markdown files across your vault.
  - Includes a note when the frontmatter has a supported media type field:
    - `type`, `mediaType`, or `media`.
    - Supported values: `book`, `movie` (or `film`), `series` (or `tv`), and `essay`.
  - Uses the note’s filename as title when `title` is not provided.

- **Metadata support**
  - Common fields: `title`, `author`, `director`, `genres`, `status`,
    `rating` or `personalRating`, `review`, `cover`, `coverUrl`, etc.
  - Supports type-specific fields like `pages` or duration.
  - Uses cover images from fields or local image paths.

---

## Tabs / main pages

The plugin’s UI is organized into several main pages (tabs). You can open it from the **Media library** ribbon icon or via the **Open media library** command.

### Tab overview

| Tab          | Main purpose                                              | Common actions / functions                                                                 |
| ------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Home**     | Snapshot of what you're doing now and what's next        | See current reads/watches, see up-next items, jump into a media item or another tab       |
| **Dashboard**| High-level stats, goals, and summaries                    | View yearly/all-time stats, track goals, inspect rating charts, see completed/backlog     |
| **Media**    | Core catalog of all media notes                           | Browse all items, search, filter, sort, switch view (cards/gallery/table), open item page |
| **Diary**    | Journal-style list by completion date                     | See items finished per day/month, scroll timeline, open item/activity from a date         |
| **Activity** | Detailed timeline of activity entries                     | View starts/finishes/status changes, edit entries, create/edit linked review notes        |
| **Lists**    | Custom collections and projects                           | Create lists, add/remove items, manage themed collections and watch/read plans            |
| **Tags**     | Tag-centric exploration and organization                  | Browse tags, see items per tag, clean up or adjust tagging                                |
| **Year in Media** | Yearly recap of everything for a chosen year        | Choose a year, review recap, export Markdown recap, export/share image, or both           |

### Home

- Shows what you are currently reading or watching.
- Shows what’s up next (e.g., backlog, queued items).
- Quick entry point into the rest of your library.

### Dashboard

- Overview of your reading and watching over time.
- Configurable for:
  - Yearly or all-time view.
  - Per-media-type goals (books, movies, series, essays).
- Typical sections:
  - Goals vs. progress.
  - Completed items and backlog.
  - Rating distribution and charts.
  - Quick picks and summary metrics.

### Media

- The core catalog view.
- Browse **all** media notes that the plugin recognizes.
- Switch between cards / gallery / table layouts.
- Search, filter, and sort your entire collection.
- Drill into an item to see details, activity, and related notes.

### Diary

- Date-based view of your completed reads and watches.
- Focus on **when** you finished items rather than what they are.
- Useful as a reading or watch journal.

### Activity

- Combined timeline of:
  - Library events (items added, status changes, etc.).
  - Activity entries (starts, stops, finishes, rating changes, notes).
- From here you can:
  - Edit activity entries.
  - Create linked review notes from an activity or its edit form.

### Lists

- Custom collections of media notes.
- Examples:
  - "2026 TBR", "Cozy mysteries", "Horror October", "Re-watch list".
- Manage which items are in which lists.
- Good for planning, themed collections, and projects.

### Tags

- Tag-centric view of your library.
- See which tags are most used and which notes use them.
- Manage tags directly from the plugin’s UI to organize your vault.

### Year in Media

- Yearly recap of everything you read and watched in a given year.
- Includes:
  - Completed titles per media type.
  - Ratings and written reviews.
  - Titles started but not finished.
- Export options:
  - Save the recap as a Markdown note.
  - Export a shareable image.
  - Or both at once.

---

## Activity, reviews, and ratings

- **Activity tracking**
  - Log start and finish dates, status, rating, and notes.
  - Edit existing entries if your dates or ratings change.
  - Activity powers the Diary, Activity, Dashboard, and Year in Media pages.

- **Reviews**
  - Create a review note from an activity entry or edit form.
  - Reviews are saved as Markdown files in `Personal/Review` in your vault.
  - The folder is created automatically when needed.
  - Each review note is linked to its media note.

- **Ratings**
  - Ratings are stored on a 0–10 scale.
  - UI can show ratings as 5-star or 10-star, configurable in settings.

---

## Installation

### With BRAT

1. Install and enable **BRAT** from Obsidian’s Community Plugins.
2. In BRAT settings, add `Ninn818/media-library-plugin` as a beta plugin.
3. Install a published release, then enable **Media Library Plugin** in Community Plugins.

> Note: BRAT installs published GitHub releases. A Git tag by itself is not a release.


## Getting started

1. Make or update a media note with frontmatter like:

   ```yaml
   ---
   type: book
   title: Dune
   author: Frank Herbert
   status: read
   genres:
     - Science Fiction
   personalRating: 9
   pages: 412
   dateRead: 2025-11-15
   ---
   ```

2. Add as many notes as you want for books, movies, series, and essays.
3. Open the library from:
   - The **Media library** ribbon icon, or
   - The **Open media library** command.
4. If you change metadata or add new notes, run **Refresh media library** to rescan.

---

## Settings

Open **Settings → Media Library Plugin** to configure:

- **General**
  - Where the library opens (pane / window).
  - Which page opens first (Home, Media, etc.).
- **Display**
  - Default sorting and view mode.
  - Tag display format.
  - Default card counts and layout behavior.
  - Enable / disable UI animations.
  - Rating display scale (5 or 10 stars).
- **Dashboard & goals**
  - Dashboard default time period.
  - Visible dashboard sections.
  - Yearly goals per media type (books, movies, series, essays).
- **Spotlight & reviews**
  - Whether the spotlight includes a review editor.
  - Review behavior and linking.

(Options may evolve; see the in-app settings for the latest list.)

---

## Troubleshooting

- **The library is empty**
  - Make sure media notes have valid frontmatter.
  - Ensure `type`, `mediaType`, or `media` has a supported value
    (`book`, `movie`/`film`, `series`/`tv`, `essay`).
  - Then run **Refresh media library**.

- **The plugin does not appear**
  - Confirm the plugin is enabled in Obsidian.
  - Check that the plugin folder contains `manifest.json`, `main.js`, and `styles.css`.

- **A recap is missing a completion or review**
  - Add a completion date or explicit activity entry to the media note.
  - Year in Media uses dated activity and review info for the selected year.

- **Covers are missing**
  - Confirm the note has a `cover` or `coverUrl` field.
  - For local images, make sure the path is correct and the file exists.

If issues continue, open Obsidian’s developer console for error messages and include those details when reporting a bug.

---

## License

This project is licensed under the [0BSD license](./LICENSE).
