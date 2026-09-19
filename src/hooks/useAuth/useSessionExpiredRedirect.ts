import { toast } from "@/components/ui/toast/store.ts";
import { UNAUTHORIZED_EVENT } from "@/services/rabbitmq/client.ts";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { clearSession, getStoredAuth } from "./index.ts";

/** Mounted once at the router root. Listens for any 401 from the API and, if
 * there was an active session, clears it and bounces to /login with a
 * "session expired" message instead of leaving stale/broken pages up. */
export function useSessionExpiredRedirect() {
	const navigate = useNavigate();
	// Deliberately NOT useRouterState: this hook runs in the router's root
	// component, so subscribing to location would re-render the whole app tree
	// on every navigation — including every filter/search param write. The
	// location is only needed at the instant a 401 fires, so read it lazily.
	const router = useRouter();

	useEffect(() => {
		function handleUnauthorized() {
			// No stored session (e.g. the login page testing bad credentials) — that
			// flow shows its own inline error, nothing to expire here.
			if (!getStoredAuth()) return;

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
