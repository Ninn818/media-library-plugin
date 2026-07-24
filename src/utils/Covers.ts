import { App, TFile } from "obsidian";

function unwrapCoverSource(source: string): string {
	let normalized = source.trim();

	for (let index = 0; index < 4; index += 1) {
		const next = normalized
			.replace(/^!\[[^\]]*\]\((.+)\)$/, "$1")
			.replace(/^\[[^\]]*\]\((.+)\)$/, "$1")
			.replace(/^!\[\[([^|\]#]+)(?:#[^|\]]+)?(?:\|[^\]]*)?\]\]$/, "$1")
			.replace(/^\[\[([^|\]#]+)(?:#[^|\]]+)?(?:\|[^\]]*)?\]\]$/, "$1")
			.replace(/^\((.*)\)$/, "$1")
			.replace(/^<(.*)>$/, "$1")
			.replace(/^"(.*)"$/, "$1")
			.replace(/^'(.*)'$/, "$1");

		if (next === normalized) {
			break;
		}

		normalized = next.trim();
	}

	return normalized;
}

function normalizeExternalCoverUrl(source: string): string {
	return source
		.replace(/^http:\/\/books\.google\.com/i, "https://books.google.com")
		.replace(/^https:\/\/books\.google\.com\/books\/content\?/i, "https://books.google.com/books/content?");
}

function toPathCandidates(source: string): string[] {
	const candidates = new Set<string>();
	const normalized = source.replace(/\\/g, "/").trim();

	if (normalized.length > 0) {
		candidates.add(normalized);
		candidates.add(normalized.replace(/^\/+/, ""));
		candidates.add(normalized.replace(/^\.\//, ""));
	}

	for (const candidate of [...candidates]) {
		if (!candidate.includes("%")) {
			continue;
		}

		try {
			const decoded = decodeURIComponent(candidate);
			if (decoded.length > 0) {
				candidates.add(decoded);
				candidates.add(decoded.replace(/^\/+/, ""));
			}
		} catch {
			// Keep original candidate if decode fails.
		}
	}

	return [...candidates].filter((candidate) => candidate.length > 0);
}

function toResourcePath(app: App, file: TFile | null): string | null {
	if (!file) {
		return null;
	}

	return app.vault.getResourcePath(file);
}

function resolveFileCandidate(app: App, candidate: string, itemPath: string): string | null {
	const direct = app.vault.getAbstractFileByPath(candidate);
	if (direct instanceof TFile) {
		return toResourcePath(app, direct);
	}

	const linked = app.metadataCache.getFirstLinkpathDest(candidate, itemPath);
	if (linked instanceof TFile) {
		return toResourcePath(app, linked);
	}

	const linkedFromRoot = app.metadataCache.getFirstLinkpathDest(candidate, "");
	if (linkedFromRoot instanceof TFile) {
		return toResourcePath(app, linkedFromRoot);
	}

	if (!candidate.startsWith("/") && itemPath) {
		const lastSlashIndex = itemPath.lastIndexOf("/");
		const folder = lastSlashIndex >= 0 ? itemPath.slice(0, lastSlashIndex) : "";
		if (folder.length > 0) {
			const relative = `${folder}/${candidate}`;
			const relativeFile = app.vault.getAbstractFileByPath(relative);
			if (relativeFile instanceof TFile) {
				return toResourcePath(app, relativeFile);
			}
		}
	}

	return null;
}

function resolveByLoosePathMatch(app: App, candidates: string[]): string | null {
	const files = app.vault.getFiles();
	const lowerCasePaths = new Set(candidates.map((candidate) => candidate.toLowerCase()));

	for (const file of files) {
		const filePath = file.path.toLowerCase();
		if (lowerCasePaths.has(filePath)) {
			return app.vault.getResourcePath(file);
		}
	}

	for (const candidate of candidates) {
		const lowerCandidate = candidate.toLowerCase();
		const suffixed = `/${lowerCandidate}`;

		for (const file of files) {
			const filePath = file.path.toLowerCase();
			if (filePath.endsWith(suffixed)) {
				return app.vault.getResourcePath(file);
			}
		}
	}

	// Fallback for moved/renamed folders: match by filename when path prefixes drift.
	for (const candidate of candidates) {
		const filename = candidate.split("/").pop()?.toLowerCase();
		if (!filename) {
			continue;
		}

		const matches = files.filter((file) => file.name.toLowerCase() === filename);
		if (matches.length === 1) {
			const match = matches[0];
			if (match) {
				return app.vault.getResourcePath(match);
			}
		}
	}

	return null;
}

export function resolveCoverSource(app: App | undefined, itemPath: string, source: string): string {
	const unwrapped = unwrapCoverSource(source);
	const external = normalizeExternalCoverUrl(unwrapped);

	if (external.startsWith("http://") || external.startsWith("https://")) {
		return external;
	}

	if (!app) {
		return external;
	}

	const candidates = toPathCandidates(external);

	for (const candidate of candidates) {
		const resolved = resolveFileCandidate(app, candidate, itemPath);
		if (resolved) {
			return resolved;
		}
	}

	const looseMatch = resolveByLoosePathMatch(app, candidates);
	if (looseMatch) {
		return looseMatch;
	}

	return external;
}
