import { Button } from "@/components/ui/button/index.tsx";
import { Radio } from "@/components/ui/radio/index.tsx";
import { toast } from "@/components/ui/toast/index.tsx";
import { useRabbitMutations } from "@/hooks/useRabbitMQ/index.ts";
import { useVHost } from "@/hooks/useVHost/index.ts";
import {
	addOrUpdateCollection,
	addPublishHistoryEntry,
	clearPublishHistory,
	deleteCollection,
	deleteTemplateFromCollection,
	exportCollectionsJson,
	getPublishHistory,
	getStoredCollections,
	importCollectionsJson,
	interpolateVariables,
	saveTemplateToCollection,
} from "@/services/testCollections/storage.ts";
import type {
	PublishHistoryEntry,
	TestCollection,
	TestMessageTemplate,
} from "@/services/testCollections/types.ts";
import {
	Check,
	Clock,
	Copy,
	Download,
	SendHorizontal,
	FolderPlus,
	Layers,
	Pencil,
	Play,
	Plus,
	Share2,
	Trash2,
	Upload,
	Variable,
	X,
} from "lucide-react";
import * as React from "react";

interface TestCollectionsDrawerProps {
	isOpen: boolean;
	onClose: () => void;
	onLoadTemplate?: (template: TestMessageTemplate) => void;
}

