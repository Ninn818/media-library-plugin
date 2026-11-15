export interface LibraryShellElements {
	bodyHost: HTMLElement;
	mainHost: HTMLElement;
	spotlightHost: HTMLElement;
	contentHost: HTMLElement;
	sidebarHost: HTMLElement;

}

export function renderLibraryShell(container: HTMLElement): LibraryShellElements {
	const body = container.createDiv({ cls: "media-library-body" });
	const mainColumn = body.createDiv({ cls: "media-library-main" });
	const sidebarHost = body.createDiv({ cls: "media-library-sidebar" });

	const spotlightHost = mainColumn.createDiv({ cls: "media-library-spotlight-shell" });
	const contentHost = mainColumn.createDiv({ cls: "media-library-content" });
	

	return {
		bodyHost: body,
		mainHost: mainColumn,
		spotlightHost,
		contentHost,
		sidebarHost,
	};
}