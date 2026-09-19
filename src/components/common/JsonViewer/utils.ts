export interface JsonParseResult {
	isJson: boolean;
	data: any;
	formatted: string;
	error?: string;
}

export function tryParseJson(text: string): JsonParseResult {
	const trimmed = text.trim();
	if (!trimmed) {
		return { isJson: false, data: null, formatted: text };
	}

	// Common check for JSON starting token
	if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
		return { isJson: false, data: null, formatted: text };
	}

	try {
		const data = JSON.parse(trimmed);
		return {
			isJson: true,
			data,
			formatted: JSON.stringify(data, null, 2),
		};
	} catch (err: any) {
		return {
			isJson: false,
			data: null,
			formatted: text,
			error: err.message || "Invalid JSON syntax",
		};
	}
}

export function isXml(text: string): boolean {
	const trimmed = text.trim();
	return (
		(trimmed.startsWith("<?xml") || trimmed.startsWith("<")) &&
		trimmed.endsWith(">") &&
		(trimmed.includes("</") || trimmed.endsWith("/>"))
	);
}

export function formatXml(xml: string): string {
	try {
		let formatted = "";
		let indent = 0;
		const reg = /(>)(<)(\/*)/g;
		const cleanXml = xml.replace(reg, "$1\r\n$2$3");
		const lines = cleanXml.split("\r\n");

		lines.forEach((line) => {
			let currentIndent = 0;
			if (line.match(/.+<\/\w[^>]*>$/)) {
				currentIndent = 0;
			} else if (line.match(/^<\/\w/)) {
				if (indent !== 0) {
					indent -= 1;
				}
			} else if (line.match(/^<\w[^>]*[^/]>.*$/)) {
				currentIndent = 1;
			}

			formatted += "  ".repeat(indent) + line + "\n";
			indent += currentIndent;
		});

		return formatted.trim();
	} catch {
		return xml;
	}
}

export function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / k ** i).toFixed(1)) + " " + sizes[i];
}
