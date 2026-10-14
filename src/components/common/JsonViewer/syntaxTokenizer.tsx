import type React from "react";
import type { SupportedLanguage } from "./syntaxDetection";

function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightSearchMatch(
	text: string,
	className: string,
	key: string,
	searchQuery?: string,
): React.ReactNode {
	if (!searchQuery || !searchQuery.trim()) {
		return (
			<span key={key} className={className}>
				{text}
			</span>
		);
	}

	const q = searchQuery.toLowerCase();
	const safeQ = escapeRegex(searchQuery);
	const parts = text.split(new RegExp(`(${safeQ})`, "gi"));

	return (
		<span key={key} className={className}>
			{parts.map((part, pIdx) => {
				if (part.toLowerCase() === q) {
					return (
						<mark
							key={pIdx}
							className="bg-yellow-400/30 text-yellow-200 border-b border-yellow-400 font-bold px-0.5 rounded"
						>
							{part}
						</mark>
					);
				}
				return part;
			})}
		</span>
	);
}

// Tokenizes a line of JSON for syntax highlighting
export function highlightJsonLine(
	line: string,
	searchQuery?: string,
): React.ReactNode[] {
	const tokenRegex =
		/("(?:\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"\s*:)|("(?:\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(\btrue\b|\bfalse\b)|(\bnull\b)|([{}[\],:])|([^"0-9a-zA-Z\s{}[\],:]+)/g;

	const nodes: React.ReactNode[] = [];
	let lastIndex = 0;
	let match: RegExpExecArray | null;

	while ((match = tokenRegex.exec(line)) !== null) {
		if (match.index > lastIndex) {
			const plain = line.substring(lastIndex, match.index);
			nodes.push(
				highlightSearchMatch(
					plain,
					"text-foreground",
					`plain-${lastIndex}`,
					searchQuery,
				),
			);
		}

		const [fullMatch, isKey, isString, isNumber, isBool, isNull, isSymbol] =
			match;
		const k = `token-${match.index}`;

		if (isKey) {
			const colonIdx = fullMatch.lastIndexOf(":");
			const keyName = fullMatch.substring(0, colonIdx);
			nodes.push(
				highlightSearchMatch(
					keyName,
					"text-sky-700 dark:text-sky-400 font-semibold",
					`${k}-key`,
					searchQuery,
				),
			);
			nodes.push(
				<span key={`${k}-colon`} className="text-muted-foreground">
					:
				</span>,
			);
		} else if (isString) {
			nodes.push(
				highlightSearchMatch(
					fullMatch,
					"text-emerald-700 dark:text-emerald-400",
					k,
					searchQuery,
				),
			);
		} else if (isNumber) {
			nodes.push(
				highlightSearchMatch(
					fullMatch,
					"text-amber-700 dark:text-amber-400 font-mono",
					k,
					searchQuery,
				),
			);
		} else if (isBool) {
			nodes.push(
				highlightSearchMatch(
					fullMatch,
					"text-purple-700 dark:text-purple-400 font-bold",
					k,
					searchQuery,
				),
			);
		} else if (isNull) {
			nodes.push(
				highlightSearchMatch(
					fullMatch,
					"text-rose-700 dark:text-rose-400 italic",
					k,
					searchQuery,
				),
			);
		} else if (isSymbol) {
			nodes.push(
				<span key={k} className="text-muted-foreground">
					{fullMatch}
				</span>,
			);
		} else {
			nodes.push(
				highlightSearchMatch(fullMatch, "text-foreground", k, searchQuery),
			);
		}

		lastIndex = tokenRegex.lastIndex;
	}

	if (lastIndex < line.length) {
		const remaining = line.substring(lastIndex);
		nodes.push(
			highlightSearchMatch(
				remaining,
				"text-foreground",
				`plain-${lastIndex}`,
				searchQuery,
			),
		);
	}

	return nodes;
}

