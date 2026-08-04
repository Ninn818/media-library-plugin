```datacorejsx

// Mount modals on document.body so they render as a window overlay, not inside the note pane.
const getModalPortalRoot = (() => {
  let root = null;
  return () => {
    if (root && root.isConnected) return root;
    root = document.getElementById("media-counter-modal-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "media-counter-modal-root";
      document.body.appendChild(root);
    }
    return root;
  };
})();

// Datacore doesn't expose createPortal — use preact.render into a body-mounted root instead.
function BodyPortal({ children }) {
  const containerRef = dc.useRef(null);
  if (!containerRef.current) containerRef.current = getModalPortalRoot();

  dc.useEffect(() => {
    dc.preact.render(children, containerRef.current);
  });

  dc.useEffect(() => {
    return () => dc.preact.render(null, containerRef.current);
  }, []);

  return null;
}

function MediaCounter() {
// ===== Helpers =====
  function first(v) {
    if (Array.isArray(v)) return v[0];
    return v;
  }
  function compareStrings(a, b) {
    const sa = (a ?? "").toString().toLowerCase();
    const sb = (b ?? "").toString().toLowerCase();
    return sa.localeCompare(sb);
  }

  function averageRating(list) {
    if (!Array.isArray(list)) return null;

    const vals = list
      .map((it) => {
        const n = Number(it?.rating);
        return Number.isFinite(n) ? n : null;
      })
      .filter((n) => n != null && n > 0);

    if (!vals.length) return null;

    const avg = vals.reduce((sum, n) => sum + n, 0) / vals.length;
    return Math.round(avg * 10) / 10;
  }

  function normalizeType(raw) {
    if (!raw) return "";
    if (Array.isArray(raw)) raw = raw[0];
    return String(raw).trim().toLowerCase();
  }

  function normGenres(page) {
    const g =
      page.value("genres") ??
      page.value("tags") ??
      page.value("genre") ??
      page.value("category") ??
      page.$tags;
    if (!g) return [];
    return Array.isArray(g) ? g.map(String) : [String(g)];
  }

  function normalizeStatus(status) {
    if (status == null) return "";
    return String(status);
  }

  function normalizeRating(r) {
    if (r == null) return null;
    const n = Number(r);
    return Number.isFinite(n) ? n : null;
  }

  function firstDate(...args) {
    for (const d of args) {
      if (d != null && d !== "") return String(d);
    }
    return null;
  }

  function yearOf(v) {
    if (!v) return "";
    const s = String(v);
    const m = s.match(/(19|20)\d{2}/);
    return m ? m[0] : "";
  }

  function normalizeDateForSort(raw) {
    if (raw == null || raw === "") return "";
    if (raw instanceof Date) {
      if (Number.isNaN(raw.getTime())) return "";
      return raw.toISOString().slice(0, 10);
    }

    const s = String(raw).trim();
    if (!s) return "";

    const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }

    const parsed = new Date(s);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }

    const yearMatch = s.match(/(19|20)\d{2}/);
    if (yearMatch) {
      return `${yearMatch[0]}-01-01`;
    }

    return "";
  }

  function getFileTimestampForPath(path) {
    if (!path) return "";
    try {
      const file = app.vault.getAbstractFileByPath(path);
      if (!file?.stat) return "";
      const timestamp = file.stat.ctime || file.stat.mtime;
      return normalizeDateForSort(timestamp);
    } catch {
      return "";
    }
  }

  function compareDateStrings(a, b) {
    const da = normalizeDateForSort(a);
    const db = normalizeDateForSort(b);
    if (da && db) return db.localeCompare(da);
    if (da) return -1;
    if (db) return 1;
    return 0;
  }

  function normalizeUrl(u) {
    if (!u) return null;
    let s = String(u).trim();
    if (s.startsWith("http://books.google.com")) {
      s = s.replace(/^http:/, "https:");
    }
    return s;
  }

  function getTodayDateString() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // normalize searchable text for item
  function itemSearchText(it) {
    const t = (it.title || "").toString().toLowerCase();
    const c = (it.creator || "").toString().toLowerCase();
    const g = (it.genres || []).join(" ").toLowerCase();
    const y = (it.year || "").toString().toLowerCase();
    return [t, c, g, y].join(" ");
  }

  function coverFields(page) {
    function extract(v) {
      if (!v) return null;
      if (Array.isArray(v)) v = v[0];

      if (typeof v === "object") {
        if (v.path) return v.path;
        if (v.url) return v.url;
      }

      return String(v).trim();
    }

    let raw =
      extract(page.value("coverUrl")) ||
      extract(page.value("cover")) ||
      extract(page.value("image")) ||
      extract(page.value("localCover"));

    if (!raw && page.$frontmatter) {
      for (const key of ["cover", "image", "coverUrl"]) {
        const f = page.$frontmatter[key];
        if (f?.raw) {
          raw = extract(f.raw);
          if (raw) break;
        }
      }
    }

    if (!raw) return { coverLocal: null, coverUrl: null };

    // Handle ![[path]], [[path]], and [[path|alias]]
    const m = raw.match(/!?\[\[([^|\]]+)(?:\|[^]]*)?]]/);
    if (m) raw = m[1].trim();

    const isUrl = /^https?:/i.test(raw);
    if (isUrl) {
      return { coverLocal: null, coverUrl: raw };
    }

    // if it's just a filename, assume your folder
    if (!raw.includes("/")) {
      raw = "Media DB/images/" + raw;
    }

    return { coverLocal: raw, coverUrl: null };
  }

  function normalizeCoverPath(raw) {
    if (!raw) return "";
    let s = String(raw).trim();

    // Handle ![[path]], [[path]], and [[path|alias]]
    const embedMatch = s.match(/!?\[\[([^|\]]+)(?:\|[^]]*)?]]/);
    if (embedMatch) s = embedMatch[1];

    return s;
  }

  function resolveCoverSrc(item) {
    const debugKey = `${item.title}-${item.path}`;
    
    if (item.coverUrl) {
      console.log(`[COVER] ${debugKey}: ✓ Using external URL`, item.coverUrl);
      return item.coverUrl;
    }
    
    if (!item.coverLocal) {
      console.log(`[COVER] ${debugKey}: ✗ No coverLocal defined`);
      return null;
    }

    const localPath = normalizeCoverPath(item.coverLocal);
    console.log(`[COVER] ${debugKey}: Normalized path: "${localPath}"`);

    try {
      console.log(`[COVER] ${debugKey}: → Trying getFirstLinkpathDest...`);
      const linked = app.metadataCache.getFirstLinkpathDest(localPath, "");
      if (linked) {
        console.log(`[COVER] ${debugKey}: ✓ Found via getFirstLinkpathDest:`, linked.path);
        try {
          const resourcePath = app.vault.adapter.getResourcePath(linked);
          console.log(`[COVER] ${debugKey}: ✓ Got resource path:`, resourcePath);
          return resourcePath;
        } catch (e) {
          console.error(`[COVER] ${debugKey}: ✗ getResourcePath failed on linked file:`, e.message);
        }
      } else {
        console.log(`[COVER] ${debugKey}: ✗ getFirstLinkpathDest returned null`);
      }

      console.log(`[COVER] ${debugKey}: → Trying getAbstractFileByPath...`);
      const direct = app.vault.getAbstractFileByPath(localPath);
      if (direct) {
        console.log(`[COVER] ${debugKey}: ✓ Found via getAbstractFileByPath:`, direct.path);
        try {
          const resourcePath = app.vault.adapter.getResourcePath(direct);
          console.log(`[COVER] ${debugKey}: ✓ Got resource path:`, resourcePath);
          return resourcePath;
        } catch (e) {
          console.error(`[COVER] ${debugKey}: ✗ getResourcePath failed on direct file:`, e.message);
        }
      } else {
        console.log(`[COVER] ${debugKey}: ✗ getAbstractFileByPath returned null`);
      }

      console.log(`[COVER] ${debugKey}: → Direct lookups failed, trying enhanced resolver...`);
      const enhanced = resolveCoverSrcEnhanced({ coverLocal: localPath, debugKey });
      if (enhanced) {
        console.log(`[COVER] ${debugKey}: ✓ Enhanced resolver found:`, enhanced);
        return enhanced;
      } else {
        console.log(`[COVER] ${debugKey}: ✗ Enhanced resolver also failed`);
      }

      return null;
    } catch (e) {
      console.error(`[COVER] ${debugKey}: ✗ Unexpected error in resolveCoverSrc:`, e.message, e.stack);
      return null;
    }
  }

  // Enhanced resolver: try more heuristics when direct lookup fails (case/extension/folder differences)
  function resolveCoverSrcEnhanced(item) {
    const debugKey = item.debugKey || "unknown";
    
    if (item.coverUrl) return item.coverUrl;
    if (!item.coverLocal) {
      console.log(`[COVER-ENHANCED] ${debugKey}: No coverLocal`);
      return null;
    }

    const localPathRaw = normalizeCoverPath(item.coverLocal);
    console.log(`[COVER-ENHANCED] ${debugKey}: Starting enhanced resolution for: "${localPathRaw}"`);

    // Helper to try to resolve a single candidate path
    function tryPath(p, strategy) {
      try {
        console.log(`[COVER-ENHANCED] ${debugKey}:   [${strategy}] Trying: "${p}"`);
        const linked = app.metadataCache.getFirstLinkpathDest(p, "");
        if (linked) {
          console.log(`[COVER-ENHANCED] ${debugKey}:   [${strategy}] ✓ Found via getFirstLinkpathDest:`, linked.path);
          try {
            const rp = app.vault.adapter.getResourcePath(linked);
            console.log(`[COVER-ENHANCED] ${debugKey}:   [${strategy}] ✓ Resource path:`, rp);
            return rp;
          } catch (e) {
            console.error(`[COVER-ENHANCED] ${debugKey}:   [${strategy}] ✗ getResourcePath error:`, e.message);
            return null;
          }
        }

        const direct = app.vault.getAbstractFileByPath(p);
        if (direct) {
          console.log(`[COVER-ENHANCED] ${debugKey}:   [${strategy}] ✓ Found via getAbstractFileByPath:`, direct.path);
          try {
            const rp = app.vault.adapter.getResourcePath(direct);
            console.log(`[COVER-ENHANCED] ${debugKey}:   [${strategy}] ✓ Resource path:`, rp);
            return rp;
          } catch (e) {
            console.error(`[COVER-ENHANCED] ${debugKey}:   [${strategy}] ✗ getResourcePath error:`, e.message);
            return null;
          }
        }

        console.log(`[COVER-ENHANCED] ${debugKey}:   [${strategy}] ✗ File not found`);
        return null;
      } catch (e) {
        console.error(`[COVER-ENHANCED] ${debugKey}:   [${strategy}] ✗ Unexpected error:`, e.message);
        return null;
      }
    }

    // Try the raw path first
    let resolved = tryPath(localPathRaw, "raw");
    if (resolved) return resolved;

    // Try without leading slashes
    const noLeading = localPathRaw.replace(/^\/+/, "");
    if (noLeading !== localPathRaw) {
      resolved = tryPath(noLeading, "no-leading-slash");
      if (resolved) return resolved;
    }

    // Try decoding URI components (in case of %20 etc)
    try {
      const dec = decodeURIComponent(localPathRaw);
      if (dec !== localPathRaw) {
        console.log(`[COVER-ENHANCED] ${debugKey}: Decoded: "${dec}"`);
        resolved = tryPath(dec, "decoded-uri");
        if (resolved) return resolved;
      }
    } catch (e) {
      console.error(`[COVER-ENHANCED] ${debugKey}: ✗ decodeURIComponent error:`, e.message);
    }

    // Try lower-casing extension (e.g., .JPG -> .jpg) and the full path
    const m = noLeading.match(/^(.*)(\.[^./]+)$/);
    if (m) {
      const base = m[1];
      const ext = m[2];
      const extLower = ext.toLowerCase();
      console.log(`[COVER-ENHANCED] ${debugKey}: Extension: "${ext}" → "${extLower}"`);
      const candidate = base + extLower;
      if (candidate !== noLeading) {
        resolved = tryPath(candidate, "lowercase-ext");
        if (resolved) return resolved;
      }
    } else {
      console.log(`[COVER-ENHANCED] ${debugKey}: No extension found in: "${noLeading}"`);
    }

    // As a last resort, search vault files for matches using case-insensitive and normalized heuristics
    try {
      const basename = noLeading.split('/').pop().toLowerCase();
      const files = app.vault.getFiles();
      console.log(`[COVER-ENHANCED] ${debugKey}: Searching ${files.length} vault files for basename: "${basename}"`);
      
      if (basename) {
        // 1) Exact case-insensitive path match
        console.log(`[COVER-ENHANCED] ${debugKey}:   [exact-ci] Looking for: "${noLeading.toLowerCase()}"`);
        const exact = files.find(f => f.path.toLowerCase() === noLeading.toLowerCase());
        if (exact) {
          console.log(`[COVER-ENHANCED] ${debugKey}:   [exact-ci] ✓ Found:`, exact.path);
          try {
            const rp = app.vault.adapter.getResourcePath(exact);
            console.log(`[COVER-ENHANCED] ${debugKey}:   [exact-ci] ✓ Resource path:`, rp);
            return rp;
          } catch (e) {
            console.error(`[COVER-ENHANCED] ${debugKey}:   [exact-ci] ✗ getResourcePath error:`, e.message);
          }
        }

        // 2) Ends-with match (common when folder prefixes differ)
        console.log(`[COVER-ENHANCED] ${debugKey}:   [ends-with] Looking for files ending with: "${basename}"`);
        const ends = files.find(f => {
          const match = f.path.toLowerCase().endsWith(basename) && /\.(jpe?g|png|gif|webp|svg)$/i.test(f.path);
          if (match) console.log(`[COVER-ENHANCED] ${debugKey}:     Candidate: ${f.path}`);
          return match;
        });
        if (ends) {
          console.log(`[COVER-ENHANCED] ${debugKey}:   [ends-with] ✓ Found:`, ends.path);
          try {
            const rp = app.vault.adapter.getResourcePath(ends);
            console.log(`[COVER-ENHANCED] ${debugKey}:   [ends-with] ✓ Resource path:`, rp);
            return rp;
          } catch (e) {
            console.error(`[COVER-ENHANCED] ${debugKey}:   [ends-with] ✗ getResourcePath error:`, e.message);
          }
        }

        // 3) Fuzzy normalized match: strip punctuation/spacing for matching
        console.log(`[COVER-ENHANCED] ${debugKey}:   [fuzzy] Starting fuzzy normalized match...`);
        function normalizeName(s) {
          return s
            .toLowerCase()
            .replace(/\.[^.]+$/, "") // remove extension
            .replace(/\s+/g, "")
            .replace(/[^a-z0-9]/g, "");
        }

        const targetNorm = normalizeName(basename);
        console.log(`[COVER-ENHANCED] ${debugKey}:   [fuzzy] Target normalized: "${targetNorm}"`);
        
        if (targetNorm) {
          const fuzzy = files.find(f => {
            if (!/\.(jpe?g|png|gif|webp|svg)$/i.test(f.path)) return false;
            const name = f.path.split('/').pop();
            const nameNorm = normalizeName(name);
            const match = nameNorm.includes(targetNorm) || targetNorm.includes(nameNorm);
            if (match) console.log(`[COVER-ENHANCED] ${debugKey}:     Fuzzy match: ${f.path} (norm: "${nameNorm}")`);
            return match;
          });
          if (fuzzy) {
            console.log(`[COVER-ENHANCED] ${debugKey}:   [fuzzy] ✓ Found:`, fuzzy.path);
            try {
              const rp = app.vault.adapter.getResourcePath(fuzzy);
              console.log(`[COVER-ENHANCED] ${debugKey}:   [fuzzy] ✓ Resource path:`, rp);
              return rp;
            } catch (e) {
              console.error(`[COVER-ENHANCED] ${debugKey}:   [fuzzy] ✗ getResourcePath error:`, e.message);
            }
          } else {
            console.log(`[COVER-ENHANCED] ${debugKey}:   [fuzzy] ✗ No fuzzy matches found`);
          }
        }
      }
    } catch (e) {
      console.error(`[COVER-ENHANCED] ${debugKey}: ✗ Unexpected error during vault search:`, e.message, e.stack);
    }

    console.log(`[COVER-ENHANCED] ${debugKey}: ✗✗✗ All strategies exhausted, giving up`);
    return null;
  }

  function coverDisplayMarkdown(item) {
    const raw = item.coverUrl || item.coverLocal;
    if (!raw) return null;

    if (/^https?:\/\//i.test(raw)) {
      return `![](${raw})`;
    }

    const path = normalizeCoverPath(raw);
    if (!path) return null;

    return `![[${path}]]`;
  }

  function extractSynopsis(page) {
    let s =
      page.value("summary") ||
      page.value("synopsis") ||
      page.value("description") ||
      page.value("plot");

    if (!s) return "";

    s = String(s);

    // remove fenced code blocks
    s = s.replace(/```[\s\S]*?```/g, "");

    // remove callout markers
    s = s.replace(/^>\s*\[!.*?\].*$/gm, "");

    // remove blockquote markers
    s = s.replace(/^>\s?/gm, "");

    // collapse whitespace
    s = s.replace(/\n+/g, " ").trim();

    return s;
  }


  function isCompleted(m) {
    const s = (m.status || "").toString().trim().toLowerCase();
    if (!s) return false;

    // Explicitly not completed
    if (/\b(unread|unwatched|want|started|currently|in-progress|in progress|paused|dropped)\b/.test(s)) {
      return false;
    }

    // Completed / done variants (e.g. "finished reading", "watched")
    return /\b(read|watched|finished|complete|completed|done)\b/.test(s);
  }

  async function openModal(item, event) {
    if (event) event.stopPropagation();

    setActiveItem(item);
    setModalOpen(true);
    setActivityRating(item.rating ?? 0);
    setActivityType(item.mediaType === "Book" ? "read" : "watch");
    setEditingIndex(null);
    setActivityStarted("");
    setActivityFinished("");

    const parsed = await loadActivitiesForItem(item);
    setActivities(parsed);
  }

  // Build a markdown activity block
  function buildActivityBlock({ type, started, finished, date, index, rating }) {
    const baseType = type === "watch" || type === "read" ? type : "watch";
    const isWatch = baseType === "watch";

    const label =
      index === 1
        ? (isWatch ? "Watched" : "Read")
        : (isWatch ? "Re-watched" : "Re-read");

    const lines = [
      `> [!activity] ${label} — ${index} Time (${date})`,
      `> - Type: ${baseType}`,
      started ? `> - Started: ${started}` : null,
      finished ? `> - Finished: ${finished}` : null,
      `> - Date: ${date}`,
      `> - Count: ${index}`,
      `> - Rating: ${"★".repeat(rating)}${"☆".repeat(10 - rating)} (${rating}/10)`
    ].filter(Boolean);          // drop null lines

    return lines.join("\n");    // no trailing blank line here
  }

  // Count rewatched/reread activities from the activity log for sorting
  async function countActivitiesForItem(item) {
    try {
      const file = app.vault.getAbstractFileByPath(item.path);
      if (!file) return 0;

      const content = await app.vault.read(file);
      if (!content.includes("## Activity Log")) return 0;

      // Count how many activity blocks exist (each represents a watch/read event)
      const blocks = content.split(/\n(?=> \[!activity\])/g).filter(b =>
        b.trimStart().startsWith("> [!activity]")
      );
      return blocks.length;
    } catch {
      return 0;
    }
  }

  // Get the most recent activity date from activity log
  async function getMostRecentActivityDate(item) {
    try {
      const file = app.vault.getAbstractFileByPath(item.path);
      if (!file) return null;

      const content = await app.vault.read(file);
      if (!content.includes("## Activity Log")) return null;

      const blocks = content.split(/\n(?=> \[!activity\])/g).filter(b =>
        b.trimStart().startsWith("> [!activity]")
      );

      let mostRecent = null;
      for (const block of blocks) {
        const dateMatch = block.match(/- Date:\s*([0-9-]+)/i);
        if (dateMatch) {
          const date = dateMatch[1];
          if (!mostRecent || date > mostRecent) {
            mostRecent = date;
          }
        }
      }
      return mostRecent;
    } catch {
      return null;
    }
  }

  // Read all activity blocks from a file and parse them
  async function loadActivitiesForItem(item) {
    const file = app.vault.getAbstractFileByPath(item.path);
    if (!file) return [];

    const content = await app.vault.read(file);
    const blocks = content.split(/\n(?=> \[!activity\])/g).filter(b =>
      b.trimStart().startsWith("> [!activity]")
    );

    const parsed = blocks.map((block, idx) => {
      const typeMatch = block.match(/- Type:\s*(\w+)/i);
      const dateMatch = block.match(/- Date:\s*([0-9-]+)/i);
      const startedMatch = block.match(/- Started:\s*([0-9-]+)/i);
      const finishedMatch = block.match(/- Finished:\s*([0-9-]+)/i);
      const countMatch = block.match(/- Count:\s*(\d+)/i);
      const ratingMatch = block.match(/\((\d+)\/10\)/);

      return {
        raw: block,
        blockIndex: idx,
        index: countMatch ? Number(countMatch[1]) : idx + 1,
        type: typeMatch ? typeMatch[1] : "",
        date: dateMatch ? dateMatch[1] : "",
        started: startedMatch ? startedMatch[1] : "",
        finished: finishedMatch ? finishedMatch[1] : "",
        rating: ratingMatch ? Number(ratingMatch[1]) : 0,
      };
    });

    return parsed;
  }


  // Append a new activity block to the file  ✅ ensure blank line between callouts
  async function addActivity(item, blockText) {
    const file = app.vault.getAbstractFileByPath(item.path);
    const content = await app.vault.read(file);

    const logHeader = "\n\n## Activity Log\n";
    const hasLog = content.includes("## Activity Log");

    const updated = hasLog
      // two newlines before the callout so Obsidian starts a NEW callout
      ? content.trimEnd() + "\n\n" + blockText + "\n"
      : content.trimEnd() + logHeader + blockText + "\n";

    await app.vault.modify(file, updated);
  }

  // Replace a single activity block by index within the whole file
  async function updateActivityBlock(item, targetIndex, newBlock) {
    const file = app.vault.getAbstractFileByPath(item.path);
    let content = await app.vault.read(file);

    const blocks = content.split(/\n(?=> \[!activity\])/g);
    let activityIdx = -1;

    const newBlocks = blocks.map((b) => {
      if (b.trimStart().startsWith("> [!activity]")) {
        activityIdx += 1;
        if (activityIdx === targetIndex) {
          return newBlock;
        }
      }
      return b;
    });

    await app.vault.modify(file, newBlocks.join("\n"));
  }
  //=== Query all pages =====
  const allPages = dc.useQuery("@page");


  const [modalOpen, setModalOpen] = dc.useState(false);
  const [activeItem, setActiveItem] = dc.useState(null);
  const [activityRating, setActivityRating] = dc.useState(0);
  const [activityDate, setActivityDate] = dc.useState("");
  const [activityType, setActivityType] = dc.useState("watch");
  const [editingIndex, setEditingIndex] = dc.useState(null);
  const [activities, setActivities] = dc.useState([]); // parsed activity blocks
  const [activityStarted, setActivityStarted] = dc.useState("");
  const [activityFinished, setActivityFinished] = dc.useState("");


  // ===== Build items =====
  let items = [];

  // Screen / Movie / Series
  const screenPages = allPages.filter((p) => {
    const t = normalizeType(p.value("type"));
    return ["movie", "film", "series", "tv"].includes(t);
  });

  items = items.concat(
    screenPages.map((page) => {
      const typeStr = normalizeType(page.value("type"));
      const isSeries = typeStr === "series" || typeStr === "tv";
      const { coverLocal, coverUrl } = coverFields(page);
      const addedDate = getFileTimestampForPath(page.$path);
      const createdDate = normalizeDateForSort(
        page.value("created") ||
        page.value("dateCreated") ||
        page.value("createdAt")
      );
      const releaseDate = normalizeDateForSort(
        page.value("publishDate") ||
          page.value("datePublished") ||
          page.value("releaseDate") ||
          page.value("releaseYear") ||
          page.value("year")
      );

      return {
        mediaType: isSeries ? "Series" : "Movie",
        title: page.value("title") || page.$name || "Untitled",
        creator: first(page.value("director")) || first(page.value("author")) || "Unknown",
        genres: normGenres(page),
        summary:
          page.value("summary") ||
          page.value("description") ||
          page.value("plot") ||
          page.value("blurb") ||
          "",
        status: normalizeStatus(page.value("status")),
        rating: normalizeRating(page.value("personalRating")),
        date: firstDate(
          page.value("lastWatched"),
          page.value("dateFinished"),
          page.value("finishDate"),
          page.value("dateRead")
        ),
        year: yearOf(page.value("year") ?? page.value("releaseYear") ?? page.value("publishDate") ?? page.value("datePublished")),
        releaseDate,
        addedDate,
        createdDate,
        coverLocal,
        coverUrl,
        path: page.$path || "#",
        link: page.$link
      };
    })
  );

  // Books
  const bookPages = allPages.filter((p) => {
    const t = normalizeType(p.value("type"));
    return t === "book" || t === "novel" || t === "paperback" || t === "hardcover";
  });

  
  items = items.concat(
    bookPages.map((page) => {
      const { coverLocal, coverUrl } = coverFields(page);
      const addedDate = getFileTimestampForPath(page.$path);
      const createdDate = normalizeDateForSort(
        page.value("created") ||
        page.value("dateCreated") ||
        page.value("createdAt")
      );
      const releaseDate = normalizeDateForSort(
        page.value("publishDate") ||
          page.value("datePublished") ||
          page.value("year")
      );
      return {
        mediaType: "Book",
        title: page.value("title") || page.$name || "Untitled",
        creator:
          first(page.value("authors")) ||   // prefer 'authors'
          first(page.value("author"))  ||   // then 'author'
          "Unknown",
        genres: normGenres(page),
        summary:
          page.value("summary") ||
          page.value("description") ||
          page.value("plot") ||
          page.value("synopsis") ||
          page.value("blurb") ||
          "",
        synopsis: extractSynopsis(page),
        status: normalizeStatus(page.value("status")),
        rating: normalizeRating(page.value("personalRating")),
        date: firstDate(
          page.value("dateRead"),
          page.value("dateFinished"),
          page.value("finishDate")
        ),
        year: yearOf(page.value("publishDate") || page.value("year") || page.value("datePublished")),
        releaseDate,
        addedDate,
        createdDate,
        coverLocal,
        coverUrl,
        path: page.$path || "#",
        link: page.$link
      };
    })
  );

  // Essays
  const essayPages = allPages.filter(
    (p) => normalizeType(p.value("type")) === "essay"
  );

  items = items.concat(
    essayPages.map((page) => {
      const { coverLocal, coverUrl } = coverFields(page);
      const addedDate = getFileTimestampForPath(page.$path);
      const createdDate = normalizeDateForSort(
        page.value("created") ||
        page.value("dateCreated") ||
        page.value("createdAt")
      );
      const releaseDate = normalizeDateForSort(
        page.value("publishDate") ||
          page.value("datePublished") ||
          page.value("year")
      );
      return {
        mediaType: "Essay",
        title: page.value("title") || page.$name || "Untitled",
        creator: first(page.value("authors")) || first(page.value("author")) || "Unknown",
        genres: normGenres(page),
        summary:
          page.value("summary") ||
          page.value("description") ||
          page.value("plot") ||
          page.value("blurb") ||
          "",
        status: normalizeStatus(page.value("status")),
        rating: normalizeRating(page.value("personalRating")),
        date: firstDate(
          page.value("dateRead"),
          page.value("dateFinished"),
          page.value("finishDate")
        ),
        year: yearOf(page.value("year") ?? page.value("releaseYear") ?? page.value("publishDate") ?? page.value("datePublished")),
        releaseDate,
        addedDate,
        createdDate,
        coverLocal,
        coverUrl,
        path: page.$path || "#",
        link: page.$link
      };
    })
  );

  // Dedupe by path
  const seen = new Set();
  items = items.filter((it) => {
    if (!it.path) return false;
    if (seen.has(it.path)) return false;
    seen.add(it.path);
    return true;
  });

  // Debug: list items with unresolved covers to console (helps diagnose 'No cover')
  dc.useEffect(() => {
    try {
      const missing = [];
      for (const it of items) {
        const src = resolveCoverSrc(it);
        if (!src) missing.push({ title: it.title, path: it.path, coverLocal: it.coverLocal });
      }
      if (missing.length) {
        console.warn(`\n📷 [COVER DEBUG] ${missing.length} items have UNRESOLVED covers:`, missing);
        console.log("↑ Check the [COVER] and [COVER-ENHANCED] logs above for details on each failure.\n");
      } else {
        console.log("\n✓ All covers successfully resolved!\n");
      }
    } catch (e) {
      console.error("Error checking covers:", e);
    }
  }, []);

  // ===== Counts =====
  const counts = {
    all: items.filter((m) =>
      ["Book", "Movie", "Series", "Essay"].includes(m.mediaType)
    ).length,
    books: items.filter((m) => m.mediaType === "Book").length,
    films: items.filter((m) => m.mediaType === "Movie").length,
    essays: items.filter((m) => m.mediaType === "Essay").length,
    series: items.filter((m) => m.mediaType === "Series").length
  };

  // ===== State =====
  const [filter, setFilter] = dc.useState("all");
  const [statusFilter, setStatusFilter] = dc.useState("all");
  const [search, setSearch] = dc.useState("");
  const [genreFilter, setGenreFilter] = dc.useState("");
  const [sortMode, setSortMode] = dc.useState("latest");
  const [sortDir, setSortDir] = dc.useState("desc");
  const [rowsShown, setRowsShown] = dc.useState(1);
  const [activityCounts, setActivityCounts] = dc.useState({});
  const [mostRecentActivityDates, setMostRecentActivityDates] = dc.useState({});
  const [featuredPath, setFeaturedPath] = dc.useState(null);

  const ITEMS_PER_ROW = 6;
  const ROW_COUNT = 4;

  // Collect all genres from items
  const allGenres = Array.from(
    new Set(items.flatMap(item => item.genres || []))
  ).sort().filter(g => g && g.length > 0);

  // ===== Keyboard "/" => focus search =====
  dc.useEffect(() => {
    function onKey(e) {
      if (e.key === "/") {
        const el = document.querySelector(
          'input[placeholder="Search title, creator, genre..."]'
        );
        if (el) {
          e.preventDefault();
          el.focus();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ===== Load activity counts and dates for sorting =====
  dc.useEffect(() => {
    async function loadCounts() {
      const counts = {};
      const recentDates = {};
      for (const item of items) {
        counts[item.path] = await countActivitiesForItem(item);
        recentDates[item.path] = await getMostRecentActivityDate(item);
      }
      setActivityCounts(counts);
      setMostRecentActivityDates(recentDates);
    }
    loadCounts();
  }, []);

  // ===== Filter + sort =====
  const filtered = items.filter((m) => {
    if (filter === "all") {
      if (!["Book", "Movie", "Series", "Essay"].includes(m.mediaType)) return false;
    } else if (filter === "books" && m.mediaType !== "Book") return false;
    else if (filter === "films" && m.mediaType !== "Movie") return false;
    else if (filter === "essays" && m.mediaType !== "Essay") return false;
    else if (filter === "series" && m.mediaType !== "Series") return false;

    // read/watched vs unread/unwatched filter
    if (statusFilter === "completed" && !isCompleted(m)) return false;
    if (statusFilter === "uncompleted" && isCompleted(m)) return false;

    // genre filter (if set, require genre to include it)
    if (genreFilter) {
      if (
        !m.genres ||
        !m.genres
          .map((x) => String(x).toLowerCase())
          .includes(String(genreFilter).toLowerCase())
      )
        return false;
    }
    // full-text search across title, creator, genres, year
    if (search && !itemSearchText(m).includes(search.toLowerCase())) return false;

    return true;
  });

  const sorted = filtered.slice().sort((a, b) => {
    let result = 0;

    if (sortMode === "latest") {
      const da = a.createdDate || a.date || "";
      const db = b.createdDate || b.date || "";
      result = compareDateStrings(da, db);
      if (result === 0) result = compareStrings(a.title, b.title);
    }

    else if (sortMode === "rated") {
      const ra = a.rating == null ? -Infinity : Number(a.rating);
      const rb = b.rating == null ? -Infinity : Number(b.rating);
      result = rb - ra;
      if (ra === rb) {
        // If ratings are equal, consider activity log: items with more rewatches/rereads rank higher
        const aActivityCount = activityCounts[a.path] || 0;
        const bActivityCount = activityCounts[b.path] || 0;
        result = bActivityCount - aActivityCount;
        if (result === 0) result = compareStrings(a.title, b.title);
      }
    }

    else if (sortMode === "release") {
      result = compareDateStrings(a.releaseDate || a.year, b.releaseDate || b.year);
      if (result === 0) result = compareStrings(a.title, b.title);
    }

    else if (sortMode === "creator") {
      result =
        compareStrings(a.creator || "", b.creator || "") ||
        compareStrings(a.title, b.title);
    }

    else if (sortMode === "title") {
      result = compareStrings(a.title || "", b.title || "");
    }

    else if (sortMode === "date") {
      const da = a.date || "";
      const db = b.date || "";
      if (da && db) result = db.localeCompare(da);
      else result = compareStrings(a.title, b.title);
    }

    // 🔥 APPLY DIRECTION HERE
    return sortDir === "asc" ? result * -1 : result;
  });


  // ===== Paging =====
  const ITEMS_PER_PAGE = ITEMS_PER_ROW * ROW_COUNT;
  const visibleCount = Math.max(
    ITEMS_PER_PAGE * rowsShown,
    Math.min(sorted.length, ITEMS_PER_PAGE)
  );
  const visible = sorted.slice(0, visibleCount);
  const hasMore = visibleCount < sorted.length;

  // ===== Stats =====
  const avgRating = averageRating(sorted);

  // ===== Featured Item (stable + unseen-first) =====
  const unseenSpotlightPool = items.filter((m) =>
    ["Book", "Movie", "Series", "Essay"].includes(m.mediaType) && !isCompleted(m)
  );

  function pickRandomFromList(list, excludePath) {
    if (!Array.isArray(list) || !list.length) return null;
    const pool = excludePath ? list.filter((it) => it.path !== excludePath) : list;
    const finalPool = pool.length ? pool : list;
    return finalPool[Math.floor(Math.random() * finalPool.length)] || null;
  }

  dc.useEffect(() => {
    if (!unseenSpotlightPool.length) {
      if (featuredPath != null) setFeaturedPath(null);
      return;
    }

    const hasCurrent = unseenSpotlightPool.some((it) => it.path === featuredPath);
    if (!hasCurrent) {
      const picked = pickRandomFromList(unseenSpotlightPool);
      if (picked?.path) setFeaturedPath(picked.path);
    }
  }, [featuredPath, unseenSpotlightPool]);

  const featured =
    unseenSpotlightPool.find((it) => it.path === featuredPath) ||
    unseenSpotlightPool[0] ||
    sorted[0] ||
    null;

  const featuredIsUnseen = featured ? !isCompleted(featured) : false;

  function shuffleFeaturedUnseen() {
    if (!unseenSpotlightPool.length) return;
    const picked = pickRandomFromList(unseenSpotlightPool, featuredPath);
    if (picked?.path) setFeaturedPath(picked.path);
  }

  // ---------- Styles (unchanged) ----------
  const buttons = ["all", "books", "films", "essays", "series"];

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
    gap: "16px",
    alignItems: "stretch", // IMPORTANT: let items stretch to row height
    marginTop: "12px"
  };

  const cardStyle = {
    position: "relative",
    background:
      "linear-gradient(145deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015))",
    borderRadius: "14px",
    padding: "10px",
    border: "1px solid rgba(255,255,255,0.06)",
    boxShadow: "0 8px 24px rgba(0,0,0,0.16)",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    minHeight: "260px",
    height: "100%",
    overflow: "hidden",
    color: "#ddd",
    transition:
      "transform 0.22s ease, box-shadow 0.22s ease, background 0.22s ease, border-color 0.22s ease"
  };

  const coverWrapper = {
    width: "100%",
    height: 0,
    paddingBottom: "140%",
    position: "relative",
    borderRadius: "10px",
    overflow: "hidden",
    background: "#222",
    flexShrink: 0,
    transition: "transform 0.24s ease, box-shadow 0.24s ease"
  };

  const coverImg = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    background: "#111",
    transition: "transform 0.28s ease, filter 0.28s ease"
  };

  const titleStyle = { 
    fontSize: "14px", 
    fontWeight: 700, 
    lineHeight: "1.2" 
  };

  const metaSmall = { 
    fontSize: "12px", 
    color: "#bbb" 
  };

  const sectionLabelStyle = {
    fontSize: "10px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--text-muted)",
    opacity: 0.8
  };

  const surfacePanelStyle = {
    borderRadius: "16px",
    border: `1px solid var(--background-modifier-border)`,
    background:
      "linear-gradient(135deg, rgba(255,255,255,0.045), rgba(255,255,255,0.02))",
    boxShadow:
      "0 10px 30px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.08)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
  };

  const searchInputStyle = {
    flex: 1,
    minWidth: "300px",
    padding: "9px 14px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.24)",
    background: "rgba(255,255,255,0.04)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
    fontSize: "13px",
    color: "var(--text-normal)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
  };

  const controlStyle = {
    padding: "6px 10px",
    borderRadius: "10px",
    fontSize: "11px",
    border: "1px solid rgba(255,255,255,0.24)",
    background: "rgba(255,255,255,0.03)",
    color: "var(--text-normal)",
    cursor: "pointer",
    transition: "all 0.16s ease"
  };

  const sortArrowStyle = (active) => ({
    ...controlStyle,
    width: "30px",
    minWidth: "30px",
    textAlign: "center",
    padding: "6px 0",
    borderColor: active ? "rgba(255,255,255,0.62)" : "rgba(255,255,255,0.24)",
    background: active ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.03)"
  });

  const pillStyle = (isActive) => ({
    padding: "4px 12px",
    fontSize: "11px",
    borderRadius: "999px",
    border: isActive
      ? "1px solid rgba(255,255,255,0.74)"
      : "1px solid rgba(255,255,255,0.28)",
    background: isActive
      ? "rgba(255,255,255,0.86)"
      : "rgba(255,255,255,0.03)",
    color: isActive
      ? "var(--background-primary)"
      : "var(--text-normal)",
    cursor: "pointer",
    transition: "all 0.16s ease",
    fontWeight: isActive ? 600 : 450,
    boxShadow: isActive
      ? "0 2px 8px rgba(0,0,0,0.25)"
      : "none",
  });

  const completionButtons = [
    { key: "all", label: "All" },
    { key: "completed", label: "Read / watched" },
    { key: "uncompleted", label: "Unread / unwatched" }
  ];

  // ---------- Render (replace existing return JSX with this) ----------
  return (
    <>

      {/* ===== RETRO WHIMSICAL HEADER ===== */}
      <div
        style={{
          marginBottom: "20px",
          padding: "18px 20px 16px",
          position: "relative",
          overflow: "hidden",
          borderRadius: "18px",
          border: `1px solid var(--background-modifier-border)`,
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.045), rgba(255,255,255,0.02))",
          boxShadow:
            "0 10px 30px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.08)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          animation: "fadeInUp 0.5s ease-out",
        }}
      >
        {/* floating doodles */}
        <div
          style={{
            position: "absolute",
            top: "-30px",
            right: "-10px",
            fontSize: "34px",
            opacity: 0.25,
            animation: "floatDoodle 10s ease-in-out infinite",
          }}
        >
          
        </div>
        <div
          style={{
            position: "absolute",
            bottom: "-10px",
            left: "-6px",
            fontSize: "26px",
            opacity: 0.22,
            animation: "floatDoodle 12s ease-in-out infinite reverse",
          }}
        >
          ♡
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "14px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                opacity: 0.75,
                marginBottom: "4px",
              }}
            >
              Welcome to
            </div>
            <div
              style={{
                fontSize: "20px",
                fontWeight: 550,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "var(--text-normal)",
                textShadow:
                  "0 0 6px rgba(255,255,255,0.65), 0 0 18px rgba(255,160,220,0.45)",
                position: "relative",
                paddingRight: "12px",
                animation: "headerGlow 3.4s ease-in-out infinite",
              }}
            >
              nini&apos;s media Library
              <span
                style={{
                  position: "absolute",
                  right: "-22px",
                  top: "-6px",
                  fontSize: "18px",
                  transform: "rotate(-12deg)",
                  animation: "wiggle 2.4s ease-in-out infinite",
                }}
              >
                ✿
              </span>
            </div>
            <div
              style={{
                marginTop: "6px",
                fontSize: "13px",
                color: "var(--text-muted)",
                opacity: 0.9,
                fontStyle: "italic",
              }}
            >
              A vault of books, films, series & essays.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: "4px",
              fontSize: "11px",
              color: "var(--text-muted)",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 10px",
                borderRadius: "999px",
                border: "1px solid rgba(255,255,255,0.18)",
                background: "transparent",
                boxShadow:
                  "0 2px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.16)",
                backdropFilter: "blur(14px)",
                WebkitBackdropFilter: "blur(14px)",
              }}
            >
              <span style={{ fontSize: "14px" }}>★</span>
              <span style={{ fontWeight: 600 }}>Average</span>
              <span style={{ fontWeight: 700 }}>
                {avgRating ?? "—"}/10
              </span>
            </div>
            <div
              style={{
                display: "flex",
                gap: "8px",
                opacity: 0.9,
              }}
            >
              <span>Books: {counts.books}</span>
              <span>Films: {counts.films}</span>
              <span>Series: {counts.series}</span>
              <span>Essays: {counts.essays}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== STATISTICS (small row under header) ===== */}
      <div
        style={{
          marginBottom: "14px",
          display: "flex",
          gap: "20px",
          flexWrap: "wrap",
          fontSize: "12px",
          color: "var(--text-muted)",
          paddingBottom: "10px",
          borderBottom: `1px dashed var(--background-modifier-border)`,
        }}
      >
        <div>
          Total:{" "}
          <span
            style={{ fontWeight: 600, color: "var(--text-normal)" }}
          >
            {counts.all}
          </span>
        </div>
        <div style={{ marginLeft: "auto" }}>
          Average:{" "}
          <span style={{ fontWeight: 600 }}>{avgRating ?? "—"}</span>
        </div>
      </div>

      {/* ===== SEARCH & FILTERS - GLASSMORPHIC BAR ===== */}
      <div
        style={{
          marginBottom: "24px",
          padding: "14px 16px 16px",
          borderRadius: "16px",
          border: `1px solid var(--background-modifier-border)`,
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.045), rgba(255,255,255,0.02))",
          boxShadow:
            "0 10px 30px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.08)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          position: "relative",
          overflow: "hidden",
          animation: "fadeInUp 0.5s ease-out",
        }}
      >

        {/* Search + controls on one row */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <input
            value={search}
            onInput={(e) => {
              setSearch(e.target.value);
              setRowsShown(1);
            }}
            placeholder="Search title, creator, genre..."
            style={{
              flex: 1,
              minWidth: "300px",
              padding: "10px 14px",
              borderRadius: "999px",
              border: "1px solid rgba(255,255,255,0.35)",
              background: "transparent",
              boxShadow:
                "0 2px 8px rgba(0,0,0,0.2), inset 0 0.1px 0 rgba(255,255,255,0.10)",
              fontSize: "14px",
              color: "var(--text-normal)",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              fontStyle: "italic",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
            }}
            onFocus={(e) => {
              e.target.style.background = "rgba(255,255,255,0.05)";
              e.target.style.boxShadow =
                "0 3px 10px rgba(0,0,0,0.27), inset 0 1px 0 rgba(255,255,255,0.22)";
              e.target.style.transform = "scale(1.02)";
            }}
            onBlur={(e) => {
              e.target.style.background = "transparent";
              e.target.style.boxShadow =
                "0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.18)";
              e.target.style.transform = "scale(1)";
            }}
          />

          {/* Genre filter */}
          {allGenres.length > 0 && (
            <select
              value={genreFilter}
              onChange={(e) => {
                setGenreFilter(e.target.value);
                setRowsShown(1);
              }}
              style={{
                padding: "5px 10px",
                borderRadius: "6px",
                fontSize: "11px",
                border: "1px solid rgba(255,255,255,0.2)",
                background: "transparent",
                color: "var(--text-normal)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = "rgba(255,255,255,0.4)";
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = "rgba(255,255,255,0.2)";
              }}
            >
              <option value="">All genres</option>
              {allGenres.map((genre) => (
                <option key={genre} value={genre}>
                  {genre}
                </option>
              ))}
            </select>
          )}

          {/* Sort mode dropdown */}
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value)}
            style={{
              padding: "5px 10px",
              borderRadius: "6px",
              fontSize: "11px",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "transparent",
              color: "var(--text-normal)",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = "rgba(255,255,255,0.4)";
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = "rgba(255,255,255,0.2)";
            }}
          >
            <option value="latest">Latest</option>
            <option value="rated">Rated</option>
            <option value="release">Release</option>
            <option value="creator">Creator</option>
            <option value="title">Title</option>
          </select>

          {/* Sort direction buttons */}
          <button
            onClick={() => setSortDir("asc")}
            style={{
              padding: "5px 8px",
              borderRadius: "4px",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "transparent",
              cursor: "pointer",
              color: "var(--text-normal)",
              fontSize: "12px",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = "rgba(255,255,255,0.5)";
              e.target.style.background = "rgba(255,255,255,0.12)";
              e.target.style.transform = "translateY(-2px) scale(1.08)";
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = "rgba(255,255,255,0.2)";
              e.target.style.background = "transparent";
              e.target.style.transform = "translateY(0) scale(1)";
            }}
          >
            ▲
          </button>

          <button
            onClick={() => setSortDir("desc")}
            style={{
              padding: "5px 8px",
              borderRadius: "4px",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "transparent",
              cursor: "pointer",
              color: "var(--text-normal)",
              fontSize: "12px",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = "rgba(255,255,255,0.5)";
              e.target.style.background = "rgba(255,255,255,0.12)";
              e.target.style.transform = "translateY(2px) scale(1.08)";
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = "rgba(255,255,255,0.2)";
              e.target.style.background = "transparent";
              e.target.style.transform = "translateY(0) scale(1)";
            }}
          >
            ▼
          </button>

          {/* Clear button */}
          <button
            onClick={() => {
              setSearch("");
              setFilter("all");
              setGenreFilter("");
              setSortMode("latest");
              setSortDir("desc");
              setRowsShown(1);
            }}
            style={{
              padding: "5px 10px",
              borderRadius: "6px",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "transparent",
              color: "var(--text-normal)",
              cursor: "pointer",
              fontSize: "11px",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = "rgba(255,200,150,0.6)";
              e.target.style.background = "rgba(255,200,150,0.1)";
              e.target.style.color = "rgba(255,200,150,0.95)";
              e.target.style.transform = "rotate(-5deg) scale(1.05)";
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = "rgba(255,255,255,0.2)";
              e.target.style.background = "transparent";
              e.target.style.color = "var(--text-normal)";
              e.target.style.transform = "rotate(0deg) scale(1)";
            }}
          >
            Clear
          </button>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            {["all", "books", "films", "essays", "series"].map((b) => (
              <button
                key={b}
                onClick={() => {
                  setFilter(b);
                  setRowsShown(1);
                }}
                style={{
                  padding: "4px 12px",
                  fontSize: "11px",
                  borderRadius: "999px",
                  border:
                    filter === b
                      ? "1px solid rgba(255,255,255,0.7)"
                      : "1px solid rgba(255,255,255,0.28)",
                  background:
                    filter === b
                      ? "linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.78))"
                      : "rgba(255,255,255,0.04)",
                  color:
                    filter === b
                      ? "var(--background-primary)"
                      : "var(--text-normal)",
                  cursor: "pointer",
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  fontWeight: filter === b ? 600 : 400,
                  boxShadow:
                    filter === b
                      ? "0 2px 8px rgba(0,0,0,0.27)"
                      : "0 1px 4px rgba(0,0,0,0.17)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                }}
                onMouseEnter={(e) => {
                  if (filter !== b) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.12)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)";
                    e.currentTarget.style.transform = "translateY(-1px) scale(1.03)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (filter !== b) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.28)";
                    e.currentTarget.style.transform = "translateY(0) scale(1)";
                  }
                }}
              >
                {b.charAt(0).toUpperCase() + b.slice(1)}
              </button>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              alignItems: "center",
              paddingLeft: "8px",
              borderLeft: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                opacity: 0.8,
              }}
            >
              Status
            </div>
            {completionButtons.map((btn) => {
              const isActive = statusFilter === btn.key;
              return (
                <button
                  key={btn.key}
                  onClick={() => {
                    setStatusFilter(btn.key);
                    setRowsShown(1);
                  }}
                  style={{
                    padding: "4px 12px",
                    fontSize: "11px",
                    borderRadius: "999px",
                    border: isActive
                      ? "1px solid rgba(255,255,255,0.7)"
                      : "1px solid rgba(255,255,255,0.28)",
                    background: isActive
                      ? "linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.78))"
                      : "rgba(255,255,255,0.04)",
                    color: isActive
                      ? "var(--background-primary)"
                      : "var(--text-normal)",
                    cursor: "pointer",
                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    fontWeight: isActive ? 600 : 400,
                    boxShadow: isActive
                      ? "0 2px 8px rgba(0,0,0,0.27)"
                      : "0 1px 4px rgba(0,0,0,0.17)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "rgba(255,255,255,0.12)";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)";
                      e.currentTarget.style.transform = "translateY(-1px) scale(1.03)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.28)";
                      e.currentTarget.style.transform = "translateY(0) scale(1)";
                    }
                  }}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>


      {/* ===== FEATURED SPOTLIGHT BOX - STREAMING STYLE ===== */}
      {featured && (() => {
        const spotlightSrc = resolveCoverSrc(featured);
        const spotlightMarkdown = !spotlightSrc && (featured.coverLocal || featured.coverUrl) ? coverDisplayMarkdown(featured) : null;
        return (
        <div style={{
          marginBottom: "32px",
          padding: "24px",
          borderRadius: "14px",
          border: `1.5px solid var(--background-modifier-border)`,
          background: "linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
          boxShadow: "0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.08)",
          display: "flex",
          gap: "28px",
          alignItems: "stretch",
          overflow: "hidden",
          transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          animation: "fadeInUp 0.6s ease-out"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
          e.currentTarget.style.boxShadow = "0 12px 48px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.12)";
          e.currentTarget.style.background = "linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--background-modifier-border)";
          e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.08)";
          e.currentTarget.style.background = "linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))";
        }}
        >
          {/* LEFT: Details & Actions */}
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: "16px",
            minWidth: 0
          }}>
            {/* Label */}
            <div style={{
              fontSize: "11px",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              fontWeight: 600,
              color: "var(--text-muted)",
              opacity: 0.7
            }}>
              Featured Spotlight
            </div>

            {/* Title */}
            <div style={{
              fontSize: "28px",
              fontWeight: 700,
              lineHeight: "1.2",
              color: "var(--text-normal)",
              transition: "all 0.3s ease",
              animation: "slideInLeft 0.5s ease-out"
            }}>
              {featured.title}
            </div>

            {/* Creator & Meta */}
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px"
            }}>
              <div style={{
                fontSize: "14px",
                color: "var(--text-muted)",
                fontStyle: "italic",
                opacity: 0.85
              }}>
                {featured.creator || "Unknown Creator"}
              </div>
              <div style={{
                fontSize: "12px",
                color: "var(--text-muted)",
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
                opacity: 0.7
              }}>
                <span>{featured.mediaType}</span>
                {featured.year && <span>•</span>}
                {featured.year && <span>{featured.year}</span>}
                {featured.rating && <span>•</span>}
                {featured.rating && <span>★ {featured.rating}/10</span>}
              </div>
            </div>

            {/* Description (if available) */}
            {(featured.summary || featured.synopsis) && (
              <div style={{
                fontSize: "13px",
                lineHeight: "1.5",
                color: "var(--text-muted)",
                opacity: 0.8,
                maxHeight: "60px",
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical"
              }}>
                {featured.summary || featured.synopsis}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              marginTop: "8px"
            }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openModal(featured, e);
                }}
                style={{
                  padding: "8px 20px",
                  borderRadius: "22px",
                  border: "none",
                  background: "var(--text-normal)",
                  color: "var(--background-primary)",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "13px",
                  transition: "all 0.25s ease",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.08) translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1) translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
                }}
              >
                View Details
              </button>

            </div>
          </div>

          {/* RIGHT: Cover Image */}
          <div style={{
            flexShrink: 0,
            width: "220px",
            height: "280px",
            borderRadius: "10px",
            overflow: "hidden",
            boxShadow: "0 12px 36px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
            border: `1px solid rgba(255,255,255,0.1)`,
            cursor: "pointer",
            transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
            animation: "slideInRight 0.5s ease-out"
          }}
          onClick={(e) => openModal(featured, e)}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-8px) scale(1.04)";
            e.currentTarget.style.boxShadow = "0 20px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0) scale(1)";
            e.currentTarget.style.boxShadow = "0 12px 36px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)";
          }}
          >
            {spotlightSrc ? (
              <img
                src={spotlightSrc}
                alt={featured.title}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover"
                }}
              />
            ) : spotlightMarkdown ? (
              <dc.Markdown content={spotlightMarkdown} />
            ) : (
              <div style={{
                width: "100%",
                height: "100%",
                background: "var(--background-secondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-muted)",
                fontSize: "12px"
              }}>
                No cover
              </div>
            )}
          </div>
        </div>
        );
      })()}

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes cardShine {
          0% {
            transform: translateX(-140%) skewX(-20deg);
          }
          100% {
            transform: translateX(140%) skewX(-20deg);
          }
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>

      {/* ===== RESULTS INFO ===== */}
      <div style={{ marginBottom: "16px", color: "rgba(255,255,255,0.6)", fontSize: "13px" }}>
        Showing: <span style={{ fontWeight: 600 }}>{visible.length}</span> of <span style={{ fontWeight: 600 }}>{counts.all}</span>
      </div>

      {/* Grid of posters */}
      <div style={gridStyle}>
        {visible.map((it) => {
          const src = resolveCoverSrc(it);
          const markdownCover = !src && (it.coverLocal || it.coverUrl) ? coverDisplayMarkdown(it) : null;
          const safePath = it.path && it.path !== "#" ? it.path : undefined;
          const debugKey = `${it.title}-${it.path}`;
          return (
            <div key={safePath || it.title} style={{ textDecoration: "none" }}>
              <div
                style={cardStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-6px) scale(1.02)";
                  e.currentTarget.style.boxShadow = "0 14px 32px rgba(0,0,0,0.35)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                  const img = e.currentTarget.querySelector("img");
                  if (img) {
                    img.style.transform = "scale(1.04)";
                    img.style.filter = "saturate(1.08)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0) scale(1)";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.16)";
                  e.currentTarget.style.background = "linear-gradient(145deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015))";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                  const img = e.currentTarget.querySelector("img");
                  if (img) {
                    img.style.transform = "scale(1)";
                    img.style.filter = "saturate(1)";
                  }
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.08) 40%, transparent 60%)",
                    transform: "translateX(-140%) skewX(-20deg)",
                    animation: "cardShine 5.2s linear infinite",
                    opacity: 0.3,
                    pointerEvents: "none",
                  }}
                />
                <div
                  style={{ ...coverWrapper, cursor: "pointer" }}
                  onClick={(e) => openModal(it, e)}
                >
                  {src ? (
                    <img
                      src={src}
                      alt={it.title}
                      style={coverImg}
                      onLoad={(e) => {
                        console.log(`[IMG] ${debugKey}: ✓ Image loaded successfully from: ${src}`);
                      }}
                      onError={(e) => {
                        console.error(`[IMG] ${debugKey}: ✗ Image FAILED to load`);
                        console.error(`[IMG] ${debugKey}:   URL: "${src}"`);
                        console.error(`[IMG] ${debugKey}:   Error type: ${e.type}`);
                        console.error(`[IMG] ${debugKey}:   Status: ${e.target.status || "unknown"}`);
                        console.error(`[IMG] ${debugKey}:   Complete: ${e.target.complete}`);
                        console.error(`[IMG] ${debugKey}:   Natural size: ${e.target.naturalWidth}x${e.target.naturalHeight}`);
                        
                        e.target.style.display = "none";
                        e.target.parentElement.innerHTML = `
                          <div style="
                            position:absolute;
                            inset:0;
                            display:flex;
                            align-items:center;
                            justify-content:center;
                            color:#a88;
                            font-size:11px;
                            text-align:center;
                            padding:10px;
                            background:rgba(200,50,50,0.1);
                          ">
                            ⚠ Image failed to load
                          </div>
                        `;
                      }}
                    />
                  ) : markdownCover ? (
                    <dc.Markdown content={markdownCover} />
                  ) : (
                    <div style={{ ...coverImg, display: "flex", alignItems: "center", justifyContent: "center", color: "#777", padding: "12px", textAlign: "center" }}>
                      No cover (URL: null)
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px", flex: "1 1 auto" }}>
                {/* CARD TITLE: make the title a clickable link to the md page */}
                  <div style={titleStyle}>
                    {it.path && it.path !== "#" ? (
                      <span
                        onClick={() => app.workspace.openLinkText(it.path, "", false)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "var(--text-accent)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "var(--text-normal)";
                        }}
                        style={{
                          cursor: "pointer",
                          color: "var(--text-normal)",
                          transition: "color 0.18s ease"
                        }}
                      >
                        {it.title}
                      </span>
                    ) : (
                      it.title
                    )}
                  </div>

                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      fontStyle: "italic",
                      cursor: "pointer",
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      setSearch(it.creator || "");
                      setFilter("all");
                      setGenreFilter("");
                      setRowsShown(1);
                    }}
                  >
                    {it.creator || "Unknown"}
                  </div>

                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "auto" }}>
                    {it.genres && it.genres.slice(0, 3).map((g) => (
                    <div
                      key={g}
                      style={{
                        fontSize: "10px",
                        color: "var(--text-muted)",
                        padding: "2px 6px",
                        borderRadius: "6px",
                        border: "1px solid var(--background-modifier-border)"
                      }}
                    >{g}</div>
                    ))}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px", fontSize: "12px", color: "#aaa" }}>
                    <div>{it.mediaType}</div>
                    <div>{it.rating != null ? `★ ${it.rating}` : ""}</div>
                  </div>

                  <div style={{ fontSize: "11px", color: "#888" }}> 
                    {it.year || ""} 
                  </div>
                </div>
              </div>
            </div>  
          );
        })}
      </div>

      {/* Show more / end of results */}
      {hasMore ? (
        <div style={{ display: "flex", justifyContent: "center", marginTop: "12px" }}>
          <button onClick={() => setRowsShown((r) => r + 1)} style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #444", background: "transparent", color: "#ddd", cursor: "pointer" }}>
            Show more posters
          </button>
        </div>
      ) : (
        sorted.length > 0 && (
          <div style={{ textAlign: "center", marginTop: "12px", color: "#888" }}>
            End of results
          </div>
        )
      )}
      {modalOpen && activeItem && (
        <BodyPortal>
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100000
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            style={{
              position: "relative",
              width: "520px",
              maxWidth: "95vw",
              maxHeight: "80vh",
              overflowY: "auto",
              background: "var(--background-primary)",
              borderRadius: "14px",
              padding: "20px",
              border: "1px solid rgba(100, 200, 255, 0.2)",
              boxSizing: "border-box",
              boxShadow: "0 20px 60px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.1)",
              transform: "translateY(-4px)",
              transition: "transform 0.18s ease, opacity 0.18s ease",
              opacity: 1
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setModalOpen(false)}
              style={{ 
                position: "absolute", 
                top: 12, 
                right: 12,
                background: "rgba(255, 100, 100, 0.1)",
                border: "1px solid rgba(255, 100, 100, 0.3)",
                borderRadius: "6px",
                width: "32px",
                height: "32px",
                cursor: "pointer",
                color: "rgba(255, 150, 150, 0.7)",
                fontSize: "18px",
                transition: "all 0.15s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 100, 100, 0.2)";
                e.currentTarget.style.borderColor = "rgba(255, 100, 100, 0.5)";
                e.currentTarget.style.color = "rgba(255, 150, 150, 0.9)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 100, 100, 0.1)";
                e.currentTarget.style.borderColor = "rgba(255, 100, 100, 0.3)";
                e.currentTarget.style.color = "rgba(255, 150, 150, 0.7)";
              }}
            >
              ✕
            </button>

            <div style={{
              display: "flex",
              gap: "14px",
              marginBottom: "14px"
            }}>

              {resolveCoverSrc(activeItem) && (
                <img
                  src={resolveCoverSrc(activeItem)}
                  style={{
                    width: "110px",
                    borderRadius: "10px",
                    objectFit: "cover",
                    flexShrink: 0
                  }}
                />
              )}

              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px"
              }}>

                <div style={{
                  fontSize: "20px",
                  fontWeight: 700
                }}>
                  {activeItem.title}
                </div>

                <div style={{
                  fontSize: "13px",
                  color: "var(--text-muted)",
                  fontStyle: "italic"
                }}>
                  {activeItem.creator}
                </div>

                <div style={{
                  fontSize: "12px",
                  color: "var(--text-muted)"
                }}>
                  {activeItem.mediaType} • {activeItem.year || "Unknown year"}
                </div>
                {activeItem.path && activeItem.path !== "#" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setModalOpen(false);
                      app.workspace.openLinkText(activeItem.path, "", false);
                    }}
                    style={{
                      marginTop: "4px",
                      alignSelf: "flex-start",
                      padding: "4px 10px",
                      borderRadius: "8px",
                      border: "1px solid var(--background-modifier-border)",
                      background: "transparent",
                      color: "var(--text-normal)",
                      fontSize: "12px",
                      cursor: "pointer"
                    }}
                  >
                    Open page
                  </button>
                )}

                <div style={{
                  fontSize: "13px",
                  lineHeight: "1.5",
                  marginTop: "6px",
                  color: "var(--text-normal)"
                }}>
                  {
                    activeItem.summary ||
                    activeItem.description ||
                    activeItem.plot ||
                    "No summary available."
                  }
                </div>

                {activeItem.mediaType === "Book" && activeItem.synopsis && (
                  <div
                    style={{
                      marginTop: "10px",
                      padding: "10px",
                      borderRadius: "10px",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid var(--background-modifier-border)",
                      overflow: "hidden",
                      transition: "all 0.25s ease",
                      cursor: "pointer"
                    }}
                    onMouseEnter={(e) => {
                      const text = e.currentTarget.querySelector(".book-synopsis");
                      if (text) {
                        text.style.webkitLineClamp = "unset";
                        text.style.maxHeight = "500px";
                      }
                    }}
                    onMouseLeave={(e) => {
                      const text = e.currentTarget.querySelector(".book-synopsis");
                      if (text) {
                        text.style.webkitLineClamp = "3";
                        text.style.maxHeight = "4.5em";
                      }
                    }}
                  >
                    <div
                      style={{
                        fontSize: "11px",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "var(--text-muted)",
                        marginBottom: "6px"
                      }}
                    >
                      Synopsis
                    </div>

                    <div
                      className="book-synopsis"
                      style={{
                        fontSize: "13px",
                        lineHeight: "1.5",
                        color: "var(--text-normal)",
                        display: "-webkit-box",
                        WebkitLineClamp: "3",
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        maxHeight: "4.5em",
                        transition: "all 0.25s ease"
                      }}
                    >
                      {activeItem.synopsis}
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* STATUS & OVERALL RATING */}
            <div style={{ marginTop: "12px" }}>
              <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                Status & overall rating
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px" }}>
                Use this for your general progress and how you feel overall about this book/movie.
              </div>

              <select
                value={activeItem.status || ""}
                onChange={(e) =>
                  setActiveItem({ ...activeItem, status: e.target.value })
                }
                style={{
                  padding: "6px",
                  borderRadius: "8px",
                  marginTop: "4px"
                }}
              >
                {["Book", "Essay"].includes(activeItem.mediaType) ? (
                  <>
                    <option value="want to read">Want to read</option>
                    <option value="started reading">Started reading</option>
                    <option value="currently reading">Currently reading</option>
                    <option value="finished reading">Finished reading</option>
                  </>
                ) : (
                  <>
                    <option value="want to watch">Want to watch</option>
                    <option value="started watching">Started watching</option>
                    <option value="currently watching">Currently watching</option>
                    <option value="finished watching">Finished watching</option>
                  </>
                )}
              </select>

              <div style={{ marginTop: "10px" }}>
                <div style={{ fontSize: "12px", marginBottom: "4px" }}>
                  Overall rating: {activityRating}/10
                </div>
                <div style={{ display: "flex", gap: "4px" }}>
                  {[...Array(10)].map((_, i) => (
                    <span
                      key={i}
                      onClick={() => setActivityRating(i + 1)}
                      style={{
                        cursor: "pointer",
                        color: i < activityRating ? "gold" : "#555"
                      }}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>


              <button
                onClick={() =>
                  updateCore(activeItem, {
                    status: activeItem.status,
                    rating: activityRating
                  })
                }
                style={{ marginTop: "8px" }}
              >
                Save status & rating
              </button>
            </div>

            {/* ACTIVITY FORM */}
            <div style={{ marginTop: "16px" }}>
              <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                {editingIndex == null ? "Add activity" : "Edit activity"}
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>
                Log a single read/watch with its own dates and rating. The first finished
                entry is marked as “Read/Watched”; later ones become “Re‑read/Re‑watched”.
              </div>

              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: "11px", marginBottom: "2px" }}>Started</div>
                  <input
                    type="date"
                    value={activityStarted}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val && val > getTodayDateString()) {
                        alert("Date cannot be in the future");
                        setActivityStarted("");
                      } else {
                        setActivityStarted(val);
                      }
                    }}
                    max={getTodayDateString()}
                  />
                </div>

                <div>
                  <div style={{ fontSize: "11px", marginBottom: "2px" }}>Finished</div>
                  <input
                    type="date"
                    value={activityFinished}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val && val > getTodayDateString()) {
                        alert("Date cannot be in the future");
                        setActivityFinished("");
                      } else {
                        setActivityFinished(val);
                      }
                    }}
                    max={getTodayDateString()}
                  />
                </div>
              </div>

              <div style={{ marginTop: "6px" }}>
                <div style={{ fontSize: "11px", marginBottom: "2px" }}>Type</div>
                <select
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value)}
                >
                  <option value="watch">Watch</option>
                  <option value="read">Read</option>
                </select>
              </div>

              <div style={{ marginTop: "6px" }}>
                <div style={{ fontSize: "12px", marginBottom: "2px" }}>
                  Activity rating: {activityRating}/10
                </div>
                <div style={{ display: "flex", gap: "4px" }}>
                  {[...Array(10)].map((_, i) => (
                    <span
                      key={i}
                      onClick={() => setActivityRating(i + 1)}
                      style={{
                        cursor: "pointer",
                        color: i < activityRating ? "gold" : "#555"
                      }}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: "8px", display: "flex", gap: "8px" }}>
                <button
                  onClick={async () => {
                    // how many existing completions for this base type?
                    const baseType = activityType; // "read" or "watch"
                    const existing = activities
                      .filter(a => a.type === baseType)
                      .sort((a, b) => a.index - b.index);
                    const nextIndex = existing.length ? existing[existing.length - 1].index + 1 : 1;
                    const existingEntry = editingIndex == null
                      ? null
                      : activities.find(a => a.blockIndex === editingIndex);
                    const index = existingEntry ? existingEntry.index : nextIndex;
                    const dateForHeader = activityFinished || activityStarted || new Date().toISOString().slice(0, 10);

                    const block = buildActivityBlock({
                      type: baseType,
                      started: activityStarted || "",
                      finished: activityFinished || "",
                      date: dateForHeader,
                      index,
                      rating: activityRating
                    });

                    if (editingIndex == null) {
                      // new activity
                      await addActivity(activeItem, block);
                    } else {
                      // editing existing (editingIndex is zero-based in activity block order)
                      await updateActivityBlock(activeItem, editingIndex, block);
                    }

                    // reload activities after write
                    const parsed = await loadActivitiesForItem(activeItem);
                    setActivities(parsed);
                    setEditingIndex(null);
                  }}
                >
                  {editingIndex == null ? "Add activity" : "Save changes"}
                </button>

                {editingIndex != null && (
                  <button
                    onClick={() => {
                      setEditingIndex(null);
                      setActivityStarted("");
                      setActivityFinished("");
                    }}
                  >
                    Cancel edit
                  </button>
                )}
              </div>
            </div>
            
            {/* ACTIVITY HISTORY */}
            {activities.length > 0 && (
              <div style={{ marginTop: "18px" }}>
                <div
                  style={{
                    fontWeight: 600,
                    marginBottom: "6px"
                  }}
                >
                  Activity history
                </div>

                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    marginBottom: "6px"
                  }}
                >
                  Click “Edit” to load an entry into the form above.
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px"
                  }}
                >
                  {activities
                    .slice()
                    .sort((a, b) => a.index - b.index)
                    .map((act, idx) => {
                      const blockIndex = Number.isInteger(act.blockIndex) ? act.blockIndex : idx;
                      const isFirst = act.index === 1;
                      const isWatch = act.type === "watch";

                      const label = isFirst
                        ? (isWatch ? "Watched" : "Read")
                        : (isWatch ? "Re-watched" : "Re-read");

                      return (
                        <div
                          key={blockIndex}
                          style={{
                            padding: "8px 10px",
                            borderRadius: "8px",
                            border: "1px solid var(--background-modifier-border)",
                            background: "rgba(255,255,255,0.02)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "10px",
                            fontSize: "12px"
                          }}
                        >
                          {/* LEFT SIDE */}
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "2px",
                              flex: 1,
                              minWidth: 0
                            }}
                          >
                            <div>
                              <b>{label}</b> — #{act.index} —{" "}
                              {act.date || "no date"}
                            </div>

                            <div
                              style={{
                                color: "var(--text-muted)",
                                fontSize: "11px"
                              }}
                            >
                              {act.started && act.finished
                                ? `From ${act.started} to ${act.finished}`
                                : act.started
                                ? `Started ${act.started}`
                                : act.finished
                                ? `Finished ${act.finished}`
                                : "No dates logged"}

                              {act.rating
                                ? ` • Rating: ${act.rating}/10`
                                : ""}
                            </div>
                          </div>

                          {/* RIGHT SIDE BUTTONS */}
                          <div
                            style={{
                              display: "flex",
                              gap: "4px",
                              flexShrink: 0
                            }}
                          >
                            <button
                              onClick={() => {
                                setEditingIndex(blockIndex);

                                setActivityStarted(act.started || "");

                                setActivityFinished(
                                  act.finished || act.date || ""
                                );

                                setActivityType(
                                  act.type ||
                                  (
                                    activeItem.mediaType === "Book"
                                      ? "read"
                                      : "watch"
                                  )
                                );

                                setActivityRating(act.rating || 0);
                              }}
                              style={{
                                fontSize: "11px",
                                padding: "4px 8px",
                                borderRadius: "6px",
                                border: "1px solid var(--background-modifier-border)",
                                cursor: "pointer"
                              }}
                            >
                              Edit
                            </button>

                            <button
                              onClick={async () => {
                                const file = app.vault.getAbstractFileByPath(activeItem.path);

                                if (!file) return;

                                let content = await app.vault.read(file);

                                const blocks = content
                                  .split(/\n(?=> \[!activity\])/g);

                                let activityIdx = -1;

                                const filtered = blocks.filter((b) => {
                                  if (b.trimStart().startsWith("> [!activity]")) {
                                    activityIdx += 1;
                                    return activityIdx !== blockIndex;
                                  }

                                  return true;
                                });

                                await app.vault.modify(
                                  file,
                                  filtered.join("\n")
                                );

                                const parsed =
                                  await loadActivitiesForItem(activeItem);

                                setActivities(parsed);
                                if (editingIndex === blockIndex) {
                                  setEditingIndex(null);
                                  setActivityStarted("");
                                  setActivityFinished("");
                                }
                              }}
                              style={{
                                fontSize: "11px",
                                padding: "4px 8px",
                                borderRadius: "6px",
                                border: "1px solid rgba(255,80,80,0.4)",
                                color: "#ff8080",
                                background: "transparent",
                                cursor: "pointer"
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

          </div>
        </div>
        </BodyPortal>
      )}
    </div>
  );
}

return <MediaCounter />;
```