import { Button } from "@/components/ui/button/index.tsx";
import { useConnectionStatus } from "@/contexts/ConnectionStatusContext.tsx";
import { cn } from "@/utilities/cn/index.ts";
import { RefreshCw, WifiOff } from "lucide-react";

export function ConnectionStatusBanner() {
	const {
		status,
		lastConnectedAt,
		retryCountdown,
		isRetrying,
		checkConnection,
	} = useConnectionStatus();

	if (status === "connected") {
		return null;
	}

	const formattedTime = lastConnectedAt
		? new Intl.DateTimeFormat(undefined, {
				hour: "2-digit",
				minute: "2-digit",
				second: "2-digit",
			}).format(lastConnectedAt)
		: null;

	return (
		<div
			role="alert"
			aria-live="assertive"
			className={cn(
				"sticky top-14 z-20 w-full border-b backdrop-blur-md transition-all duration-200 shadow-xs",
				"bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-200",
			)}
		>
			<div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
				{/* Left: Disconnection indicator & cached state info */}
				<div className="flex items-center gap-2.5 min-w-0">
					<div className="relative flex items-center justify-center">
						<span className="absolute inline-flex h-3 w-3 animate-ping rounded-full bg-amber-400 opacity-75" />
						<span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
					</div>

					<div className="flex items-center gap-1.5 font-medium truncate">
						<WifiOff className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
						<span>Connection to RabbitMQ lost</span>
					</div>

					<span className="hidden sm:inline text-amber-700/60 dark:text-amber-400/60">
						•
					</span>
					<span className="hidden sm:inline text-amber-800/80 dark:text-amber-300/80 truncate">
						Showing cached data
						{formattedTime && ` (last synced ${formattedTime})`}
					</span>
				</div>

				{/* Right: Countdown & Retry button */}
				<div className="flex items-center gap-2 shrink-0">
					<span className="font-mono text-[11px] text-amber-800/80 dark:text-amber-300/80 mr-1">
						{isRetrying ? (
							<span className="inline-flex items-center gap-1">
								<RefreshCw className="h-3 w-3 animate-spin" />
								Connecting...
							</span>
						) : (
							`Retrying in ${retryCountdown}s`
						)}
					</span>

					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => checkConnection()}
						disabled={isRetrying}
						className="h-7 px-2.5 text-xs bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/40 text-amber-900 dark:text-amber-100 gap-1.5"
					>
						<RefreshCw
							className={cn("h-3 w-3", isRetrying && "animate-spin")}
						/>
						<span>Retry Now</span>
					</Button>
				</div>
			</div>
		</div>
	);
}