// Tokenizes a line of XML / HTML
export function highlightXmlLine(
	line: string,
	searchQuery?: string,
): React.ReactNode[] {
	const xmlRegex =
		/(<!--[\s\S]*?-->)|(<!\[CDATA\[[\s\S]*?\]\]>)|(<\?[\s\S]*?\?>)|(<\/?[a-zA-Z0-9_:-]+)|(\/?>)|(\b[a-zA-Z0-9_:-]+(?=\s*=))|(=)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|([^<>\s="']+)/g;

	const nodes: React.ReactNode[] = [];
	let lastIndex = 0;
	let match: RegExpExecArray | null;

	while ((match = xmlRegex.exec(line)) !== null) {
		if (match.index > lastIndex) {
			const plain = line.substring(lastIndex, match.index);
			nodes.push(
				highlightSearchMatch(
					plain,
					"text-foreground",
					`plain-${lastIndex}`,
					searchQuery,
				),
			);
		}

		const [
			fullMatch,
			isComment,
			isCData,
			isProc,
			isTagOpen,
			isTagClose,
			isAttr,
			isEq,
			isString,
		] = match;
		const k = `xml-${match.index}`;

		if (isComment) {
			nodes.push(
				highlightSearchMatch(
					fullMatch,
					"text-muted-foreground/80 italic",
					k,
					searchQuery,
				),
			);
		} else if (isCData) {
			nodes.push(
				highlightSearchMatch(
					fullMatch,
					"text-amber-700 dark:text-amber-400 font-mono",
					k,
					searchQuery,
				),
			);
		} else if (isProc) {
			nodes.push(
				highlightSearchMatch(
					fullMatch,
					"text-purple-700 dark:text-purple-400 italic",
					k,
					searchQuery,
				),
			);
		} else if (isTagOpen) {
			nodes.push(
				highlightSearchMatch(
					fullMatch,
					"text-sky-700 dark:text-sky-400 font-semibold",
					k,
					searchQuery,
				),
			);
		} else if (isTagClose) {
			nodes.push(
				highlightSearchMatch(
					fullMatch,
					"text-sky-700 dark:text-sky-400 font-semibold",
					k,
					searchQuery,
				),
			);
		} else if (isAttr) {
			nodes.push(
				highlightSearchMatch(
					fullMatch,
					"text-amber-700 dark:text-amber-400 font-mono",
					k,
					searchQuery,
				),
			);
		} else if (isEq) {
			nodes.push(
				<span key={k} className="text-muted-foreground">
					=
				</span>,
			);
		} else if (isString) {
			nodes.push(
				highlightSearchMatch(
					fullMatch,
					"text-emerald-700 dark:text-emerald-400",
					k,
					searchQuery,
				),
			);
		} else {
			nodes.push(
				highlightSearchMatch(fullMatch, "text-foreground", k, searchQuery),
			);
		}

		lastIndex = xmlRegex.lastIndex;
	}

	if (lastIndex < line.length) {
		const remaining = line.substring(lastIndex);
		nodes.push(
			highlightSearchMatch(
				remaining,
				"text-foreground",
				`plain-${lastIndex}`,
				searchQuery,
			),
		);
	}

	return nodes;
}

// Tokenizes a line of YAML
export function highlightYamlLine(
	line: string,
	searchQuery?: string,
): React.ReactNode[] {
	const yamlRegex =
		/(#.*$)|(^---)|(^\s*-\s+)|(^\s*[a-zA-Z0-9_-]+:)|(\b(?:true|false|yes|no)\b)|(\b(?:null|~)\b)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b-?\d+(?:\.\d+)?\b)|([^#\s"':]+)/g;

	const nodes: React.ReactNode[] = [];
	let lastIndex = 0;
	let match: RegExpExecArray | null;

	while ((match = yamlRegex.exec(line)) !== null) {
		if (match.index > lastIndex) {
			const plain = line.substring(lastIndex, match.index);
			nodes.push(
				highlightSearchMatch(
					plain,
					"text-foreground",
					`plain-${lastIndex}`,
					searchQuery,
				),
			);
		}

		const [
			fullMatch,
			isComment,
			isDoc,
			isBullet,
			isKey,
			isBool,
			isNull,
			isString,
			isNumber,
		] = match;
		const k = `yaml-${match.index}`;

		if (isComment) {
			nodes.push(
				highlightSearchMatch(
					fullMatch,
					"text-muted-foreground/80 italic",
					k,
					searchQuery,
				),
			);
		} else if (isDoc) {
			nodes.push(
				<span key={k} className="text-muted-foreground font-bold">
					---
				</span>,
			);
		} else if (isBullet) {
			nodes.push(
				highlightSearchMatch(
					fullMatch,
					"text-purple-700 dark:text-purple-400 font-bold",
					k,
					searchQuery,
				),
			);
		} else if (isKey) {
			const colonIdx = fullMatch.lastIndexOf(":");
			const keyName = fullMatch.substring(0, colonIdx);
			nodes.push(
				highlightSearchMatch(
					keyName,
					"text-sky-700 dark:text-sky-400 font-semibold",
					`${k}-key`,
					searchQuery,
				),
			);
			nodes.push(
				<span key={`${k}-colon`} className="text-muted-foreground">
					:
				</span>,
			);
		} else if (isBool) {
			nodes.push(
				highlightSearchMatch(
					fullMatch,
					"text-purple-700 dark:text-purple-400 font-bold",
					k,
					searchQuery,
				),
			);
		} else if (isNull) {
			nodes.push(
				highlightSearchMatch(
					fullMatch,
					"text-rose-700 dark:text-rose-400 italic",
					k,
					searchQuery,
				),
			);
		} else if (isString) {
			nodes.push(
				highlightSearchMatch(
					fullMatch,
					"text-emerald-700 dark:text-emerald-400",
					k,
					searchQuery,
				),
			);
		} else if (isNumber) {
			nodes.push(
				highlightSearchMatch(
					fullMatch,
					"text-amber-700 dark:text-amber-400 font-mono",
					k,
					searchQuery,
				),
			);
		} else {
			nodes.push(
				highlightSearchMatch(fullMatch, "text-foreground", k, searchQuery),
			);
		}

		lastIndex = yamlRegex.lastIndex;
	}

	if (lastIndex < line.length) {
		const remaining = line.substring(lastIndex);
		nodes.push(
			highlightSearchMatch(
				remaining,
				"text-foreground",
				`plain-${lastIndex}`,
				searchQuery,
			),
		);
	}

	return nodes;
}

// Tokenizes a line of JWT (3 parts separated by dots)
export function highlightJwtLine(
	line: string,
	searchQuery?: string,
): React.ReactNode[] {
	const trimmed = line.trim();
	const parts = trimmed.split(".");
	if (parts.length === 3) {
		return [
			highlightSearchMatch(
				parts[0],
				"text-rose-600 dark:text-rose-400 font-semibold",
				"jwt-header",
				searchQuery,
			),
			<span key="dot1" className="text-muted-foreground font-bold">
				.
			</span>,
			highlightSearchMatch(
				parts[1],
				"text-purple-600 dark:text-purple-400 font-semibold",
				"jwt-payload",
				searchQuery,
			),
			<span key="dot2" className="text-muted-foreground font-bold">
				.
			</span>,
			highlightSearchMatch(
				parts[2],
				"text-sky-600 dark:text-sky-400 font-mono",
				"jwt-sig",
				searchQuery,
			),
		];
	}

	return [
		highlightSearchMatch(
			line,
			"text-foreground font-mono",
			"jwt-fallback",
			searchQuery,
		),
	];
}

/**
 * Universal line tokenizer that dispatches according to language and highlight state
 */
export function tokenizeLine(
	line: string,
	language: SupportedLanguage,
	highlightEnabled = true,
	searchQuery?: string,
): React.ReactNode[] {
	if (!highlightEnabled || language === "text") {
		return [
			highlightSearchMatch(line, "text-foreground", "plain-line", searchQuery),
		];
	}

	switch (language) {
		case "json":
			return highlightJsonLine(line, searchQuery);
		case "xml":
			return highlightXmlLine(line, searchQuery);
		case "yaml":
			return highlightYamlLine(line, searchQuery);
		case "jwt":
			return highlightJwtLine(line, searchQuery);
		default:
			return [
				highlightSearchMatch(line, "text-foreground", "plain-line", searchQuery),
			];
	}
}
