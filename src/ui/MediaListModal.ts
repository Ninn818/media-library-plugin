import { App, Modal } from "obsidian";
import { MediaItem } from "../models/MediaItem";
import { MediaLibraryCustomList } from "../settings";
import { Poster } from "../components/Poster";

export interface MediaListModalOptions {
    app: App;
    list: MediaLibraryCustomList;
    allItemsByPath: Map<string, MediaItem>;
    onSave(list: MediaLibraryCustomList): Promise<void> | void;
}

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

  private render(): void {
    const { contentEl } = this;
    contentEl.empty();

    const shell = contentEl.createDiv({ cls: "media-list-modal" });

    // Header
    const header = shell.createDiv({ cls: "media-list-modal-header" });
    const title = header.createEl("h2", { cls: "media-list-modal-title" });
    title.textContent = this.list.name;

    const controls = header.createDiv({ cls: "media-list-modal-controls" });

    const editButton = controls.createEl("button", {
      text: this.isEditing ? "Done" : "Edit",
      cls: "media-list-modal-edit",
    });
    editButton.type = "button";

    const closeButton = controls.createEl("button", {
      text: "Close",
      cls: "media-list-modal-close",
    });
    closeButton.type = "button";

    closeButton.addEventListener("click", () => this.close());
    editButton.addEventListener("click", () => {
      this.isEditing = !this.isEditing;
      this.render();
    });

    // Description
    const descSection = shell.createDiv({ cls: "media-list-modal-section" });
    descSection.createDiv({
      cls: "media-list-modal-section-label",
      text: "Description",
    });

    if (!this.isEditing) {
      descSection.createDiv({
        cls: "media-list-modal-description",
        text: this.list.description || "No description yet.",
      });
    } else {
      const textarea = descSection.createEl("textarea", {
        cls: "media-list-modal-description-input",
      });
      textarea.value = this.list.description ?? "";
      textarea.addEventListener("input", () => {
        this.list.description = textarea.value.trim() || undefined;
      });
    }

    // Items section
    const itemsSection = shell.createDiv({ cls: "media-list-modal-section" });
    itemsSection.createDiv({
      cls: "media-list-modal-section-label",
      text: `Items (${this.list.itemPaths.length})`,
    });

    if (!this.list.itemPaths.length) {
      itemsSection.createDiv({
        cls: "media-list-modal-empty",
        text: "No media in this list yet.",
      });
    } else {
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
    }

    // Editing: add media
    if (this.isEditing) {
      const addRow = shell.createDiv({ cls: "media-list-modal-add-row" });
      const picker = addRow.createEl("select", {
        cls: "media-list-modal-add-select",
      });
      for (const item of this.allItemsByPath.values()) {
        picker.createEl("option", {
          value: item.path,
          text: item.title,
        });
      }

      const addButton = addRow.createEl("button", {
        text: "Add media",
        cls: "media-list-modal-add-button",
      });
      addButton.type = "button";
      addButton.addEventListener("click", () => {
        const value = picker.value;
        if (
          !value ||
          this.list.itemPaths.includes(value)
        ) {
          return;
        }
        this.list.itemPaths = [...this.list.itemPaths, value];
        this.list.updatedAt = new Date().toISOString();
        this.render();
      });
    }

    // Footer save
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

  onClose(): void {
    this.contentEl.empty();
  }
}