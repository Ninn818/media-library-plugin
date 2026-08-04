

```dataviewjs
// ==============================

// MEDIA DASHBOARD - DEBUGGED + NOTED

// Paste this inside an Obsidian `dataviewjs` block.

// ==============================

  

// ---------- STYLE TOKENS ----------

const THEME = {

bgMainTop: "rgba(255, 255, 255, 0.18)",

bgMainBottom: "rgba(255, 255, 255, 0.20)",

  

cardBg: "rgba(255, 255, 255, 0.16)",

cardBorder: "rgba(255, 255, 255, 0.18)",

  

accent: "rgba(100, 200, 255, 0.4)",

accentSoft: "rgba(100, 200, 255, 0.3)",

accentLight: "rgba(255, 255, 255, 0.20)",

accentWarm: "rgba(100, 200, 255, 0.25)",

  

textPrimary: "var(--text-normal)",

textSecondary: "var(--text-muted)",

  

headerGradA: "rgba(255, 255, 255, 0.18)",

headerGradB: "rgba(255, 255, 255, 0.20)",

headerGradC: "rgba(255, 255, 255, 0.16)",

  

barTrackTop: "rgba(255, 255, 255, 0.14)",

barTrackBottom: "rgba(255, 255, 255, 0.06)",

  

pieColors: ["rgba(100, 200, 255, 0.4)", "rgba(100, 200, 255, 0.3)", "rgba(100, 200, 255, 0.25)", "rgba(120, 180, 255, 0.25)", "rgba(100, 200, 255, 0.1)"],

  

noiseTexture: '',

};

  

// ---------- CONFIG ----------

const BOOKS_FOLDER = '"Source Material/Books"';

const MOVIES_FOLDER = '"Source Material/Movies-Series"';

const ESSAYS_FOLDER = '"Source Material/Essays"';

const TAGS_FOLDER = '"Tags"';

  

const NOW = new Date();

const THIS_YEAR = NOW.getFullYear();

const GOAL_KEY = "mediaDashboardGoals";

  

// ---------- HELPERS ----------

const first = (value) => (Array.isArray(value) ? value[0] : value || "");

const safeNum = (value) => (value ? Number(value) : 0);

const dateOf = (value) => (value ? new Date(value) : null);

  

function isCompletedFromStatus(status) {
  const s = (status || "").toString().trim().toLowerCase();
  if (!s) return false;

  if (/\b(unread|unwatched|want|started|currently|in-progress|in progress|paused|dropped)\b/.test(s)) {
    return false;
  }

  return /\b(read|watched|finished|complete|completed|done)\b/.test(s);
}

function normGenres(page) {

if (Array.isArray(page.genres)) return page.genres;

if (Array.isArray(page.category)) return page.category;

if (typeof page.category === "string") return [page.category];

return [];

}

  



function countBy(items, getKey) {

const counts = new Map();

  

for (const item of items) {

const key = getKey(item);

if (!key) continue;

counts.set(key, (counts.get(key) || 0) + 1);

}

  

return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

}

  

function hexToRgba(hex, alpha) {

const cleaned = hex.replace("#", "");

const full = cleaned.length === 3

? cleaned.split("").map((c) => c + c).join("")

: cleaned;

  

const int = parseInt(full, 16);

const r = (int >> 16) & 255;

const g = (int >> 8) & 255;

const b = int & 255;

  

return `rgba(${r}, ${g}, ${b}, ${alpha})`;

}



function booksByPages(data) {

const buckets = { "<200": 0, "200-400": 0, "400-600": 0, "600+": 0 };

  

data

.filter((item) => item.mediaType === "Book" && item.pages)

.forEach((book) => {

if (book.pages < 200) buckets["<200"] += 1;

else if (book.pages < 400) buckets["200-400"] += 1;

else if (book.pages < 600) buckets["400-600"] += 1;

else buckets["600+"] += 1;

});

  

return Object.entries(buckets);

}

  

function loadGoals() {

const saved = localStorage.getItem(GOAL_KEY);

if (saved) return JSON.parse(saved);

return { Book: 20, Movie: 30, Series: 10, Essay: 15 };

}

  

function saveGoals(goals) {

localStorage.setItem(GOAL_KEY, JSON.stringify(goals));

}

  

function daysLeftInYear() {

const now = new Date();

const nextYear = new Date(now.getFullYear() + 1, 0, 1);

const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

return Math.max(

0,

Math.floor((nextYear - tomorrow) / (1000 * 60 * 60 * 24))

);

}

  

function estimateTime(item) {

if (item.mediaType === "Book") return (item.pages || 300) / 40;

if (item.mediaType === "Movie") return 2;

if (item.mediaType === "Series") return 8;

if (item.mediaType === "Essay") return 0.5;

return 1;

}

  

// ---------- LOAD ----------

const books = dv.pages(BOOKS_FOLDER).array().map((page) => {
  const status = page.status || page.read;

  return {
    mediaType: "Book",
    file: page.file,
    title: page.title || page.file.name,
    creator: first(page.authors),
    genres: normGenres(page),
    date: dateOf(page.dateRead || page.dateFinished || page.finishDate),
    pages: safeNum(page.pages),
    status,
    rating: Number(page.personalRating) || 0,
    done:
      !!page.dateRead ||
      !!page.dateFinished ||
      !!page.finishDate ||
      isCompletedFromStatus(status),
  };
});
  

const movies = dv.pages(MOVIES_FOLDER).array().map((page) => {
  const status = page.status || page.watched;

  return {
    mediaType: page.type === "series" ? "Series" : "Movie",
    file: page.file,
    title: page.title || page.file.name,
    creator: first(page.director),
    genres: normGenres(page),
    date: dateOf(
      page.lastWatched ||
      page.dateFinished ||
      page.finishDate
    ),
    status,
    rating: Number(page.personalRating) || 0,
    done:
      !!page.lastWatched ||
      !!page.dateFinished ||
      !!page.finishDate ||
      isCompletedFromStatus(status),
  };
});
  

const essays = dv.pages(ESSAYS_FOLDER).array().map((page) => {
  const status = page.status || page.read;

  return {
    mediaType: "Essay",
    file: page.file,
    title: page.title || page.file.name,
    creator: first(page.authors),
    genres: normGenres(page),
    date: dateOf(page.dateRead || page.dateFinished || page.finishDate),
    status,
    rating: Number(page.personalRating) || 0,
    done:
      !!page.dateRead ||
      !!page.dateFinished ||
      !!page.finishDate ||
      isCompletedFromStatus(status),
  };
});

const allItems = [...books, ...movies, ...essays];

const items = allItems.filter((item) => item.done);

  

// ---------- ROOT ----------

const root = this.container;

root.empty();

root.classList.add('md-container');


// Apply Obsidian's `cards` CSS class to the surrounding rendered note so

// card-based snippets can style this dashboard in wide view automatically.

const previewRoot =

root.closest(".markdown-preview-view") ||

root.closest(".view-content") ||

root.parentElement;

  

if (previewRoot) {

previewRoot.classList.add("cards");

}

  

// NOTE: Dataview blocks can re-run often. Clearing the old interval avoids

// stacking multiple sparkle timers after refreshes.

if (window.__mediaDashboardSparkleInterval) {

clearInterval(window.__mediaDashboardSparkleInterval);

}

  

root.style.setProperty("--interactive-accent", "rgba(100, 200, 255, 0.4)");

root.style.setProperty("--bg-main-top", "rgba(255, 255, 255, 0.18)");

root.style.setProperty("--bg-main-bottom", "rgba(255, 255, 255, 0.20)");

root.style.setProperty("--card-bg", "rgba(255, 255, 255, 0.16)");

root.style.setProperty("--card-border", "rgba(255, 255, 255, 0.18)");

root.style.setProperty("--accent", "rgba(100, 200, 255, 0.4)");

root.style.setProperty("--accent-soft", "rgba(100, 200, 255, 0.3)");

root.style.setProperty("--accent-light", "rgba(255, 255, 255, 0.20)");

root.style.setProperty("--accent-warm", "rgba(100, 200, 255, 0.25)");

root.style.setProperty("--text-primary", "var(--text-normal)");

root.style.setProperty("--text-secondary", "var(--text-muted)");

root.style.setProperty("--bar-track-top", "rgba(255, 255, 255, 0.14)");

root.style.setProperty("--bar-track-bottom", "rgba(255, 255, 255, 0.06)");

  

root.style.position = "relative";

root.style.overflow = "hidden";

root.style.padding = "20px";

root.style.fontFamily = "var(--font-family)";

root.style.background = "var(--background-primary)";

root.style.color = "var(--text-normal)";

  

// NOTE: The original snippet had two loose template-string lines here, which

// caused a syntax error and stopped the entire dashboard from rendering.

  

const blushField = root.createEl("div");

blushField.style.display = "none";

  

[

{ top: "6%", left: "5%", width: "200px", height: "200px", color: "rgba(0,0,0,0)", duration: "8.5s" },

{ top: "18%", right: "9%", width: "180px", height: "180px", color: "rgba(0,0,0,0)", duration: "10.5s" },

{ bottom: "8%", left: "32%", width: "220px", height: "220px", color: "rgba(0,0,0,0)", duration: "12s" },

].forEach((blob) => {

const glow = blushField.createEl("div");

glow.style.display = "none";

});

  

const sparkleField = root.createEl("div");

sparkleField.style.display = "none";

  

function spawnSparkle() {

// Sparkle effects disabled

}

  

window.__mediaDashboardSparkleInterval = null;

  

// ---------- STATE ----------

let scope = "year";

let filter = "all";

  

function getActive() {

return items.filter((item) => {

if (scope === "year") {

if (!item.date) return false;

if (item.date.getFullYear() !== THIS_YEAR) return false;

}

  

if (filter === "text" && !["Book", "Essay"].includes(item.mediaType)) return false;

if (filter === "screen" && !["Movie", "Series"].includes(item.mediaType)) return false;

  

return true;

});

}

  

// ---------- CHART HELPERS ----------

function drawBar(container, data) {

container.style.width = "100%";

const max = data[0]?.[1] || 1;

  

data.forEach(([label, value], index) => {

const row = container.createEl("div");

row.style.display = "grid";

row.style.gridTemplateColumns = "96px minmax(0, 1fr) 22px";

row.style.alignItems = "center";

row.style.gap = "8px";

row.style.marginBottom = "8px";

  

const labelEl = row.createEl("div", { text: label });

labelEl.style.fontSize = "10px";

labelEl.style.color = "var(--text-muted)";

labelEl.style.lineHeight = "1.35";

  

const track = row.createEl("div");

track.classList.add('md-bar-track');

track.style.height = "20px";

track.style.width = "100%";

track.style.background = "linear-gradient(90deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.16))";

track.style.borderRadius = "8px";

track.style.overflow = "hidden";

track.style.boxShadow = "inset 0 1px 3px rgba(0, 0, 0, 0.1)";

track.style.border = "1px solid rgba(255, 255, 255, 0.20)";

  

const bar = track.createEl("div");

bar.classList.add('md-bar-fill');

bar.style.width = "0%";

bar.style.background = "linear-gradient(90deg, rgba(100, 200, 255, 0.4), rgba(100, 200, 255, 0.25))";

bar.style.borderRadius = "8px";

bar.style.boxShadow = "0 2px 8px rgba(100, 200, 255, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.2)";

bar.style.transition = "width 0.3s ease";

  

const valueEl = row.createEl("div", { text: String(value) });

valueEl.style.fontSize = "10px";

valueEl.style.textAlign = "right";

valueEl.style.color = "var(--text-normal)";

  

setTimeout(() => {

bar.style.width = `${(value / max) * 100}%`;

}, index * 60);

});

  

const footer = container.createEl("div", { text: "No. of items" });

footer.style.textAlign = "center";

footer.style.marginTop = "4px";

footer.style.fontSize = "10px";

footer.style.color = "var(--text-muted)";

}

  

function drawPie(container, data) {

const total = data.reduce((sum, [, value]) => sum + value, 0);

if (!total) {

container.createEl("div", { text: "No data to show yet." });

return;

}

  

// NOTE: The original `drawPie()` block was truncated midway through a

// `reduce()` call. Rebuilding it cleanly is what makes the pie chart work.

const colors = THEME.pieColors;

let angle = 0;

  

const parts = data.map(([key, value], index) => {

const start = angle;

const degrees = (value / total) * 360;

angle += degrees;

  

return {

key,

value,

start,

end: angle,

color: colors[index % colors.length],

};

});

  

const wrap = container.createEl("div");

wrap.style.display = "flex";

wrap.style.flexDirection = "column";

wrap.style.alignItems = "center";

wrap.style.gap = "10px";

  

const pie = wrap.createEl("div");

pie.style.width = "148px";

pie.style.height = "148px";

pie.style.borderRadius = "50%";

pie.style.background = "linear-gradient(135deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.20))";

pie.style.backdropFilter = "blur(10px)";

pie.style.webkitBackdropFilter = "blur(10px)";

pie.style.border = "1px solid rgba(255, 255, 255, 0.20)";

pie.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.20)";

pie.style.transition = "all 0.3s ease"

  

function renderPie(highlightKey) {

pie.style.background = `conic-gradient(${parts

.map((part) => {

const color =

!highlightKey || highlightKey === part.key

? part.color

: hexToRgba(part.color, 0.3);

  

return `${color} ${part.start}deg ${part.end}deg`;

})

.join(", ")})`;

}

  

renderPie();

  

const tooltip = wrap.createEl("div");

tooltip.style.fontSize = "12px";

tooltip.style.display = "none";

tooltip.style.padding = "4px 8px";

tooltip.style.borderRadius = "4px";

tooltip.style.background = "var(--background-secondary)";

tooltip.style.color = "var(--text-normal)";

tooltip.style.border = "1px solid rgba(255, 255, 255, 0.18)";

  

pie.onmousemove = (event) => {

const rect = pie.getBoundingClientRect();

const x = event.clientX - rect.left - rect.width / 2;

const y = event.clientY - rect.top - rect.height / 2;

const angleDeg = (Math.atan2(y, x) * 180) / Math.PI;

const normalized = (angleDeg + 360 + 90) % 360;

  

const hovered = parts.find(

(part) => normalized >= part.start && normalized < part.end

);

  

if (!hovered) return;

  

renderPie(hovered.key);

tooltip.textContent = `${hovered.key} (${hovered.value})`;

tooltip.style.display = "block";

};

  

pie.onmouseleave = () => {

renderPie();

tooltip.style.display = "none";

};

  

const legend = wrap.createEl("div");

legend.style.display = "flex";

legend.style.flexDirection = "column";

legend.style.gap = "4px";

  

parts.forEach((part) => {

const row = legend.createEl("div");

row.style.display = "flex";

row.style.gap = "6px";

row.style.alignItems = "center";

  

const dot = row.createEl("div");

dot.style.width = "10px";

dot.style.height = "10px";

dot.style.borderRadius = "50%";

dot.style.background = part.color;

  

const text = row.createEl("div", {

text: `${part.key} (${part.value})`,

});

text.style.color = "var(--text-normal)";

  

row.onmouseenter = () => {

row.style.background = "linear-gradient(135deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.08))";

row.style.boxShadow = "inset 0 1px 2px rgba(255, 255, 255, 0.16)";

renderPie(part.key);

};

  

row.onmouseleave = () => {

row.style.background = "transparent";

row.style.boxShadow = "none";

renderPie();

};

});

}

  

function chartIcon(kind) {

if (kind === "bar") {

return `

