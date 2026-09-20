/**
 * Client-side JWT (JSON Web Token) parser and inspector utilities.
 */

export interface DecodedJwt {
	header: Record<string, unknown>;
	payload: Record<string, unknown>;
	signature: string;
	isExpired: boolean;
	expiresAt: Date | null;
	issuedAt: Date | null;
	notBefore: Date | null;
	timeStatus: string;
}

function base64UrlDecode(str: string): string {
	let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
	while (base64.length % 4) {
		base64 += "=";
	}
	try {
		// Use decodeURIComponent(escape(atob(...))) for UTF-8 compatibility
		return decodeURIComponent(
			atob(base64)
				.split("")
				.map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
				.join(""),
		);
	} catch {
		return atob(base64);
	}
}

/**
 * Tests if a string looks like a JWT token (3 segments, base64url).
 */
function isJwt(str: string): boolean {
	if (!str || typeof str !== "string") return false;
	const trimmed = str.trim();
	const parts = trimmed.split(".");
	if (parts.length !== 3) return false;
	// JWTs start with eyJ (Base64url for '{"')
	return parts[0].startsWith("eyJ") && parts[1].length > 1;
}

/**
 * Decodes and extracts claims from a JWT string.
 */
export function parseJwt(str: string): DecodedJwt | null {
	if (!isJwt(str)) return null;
	try {
		const parts = str.trim().split(".");
		const headerJson = base64UrlDecode(parts[0]);
		const payloadJson = base64UrlDecode(parts[1]);

		const header = JSON.parse(headerJson);
		const payload = JSON.parse(payloadJson);
		const signature = parts[2];

		const now = Math.floor(Date.now() / 1000);
		let isExpired = false;
		let expiresAt: Date | null = null;
		let issuedAt: Date | null = null;
		let notBefore: Date | null = null;
		let timeStatus = "Valid (no expiry claim)";

		if (typeof payload.exp === "number") {
			expiresAt = new Date(payload.exp * 1000);
			if (payload.exp < now) {
				isExpired = true;
				const diffSeconds = now - payload.exp;
				timeStatus = `Expired ${formatRelativeTime(diffSeconds)} ago`;
			} else {
				isExpired = false;
				const diffSeconds = payload.exp - now;
				timeStatus = `Expires in ${formatRelativeTime(diffSeconds)}`;
			}
		}

		if (typeof payload.iat === "number") {
			issuedAt = new Date(payload.iat * 1000);
		}

		if (typeof payload.nbf === "number") {
			notBefore = new Date(payload.nbf * 1000);
		}

		return {
			header,
			payload,
			signature,
			isExpired,
			expiresAt,
			issuedAt,
			notBefore,
			timeStatus,
		};
	} catch {
		return null;
	}
}

function formatRelativeTime(seconds: number): string {
	if (seconds < 60) return `${Math.round(seconds)}s`;
	const mins = Math.floor(seconds / 60);
	if (mins < 60) return `${mins}m`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h ${mins % 60}m`;
	const days = Math.floor(hours / 24);
	return `${days}d ${hours % 24}h`;
}
