import { App, Modal } from "obsidian";
import { MediaItem } from "../models";
import { MediaLibraryCustomList } from "../settings";
import { Poster } from "../PluginControllers";

export interface MediaListModalOptions {
  app: App;
  list: MediaLibraryCustomList;
  allItemsByPath: Map<string, MediaItem>;
  onSave(list: MediaLibraryCustomList): Promise<void> | void;
}

/**
 * MediaListModal
 *
 * Single modal that behaves like a small gallery view.
 * - Title + description at the top
 * - Edit button in the header toggles edit mode
 * - In edit mode you can:
 *   - Rename the list
 *   - Edit the description
 *   - Add items from a dropdown
 *   - Remove items directly from the grid
 */
export class MediaListModal extends Modal {
  private list: MediaLibraryCustomList;
  private allItemsByPath: Map<string, MediaItem>;
  private onSave: (list: MediaLibraryCustomList) => Promise<void> | void;

  private isEditing = false;

  constructor(opts: MediaListModalOptions) {
    super(opts.app);
    this.list = { ...opts.list };
    this.allItemsByPath = opts.allItemsByPath;
    this.onSave = opts.onSave;
  }

  onOpen(): void {
    this.render();
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private render(): void {
    const { contentEl } = this;
    contentEl.empty();

    const shell = contentEl.createDiv({ cls: "media-list-modal" });

    // HEADER ROW -----------------------------------------------------------
    const header = shell.createDiv({ cls: "media-list-modal-header" });

    const titleBlock = header.createDiv({ cls: "media-list-modal-title-block" });

    if (!this.isEditing) {
      const title = titleBlock.createEl("h2", {
        cls: "media-list-modal-title",
      });
      title.textContent = this.list.name;
    } else {
      const titleLabel = titleBlock.createDiv({
        cls: "media-list-modal-field-label",
        text: "List title",
      });
      void titleLabel; // label for screen readers / layout only
      const titleInput = titleBlock.createEl("input", {
        cls: "media-list-modal-title-input",
        type: "text",
      });
      titleInput.value = this.list.name;
      titleInput.addEventListener("input", () => {
        this.list.name = titleInput.value.trim() || this.list.name;
      });
    }

    const headerControls = header.createDiv({ cls: "media-list-modal-header-controls" });

    const editButton = headerControls.createEl("button", {
      text: this.isEditing ? "Done" : "Edit",
      cls: "media-list-modal-edit",
    });
    editButton.type = "button";

    const closeButton = headerControls.createEl("button", {
      text: "Close",
      cls: "media-list-modal-close",
    });
    closeButton.type = "button";

    closeButton.addEventListener("click", () => this.close());
    editButton.addEventListener("click", () => {
      this.isEditing = !this.isEditing;
      this.render();
    });

    // DESCRIPTION ---------------------------------------------------------
    const descSection = shell.createDiv({ cls: "media-list-modal-desc" });

    if (!this.isEditing) {
      descSection.createDiv({
        cls: "media-list-modal-desc-text",
        text: this.list.description || "No description yet.",
      });
    } else {
      const descLabel = descSection.createDiv({
        cls: "media-list-modal-field-label",
        text: "Description",
      });
      void descLabel;
      const textarea = descSection.createEl("textarea", {
        cls: "media-list-modal-desc-input",
      });
      textarea.value = this.list.description ?? "";
      textarea.addEventListener("input", () => {
        this.list.description = textarea.value.trim() || undefined;
      });
    }

    // EDIT TOOLS ROW ------------------------------------------------------
    if (this.isEditing) {
      const toolsRow = shell.createDiv({ cls: "media-list-modal-tools" });

      const picker = toolsRow.createEl("select", {
        cls: "media-list-modal-add-select",
      });

      // All items, sorted alphabetically for now
      const allItems = Array.from(this.allItemsByPath.values()).sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
      );

      picker.createEl("option", {
        value: "",
        text: "Add media to this list…",
      });

      for (const item of allItems) {
        picker.createEl("option", {
          value: item.path,
          text: item.title,
        });
      }

      const addButton = toolsRow.createEl("button", {
        text: "Add",
        cls: "media-list-modal-add-button",
      });
      addButton.type = "button";
      addButton.addEventListener("click", () => {
        const value = picker.value;
        if (!value || this.list.itemPaths.includes(value)) {
          return;
        }
        this.list.itemPaths = [...this.list.itemPaths, value];
        this.list.updatedAt = new Date().toISOString();
        this.render();
      });
    }

    // GRID ---------------------------------------------------------------
    const itemsSection = shell.createDiv({ cls: "media-list-modal-items" });

    itemsSection.createDiv({
      cls: "media-list-modal-items-label",
      text: `Items (${this.list.itemPaths.length})`,
    });

    if (!this.list.itemPaths.length) {
      itemsSection.createDiv({
        cls: "media-list-modal-empty",
        text: "No media in this list yet.",
      });
      return;
    }

    const grid = itemsSection.createDiv({ cls: "media-list-modal-grid" });

    for (const path of this.list.itemPaths) {
      const item = this.allItemsByPath.get(path);
      if (!item) continue;

      const card = grid.createDiv({ cls: "media-list-modal-card" });
      const posterHost = card.createDiv({ cls: "media-list-modal-poster" });
      new Poster(item, this.app).render(posterHost);

      const body = card.createDiv({ cls: "media-list-modal-card-body" });
      body.createDiv({
        cls: "media-list-modal-card-title",
        text: item.title,
      });
      if (item.creator) {
        body.createDiv({
          cls: "media-list-modal-card-meta",
          text: item.creator,
        });
      }

      card.addEventListener("click", () => {
        void this.app.workspace.openLinkText(item.path, "", false);
      });

      if (this.isEditing) {
        const removeBtn = card.createEl("button", {
          text: "Remove",
          cls: "media-list-modal-remove",
        });
        removeBtn.type = "button";
        removeBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.list.itemPaths = this.list.itemPaths.filter((p) => p !== path);
          this.list.updatedAt = new Date().toISOString();
          this.render();
        });
      }
    }

    // FOOTER SAVE --------------------------------------------------------
    if (this.isEditing) {
      const footer = shell.createDiv({ cls: "media-list-modal-footer" });
      const saveButton = footer.createEl("button", {
        text: "Save changes",
        cls: "media-list-modal-save",
      });
      saveButton.type = "button";
      saveButton.addEventListener("click", async () => {
        await this.onSave(this.list);
        this.isEditing = false;
        this.render();
      });
    }
  }
}