<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">

<rect x="2" y="8" width="2.5" height="6" rx="1" fill="currentColor"></rect>

<rect x="6.75" y="5" width="2.5" height="9" rx="1" fill="currentColor"></rect>

<rect x="11.5" y="2" width="2.5" height="12" rx="1" fill="currentColor"></rect>

</svg>

`;

}

  

if (kind === "pie") {

return `

<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">

<path d="M8 1a7 7 0 1 0 7 7H8z" fill="currentColor"></path>

<path d="M9 1.07A7 7 0 0 1 14.93 7H9z" fill="#fff0f5"></path>

</svg>

`;

}

  

if (kind === "spotlight") {

return `

<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">

<rect x="2.5" y="2.5" width="11" height="11" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"></rect>

<circle cx="8" cy="8" r="2.4" fill="currentColor"></circle>

</svg>

`;

}

  

return `

<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">

<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.6"></circle>

<rect x="7.25" y="6.5" width="1.5" height="4.5" rx=".75" fill="currentColor"></rect>

<circle cx="8" cy="4.3" r="1" fill="currentColor"></circle>

</svg>

`;

}

  

function chart(container, title, data, description) {

if (!data.length) return;

  

const panel = container.createEl("div");

panel.classList.add('md-chart-container');

panel.style.padding = "16px";

panel.style.borderRadius = "12px";

panel.style.background = "linear-gradient(135deg, rgba(255, 255, 255, 0.20), rgba(255, 255, 255, 0.06))";

panel.style.backdropFilter = "blur(8px)";

panel.style.webkitBackdropFilter = "blur(8px)";

panel.style.border = "1px solid rgba(255, 255, 255, 0.16)";

panel.style.marginBottom = "12px";

  

const head = panel.createEl("div");

head.style.display = "flex";

head.style.justifyContent = "space-between";

head.style.alignItems = "flex-start";

head.style.gap = "10px";

head.style.marginBottom = "8px";

  

const titleWrap = head.createEl("div");

titleWrap.style.display = "flex";

titleWrap.style.flexDirection = "column";

  

const titleEl = titleWrap.createEl("div", { text: title });

titleEl.style.fontWeight = "600";

titleEl.style.fontSize = "13.5px";

titleEl.style.color = "var(--text-normal)";

  

const controls = head.createEl("div");

controls.style.display = "flex";

controls.style.gap = "4px";

  

function pill(iconKind, label) {

const button = controls.createEl("button");

button.style.border = "1px solid rgba(255, 255, 255, 0.20)";

button.style.borderRadius = "8px";

button.style.width = "28px";

button.style.height = "28px";

button.style.padding = "0";

button.style.display = "grid";

button.style.placeItems = "center";

button.style.background = "linear-gradient(135deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.08))";

button.style.backdropFilter = "blur(10px)";

button.style.webkitBackdropFilter = "blur(10px)";

button.style.cursor = "pointer";

button.style.color = "var(--text-normal)";

button.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.06), inset 0 1px 1px rgba(255, 255, 255, 0.20)";

button.style.transition = "all 0.12s ease";

button.setAttribute("aria-label", label);

button.innerHTML = chartIcon(iconKind);

  

button.onmouseenter = () => {

button.style.background = "linear-gradient(135deg, rgba(255, 255, 255, 0.20), rgba(255, 255, 255, 0.14))";

button.style.boxShadow = "0 6px 16px rgba(0, 0, 0, 0.10), inset 0 1px 2px rgba(255, 255, 255, 0.22)";

};

  

button.onmouseleave = () => {

button.style.background = "linear-gradient(135deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.08))";

button.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.06), inset 0 1px 1px rgba(255, 255, 255, 0.20)";

};

  

return button;

}

  

const btnBar = pill("bar", "Bar chart");

const btnPie = pill("pie", "Pie chart");

const btnSpotlight = pill("spotlight", "Spotlight view");

const infoBtn = pill("info", "About chart");

  

let currentType = data.length === 1 ? "spotlight" : "bar";

let info = null;

  

function updateActive() {

[btnBar, btnPie, btnSpotlight].forEach((button) => {

button.style.background = "linear-gradient(135deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.08))";

button.style.opacity = "1";

});

  

if (currentType === "bar") {

btnBar.style.background = "linear-gradient(135deg, rgba(255, 255, 255, 0.20), rgba(255, 255, 255, 0.14))";

btnBar.style.opacity = "1";

} else if (currentType === "pie") {

btnPie.style.background = "linear-gradient(135deg, rgba(255, 255, 255, 0.20), rgba(255, 255, 255, 0.14))";

btnPie.style.opacity = "1";

} else {

btnSpotlight.style.background = "linear-gradient(135deg, rgba(255, 255, 255, 0.20), rgba(255, 255, 255, 0.14))";

btnSpotlight.style.opacity = "1";

}

}

  

infoBtn.onclick = () => {

if (info) {

info.remove();

info = null;

return;

}

  

info = panel.createEl("div", { text: description || "" });

info.style.marginTop = "6px";

info.style.fontSize = "12px";

info.style.opacity = "0.75";

};

  

const area = panel.createEl("div");

area.style.display = "flex";

area.style.flexDirection = "column";

area.style.justifyContent = "flex-start";

area.style.minHeight = "148px";

area.style.paddingTop = "6px";

  

function drawSpotlight(containerEl, values) {

const [[label, value]] = values;

const total = values.reduce((sum, [, amount]) => sum + amount, 0);

  

const wrap = containerEl.createEl("div");

wrap.style.height = "100%";

wrap.style.display = "grid";

wrap.style.placeItems = "center";

wrap.style.textAlign = "center";

  

const card = wrap.createEl("div");

card.style.display = "flex";

card.style.flexDirection = "column";

card.style.alignItems = "center";

card.style.gap = "10px";

card.style.padding = "12px";

  

const halo = card.createEl("div");

halo.style.width = "100px";

halo.style.height = "100px";

halo.style.borderRadius = "50%";

halo.style.display = "grid";

halo.style.placeItems = "center";

halo.style.background = "linear-gradient(135deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.20))";

halo.style.backdropFilter = "blur(10px)";

halo.style.webkitBackdropFilter = "blur(10px)";

halo.style.border = "1px solid rgba(255, 255, 255, 0.20)";

halo.style.boxShadow = "0 8px 18px rgba(0, 0, 0, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.20)";

  

const number = halo.createEl("div", { text: String(value) });

number.style.fontSize = "24px";

number.style.fontWeight = "700";

number.style.color = "var(--text-normal)";

  

const labelEl = card.createEl("div", { text: label });

labelEl.style.fontSize = "13px";

labelEl.style.fontWeight = "600";

labelEl.style.color = "var(--text-muted)";

  

if (values.length > 1) {

const share = card.createEl("div", {

text: `${Math.round((value / total) * 100)}% of shown items`,

});

share.style.fontSize = "11px";

share.style.opacity = "0.65";

}

}

  

function draw() {

area.empty();

if (currentType === "bar") drawBar(area, data);

else if (currentType === "pie") drawPie(area, data);

else drawSpotlight(area, data);

}

  

btnBar.onclick = () => {

currentType = "bar";

updateActive();

draw();

};

  

btnPie.onclick = () => {

currentType = "pie";

updateActive();

draw();

};

  

btnSpotlight.onclick = () => {

currentType = "spotlight";

updateActive();

draw();

};

  

updateActive();

draw();

}

  

// ---------- SIDEBAR + RIGHT RAIL ----------

function smartPick(active) {

const topGenre = countBy(active.flatMap((item) => item.genres), (genre) => genre)[0]?.[0];

const pool = allItems.filter((item) => !item.done);

if (!pool.length) return null;

const match = pool.find((item) => item.genres?.includes(topGenre));

return match || pool[Math.floor(Math.random() * pool.length)];

}

  

function openItem(item) {

if (!item) return;

app.workspace.openLinkText(item.file.path, "", false);

}

  

function pickByType(types) {

const pool = allItems.filter((item) => !item.done && types.includes(item.mediaType));

if (!pool.length) {

new Notice("Nothing left!");

return;

}

  

openItem(pool[Math.floor(Math.random() * pool.length)]);

}

  

function createRailCard(container, title) {

const box = container.createEl("div");

box.classList.add('md-sidebar-card');

box.style.padding = "16px";

box.style.background = "linear-gradient(135deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.08))";

box.style.backdropFilter = "blur(10px)";

box.style.webkitBackdropFilter = "blur(10px)";

box.style.border = "1px solid rgba(255, 255, 255, 0.18)";

box.style.marginBottom = "16px";

box.style.borderRadius = "12px";

box.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.20)";

  

const heading = box.createEl("div", { text: title });

heading.style.fontWeight = "600";

heading.style.fontSize = "13px";

heading.style.color = "var(--text-normal)";

heading.style.marginBottom = "10px";

  

return box;

}

  

function renderSidebar(sidebar) {

sidebar.empty();

sidebar.style.position = "relative";

sidebar.style.zIndex = "1";

  

const card = createRailCard(sidebar, "Filters");

card.style.position = "sticky";

card.style.top = "12px";

  

function section(title) {

const sectionEl = card.createEl("div");

sectionEl.style.marginBottom = "12px";

  

const heading = sectionEl.createEl("div", { text: title });

heading.style.opacity = "0.7";

heading.style.fontSize = "10px";

heading.style.letterSpacing = "0.08em";

heading.style.textTransform = "uppercase";

heading.style.marginBottom = "8px";

return sectionEl;

}

  

function btn(parent, label, isActive, onClick) {

const button = parent.createEl("button", { text: label });

button.classList.add('md-button');

button.style.borderRadius = "8px";

button.style.padding = "8px 12px";

button.style.marginTop = "6px";

button.style.cursor = "pointer";

button.style.fontSize = "12px";

button.style.textAlign = "left";

button.style.background = isActive ? "linear-gradient(135deg, rgba(255, 255, 255, 0.20), rgba(255, 255, 255, 0.14))" : "linear-gradient(135deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.08))";

button.style.border = "1px solid rgba(255, 255, 255, 0.18)";

button.style.color = "var(--text-normal)";

button.style.backdropFilter = "blur(10px)";

button.style.webkitBackdropFilter = "blur(10px)";

button.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.06), inset 0 1px 1px rgba(255, 255, 255, 0.20)";

  

button.onmouseenter = () => {

button.style.background = "linear-gradient(135deg, rgba(255, 255, 255, 0.20), rgba(255, 255, 255, 0.14))";

button.style.boxShadow = "0 6px 16px rgba(0, 0, 0, 0.10), inset 0 1px 2px rgba(255, 255, 255, 0.22)";

};

  

button.onmouseleave = () => {

button.style.background = isActive ? "linear-gradient(135deg, rgba(255, 255, 255, 0.20), rgba(255, 255, 255, 0.14))" : "linear-gradient(135deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.08))";

button.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.06), inset 0 1px 1px rgba(255, 255, 255, 0.20)";

};

  

button.onclick = onClick;

};


  

const scopeSection = section("Scope");

btn(scopeSection, "This Year", scope === "year", () => {

scope = "year";

render();

});

btn(scopeSection, "All Time", scope === "all", () => {

scope = "all";

render();

});

  

const mediaSection = section("Media");

btn(mediaSection, "All Media", filter === "all", () => {

filter = "all";

render();

});

btn(mediaSection, "Books + Essays", filter === "text", () => {

filter = "text";

render();

});

btn(mediaSection, "Movies + Series", filter === "screen", () => {

filter = "screen";

render();

});

  

const pickSection = section("Quick Picks");

btn(pickSection, "Pick a Book", false, () => pickByType(["Book"]));

btn(pickSection, "Pick a Movie", false, () => pickByType(["Movie"]));

btn(pickSection, "Pick a Series", false, () => pickByType(["Series"]));

btn(pickSection, "Pick an Essay", false, () => pickByType(["Essay"]));

  

renderTagsPanel(sidebar);

}

  

function renderSummaryPanel(container, active) {

const box = createRailCard(container, "Summary");

box.style.minHeight = "230px";

  

const bookCount = active.filter((item) => item.mediaType === "Book").length;

const movieCount = active.filter((item) => item.mediaType === "Movie").length;

const essayCount = active.filter((item) => item.mediaType === "Essay").length;

const seriesCount = active.filter((item) => item.mediaType === "Series").length;

  

const topGenre = countBy(active.flatMap((item) => item.genres), (genre) => genre)[0]?.[0];

const topBookGenre = countBy(

active.filter((item) => item.mediaType === "Book").flatMap((item) => item.genres),

(genre) => genre

)[0]?.[0];

const topScreenGenre = countBy(

active

.filter((item) => ["Movie", "Series"].includes(item.mediaType))

.flatMap((item) => item.genres),

(genre) => genre

)[0]?.[0];

const topAuthor = countBy(

active.filter((item) => item.mediaType === "Book").map((item) => item.creator),

(creator) => creator

)[0]?.[0];

const topEssayist = countBy(

active.filter((item) => item.mediaType === "Essay").map((item) => item.creator),

(creator) => creator

)[0]?.[0];

const topDirector = countBy(

active

.filter((item) => ["Movie", "Series"].includes(item.mediaType))

.map((item) => item.creator),

(creator) => creator

)[0]?.[0];

const tagNotes = dv.pages(TAGS_FOLDER).array();

const linkCounts = new Map();

  

for (const page of dv.pages().array()) {

const outlinks = page.file.outlinks || [];

for (const link of outlinks) {

if (!link.path) continue;

linkCounts.set(link.path, (linkCounts.get(link.path) || 0) + 1);

}

}

  

const topTags = tagNotes

.map((page) => ({

name: page.file.name,

count: linkCounts.get(page.file.path) || 0,

}))

.sort((a, b) => b.count - a.count)

.slice(0, 2)

.map((tag) => tag.name);

  

const goals = loadGoals();

const plannedBooks = goals.Book || 0;

let goalSentence = `You plan to read <b>${plannedBooks}</b> books and have read <b>${bookCount}</b>`;

if (plannedBooks > 0 && bookCount >= plannedBooks) {

goalSentence += ", and you've done that";

}

goalSentence += ".";

  

const summary = box.createEl("div");

summary.style.fontSize = "13px";

summary.style.lineHeight = "1.75";

summary.innerHTML = `You've finished <b>${bookCount}</b> books, <b>${movieCount}</b> movies, <b>${essayCount}</b> essays, and <b>${seriesCount}</b> series ${

