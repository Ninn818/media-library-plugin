import { App, TFile } from "obsidian";

import { TagStorageFormat } from "../settings";

const TAG_BLOCK_START = "<!-- media-library-tags:start -->";
const TAG_BLOCK_END = "<!-- media-library-tags:end -->";
const TAG_CALLOUT_HEADER = "> [!media-tags]+ Media tags";
const MEDIA_TAGS_FIELD = "mediaTags";

function normalizeTag(rawTag: string): string {
	return rawTag.trim().replace(/^#+/, "").replace(/^\[\[|\]\]$/g, "").replace(/\s+/g, "-").toLowerCase();
}

function formatTag(tag: string, format: TagStorageFormat): string {
	if (format === "wikilink") {
		return `[[${tag}]]`;
	}

	return `#${tag}`;
}

function readFrontmatterMediaTags(frontmatter: Record<string, unknown>): string[] {
	const value = frontmatter[MEDIA_TAGS_FIELD];
	if (Array.isArray(value)) {
		return value.map((entry) => String(entry));
	}

	if (typeof value === "string") {
		return value
			.split(/[\s,]+/)
			.map((entry) => entry.trim())
			.filter((entry) => entry.length > 0);
	}

	return [];
}

function renderTagBlock(tags: string[]): string {
	const line = tags.join(" ");
	return `${TAG_BLOCK_START}\n${TAG_CALLOUT_HEADER}\n> ${line}\n${TAG_BLOCK_END}\n`;
}

function upsertInlineTagBlock(content: string, nextTags: string[]): string {
	const startIndex = content.indexOf(TAG_BLOCK_START);
	const endIndex = content.indexOf(TAG_BLOCK_END);

	const deduped = [...new Set(nextTags.map((tag) => tag.trim()).filter((tag) => tag.length > 0))];
	if (deduped.length === 0) {
		return content;
	}

	if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
		const suffix = content.endsWith("\n") ? "" : "\n";
		return `${content}${suffix}\n${renderTagBlock(deduped)}`;
	}

	const before = content.slice(0, startIndex);
	const after = content.slice(endIndex + TAG_BLOCK_END.length);

	const normalizedAfter = after.startsWith("\n") ? after.slice(1) : after;
	return `${before}${renderTagBlock(deduped)}${normalizedAfter}`;
}

export async function addTagToMediaNote(app: App, itemPath: string, rawTag: string, format: TagStorageFormat): Promise<{ added: boolean; value: string; reason?: string }> {
	const file = app.vault.getAbstractFileByPath(itemPath);
	if (!(file instanceof TFile)) {
		return { added: false, value: "", reason: "note-not-found" };
	}

	const normalized = normalizeTag(rawTag);
	if (!normalized) {
		return { added: false, value: "", reason: "empty-tag" };
	}

	const formatted = formatTag(normalized, format);
	let added = false;
	let updatedMediaTags: string[] = [];
	await app.fileManager.processFrontMatter(file, (frontmatter) => {
		const mutableFrontmatter = frontmatter as Record<string, unknown>;
		const tags = readFrontmatterMediaTags(mutableFrontmatter);
		if (tags.includes(formatted)) {
			updatedMediaTags = tags;
			return;
		}
		updatedMediaTags = [...tags, formatted];
		mutableFrontmatter[MEDIA_TAGS_FIELD] = updatedMediaTags;
		added = true;
	});

	if (added) {
		const current = await app.vault.cachedRead(file);
		const updated = upsertInlineTagBlock(current, updatedMediaTags);
		if (updated !== current) {
			await app.vault.modify(file, updated);
		}
	}

	return { added, value: formatted };
}
