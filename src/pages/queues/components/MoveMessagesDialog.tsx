import { Button } from "@/components/ui/button/index.tsx";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card/index.tsx";
import { Checkbox } from "@/components/ui/checkbox/index.tsx";
import { toast } from "@/components/ui/toast/index.tsx";
import {
	useRabbitMutations,
	useRabbitQueues,
} from "@/hooks/useRabbitMQ/index.ts";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronDown, Layers, Shovel, X } from "lucide-react";
import * as React from "react";

interface MoveMessagesDialogProps {
	isOpen: boolean;
	onClose: () => void;
	vhost: string;
	sourceQueue: string;
	totalMessages?: number;
	queueType?: string;
}

export function MoveMessagesDialog({
	isOpen,
	onClose,
	vhost,
	sourceQueue,
	totalMessages = 0,
	queueType,
}: MoveMessagesDialogProps) {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs p-4 animate-in fade-in duration-200">
			<MoveMessagesForm
				onClose={onClose}
				vhost={vhost}
				sourceQueue={sourceQueue}
				totalMessages={totalMessages}
				queueType={queueType}
			/>
		</div>
	);
}

function MoveMessagesForm({
	onClose,
	vhost,
	sourceQueue,
	totalMessages = 0,
	queueType,
}: Omit<MoveMessagesDialogProps, "isOpen">) {
	const { data: allQueues = [] } = useRabbitQueues(vhost);
	const { createShovel } = useRabbitMutations();

	const [destQueue, setDestQueue] = React.useState("");
	const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
	const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
	const dropdownRef = React.useRef<HTMLDivElement>(null);

	const [moveMode, setMoveMode] = React.useState<
		"all" | "count" | "continuous"
	>("all");
	const [messageCount, setMessageCount] = React.useState(
		totalMessages > 0 ? totalMessages : 100,
	);
	const [addHeaders, setAddHeaders] = React.useState(false);
	const [isSubmitting, setIsSubmitting] = React.useState(false);

	// Filter other queues in this vhost
	const candidateQueues = React.useMemo(
		() => allQueues.filter((q) => q.name !== sourceQueue),
		[allQueues, sourceQueue],
	);

	// Filter suggestions based on typed text
	const matchingQueues = React.useMemo(() => {
		const q = destQueue.trim().toLowerCase();
		if (!q) return candidateQueues;
		return candidateQueues.filter((item) =>
			item.name.toLowerCase().includes(q),
		);
	}, [candidateQueues, destQueue]);

	// Close suggestion dropdown on outside click
	React.useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setIsDropdownOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const trimmedDest = destQueue.trim();
		if (!trimmedDest) {
			toast.error("Destination queue is required");
			return;
		}

		if (trimmedDest === sourceQueue) {
			toast.error("Destination queue must be different from source queue");
			return;
		}

		setIsSubmitting(true);
		try {
			const shovelName = `move-${sourceQueue}-to-${trimmedDest}-${Date.now().toString(36)}`;
			const deleteAfter =
				moveMode === "all"
					? "queue-length"
					: moveMode === "count"
						? Number(messageCount)
						: "never";

			const localUri =
				vhost === "/" ? "amqp://" : `amqp:///${encodeURIComponent(vhost)}`;

			const definition: Record<string, unknown> = {
				"src-uri": localUri,
				"src-queue": sourceQueue,
				"src-protocol": "amqp091",
				"dest-uri": localUri,
				"dest-queue": trimmedDest,
				"dest-protocol": "amqp091",
				"ack-mode": "on-confirm",
				"src-delete-after": deleteAfter,
				"dest-add-forward-headers": addHeaders,
				"reconnect-delay": 1,
			};

			if (queueType === "stream") {
				definition["src-consumer-args"] = { "x-stream-offset": "first" };
			}

			await createShovel.mutateAsync({
				vhost,
				name: shovelName,
				definition: definition as any,
			});

			toast.success(
				"Message shovel started",
				`Moving messages from ${sourceQueue} to ${trimmedDest}. Shovel '${shovelName}' created.`,
			);
			onClose();
		} catch (err: any) {
			toast.error(
				"Failed to start message shovel",
				err?.message || String(err),
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Card className="w-full max-w-lg shadow-xl border-border bg-card">
			<CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border">
				<div>
					<CardTitle className="text-base font-semibold flex items-center gap-2">
						<Shovel className="h-4.5 w-4.5 text-primary" />
						Move Messages
					</CardTitle>
					<CardDescription className="text-xs">
						Transfer messages to another queue using the RabbitMQ Shovel plugin
					</CardDescription>
				</div>
				<Button
					variant="ghost"
					size="icon"
					className="h-8 w-8 text-muted-foreground hover:text-foreground"
					onClick={onClose}
				>
					<X className="h-4 w-4" />
				</Button>
			</CardHeader>

			<form onSubmit={handleSubmit}>
				<CardContent className="space-y-4 pt-4 text-xs">
					{/* Source -> Destination visual preview */}
					<div className="flex items-center gap-3 p-3 rounded-lg border border-border/70 bg-muted/30">
						<div className="flex-1 min-w-0">
							<span className="text-[10px] uppercase font-mono text-muted-foreground font-semibold">
								Source Queue
							</span>
							<p className="font-mono text-xs font-semibold truncate text-foreground">
								{sourceQueue}
							</p>
							<span className="text-[10px] text-muted-foreground">
								{totalMessages.toLocaleString()} ready msgs
							</span>
						</div>
						<ArrowRight className="h-4 w-4 shrink-0 text-primary" />
						<div className="flex-1 min-w-0">
							<span className="text-[10px] uppercase font-mono text-muted-foreground font-semibold">
								Destination Queue
							</span>
							<p className="font-mono text-xs font-semibold truncate text-primary">
								{destQueue || "Enter target queue..."}
							</p>
							<span className="text-[10px] text-muted-foreground">
								Virtual Host: {vhost}
							</span>
						</div>
					</div>

					{/* Single unified Destination Queue selector with autocomplete */}
					<div className="space-y-1.5" ref={dropdownRef}>
						<div className="flex items-center justify-between">
							<label className="font-medium text-foreground">
								Target Destination Queue{" "}
								<span className="text-destructive">*</span>
							</label>
							<span className="text-[10px] text-muted-foreground">
								Type any custom queue or choose below
							</span>
						</div>
						<div className="relative">
							<input
								type="text"
								placeholder="Search known queues or enter custom queue name..."
								value={destQueue}
								onFocus={() => setIsDropdownOpen(true)}
								onKeyDown={(e) => {
									if (!isDropdownOpen) {
										if (e.key === "ArrowDown" || e.key === "ArrowUp") {
											e.preventDefault();
											setIsDropdownOpen(true);
										}
										return;
									}

									if (e.key === "Escape") {
										e.preventDefault();
										setIsDropdownOpen(false);
									} else if (e.key === "ArrowDown") {
										e.preventDefault();
										setHighlightedIndex((prev) =>
											matchingQueues.length === 0
												? -1
												: prev < matchingQueues.length - 1
													? prev + 1
													: 0,
										);
									} else if (e.key === "ArrowUp") {
										e.preventDefault();
										setHighlightedIndex((prev) =>
											matchingQueues.length === 0
												? -1
												: prev > 0
													? prev - 1
													: matchingQueues.length - 1,
										);
									} else if (
										e.key === "Enter" &&
										highlightedIndex >= 0 &&
										highlightedIndex < matchingQueues.length
									) {
										e.preventDefault();
										setDestQueue(matchingQueues[highlightedIndex].name);
										setIsDropdownOpen(false);
									}
								}}
								onChange={(e) => {
									setDestQueue(e.target.value);
									setIsDropdownOpen(true);
									setHighlightedIndex(-1);
								}}
								className="w-full h-8 pl-2.5 pr-8 rounded-md border border-border bg-background text-xs font-mono text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
							/>
							<button
								type="button"
								onClick={() => setIsDropdownOpen((prev) => !prev)}
								tabIndex={-1}
								className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded"
								title="Toggle suggestions"
							>
								<ChevronDown
									className={`h-3.5 w-3.5 transition-transform duration-150 ${isDropdownOpen ? "rotate-180" : ""}`}
								/>
							</button>

							{/* Suggestion Dropdown Popover */}
							{isDropdownOpen && matchingQueues.length > 0 && (
								<div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-48 overflow-y-auto scrollbar-thin rounded-md border border-border bg-popover text-popover-foreground shadow-lg animate-in fade-in-50 zoom-in-95 duration-100">
									<div className="p-1 text-[10px] uppercase font-mono text-muted-foreground px-2 pt-1.5 pb-1 border-b border-border/40">
										Known Queues in {vhost} ({matchingQueues.length})
									</div>
									{matchingQueues.map((q, idx) => {
										const isSelected = destQueue === q.name;
										const isHighlighted = highlightedIndex === idx;
										return (
											<button
												key={q.name}
												type="button"
												onMouseDown={(e) => {
													// Prevent input blur before click registers
													e.preventDefault();
												}}
												onClick={() => {
													setDestQueue(q.name);
													setIsDropdownOpen(false);
												}}
												onMouseEnter={() => setHighlightedIndex(idx)}
												className={`w-full flex items-center justify-between px-2.5 py-1.5 text-left text-xs font-mono transition-colors ${
													isSelected
														? "bg-primary/15 text-primary font-semibold"
														: isHighlighted
															? "bg-muted text-foreground"
															: "text-foreground hover:bg-muted/70"
												}`}
											>
												<div className="flex items-center gap-1.5 truncate">
													<Layers className="h-3 w-3 text-muted-foreground shrink-0" />
													<span className="truncate">{q.name}</span>
												</div>
												<span className="text-[10px] text-muted-foreground shrink-0 ml-2">
													{q.messages_ready ?? q.messages ?? 0} ready
												</span>
											</button>
										);
									})}
								</div>
							)}
						</div>
					</div>

					{/* Move Mode */}
					<div className="space-y-1.5">
						<label className="font-medium text-foreground">
							Transfer Scope
						</label>
						<div className="grid grid-cols-3 gap-2">
							<button
								type="button"
								onClick={() => setMoveMode("all")}
								className={`px-2.5 py-2 rounded-md border text-left text-xs transition-colors ${
									moveMode === "all"
										? "border-primary bg-primary/10 text-primary font-semibold"
										: "border-border hover:bg-muted/50 text-muted-foreground"
								}`}
							>
								<div className="font-medium">All Messages</div>
								<div className="text-[10px] opacity-80">
									Drain & auto-delete
								</div>
							</button>
							<button
								type="button"
								onClick={() => setMoveMode("count")}
								className={`px-2.5 py-2 rounded-md border text-left text-xs transition-colors ${
									moveMode === "count"
										? "border-primary bg-primary/10 text-primary font-semibold"
										: "border-border hover:bg-muted/50 text-muted-foreground"
								}`}
							>
								<div className="font-medium">Message Limit</div>
								<div className="text-[10px] opacity-80">Specific count</div>
							</button>
							<button
								type="button"
								onClick={() => setMoveMode("continuous")}
								className={`px-2.5 py-2 rounded-md border text-left text-xs transition-colors ${
									moveMode === "continuous"
										? "border-primary bg-primary/10 text-primary font-semibold"
										: "border-border hover:bg-muted/50 text-muted-foreground"
								}`}
							>
								<div className="font-medium">Continuous</div>
								<div className="text-[10px] opacity-80">Permanent shovel</div>
							</button>
						</div>
					</div>

					{/* Specific count input */}
					{moveMode === "count" && (
						<div className="space-y-1.5 animate-in fade-in duration-150">
							<label className="font-medium text-foreground">
								Number of messages to transfer
							</label>
							<input
								type="number"
								min={1}
								value={messageCount}
								onChange={(e) =>
									setMessageCount(
										Math.max(1, parseInt(e.target.value, 10) || 1),
									)
								}
								className="w-full h-8 px-2.5 rounded-md border border-border bg-background text-xs font-mono text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
							/>
						</div>
					)}

					{/* Options */}
					<div className="pt-2 border-t border-border/50">
						<label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
							<Checkbox
								checked={addHeaders}
								onChange={(e) => setAddHeaders(e.target.checked)}
							/>
							<span>
								Add forwarding headers (records source and destination
								timestamps)
							</span>
						</label>
					</div>

					<p className="text-[11px] text-muted-foreground bg-muted/30 p-2 rounded border border-border/40">
						A dynamic shovel with <code>on-confirm</code> acknowledgement mode
						will be launched on this cluster. You can monitor its live progress
						in{" "}
						<Link
							to="/shovels"
							className="text-primary hover:underline font-semibold"
						>
							Shovels
						</Link>
						.
					</p>
				</CardContent>

				<CardFooter className="flex justify-end gap-2 border-t border-border pt-3">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={onClose}
						disabled={isSubmitting}
					>
						Cancel
					</Button>
					<Button
						type="submit"
						size="sm"
						disabled={isSubmitting || !destQueue.trim()}
						className="gap-1.5"
					>
						<Shovel className="h-3.5 w-3.5" />
						{isSubmitting ? "Starting..." : "Start Move"}
					</Button>
				</CardFooter>
			</form>
		</Card>
	);
}