scope === "year" ? "this year" : "all time"

}. Your most read book genre is <b>${topBookGenre || topGenre || "varied"}</b>, and your most watched screen genre is <b>${topScreenGenre || topGenre || "varied"}</b>. You return to <b>${topDirector || "favorite directors"}</b> and <b>${topAuthor || "favorite authors"}</b>, and you read a lot about <b>${topTags[0] || "different ideas"}</b> and <b>${topTags[1] || "whatever is catching your attention"}</b>. <b>${topEssayist || "Certain essay voices"}</b> shows up often too, which gives the whole mix a clear through-line. ${goalSentence}`;

}

  

function renderGoalSetter(container) {

const box = createRailCard(container, "Goals");

const goals = loadGoals();

  

["Book", "Movie", "Series", "Essay"].forEach((type) => {

const row = box.createEl("div");

row.style.display = "flex";

row.style.justifyContent = "space-between";

row.style.alignItems = "center";

row.style.marginBottom = "6px";

  

const label = row.createEl("div", { text: type });

label.style.fontSize = "12px";

  

const input = row.createEl("input");

input.type = "number";

input.min = "0";

input.value = String(goals[type]);

input.style.width = "58px";

input.style.borderRadius = "6px";

input.style.border = "1px solid rgba(255, 255, 255, 0.20)";

input.style.padding = "4px 8px";

input.style.fontSize = "11px";

input.style.background = "rgba(255, 255, 255, 0.20)";

input.style.color = "var(--text-normal)";

input.style.backdropFilter = "blur(8px)";

input.style.webkitBackdropFilter = "blur(8px)";

  

input.onchange = () => {

goals[type] = Number(input.value);

saveGoals(goals);

render();

};

});

}

  

function renderGoalProgress(container, active) {

const box = createRailCard(container, "Year Progress");

const goals = loadGoals();

  

["Book", "Movie", "Series", "Essay"].forEach((type) => {

const goal = goals[type];

const current = active.filter((item) => item.mediaType === type).length;

const remaining = Math.max(goal - current, 0);

  

const row = box.createEl("div");

row.style.marginBottom = "10px";

  

const label = row.createEl("div", { text: `${type} - ${current}/${goal}` });

label.style.fontSize = "12px";

  

const track = row.createEl("div");

track.style.height = "10px";

track.style.background = "#f0f0f0";

track.style.borderRadius = "4px";

track.style.marginTop = "6px";

  

const bar = track.createEl("div");

bar.style.height = "100%";

bar.style.width = "0%";

bar.style.borderRadius = "4px";

bar.style.background = "#333333";

bar.style.transition = "width 0.6s ease";

  

setTimeout(() => {

bar.style.width = `${(goal ? Math.min(current / goal, 1) : 0) * 100}%`;

}, 40);

  

const note = row.createEl("div", { text: `${remaining} remaining` });

note.style.fontSize = "11px";

note.style.color = "var(--text-muted)";

note.style.marginTop = "4px";

});

}

  

function renderTagsPanel(container) {

const box = createRailCard(container, "Tags");

  

const tagNotes = dv.pages(TAGS_FOLDER).array();

const linkCounts = new Map();

  

for (const page of dv.pages().array()) {

const outlinks = page.file.outlinks || [];

for (const link of outlinks) {

if (!link.path) continue;

linkCounts.set(link.path, (linkCounts.get(link.path) || 0) + 1);

}

}

  

const stats = tagNotes

.map((page) => ({

name: page.file.name,

path: page.file.path,

count: linkCounts.get(page.file.path) || 0,

}))

.sort((a, b) => b.count - a.count)

.slice(0, 12);

  

const total = box.createEl("div", { text: `Total tags: ${tagNotes.length}` });

total.style.fontSize = "11px";

total.style.color = "var(--text-muted)";

total.style.marginBottom = "10px";

  

const pillWrap = box.createEl("div");

pillWrap.style.display = "flex";

pillWrap.style.flexWrap = "wrap";

pillWrap.style.gap = "6px";

  

stats.forEach((tag) => {

const pill = pillWrap.createEl("button", {

text: `${tag.name} (${tag.count})`,

});

pill.classList.add('md-pill');

pill.style.background = "linear-gradient(135deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.20))";

pill.style.cursor = "pointer";

pill.style.color = "var(--text-normal)";

pill.style.border = "1px solid rgba(255, 255, 255, 0.20)";

pill.style.borderRadius = "20px";

pill.style.padding = "6px 12px";

pill.style.fontSize = "0.82rem";

pill.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.06), inset 0 1px 1px rgba(255, 255, 255, 0.20)";

pill.style.transition = "all 0.1s ease";

  

pill.onmouseenter = () => {

pill.style.background = "linear-gradient(135deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0.16))";

pill.style.boxShadow = "0 6px 16px rgba(0, 0, 0, 0.10), inset 0 1px 2px rgba(255, 255, 255, 0.22)";

};

  

pill.onmouseleave = () => {

pill.style.background = "linear-gradient(135deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.20))";

pill.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.06), inset 0 1px 1px rgba(255, 255, 255, 0.20)";

};

  

pill.onclick = () => {

app.workspace.openLinkText(tag.path, "", false);

};

});

}

  

function renderTopCards(container, active) {

container.empty();

  container.classList.add('md-grid');

container.style.gap = "12px";

container.style.alignItems = "stretch";

  

const goals = loadGoals();

const goalsTotal = Object.values(goals).reduce((sum, value) => sum + value, 0);

const recommendation = smartPick(active);

  

const cards = [

{ label: "Days Left", value: `${daysLeftInYear()} days` },

{ label: "Completed", value: String(active.length) },

{ label: "Goals Total", value: String(goalsTotal) },

{

label: "Next Pick",

value: recommendation ? recommendation.title : "Nothing queued",

item: recommendation,

},

];

  

cards.forEach((entry) => {

const card = container.createEl("div");

card.classList.add('md-card');

card.style.borderRadius = "14px";

card.style.border = "1px solid rgba(255, 255, 255, 0.18)";

card.style.background = "linear-gradient(135deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.08))";

card.style.backdropFilter = "blur(10px)";

card.style.webkitBackdropFilter = "blur(10px)";

card.style.padding = "18px";

card.style.display = "flex";

card.style.flexDirection = "column";

card.style.justifyContent = "space-between";

card.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.20), inset 0 -1px 2px rgba(0, 0, 0, 0.04)";

card.style.transition = "all 0.15s ease";

  

if (entry.item) {

card.style.cursor = "pointer";

card.onclick = () => openItem(entry.item);

}

card.onmouseenter = () => {

card.style.background = "linear-gradient(135deg, rgba(255, 255, 255, 0.20), rgba(255, 255, 255, 0.14))";

card.style.boxShadow = "0 12px 32px rgba(0, 0, 0, 0.12), inset 0 1px 2px rgba(255, 255, 255, 0.22), inset 0 -2px 6px rgba(0, 0, 0, 0.06)";

};

card.onmouseleave = () => {

card.style.background = "linear-gradient(135deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.08))";

card.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.20), inset 0 -1px 2px rgba(0, 0, 0, 0.04)";

}

  

const label = card.createEl("div", { text: entry.label });

label.classList.add('md-card-title');

label.style.color = "var(--text-muted)";

label.style.fontSize = "0.80rem";

label.style.margin = "0 0 8px 0";

label.style.fontWeight = "600";

label.style.letterSpacing = "0.3px";

  

const value = card.createEl("div", { text: entry.value });

value.classList.add('md-card-value');

value.style.lineHeight = "1.12";

value.style.color = "var(--text-normal)";

value.style.fontSize = "2rem";

value.style.fontWeight = "700";

value.style.margin = "0";

value.style.whiteSpace = "nowrap";

value.style.overflow = "hidden";

value.style.textOverflow = "ellipsis";

  

if (entry.label === "Next Pick") {

value.style.maxWidth = "220px";

value.style.fontSize = entry.value.length > 18 ? "1.5rem" : "2rem";

}

});

}

  

const dashboardGrid = root.createEl("div");

dashboardGrid.style.position = "relative";

dashboardGrid.style.zIndex = "1";

dashboardGrid.style.display = "grid";

dashboardGrid.style.gridTemplateColumns = "1fr";

dashboardGrid.style.gridTemplateRows = "auto auto";

dashboardGrid.style.rowGap = "12px";

dashboardGrid.style.alignItems = "start";

  

const hero = dashboardGrid.createEl("div");

hero.style.gridRow = "1";

  

const contentWrap = dashboardGrid.createEl("div");

contentWrap.style.display = "grid";

contentWrap.style.gridTemplateColumns = "188px minmax(0, 1fr)";

contentWrap.style.columnGap = "12px";

contentWrap.style.alignItems = "start";

contentWrap.style.gridRow = "2";

  

const sidebar = contentWrap.createEl("div");

sidebar.style.gridColumn = "1";

sidebar.style.alignSelf = "start";

  

const rightStack = contentWrap.createEl("div");

rightStack.style.gridColumn = "2";

rightStack.style.display = "grid";

rightStack.style.gridTemplateRows = "auto auto";

rightStack.style.rowGap = "12px";

rightStack.style.alignItems = "start";

  

const topCards = rightStack.createEl("div");

  

const lowerContent = rightStack.createEl("div");

lowerContent.style.display = "grid";

lowerContent.style.gridTemplateColumns = "minmax(0, 1fr) 228px";

lowerContent.style.columnGap = "12px";

lowerContent.style.alignItems = "start";

  

const main = lowerContent.createEl("div");

main.style.gridColumn = "1";

  

const rightPanel = lowerContent.createEl("div");

rightPanel.style.gridColumn = "2";

main.style.minWidth = "0";

rightPanel.style.minWidth = "0";

  

function render() {

hero.empty();

topCards.empty();

sidebar.empty();

main.empty();

rightPanel.empty();

  

const active = getActive();

rightStack.style.rowGap = "12px";

lowerContent.style.columnGap = "12px";

lowerContent.style.rowGap = "12px";

  

const header = hero.createEl("div");

header.classList.add('md-header');

header.style.padding = "20px 24px";

header.style.marginBottom = "8px";

header.style.borderRadius = "16px";

header.style.border = "1px solid rgba(255, 255, 255, 0.20)";

header.style.background = "linear-gradient(135deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.20))";

header.style.backdropFilter = "blur(12px)";

header.style.webkitBackdropFilter = "blur(12px)";

header.style.boxShadow = "0 8px 32px rgba(0, 0, 0, 0.08), inset 0 1px 2px rgba(255, 255, 255, 0.22), inset 0 -2px 8px rgba(0, 0, 0, 0.04)";

  

const title = header.createEl("div", { text: "Media Dashboard" });

title.style.fontSize = "1.4rem";

title.style.fontWeight = "700";

title.style.color = "var(--text-normal)";

title.style.margin = "0 0 6px 0";

  

const subtitle = header.createEl("div", {

text: scope === "year" ? `Your ${THIS_YEAR} wrapped` : "All-time overview",

});

subtitle.style.fontSize = "0.85rem";

subtitle.style.color = "var(--text-muted)";

subtitle.style.marginTop = "4px";

subtitle.style.fontWeight = "500";

  

renderTopCards(topCards, active);

renderSidebar(sidebar);

renderSummaryPanel(rightPanel, active);

renderGoalSetter(rightPanel);

if (scope === "year") {

renderGoalProgress(rightPanel, active);

}

  

const chartGrid = main.createEl("div");

  chartGrid.classList.add('md-grid');

chartGrid.style.gridTemplateColumns = "repeat(2, minmax(0, 1fr))";

chartGrid.style.gap = "12px";

chartGrid.style.alignItems = "stretch";

const chartConfigs = [];

  

if (filter !== "screen") {

chartConfigs.push([

"Books by Pages",

booksByPages(active),

"How your finished books spread across page counts.",

]);

}

  

chartConfigs.push([

"Media Breakdown",

countBy(active, (item) => item.mediaType),

"Books, essays, movies, and series in the active scope.",

]);

  

chartConfigs.push([

"Top Genres",

countBy(active.flatMap((item) => item.genres), (genre) => genre),

"Your most repeated genres right now.",

]);

  

chartConfigs.push([
  "Ratings (rounded)",
  countBy(
    active.filter((item) => item.rating && item.rating > 0),
    (item) => Math.round(item.rating)   // 7.2 → 7, 8.6 → 9
  ),
  "How your ratings are distributed across items.",
]);

if (filter !== "screen") {

chartConfigs.push([

"Top Authors",

countBy(

active.filter((item) => item.mediaType === "Book").map((item) => item.creator),

(creator) => creator

),

"Most frequent book authors in the active view.",

]);

  

chartConfigs.push([

"Top Essayists",

countBy(

active.filter((item) => item.mediaType === "Essay").map((item) => item.creator),

(creator) => creator

),

"Most frequent essay writers in the active view.",

]);

}

  

if (filter !== "text") {

chartConfigs.push([

"Top Directors",

countBy(

active

.filter((item) => ["Movie", "Series"].includes(item.mediaType))

.map((item) => item.creator),

(creator) => creator

),

"Most frequent directors across movies and series.",

]);

}

  

chartConfigs.forEach(([title, data, description]) => {

chart(chartGrid, title, data, description);

});

}

  

render();
```