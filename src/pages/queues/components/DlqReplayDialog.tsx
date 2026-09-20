import { Button } from "@/components/ui/button/index.tsx";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card/index.tsx";
import { toast } from "@/components/ui/toast/index.tsx";
import {
	useRabbitExchanges,
	useRabbitMutations,
	useRabbitQueues,
} from "@/hooks/useRabbitMQ/index.ts";
import type { QueueMessage } from "@/services/rabbitmq/types/queue.ts";
import type { DynamicShovelDefinition } from "@/services/rabbitmq/types/shovel.ts";
import { Radio } from "@/components/ui/radio/index.tsx";
import {
	extractXDeathEntries,
	type XDeathEntry,
} from "@/services/rabbitmq/types/xdeath.ts";
import { RotateCcw, Sparkles, X } from "lucide-react";
import * as React from "react";

interface DlqReplayDialogProps {
	isOpen: boolean;
	onClose: () => void;
	vhost: string;
	sourceQueue: string;
	totalMessages?: number;
	peekedMessages?: QueueMessage[];
	singleMessage?: QueueMessage | null;
	onSuccess?: () => void;
}

export function DlqReplayDialog({
	isOpen,
	onClose,
	vhost,
	sourceQueue,
	totalMessages = 0,
	peekedMessages = [],
	singleMessage = null,
	onSuccess,
}: DlqReplayDialogProps) {
	const { data: allQueues = [] } = useRabbitQueues(vhost);
	const { data: allExchanges = [] } = useRabbitExchanges(vhost);
	const { createShovel, publishMessage } = useRabbitMutations();

	// Detected original metadata from x-death
	const detectedDeath = React.useMemo<{
		originQueue?: string;
		originExchange?: string;
		routingKey?: string;
		reasons: string[];
	}>(() => {
		const msgs = singleMessage ? [singleMessage] : peekedMessages;
		const reasons = new Set<string>();
		let originQueue: string | undefined;
		let originExchange: string | undefined;
		let routingKey: string | undefined;

		for (const msg of msgs) {
			const entries: XDeathEntry[] = extractXDeathEntries(msg.properties?.headers);
			for (const entry of entries) {
				if (entry.reason) reasons.add(entry.reason);
				if (!originQueue && entry.queue && entry.queue !== sourceQueue) {
					originQueue = entry.queue;
				}
				if (!originExchange && entry.exchange) {
					originExchange = entry.exchange;
				}
				if (!routingKey && entry["routing-keys"] && entry["routing-keys"].length > 0) {
					routingKey = entry["routing-keys"][0];
				}
			}
		}

		return {
			originQueue,
			originExchange: originExchange || "",
			routingKey: routingKey || "",
			reasons: Array.from(reasons),
		};
	}, [singleMessage, peekedMessages, sourceQueue]);

	// Replay destination type: "queue" | "exchange"
	const [targetType, setTargetType] = React.useState<"queue" | "exchange">("queue");
	const [destQueue, setDestQueue] = React.useState("");
	const [destExchange, setDestExchange] = React.useState("");
	const [destRoutingKey, setDestRoutingKey] = React.useState("");
	const [replayMode, setReplayMode] = React.useState<"all" | "count">("all");
	const [messageCount, setMessageCount] = React.useState(
		totalMessages > 0 ? totalMessages : 50,
	);
	const [isSubmitting, setIsSubmitting] = React.useState(false);

	// Pre-fill fields upon opening or when detection changes
	React.useEffect(() => {
		if (isOpen) {
			if (detectedDeath.originQueue) {
				setTargetType("queue");
				setDestQueue(detectedDeath.originQueue);
			} else if (detectedDeath.originExchange) {
				setTargetType("exchange");
				setDestExchange(detectedDeath.originExchange);
				setDestRoutingKey(detectedDeath.routingKey || "");
			} else {
				// Default to first non-self queue
				const candidate = allQueues.find((q) => q.name !== sourceQueue);
				if (candidate) setDestQueue(candidate.name);
			}

			if (detectedDeath.routingKey) {
				setDestRoutingKey(detectedDeath.routingKey);
			}

			if (totalMessages > 0) {
				setMessageCount(totalMessages);
			}
		}
	}, [isOpen, detectedDeath, allQueues, sourceQueue, totalMessages]);

	if (!isOpen) return null;

	const handleSingleMessageReplay = async () => {
		if (!singleMessage) return;
		setIsSubmitting(true);
		try {
			// Clean headers: copy properties without x-death to avoid immediate loop
			const headersCopy = { ...(singleMessage.properties?.headers || {}) };
			delete headersCopy["x-death"];

			const targetExchangeName =
				targetType === "exchange" ? destExchange.trim() : "";
			const routingKey =
				targetType === "exchange"
					? destRoutingKey.trim()
					: destQueue.trim();

			await publishMessage.mutateAsync({
				vhost,
				exchange: targetExchangeName,
				data: {
					properties: {
						...singleMessage.properties,
						headers: headersCopy,
					},
					routing_key: routingKey,
					payload: singleMessage.payload,
					payload_encoding: "string",
				},
			});

			toast.success(
				"Message replayed successfully",
				`Redelivered to ${targetType === "queue" ? `queue ${destQueue}` : `exchange ${destExchange}`}`,
			);
			onSuccess?.();
			onClose();
		} catch (err: any) {
			toast.error("Failed to replay message", err.message || String(err));
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleBatchReplay = async (e: React.FormEvent) => {
		e.preventDefault();
		if (singleMessage) {
			return handleSingleMessageReplay();
		}

		if (targetType === "queue" && !destQueue.trim()) {
			toast.error("Please select or enter a destination queue");
			return;
		}
		if (targetType === "exchange" && !destExchange.trim()) {
			toast.error("Please select or enter a destination exchange");
			return;
		}

		setIsSubmitting(true);
		try {
			const shovelName = `dlq-replay-${sourceQueue}-${Date.now().toString(36)}`;
			const localUri =
				vhost === "/" ? "amqp://" : `amqp:///${encodeURIComponent(vhost)}`;

			const countNumber = Number(messageCount);
			const deleteAfter =
				replayMode === "all"
					? "queue-length"
					: countNumber > 0
						? countNumber
						: "queue-length";

			const definition: DynamicShovelDefinition = {
				"src-uri": localUri,
				"src-queue": sourceQueue,
				"src-protocol": "amqp091",
				"dest-uri": localUri,
				"dest-protocol": "amqp091",
				"ack-mode": "on-confirm",
				"src-delete-after": deleteAfter,
				"reconnect-delay": 1,
			};

			if (targetType === "queue") {
				definition["dest-queue"] = destQueue.trim();
			} else {
				definition["dest-exchange"] = destExchange.trim();
				if (destRoutingKey.trim()) {
					definition["dest-exchange-key"] = destRoutingKey.trim();
				}
			}

			await createShovel.mutateAsync({
				vhost,
				name: shovelName,
				definition,
			});

			toast.success(
				"DLQ Replay Shovel launched",
				`Moving ${replayMode === "all" ? "all" : messageCount} messages from ${sourceQueue} to ${targetType === "queue" ? destQueue : destExchange}.`,
			);
			onSuccess?.();
			onClose();
		} catch (err: any) {
			toast.error("Failed to start DLQ replay", err.message || String(err));
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
			<Card className="max-w-lg w-full border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
				<CardHeader className="pb-3 border-b border-border bg-card/80">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<div className="h-8 w-8 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center">
								<RotateCcw className="h-4 w-4" />
							</div>
							<div>
								<CardTitle className="text-base flex items-center gap-2">
									{singleMessage ? "Replay Dead-Letter Message" : "DLQ Replay Wizard"}
								</CardTitle>
								<CardDescription className="text-xs">
									Redeliver dead-lettered messages back into production.
								</CardDescription>
							</div>
						</div>
						<button
							type="button"
							onClick={onClose}
							className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
						>
							<X className="h-4 w-4" />
						</button>
					</div>
				</CardHeader>

				<form onSubmit={handleBatchReplay}>
					<CardContent className="p-4 space-y-4 text-xs font-sans max-h-[75vh] overflow-y-auto scrollbar-thin">
						{/* Source info pill */}
						<div className="p-2.5 rounded-lg border border-border bg-muted/30 flex items-center justify-between font-mono">
							<div>
								<span className="text-[10px] text-muted-foreground block">Source DLQ:</span>
								<span className="font-semibold text-foreground text-xs">{sourceQueue}</span>
							</div>
							{!singleMessage && (
								<div className="text-right">
									<span className="text-[10px] text-muted-foreground block">Available:</span>
									<span className="text-xs font-bold text-primary">
										{totalMessages.toLocaleString()} msgs
									</span>
								</div>
							)}
						</div>

						{/* Telemetry Detection Callout */}
						{(detectedDeath.originQueue || detectedDeath.originExchange) && (
							<div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-1.5">
								<div className="flex items-center gap-1.5 font-semibold text-primary text-[11px]">
									<Sparkles className="h-3.5 w-3.5" />
									<span>Auto-Detected Origin from x-death Header</span>
								</div>
								<div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-muted-foreground">
									{detectedDeath.originQueue && (
										<div>
											<span>Origin Queue:</span>{" "}
											<strong className="text-foreground">{detectedDeath.originQueue}</strong>
										</div>
									)}
									{detectedDeath.originExchange && (
										<div>
											<span>Origin Exchange:</span>{" "}
											<strong className="text-foreground">{detectedDeath.originExchange}</strong>
										</div>
									)}
									{detectedDeath.routingKey && (
										<div className="col-span-2">
											<span>Original Key:</span>{" "}
											<strong className="text-foreground">{detectedDeath.routingKey}</strong>
										</div>
									)}
									{detectedDeath.reasons.length > 0 && (
										<div className="col-span-2">
											<span>Reasons:</span>{" "}
											<span className="text-rose-400 capitalize">
												{detectedDeath.reasons.join(", ")}
											</span>
										</div>
									)}
								</div>
							</div>
						)}

						{/* Destination Target Type */}
						<div className="space-y-1.5">
							<label className="text-xs font-semibold text-foreground">
								Replay Destination Type
							</label>
							<div className="grid grid-cols-2 gap-2">
								<button
									type="button"
									onClick={() => setTargetType("queue")}
									className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition-all ${
										targetType === "queue"
											? "border-primary bg-primary/10 text-foreground"
											: "border-border bg-card text-muted-foreground hover:border-border/80"
									}`}
								>
									<span className="font-semibold text-xs text-foreground">
										Direct to Queue
									</span>
									<span className="text-[10px] text-muted-foreground">
										Bypasses exchanges, puts messages straight into target queue
									</span>
								</button>

								<button
									type="button"
									onClick={() => setTargetType("exchange")}
									className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition-all ${
										targetType === "exchange"
											? "border-primary bg-primary/10 text-foreground"
											: "border-border bg-card text-muted-foreground hover:border-border/80"
									}`}
								>
									<span className="font-semibold text-xs text-foreground">
										Re-route via Exchange
									</span>
									<span className="text-[10px] text-muted-foreground">
										Evaluates bindings and routing keys afresh
									</span>
								</button>
							</div>
						</div>

						{/* Destination Queue Selector */}
						{targetType === "queue" && (
							<div className="space-y-1">
								<label className="text-xs font-semibold text-foreground">
									Destination Queue
								</label>
								<div className="flex gap-1.5">
									<select
										value={destQueue}
										onChange={(e) => setDestQueue(e.target.value)}
										className="flex-1 h-9 rounded-md border border-border bg-background px-3 text-xs font-mono focus:outline-none focus:border-primary"
									>
										<option value="">Select queue...</option>
										{allQueues
											.filter((q) => q.name !== sourceQueue)
											.map((q) => (
												<option key={q.name} value={q.name}>
													{q.name} ({q.type})
												</option>
											))}
									</select>
								</div>
							</div>
						)}

						{/* Destination Exchange & Key */}
						{targetType === "exchange" && (
							<div className="space-y-2">
								<div className="space-y-1">
									<label className="text-xs font-semibold text-foreground">
										Destination Exchange
									</label>
									<select
										value={destExchange}
										onChange={(e) => setDestExchange(e.target.value)}
										className="w-full h-9 rounded-md border border-border bg-background px-3 text-xs font-mono focus:outline-none focus:border-primary"
									>
										<option value="">(AMQP default direct)</option>
										{allExchanges.map((ex) => (
											<option key={ex.name} value={ex.name}>
												{ex.name} [{ex.type}]
											</option>
										))}
									</select>
								</div>

								<div className="space-y-1">
									<label className="text-xs font-semibold text-foreground">
										Routing Key
									</label>
									<input
										type="text"
										value={destRoutingKey}
										onChange={(e) => setDestRoutingKey(e.target.value)}
										placeholder="e.g. orders.processed"
										className="w-full h-9 rounded-md border border-border bg-background px-3 text-xs font-mono focus:outline-none focus:border-primary"
									/>
								</div>
							</div>
						)}

						{/* Batch Count Options (if not single message) */}
						{!singleMessage && (
							<div className="space-y-2 pt-1 border-t border-border">
								<label className="text-xs font-semibold text-foreground">
									Replay Volume
								</label>
								<div className="flex items-center gap-4 pt-0.5">
									<Radio
										name="replayMode"
										checked={replayMode === "all"}
										onChange={() => setReplayMode("all")}
										label={`All messages (${totalMessages})`}
									/>
									<Radio
										name="replayMode"
										checked={replayMode === "count"}
										onChange={() => setReplayMode("count")}
										label="Specific batch size"
									/>
								</div>

								{replayMode === "count" && (
									<div className="flex items-center gap-2">
										<input
											type="number"
											min={1}
											max={totalMessages > 0 ? totalMessages : 100000}
											value={messageCount}
											onChange={(e) => setMessageCount(Number(e.target.value))}
											className="h-8 w-32 rounded-md border border-border bg-background px-2.5 text-xs font-mono focus:outline-none focus:border-primary"
										/>
										<span className="text-[11px] text-muted-foreground">
											messages to transfer
										</span>
									</div>
								)}
							</div>
						)}
					</CardContent>

					<CardFooter className="p-4 border-t border-border bg-card/60 flex items-center justify-between">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={onClose}
							disabled={isSubmitting}
							className="h-8 text-xs"
						>
							Cancel
						</Button>

						<Button
							type="submit"
							size="sm"
							disabled={
								isSubmitting ||
								(targetType === "queue" && !destQueue.trim())
							}
							className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white font-medium"
						>
							{isSubmitting ? (
								"Launching Replay..."
							) : (
								<>
									<RotateCcw className="h-3.5 w-3.5 mr-1.5" />
									{singleMessage
										? "Replay Message Now"
										: `Start Replay (${replayMode === "all" ? "All" : messageCount})`}
								</>
							)}
						</Button>
					</CardFooter>
				</form>
			</Card>
		</div>
	);
}
