/**
 * Hex dump and Base64 parsing utilities for raw & binary RabbitMQ message payloads.
 */

interface HexLine {
	offset: string;
	hexLeft: string;
	hexRight: string;
	ascii: string;
}

export interface HexDumpResult {
	lines: HexLine[];
	totalBytes: number;
	truncated: boolean;
}

/**
 * Checks if a string appears to be valid Base64 encoding.
 */
export function isBase64(str: string): boolean {
	if (!str || typeof str !== "string") return false;
	const trimmed = str.trim();
	if (trimmed.length < 4 || trimmed.length % 4 !== 0) return false;
	// Ignore if it's already plain readable JSON or XML
	if (trimmed.startsWith("{") || trimmed.startsWith("[") || trimmed.startsWith("<")) {
		return false;
	}
	const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
	return base64Regex.test(trimmed);
}

/**
 * Safely decodes a Base64 string into UTF-8 text.
 */
export function tryDecodeBase64(str: string): { success: boolean; text: string } {
	try {
		const decoded = atob(str.trim());
		return { success: true, text: decoded };
	} catch {
		return { success: false, text: str };
	}
}

/**
 * Generates formatted Hexdump lines from a string payload.
 */
export function generateHexDump(input: string, maxBytes = 2048): HexDumpResult {
	const encoder = new TextEncoder();
	const bytes = encoder.encode(input);
	const totalBytes = bytes.length;
	const truncated = totalBytes > maxBytes;
	const displayBytes = truncated ? bytes.slice(0, maxBytes) : bytes;

	const lines: HexLine[] = [];
	const chunkSize = 16;

	for (let i = 0; i < displayBytes.length; i += chunkSize) {
		const slice = displayBytes.slice(i, i + chunkSize);
		const offset = i.toString(16).padStart(8, "0");

		const hexParts: string[] = [];
		let ascii = "";

		for (let j = 0; j < chunkSize; j++) {
			if (j < slice.length) {
				const b = slice[j];
				hexParts.push(b.toString(16).padStart(2, "0"));
				// Printable ASCII between 32 and 126
				if (b >= 32 && b <= 126) {
					ascii += String.fromCharCode(b);
				} else {
					ascii += ".";
				}
			} else {
				hexParts.push("  ");
			}
		}

		const hexLeft = hexParts.slice(0, 8).join(" ");
		const hexRight = hexParts.slice(8, 16).join(" ");

		lines.push({
			offset,
			hexLeft,
			hexRight,
			ascii,
		});
	}

	return {
		lines,
		totalBytes,
		truncated,
	};
}
