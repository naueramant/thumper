import { toast } from "@/components/ui/toast/index.tsx";
import {
	getRabbitMQClient,
	getStoredAuth,
	useAuth,
} from "@/hooks/useAuth/index.ts";
import { NetworkError, RabbitMQApiError } from "@/services/rabbitmq/errors.ts";
import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";

export type ConnectionStatus = "connected" | "disconnected" | "checking";

export interface ConnectionStatusContextValue {
	status: ConnectionStatus;
	lastConnectedAt: Date | null;
	lastError: string | null;
	retryCountdown: number;
	isRetrying: boolean;
	clusterUrl: string;
	checkConnection: () => Promise<boolean>;
	updateClusterUrl: (newUrl: string) => Promise<boolean>;
}

const ConnectionStatusContext =
	React.createContext<ConnectionStatusContextValue | null>(null);

const RETRY_INTERVAL_SECONDS = 5;

export function ConnectionStatusProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const queryClient = useQueryClient();
	const { user, updateClusterUrl: setAuthClusterUrl } = useAuth();

	const [status, setStatus] = React.useState<ConnectionStatus>("connected");
	const [lastConnectedAt, setLastConnectedAt] = React.useState<Date | null>(
		() => new Date(),
	);
	const [lastError, setLastError] = React.useState<string | null>(null);
	const [retryCountdown, setRetryCountdown] = React.useState<number>(RETRY_INTERVAL_SECONDS);
	const [isRetrying, setIsRetrying] = React.useState<boolean>(false);

	const statusRef = React.useRef<ConnectionStatus>(status);
	React.useEffect(() => {
		statusRef.current = status;
	}, [status]);

	const clusterUrl =
		user?.clusterUrl ||
		getStoredAuth()?.clusterUrl ||
		(typeof window !== "undefined" && window.location.origin
			? window.location.origin
			: "http://localhost:15672");

	const isCheckingRef = React.useRef<boolean>(false);

	// Active probe function
	const checkConnection = React.useCallback(async (): Promise<boolean> => {
		if (isCheckingRef.current) return false;
		isCheckingRef.current = true;
		setIsRetrying(true);
		setStatus((prev) => (prev === "disconnected" ? "checking" : prev));

		try {
			const client = getRabbitMQClient();
			await client.overview.getOverview();

			// If successful:
			const wasDisconnected =
				statusRef.current === "disconnected" || statusRef.current === "checking";
			setStatus("connected");
			setLastConnectedAt(new Date());
			setLastError(null);
			setRetryCountdown(RETRY_INTERVAL_SECONDS);

			if (wasDisconnected) {
				toast.success(
					"Connection restored",
					"Successfully reconnected to RabbitMQ.",
				);
				// Refetch active queries to immediately refresh dashboard
				queryClient.invalidateQueries({ queryKey: ["rabbit"] });
			}
			return true;
		} catch (err: unknown) {
			const errMsg =
				err instanceof NetworkError
					? err.message
					: err instanceof RabbitMQApiError
						? `RabbitMQ API error (${err.status} ${err.statusText})`
						: err instanceof Error
							? err.message
							: "Failed to reach RabbitMQ management API";

			setStatus("disconnected");
			setLastError(errMsg);
			setRetryCountdown(RETRY_INTERVAL_SECONDS);
			return false;
		} finally {
			setIsRetrying(false);
			isCheckingRef.current = false;
		}
	}, [queryClient]);

	// Update cluster URL helper
	const updateClusterUrl = React.useCallback(
		async (newUrl: string): Promise<boolean> => {
			setAuthClusterUrl(newUrl);
			// Trigger immediate check with new URL
			return await checkConnection();
		},
		[setAuthClusterUrl, checkConnection],
	);

	// Listen to QueryCache events for passive connection monitoring
	React.useEffect(() => {
		const queryCache = queryClient.getQueryCache();

		const unsubscribe = queryCache.subscribe((event) => {
			if (event.type !== "updated") return;

			const query = event.query;
			const queryKey = query.queryKey;

			// We only monitor queries starting with "rabbit"
			if (!Array.isArray(queryKey) || queryKey[0] !== "rabbit") {
				return;
			}

			const actionType = event.action?.type;

			if (actionType === "success") {
				setLastConnectedAt(new Date());
				// If we were connected, stay connected and keep timestamp fresh.
				// Note: Reconnection from "disconnected" is deliberately handled by
				// the active `checkConnection` probe to avoid race conditions with
				// parallel queries in-flight while the backend is flapping/down.
			} else if (actionType === "error") {
				const error = query.state.error;
				// Don't treat 401/403 as general network disconnect (401 triggers session redirect)
				if (
					error instanceof RabbitMQApiError &&
					(error.status === 401 || error.status === 403)
				) {
					return;
				}

				const errMsg =
					error instanceof NetworkError
						? error.message
						: error instanceof RabbitMQApiError
							? `RabbitMQ API error (${error.status} ${error.statusText})`
							: error instanceof Error
								? error.message
								: "Failed to reach RabbitMQ";

				if (statusRef.current === "connected") {
					setStatus("disconnected");
					setLastError(errMsg);
					setRetryCountdown(RETRY_INTERVAL_SECONDS);
				}
			}
		});

		return () => {
			unsubscribe();
		};
	}, [queryClient]);

	// Countdown timer when disconnected
	React.useEffect(() => {
		if (status !== "disconnected") return;

		const timer = setInterval(() => {
			setRetryCountdown((prev) => {
				if (prev <= 1) {
					// Time to retry!
					checkConnection();
					return RETRY_INTERVAL_SECONDS;
				}
				return prev - 1;
			});
		}, 1000);

		return () => clearInterval(timer);
	}, [status, checkConnection]);

	// Reconnect immediately on browser focus or network online event
	React.useEffect(() => {
		const handleOnline = () => {
			if (statusRef.current === "disconnected") {
				checkConnection();
			}
		};

		const handleFocus = () => {
			if (statusRef.current === "disconnected") {
				checkConnection();
			}
		};

		window.addEventListener("online", handleOnline);
		window.addEventListener("focus", handleFocus);
		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("focus", handleFocus);
		};
	}, [checkConnection]);

	const value = React.useMemo<ConnectionStatusContextValue>(
		() => ({
			status,
			lastConnectedAt,
			lastError,
			retryCountdown,
			isRetrying,
			clusterUrl,
			checkConnection,
			updateClusterUrl,
		}),
		[
			status,
			lastConnectedAt,
			lastError,
			retryCountdown,
			isRetrying,
			clusterUrl,
			checkConnection,
			updateClusterUrl,
		],
	);

	return (
		<ConnectionStatusContext.Provider value={value}>
			{children}
		</ConnectionStatusContext.Provider>
	);
}

export function useConnectionStatus(): ConnectionStatusContextValue {
	const ctx = React.useContext(ConnectionStatusContext);
	if (!ctx) {
		throw new Error(
			"useConnectionStatus must be used within a ConnectionStatusProvider",
		);
	}
	return ctx;
}
