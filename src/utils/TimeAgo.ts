function parseToDate(value: string): Date | null {
	const date = new Date(value);
	if (!Number.isNaN(date.getTime())) {
		return date;
	}

	const normalized = value.trim();
	if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
		return new Date(`${normalized}T00:00:00`);
	}

	return null;
}

export function timeAgoFromDate(value: string): string {
	const date = parseToDate(value);
	if (!date) {
		return "unknown";
	}

	const deltaMs = Date.now() - date.getTime();
	if (deltaMs < 0) {
		return "just now";
	}

	const seconds = Math.floor(deltaMs / 1000);
	if (seconds < 60) {
		return `${seconds} sec ago`;
	}

	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) {
		return `${minutes} min ago`;
	}

	const hours = Math.floor(minutes / 60);
	if (hours < 24) {
		return `${hours} hr ago`;
	}

	const days = Math.floor(hours / 24);
	return `${days} day${days === 1 ? "" : "s"} ago`;
}
