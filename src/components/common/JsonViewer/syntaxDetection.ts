export type SupportedLanguage = "json" | "xml" | "yaml" | "jwt" | "text";

/**
 * Checks if a string looks like a JWT token (3 dot-separated base64url parts starting with ey)
 */
export function isJwt(text: string): boolean {
	const trimmed = text.trim();
	if (!trimmed.startsWith("ey")) return false;
	const parts = trimmed.split(".");
	if (parts.length !== 3) return false;
	return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(trimmed);
}

/**
 * Checks if a string looks like XML / HTML
 */
export function isXmlContent(text: string): boolean {
	const trimmed = text.trim();
	return (
		(trimmed.startsWith("<?xml") || trimmed.startsWith("<")) &&
		trimmed.includes(">") &&
		(/<\/?([a-zA-Z0-9_:-]+)(\s+[^>]*?)?\/?>/.test(trimmed) || trimmed.endsWith(">"))
	);
}

/**
 * Checks if a string looks like YAML
 */
export function isYamlContent(text: string): boolean {
	const trimmed = text.trim();
	if (!trimmed || trimmed.startsWith("{") || trimmed.startsWith("<")) {
		return false;
	}

	const lines = trimmed.split("\n");
	const yamlKeyRegex = /^[a-zA-Z0-9_-]+:\s*.+/;
	const yamlListRegex = /^\s*-\s+.+/;
	const yamlDocRegex = /^---/;

	let yamlMatches = 0;
	const sample = lines.slice(0, 10);
	for (const line of sample) {
		const l = line.trim();
		if (yamlKeyRegex.test(l) || yamlListRegex.test(l) || yamlDocRegex.test(l)) {
			yamlMatches++;
		}
	}

	return yamlMatches >= 2 || (lines.length === 1 && yamlKeyRegex.test(trimmed));
}

/**
 * Automatically detects language format from text content
 */
export function detectLanguage(text: string): SupportedLanguage {
	const trimmed = text.trim();
	if (!trimmed) return "text";

	// 1. JWT
	if (isJwt(trimmed)) {
		return "jwt";
	}

	// 2. JSON: starts with { or [
	if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
		return "json";
	}

	// Try JSON parse for objects/arrays
	try {
		const parsed = JSON.parse(trimmed);
		if (typeof parsed === "object" && parsed !== null) {
			return "json";
		}
	} catch {
		// Not valid JSON
	}

	// 3. XML
	if (isXmlContent(trimmed)) {
		return "xml";
	}

	// 4. YAML
	if (isYamlContent(trimmed)) {
		return "yaml";
	}

	return "text";
}
