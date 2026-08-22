export type MediaActivityKind = "read" | "watch";

export interface MediaActivityEntry {
	date: string;
	status: string | null;
	rating: number | null;
	note?: string;
	kind: MediaActivityKind;
	recordedAt?: string;
}