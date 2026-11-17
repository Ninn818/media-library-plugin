# Media Library Plugin

Media Library turns media notes in your Obsidian vault into a personal catalog. Browse books, movies, series, and essays; track what you finish; and keep your ratings, reviews, lists, and tags alongside your notes.

## Features

- **Library views:** browse your catalog as cards, a gallery, or a table. Search, filter, sort, and adjust card size.
- **Personal pages:** Home, Dashboard, Media, Diary, Activity, Lists, Tags, and Year in Media.
- **Activity tracking:** log and edit reading and watching dates, statuses, ratings, and notes.
- **Reviews and ratings:** create a review note from an activity entry or its edit form. Review notes are saved as Markdown files in `Personal/Review` and linked to the media note; the folder is created when needed. Ratings are stored out of 10; choose a 5- or 10-star display.
- **Dashboard:** review yearly goals, completed and backlog items, quick picks, summaries, and rating charts.
- **Year in Media:** explore a yearly recap across all four media types, including ratings, written reviews, and titles started but not finished. Save the recap as a Markdown note or share image.
- **Lists and tags:** create custom collections, manage favorites, and add tags to media notes.

## Install

### With BRAT

1. Install and enable **BRAT** from Obsidian's Community Plugins.
2. In BRAT settings, add `Ninn818/media-library-plugin` as a beta plugin.
3. Install a published release, then enable **Media Library Plugin** in Community Plugins.

BRAT installs published GitHub releases. A Git tag by itself is not a release.

### Manually

1. Download `main.js`, `manifest.json`, and `styles.css` from a published GitHub release.
2. Put the files in your vault's `.obsidian/plugins/media-library-plugin/` folder.
3. In Obsidian, enable **Media Library Plugin** under **Settings → Community Plugins**.

## Get started

The plugin scans Markdown notes throughout your vault. A note is included when its frontmatter identifies a supported media type with `type`, `mediaType`, or `media`.

For example:

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

Supported type values are `book`, `movie` (also `film`), `series` (also `tv`), and `essay`. A title is optional; when omitted, the note's filename is used. Common metadata fields include `author`, `director`, `genres`, `status`, `rating` or `personalRating`, `review`, `cover`, and `coverUrl`. The accepted fields vary by media type.

Open the library from the **Media library** ribbon icon or run **Open media library** from the command palette. If you have changed note metadata and want to rescan, run **Refresh media library**.

## Main pages

- **Home:** see currently reading/watching items and what's up next.
- **Dashboard:** review your yearly or all-time activity, goals, ratings, and quick picks.
- **Media:** browse and organize your full catalog.
- **Diary:** view completed reads and watches by date.
- **Activity:** see a combined timeline of library and activity events, edit entries, and create linked review notes.
- **Lists:** manage custom collections.
- **Tags:** browse and manage tags on media notes.
- **Year in Media:** choose a year to review your reading and watching recap, including ratings, written reviews, and titles started but not finished. Use **Save** to export it as a Markdown note, share image, or both.

## Settings

Open **Settings → Media Library Plugin** to configure:

- Where the library opens and which page opens first.
- Default sorting, tag format, and card counts.
- Whether the spotlight includes a review editor and whether animations are enabled.
- Rating display scale (5 or 10 stars).
- Dashboard defaults, visible dashboard sections, and yearly goals for each media type.

## Troubleshooting

- **The library is empty:** confirm that media notes have valid frontmatter and a supported value in `type`, `mediaType`, or `media`. Then run **Refresh media library**.
- **The plugin does not appear:** confirm the plugin is enabled and that its folder contains `manifest.json`, `main.js`, and `styles.css`.
- **A recap is missing a completion or review:** add a completion date or activity entry to the media note. Year in Media uses dated activity and review information for the selected year.
- **Covers are missing:** check that the note has a valid cover field or a local cover image path.

If the problem persists, check Obsidian's developer console for errors and include relevant details when reporting an issue.

## License

This project is licensed under the [0BSD license](./LICENSE).
