import { setIcon } from "obsidian";

export function renderMediaDashboardToolbar(
	container: HTMLElement
): void {
	const toolbar = container.createDiv({ cls: "media-library-toolbar media-dashboard-toolbar" });
	const titleWrap = toolbar.createDiv({ cls: "media-dashboard-toolbar-title-wrap" });
	const icon = titleWrap.createSpan({ cls: "media-dashboard-toolbar-title-icon" });
	setIcon(icon, "layout-dashboard");
	icon.setAttr("aria-hidden", "true");
	titleWrap.createEl("h2", { text: "Media Dashboard" });
	toolbar.createDiv({
		text: "Filters now live in the sidebar so you can keep them in view while reading the charts.",
		cls: "media-dashboard-toolbar-copy",
	});
}