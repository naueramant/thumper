import { toast } from "@/components/ui/toast/store.ts";
import { UNAUTHORIZED_EVENT } from "@/services/rabbitmq/client.ts";
import { base64Encode } from "@/services/rabbitmq/utils.ts";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { clearSession, getStoredAuth } from "./index.ts";

let activeValidation: Promise<boolean> | null = null;

/**
 * Checks whether the current credentials are still valid by probing /api/whoami.
 * Deduplicates in-flight calls so concurrent 401 responses don't flood the server.
 */
async function checkSessionStillValid(): Promise<boolean> {
	if (activeValidation) return activeValidation;

	activeValidation = (async () => {
		try {
			const auth = getStoredAuth();
			if (!auth) return false;

			const headers: Record<string, string> = {
				Accept: "application/json",
				"X-Requested-With": "XMLHttpRequest",
			};
			if (auth.token) {
				headers.Authorization = `Bearer ${auth.token}`;
			} else if (auth.username !== undefined && auth.password !== undefined) {
				headers.Authorization = `Basic ${base64Encode(`${auth.username}:${auth.password}`)}`;
			}

			// In browser dev mode, requests go through the Vite proxy (/api), or direct to clusterUrl if set
			const baseUrl = auth.clusterUrl?.startsWith("http")
				? ""
				: (auth.clusterUrl || "");

			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 5000);

			try {
				const res = await fetch(`${baseUrl}/api/whoami`, {
					headers,
					signal: controller.signal,
				});
				return res.ok;
			} finally {
				clearTimeout(timeoutId);
			}
		} catch {
			// On network glitches or timeouts, do NOT aggressively log out the user
			return true;
		} finally {
			activeValidation = null;
		}
	})();

	return activeValidation;
}

/** Mounted once at the router root. Listens for 401 from the API.
 * RabbitMQ returns 401 for both invalid credentials AND when an authenticated
 * user tries to access a virtual host or queue they don't have AMQP permissions for.
 * This hook verifies whether the credentials actually expired before logging out. */
export function useSessionExpiredRedirect() {
	const navigate = useNavigate();
	const router = useRouter();

	useEffect(() => {
		async function handleUnauthorized(e: Event) {
			// No stored session (e.g. login form testing bad credentials)
			if (!getStoredAuth()) return;

			// Avoid redirect loop if already on /login
			if (router.state.location.pathname === "/login") return;

			const customEvent = e as CustomEvent<{
				endpoint?: string;
				reason?: string;
				error?: string;
			}>;
			const endpoint = customEvent.detail?.endpoint;

			// If the failing endpoint was whoami itself, credentials are definitively invalid
			if (endpoint === "/api/whoami") {
				expire();
				return;
			}

			// For any other endpoint, probe /api/whoami to distinguish session expiration
			// from a resource/vhost permission denial (which RabbitMQ returns as 401).
			const isStillValid = await checkSessionStillValid();
			if (!isStillValid) {
				expire();
			}
		}

		function expire() {
			clearSession();
			toast.error("Session expired", "Please sign in again to continue.");
			const { pathname, searchStr } = router.state.location;
			navigate({
				to: "/login",
				search: {
					redirect: pathname + searchStr,
					expired: true,
				},
			});
		}

		window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
		return () =>
			window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
	}, [navigate, router]);
}