export function TestCollectionsDrawer({
	isOpen,
	onClose,
	onLoadTemplate,
}: TestCollectionsDrawerProps) {
	const { selectedVHost } = useVHost();
	const effectiveVHost = selectedVHost === "all" ? "/" : selectedVHost;
	const { publishMessage } = useRabbitMutations();

	const [activeTab, setActiveTab] = React.useState<"collections" | "history">(
		"collections",
	);
	const [collections, setCollections] = React.useState<TestCollection[]>([]);
	const [selectedCollectionId, setSelectedCollectionId] =
		React.useState<string>("");
	const [history, setHistory] = React.useState<PublishHistoryEntry[]>([]);

	// Form states
	const [isCreatingCollection, setIsCreatingCollection] = React.useState(false);
	const [newCollectionName, setNewCollectionName] = React.useState("");
	const [newCollectionDesc, setNewCollectionDesc] = React.useState("");

	const [isCreatingTemplate, setIsCreatingTemplate] = React.useState(false);
	const [editingTemplateId, setEditingTemplateId] = React.useState<
		string | null
	>(null);
	const [tplName, setTplName] = React.useState("");
	const [tplDesc, setTplDesc] = React.useState("");
	const [tplTargetType, setTplTargetType] = React.useState<"exchange" | "queue">(
		"exchange",
	);
	const [tplTargetName, setTplTargetName] = React.useState("amq.topic");
	const [tplRoutingKey, setTplRoutingKey] = React.useState("");
	const [tplPayload, setTplPayload] = React.useState(
		JSON.stringify({ event: "test_event", id: "{{$uuid}}" }, null, 2),
	);

	const [runningTemplateId, setRunningTemplateId] = React.useState<
		string | null
	>(null);
	const fileInputRef = React.useRef<HTMLInputElement | null>(null);

	// Refresh collections and history
	const refreshData = React.useCallback(() => {
		const cols = getStoredCollections();
		setCollections(cols);
		if (cols.length > 0 && !selectedCollectionId) {
			setSelectedCollectionId(cols[0].id);
		}
		setHistory(getPublishHistory());
	}, [selectedCollectionId]);

	React.useEffect(() => {
		if (isOpen) {
			refreshData();
		}
	}, [isOpen, refreshData]);

	if (!isOpen) return null;

	const selectedCollection =
		collections.find((c) => c.id === selectedCollectionId) || collections[0];

	// Run / Publish template
	const handleRunTemplate = async (tpl: TestMessageTemplate) => {
		setRunningTemplateId(tpl.id);
		const evaluatedPayload = interpolateVariables(tpl.payload);
		const evaluatedKey = interpolateVariables(tpl.routingKey);
		const evaluatedVHost = tpl.vhost || effectiveVHost;

		try {
			await publishMessage.mutateAsync({
				vhost: evaluatedVHost,
				exchange: tpl.targetType === "exchange" ? tpl.targetName : "",
				data: {
					routing_key:
						tpl.targetType === "exchange" ? evaluatedKey : tpl.targetName,
					payload: evaluatedPayload,
					payload_encoding: "string",
					properties: {
						delivery_mode: tpl.deliveryMode || 2,
						content_type: tpl.contentType || "application/json",
						headers: tpl.headers || {},
					},
				},
			});

			addPublishHistoryEntry({
				targetType: tpl.targetType,
				targetName: tpl.targetName,
				vhost: evaluatedVHost,
				routingKey: evaluatedKey,
				payload: evaluatedPayload,
				status: "success",
			});

			toast.success(
				"Message published successfully",
				`Sent to ${tpl.targetType} ${tpl.targetName}`,
			);
			refreshData();
		} catch (err: any) {
			addPublishHistoryEntry({
				targetType: tpl.targetType,
				targetName: tpl.targetName,
				vhost: evaluatedVHost,
				routingKey: evaluatedKey,
				payload: evaluatedPayload,
				status: "failed",
				error: err.message || String(err),
			});
			toast.error("Failed to publish message", err.message || String(err));
			refreshData();
		} finally {
			setRunningTemplateId(null);
		}
	};

	// Save new collection
	const handleCreateCollection = (e: React.FormEvent) => {
		e.preventDefault();
		if (!newCollectionName.trim()) return;
		const newCol: TestCollection = {
			id: `col-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
			name: newCollectionName.trim(),
			description: newCollectionDesc.trim(),
			color: "#3b82f6",
			items: [],
			createdAt: Date.now(),
		};
		addOrUpdateCollection(newCol);
		setSelectedCollectionId(newCol.id);
		setNewCollectionName("");
		setNewCollectionDesc("");
		setIsCreatingCollection(false);
		refreshData();
		toast.success(`Created collection "${newCol.name}"`);
	};

	// Start editing template
	const handleStartEdit = (tpl: TestMessageTemplate) => {
		setEditingTemplateId(tpl.id);
		setTplName(tpl.name);
		setTplDesc(tpl.description || "");
		setTplTargetType(tpl.targetType);
		setTplTargetName(tpl.targetName);
		setTplRoutingKey(tpl.routingKey || "");
		setTplPayload(tpl.payload);
		setIsCreatingTemplate(true);
	};

	// Reset & cancel template form
	const handleCancelTemplate = () => {
		setIsCreatingTemplate(false);
		setEditingTemplateId(null);
		setTplName("");
		setTplDesc("");
		setTplRoutingKey("");
		setTplPayload(
			JSON.stringify({ event: "test_event", id: "{{$uuid}}" }, null, 2),
		);
	};

	// Save template (Create or Update)
	const handleSaveTemplate = (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedCollection || !tplName.trim()) return;

		const existing = editingTemplateId
			? selectedCollection.items.find((t) => t.id === editingTemplateId)
			: null;

		const templateToSave: TestMessageTemplate = {
			id:
				editingTemplateId ||
				`tpl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
			name: tplName.trim(),
			description: tplDesc.trim(),
			targetType: tplTargetType,
			targetName: tplTargetName.trim(),
			vhost: effectiveVHost,
			routingKey: tplRoutingKey.trim(),
			deliveryMode: 2,
			contentType: "application/json",
			payload: tplPayload,
			createdAt: existing ? existing.createdAt : Date.now(),
			updatedAt: Date.now(),
		};

		saveTemplateToCollection(selectedCollection.id, templateToSave);
		const wasEditing = Boolean(editingTemplateId);
		handleCancelTemplate();
		refreshData();
		toast.success(
			wasEditing
				? `Updated template "${templateToSave.name}"`
				: `Added template "${templateToSave.name}"`,
		);
	};

	// Import file handler
	const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (event) => {
			const content = event.target?.result as string;
			const res = importCollectionsJson(content, "merge");
			if (res.success) {
				toast.success(
					"Collections imported successfully",
					`Imported ${res.count} collection(s).`,
				);
				refreshData();
			} else {
				toast.error("Failed to import collections", res.error);
			}
		};
		reader.readAsText(file);
		e.target.value = "";
	};

	return (
		<div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
			<div className="w-full max-w-5xl sm:max-w-6xl h-full bg-card border-l border-border flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
				{/* Top Drawer Header */}
				<div className="h-14 px-5 border-b border-border flex items-center justify-between bg-card/80 shrink-0">
					<div className="flex items-center gap-3">
						<div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
							<SendHorizontal className="h-4 w-4" />
						</div>
						<div>
							<h2 className="text-sm font-bold text-foreground">
								Publisher Studio
							</h2>
							<p className="text-[11px] text-muted-foreground">
								Postman-style saved requests, dynamic variables &amp; history.
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						{/* Tabs */}
						<div className="flex items-center bg-muted/70 rounded-lg p-0.5 border border-border">
							<button
								type="button"
								onClick={() => setActiveTab("collections")}
								className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
									activeTab === "collections"
										? "bg-background text-foreground shadow-xs font-bold"
										: "text-muted-foreground hover:text-foreground"
								}`}
							>
								Collections ({collections.length})
							</button>
							<button
								type="button"
								onClick={() => setActiveTab("history")}
								className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
									activeTab === "history"
										? "bg-background text-foreground shadow-xs font-bold"
										: "text-muted-foreground hover:text-foreground"
								}`}
							>
								History ({history.length})
							</button>
						</div>

						{/* Close button */}
						<button
							type="button"
							onClick={onClose}
							className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
						>
							<X className="h-4 w-4" />
						</button>
					</div>
				</div>

				{/* Collections Tab Content */}
				{activeTab === "collections" ? (
					<div className="flex-1 flex overflow-hidden">
						{/* Left Column: Collections List */}
						<div className="w-72 border-r border-border flex flex-col bg-muted/10 shrink-0">
							<div className="p-3 border-b border-border flex items-center justify-between">
								<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono">
									Collections
								</span>
								<div className="flex items-center gap-1">
									<Button
										variant="ghost"
										size="sm"
										onClick={() => setIsCreatingCollection(true)}
										className="h-6 w-6 p-0 text-muted-foreground hover:text-primary cursor-pointer"
										title="New Collection"
									>
										<FolderPlus className="h-3.5 w-3.5" />
									</Button>
									<Button
										variant="ghost"
										size="sm"
										onClick={exportCollectionsJson}
										className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
										title="Export Collections JSON"
									>
										<Download className="h-3.5 w-3.5" />
									</Button>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => fileInputRef.current?.click()}
										className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
										title="Import Collections JSON"
									>
										<Upload className="h-3.5 w-3.5" />
									</Button>
									<input
										ref={fileInputRef}
										type="file"
										accept=".json"
										onChange={handleFileImport}
										className="hidden"
									/>
								</div>
							</div>

							{/* New collection inline input */}
							{isCreatingCollection && (
								<form
									onSubmit={handleCreateCollection}
									className="p-2.5 border-b border-border bg-card space-y-2 text-xs"
								>
									<input
										type="text"
										value={newCollectionName}
										onChange={(e) => setNewCollectionName(e.target.value)}
										placeholder="Collection name..."
										autoFocus
										className="w-full h-7 px-2 border border-border rounded bg-background text-xs focus:outline-none focus:border-primary"
									/>
									<div className="flex justify-end gap-1">
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => setIsCreatingCollection(false)}
											className="h-6 text-[11px] px-2"
										>
											Cancel
										</Button>
										<Button
											type="submit"
											size="sm"
											disabled={!newCollectionName.trim()}
											className="h-6 text-[11px] px-2 bg-primary text-primary-foreground"
										>
											Create
										</Button>
									</div>
								</form>
							)}

							<div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
								{collections.map((col) => (
									<div
										key={col.id}
										onClick={() => setSelectedCollectionId(col.id)}
										className={`group flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors ${
											selectedCollection?.id === col.id
												? "bg-primary/10 text-primary font-semibold border border-primary/20"
												: "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
										}`}
									>
										<div className="flex items-center gap-2 truncate">
											<span
												className="h-2 w-2 rounded-full shrink-0"
												style={{ backgroundColor: col.color || "#3b82f6" }}
											/>
											<span className="truncate">{col.name}</span>
										</div>

										<div className="flex items-center gap-1.5">
											<span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
												{col.items.length}
											</span>
											{collections.length > 1 && (
												<button
													type="button"
													onClick={(e) => {
														e.stopPropagation();
														deleteCollection(col.id);
														refreshData();
													}}
													className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-destructive transition-opacity cursor-pointer"
													title="Delete collection"
												>
													<Trash2 className="h-3 w-3" />
												</button>
											)}
										</div>
									</div>
								))}
							</div>
						</div>

						{/* Right Column: Templates in Selected Collection */}
						<div className="flex-1 flex flex-col overflow-hidden bg-background">
							{selectedCollection ? (
								<>
									{/* Collection Header Bar */}
									<div className="p-3 border-b border-border flex items-center justify-between bg-card/40 shrink-0">
										<div>
											<h3 className="text-xs font-bold text-foreground flex items-center gap-2">
												{selectedCollection.name}
												<span className="text-[11px] font-normal text-muted-foreground">
													({selectedCollection.items.length} templates)
												</span>
											</h3>
											{selectedCollection.description && (
												<p className="text-[11px] text-muted-foreground">
													{selectedCollection.description}
												</p>
											)}
										</div>

										<Button
											size="sm"
											onClick={() => {
												handleCancelTemplate();
												setIsCreatingTemplate(true);
											}}
											className="h-7 text-xs bg-primary text-primary-foreground font-medium cursor-pointer"
										>
											<Plus className="h-3 w-3 mr-1" /> New Template
										</Button>
									</div>

									{/* Create / Edit Template Form Drawer */}
									{isCreatingTemplate && (
										<form
											onSubmit={handleSaveTemplate}
											className="p-4 border-b border-border bg-card space-y-3 shrink-0 text-xs animate-in slide-in-from-top-2 duration-150"
										>
											<div className="flex items-center justify-between pb-1 border-b border-border/50">
												<span className="font-semibold text-xs text-foreground">
													{editingTemplateId ? "Edit Template" : "New Template"}
												</span>
												{editingTemplateId && (
													<span className="text-[11px] font-mono text-primary">
														Editing ID: {editingTemplateId}
													</span>
												)}
											</div>

											<div className="grid grid-cols-2 gap-2">
												<div className="space-y-1">
													<label className="text-[11px] font-semibold text-muted-foreground">
														Template Name
													</label>
													<input
														type="text"
														value={tplName}
														onChange={(e) => setTplName(e.target.value)}
														placeholder="e.g. Order Placed"
														className="w-full h-8 px-2.5 rounded border border-border bg-background text-xs focus:outline-none focus:border-primary"
														required
													/>
												</div>

												<div className="space-y-1">
													<label className="text-[11px] font-semibold text-muted-foreground">
														Routing Key
													</label>
													<input
														type="text"
														value={tplRoutingKey}
														onChange={(e) => setTplRoutingKey(e.target.value)}
														placeholder="e.g. orders.created"
														className="w-full h-8 px-2.5 rounded border border-border bg-background text-xs font-mono focus:outline-none focus:border-primary"
													/>
												</div>
											</div>

											<div className="grid grid-cols-2 gap-2">
												<div className="space-y-1">
													<label className="text-[11px] font-semibold text-muted-foreground">
														Target Type
													</label>
													<div className="flex items-center gap-4 pt-1">
														<Radio
															name="tplTargetType"
															checked={tplTargetType === "exchange"}
															onChange={() => setTplTargetType("exchange")}
															label="Exchange"
														/>
														<Radio
															name="tplTargetType"
															checked={tplTargetType === "queue"}
															onChange={() => setTplTargetType("queue")}
															label="Queue"
														/>
													</div>
												</div>

												<div className="space-y-1">
													<label className="text-[11px] font-semibold text-muted-foreground">
														Target Name
													</label>
													<input
														type="text"
														value={tplTargetName}
														onChange={(e) => setTplTargetName(e.target.value)}
														placeholder="e.g. amq.topic or orders"
														className="w-full h-8 px-2.5 rounded border border-border bg-background text-xs font-mono focus:outline-none focus:border-primary"
														required
													/>
												</div>
											</div>

											<div className="space-y-1">
												<div className="flex items-center justify-between">
													<label className="text-[11px] font-semibold text-muted-foreground">
														Payload (supports {`{{$uuid}}`},{" "}
														{`{{$timestamp}}`}, {`{{$isoDate}}`})
													</label>
													<span className="text-[10px] text-primary flex items-center gap-1 font-mono">
														<Variable className="h-3 w-3" /> Dynamic variables
													</span>
												</div>
												<textarea
													value={tplPayload}
													onChange={(e) => setTplPayload(e.target.value)}
													rows={5}
													className="w-full p-2.5 rounded border border-border bg-background text-xs font-mono focus:outline-none focus:border-primary scrollbar-thin"
												/>
											</div>

											<div className="flex justify-end gap-2">
												<Button
													type="button"
													variant="outline"
													size="sm"
													onClick={handleCancelTemplate}
													className="h-7 text-xs cursor-pointer"
												>
													Cancel
												</Button>
												<Button
													type="submit"
													size="sm"
													disabled={!tplName.trim()}
													className="h-7 text-xs bg-primary text-primary-foreground font-medium cursor-pointer"
												>
													{editingTemplateId ? "Save Changes" : "Save Template"}
												</Button>
											</div>
										</form>
									)}

									{/* Templates List */}
									<div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
										{selectedCollection.items.length === 0 ? (
											<div className="py-16 text-center text-xs text-muted-foreground font-mono">
												No templates in this collection yet. Click "New
												Template" to create one.
											</div>
										) : (
											selectedCollection.items.map((tpl) => (
												<div
													key={tpl.id}
													className="p-3.5 rounded-xl border border-border bg-card/60 hover:border-primary/40 transition-colors space-y-2.5"
												>
													<div className="flex items-start justify-between gap-3">
														<div>
															<div className="flex items-center gap-2">
																<span className="font-semibold text-xs text-foreground">
																	{tpl.name}
																</span>
																<span className="px-1.5 py-0.2 rounded text-[10px] font-mono border border-border text-muted-foreground uppercase flex items-center gap-1">
																	{tpl.targetType === "exchange" ? (
																		<Share2 className="h-2.5 w-2.5 text-primary" />
																	) : (
																		<Layers className="h-2.5 w-2.5 text-purple-400" />
																	)}
																	{tpl.targetType}: {tpl.targetName}
																</span>
																{tpl.routingKey && (
																	<span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-muted text-muted-foreground">
																		key: {tpl.routingKey}
																	</span>
																)}
															</div>
															{tpl.description && (
																<p className="text-[11px] text-muted-foreground mt-0.5">
																	{tpl.description}
																</p>
															)}
														</div>

														<div className="flex items-center gap-1.5 shrink-0">
															{onLoadTemplate && (
																<Button
																	variant="outline"
																	size="sm"
																	onClick={() => {
																		onLoadTemplate(tpl);
																		onClose();
																	}}
																	className="h-7 px-2 text-xs hover:text-primary cursor-pointer"
																	title="Load this template into the active publisher form"
																>
																	<Check className="h-3 w-3 mr-1" /> Use in Form
																</Button>
															)}

															<Button
																size="sm"
																onClick={() => handleRunTemplate(tpl)}
																disabled={runningTemplateId === tpl.id}
																className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium cursor-pointer"
																title="Publish message immediately"
															>
																<Play
																	className={`h-3 w-3 mr-1 ${runningTemplateId === tpl.id ? "animate-spin" : ""}`}
																/>
																Send
															</Button>

															<Button
																variant="ghost"
																size="sm"
																onClick={() => handleStartEdit(tpl)}
																className="h-7 w-7 p-0 text-muted-foreground hover:text-primary cursor-pointer"
																title="Edit template"
															>
																<Pencil className="h-3.5 w-3.5" />
															</Button>

															<Button
																variant="ghost"
																size="sm"
																onClick={() => {
																	deleteTemplateFromCollection(
																		selectedCollection.id,
																		tpl.id,
																	);
																	refreshData();
																}}
																className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
																title="Delete template"
															>
																<Trash2 className="h-3.5 w-3.5" />
															</Button>
														</div>
													</div>

													{/* Snippet preview */}
													<div className="p-2 rounded bg-slate-900 text-slate-200 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-28 scrollbar-thin">
														<pre>{tpl.payload}</pre>
													</div>
												</div>
											))
										)}
									</div>
								</>
							) : (
								<div className="py-20 text-center text-xs text-muted-foreground font-mono">
									Select or create a collection.
								</div>
							)}
						</div>
					</div>
				) : (
					/* History Tab Content */
					<div className="flex-1 flex flex-col overflow-hidden bg-background">
						<div className="p-3 border-b border-border flex items-center justify-between bg-card/40 shrink-0">
							<span className="text-xs font-semibold text-muted-foreground font-mono">
								Recent Executions ({history.length})
							</span>
							{history.length > 0 && (
								<Button
									variant="ghost"
									size="sm"
									onClick={() => {
										clearPublishHistory();
										refreshData();
									}}
									className="h-7 text-xs text-muted-foreground hover:text-destructive cursor-pointer"
								>
									<Trash2 className="h-3.5 w-3.5 mr-1" /> Clear History
								</Button>
							)}
						</div>

						<div className="flex-1 overflow-y-auto p-4 space-y-2.5 scrollbar-thin">
							{history.length === 0 ? (
								<div className="py-20 text-center text-xs text-muted-foreground font-mono">
									No execution history yet. Publish messages from collections or
									publisher forms to view them here.
								</div>
							) : (
								history.map((item) => (
									<div
										key={item.id}
										className="p-3 rounded-lg border border-border bg-card/60 flex items-center justify-between gap-3 text-xs"
									>
										<div className="space-y-1 overflow-hidden">
											<div className="flex items-center gap-2">
												<span
													className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
														item.status === "success"
															? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
															: "bg-rose-500/10 text-rose-400 border border-rose-500/30"
													}`}
												>
													{item.status.toUpperCase()}
												</span>
												<span className="font-mono text-muted-foreground text-[11px]">
													{item.targetType}: {item.targetName}
												</span>
												{item.routingKey && (
													<span className="font-mono text-primary text-[11px]">
														key: {item.routingKey}
													</span>
												)}
												<span className="text-muted-foreground text-[10px] flex items-center gap-1">
													<Clock className="h-3 w-3" />
													{new Date(item.timestamp).toLocaleTimeString()}
												</span>
											</div>

											<p className="font-mono text-[11px] text-muted-foreground truncate max-w-lg">
												{item.payload}
											</p>
											{item.error && (
												<p className="text-[11px] text-rose-400 font-mono">
													Error: {item.error}
												</p>
											)}
										</div>

										<div className="flex items-center gap-1.5 shrink-0">
											<Button
												variant="ghost"
												size="sm"
												onClick={() => {
													navigator.clipboard.writeText(item.payload);
													toast.success("Payload copied to clipboard");
												}}
												className="h-7 w-7 p-0 cursor-pointer"
												title="Copy payload"
											>
												<Copy className="h-3.5 w-3.5 text-muted-foreground" />
											</Button>

											<Button
												size="sm"
												onClick={() => {
													publishMessage
														.mutateAsync({
															vhost: item.vhost,
															exchange:
																item.targetType === "exchange"
																	? item.targetName
																	: "",
															data: {
																routing_key:
																	item.targetType === "exchange"
																		? item.routingKey
																		: item.targetName,
																payload: item.payload,
																payload_encoding: "string",
															},
														})
														.then(() => {
															toast.success("Re-sent message successfully");
															refreshData();
														})
														.catch((e) => toast.error(e.message || String(e)));
												}}
												className="h-7 px-2 text-xs bg-muted hover:bg-muted/80 text-foreground cursor-pointer"
												title="Re-send message"
											>
												<Play className="h-3 w-3 mr-1" /> Re-send
											</Button>
										</div>
									</div>
								))
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
