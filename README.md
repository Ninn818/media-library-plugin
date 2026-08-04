Media Library Plugin
A media library plugin for Obsidian to browse, organize, and log activity for books, movies, series, and essays stored in your vault.

Features
Index media notes and surface them in a dedicated library view.
Multiple library views: card, gallery, diary (Letterboxd-style), activity timeline, lists, and tags.
Activity logging (read/watch entries) with date, status, rating, and notes.
Tag management for media notes.
Custom lists (collections) with add/remove and reorder in a modal.
Search, filter, sort (mode + direction), and pagination for diary & activity views.
Lightweight UI with poster rendering, responsive modals, and theme-aware styles.
Installation
Installation options:

Manually copy the plugin folder into your vault at: .obsidian/plugins/media-library-plugin

Or, during development, clone into your Obsidian plugins directory.

After placing the plugin, enable it in Obsidian Settings → Community Plugins.

Development
Prerequisites

Node >= 18
npm
Install dependencies:

bash

npm install
Build (production):

bash

npm run build
Build + watch (development):

bash

npm run dev
Notes:

Bundles are produced in top-level main.js for Obsidian to load.
Source TypeScript is under src/. The repo includes esbuild configuration.
Usage
Open the Media Library view from the command palette or the sidebar (depends on your setup). Main areas:

Toolbar: search, filters, status filter, sort mode & direction, view switcher.
Pages/tabs: Home, Media, Diary, Activity, Lists, Tags, Dashboard.
Diary: displays dated media entries; supports pagination and opens activity modal to add/edit review.
Activity: combined timeline of adds + diary events; supports pagination and opens activity modal.
Modals:
Activity modal — log reading/watching activity, manage tags.
List modal — view or edit custom lists; add/remove items.
Keyboard and click interactions follow Obsidian defaults for opening notes and links.

Settings
Accessible in Settings → Plugin settings. Some notable settings:

Default page tab (home, media, diary, activity, etc.)
Default sort mode and direction
Dashboard preferences (consumption, scope, filter)
Home hero appearance (image, title, subtitle, size)
Tag storage format
UI animation toggle and modal sizing preferences
Contributing
Contributions, bug reports, and feature requests are welcome.

Create issues and PRs on the repository.
Follow existing code style and tests (if present).
Before submitting larger changes, open an issue to discuss design.
Developer tips:

Work from src/ TypeScript files.
Use npm run dev to rebuild bundles while developing.
Keep UI changes theme-aware (use CSS variables provided by Obsidian).
File structure (important files)
main.js — plugin bundle loaded by Obsidian
src/ — TypeScript source
ui/ — modals and UI bits (MediaActivityModal.ts, MediaListModal.ts)
views/ — main views (LibraryView.ts, CardView.ts, GalleryView.ts)
services/ — activity log, tag service, lists
models/ — types and enums
styles.css — plugin styles
manifest.json — Obsidian plugin manifest
README.md — this file
Styling and customization
Edit styles.css to tweak layout, modal width, spacing, and color tokens.
The plugin uses Obsidian CSS variables (e.g., --background-primary, --text-muted) to remain theme-compatible.
Example: to make modals wider on desktop, add a media query:

css

@media (min-width: 900px) {
  .media-activity-modal-shell .modal { max-width: 900px; }
  .media-list-modal .modal { max-width: 820px; }
}
Troubleshooting
If the plugin does not appear, confirm the folder name and ensure manifest.json exists and main.js is present.
Check Obsidian console (Developer Tools) for errors when opening views.
If posters or covers do not display, confirm the note frontmatter contains recognizable cover fields (cover, coverUrl, image, poster, localCover).
License
MIT — see LICENSE file for full text.

