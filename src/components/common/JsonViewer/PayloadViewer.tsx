import { Button } from "@/components/ui/button";
import {
	AlertCircle,
	Binary,
	Check,
	Clock,
	Code2,
	Copy,
	Download,
	FileText,
	FolderTree,
	KeyRound,
	Search,
	ShieldAlert,
	ShieldCheck,
	WrapText,
} from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { generateHexDump, isBase64, tryDecodeBase64 } from "./hexUtils";
import { JsonHighlighter } from "./JsonHighlighter";
import { JsonTreeViewer } from "./JsonTreeViewer";
import { parseJwt } from "./jwtUtils";
import { formatBytes, formatXml, isXml, tryParseJson } from "./utils";

export interface PayloadViewerProps {
	payload: string;
	contentType?: string;
	maxHeight?: string;
	defaultMode?: "formatted" | "tree" | "jwt" | "hex" | "raw";
	className?: string;
	showToolbar?: boolean;
}

export const PayloadViewer: React.FC<PayloadViewerProps> = ({
	payload,
	contentType,
	maxHeight = "max-h-80",
	defaultMode = "formatted",
	className = "",
	showToolbar = true,
}) => {
	const [copied, setCopied] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [wordWrap, setWordWrap] = useState(true);
	const [decodeBase64Enabled, setDecodeBase64Enabled] = useState(false);

	// Base64 detection & optional decoding
	const isBase64Encoded = useMemo(() => isBase64(payload), [payload]);
	const effectivePayload = useMemo(() => {
		if (isBase64Encoded && decodeBase64Enabled) {
			const res = tryDecodeBase64(payload);
			return res.success ? res.text : payload;
		}
		return payload;
	}, [payload, isBase64Encoded, decodeBase64Enabled]);

	// Format & parse effective payload
	const parseResult = useMemo(() => {
		return tryParseJson(effectivePayload);
	}, [effectivePayload]);

	const isXmlFormat = useMemo(() => {
		return (
			!parseResult.isJson &&
			(isXml(effectivePayload) || contentType?.includes("xml"))
		);
	}, [parseResult.isJson, effectivePayload, contentType]);

	const formattedXml = useMemo(() => {
		return isXmlFormat ? formatXml(effectivePayload) : null;
	}, [isXmlFormat, effectivePayload]);

	// JWT detection
	const detectedJwt = useMemo(() => {
		return parseJwt(effectivePayload);
	}, [effectivePayload]);

	// Hex dump generation
	const hexDump = useMemo(() => {
		return generateHexDump(effectivePayload);
	}, [effectivePayload]);

	// Initial mode setup
	const [mode, setMode] = useState<
		"formatted" | "tree" | "jwt" | "hex" | "raw"
	>(() => {
		if (detectedJwt) return "jwt";
		if (!parseResult.isJson && defaultMode === "tree") return "raw";
		return defaultMode;
	});

	// Format type tag
	const formatTag = useMemo(() => {
		if (detectedJwt) {
			return {
				label: "JWT TOKEN",
				color: "bg-purple-500/10 text-purple-400 border-purple-500/30",
			};
		}
		if (parseResult.isJson) {
			return {
				label: "JSON",
				color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
			};
		}
		if (isXmlFormat) {
			return {
				label: "XML",
				color: "bg-sky-500/10 text-sky-400 border-sky-500/30",
			};
		}
		if (isBase64Encoded) {
			return {
				label: decodeBase64Enabled ? "BASE64 (DECODED)" : "BASE64",
				color: "bg-amber-500/10 text-amber-400 border-amber-500/30",
			};
		}
		return {
			label: "RAW TEXT",
			color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30",
		};
	}, [
		detectedJwt,
		parseResult.isJson,
		isXmlFormat,
		isBase64Encoded,
		decodeBase64Enabled,
	]);

	const handleCopy = () => {
		let textToCopy = effectivePayload;
		if (mode === "formatted" && parseResult.isJson) {
			textToCopy = parseResult.formatted;
		} else if (isXmlFormat && formattedXml) {
			textToCopy = formattedXml;
		} else if (mode === "jwt" && detectedJwt) {
			textToCopy = JSON.stringify(detectedJwt.payload, null, 2);
		}
		navigator.clipboard.writeText(textToCopy);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const handleDownload = () => {
		let ext = "txt";
		let mime = "text/plain";
		let textToSave = effectivePayload;

		if (parseResult.isJson || mode === "jwt") {
			ext = "json";
			mime = "application/json";
			textToSave =
				mode === "jwt" && detectedJwt
					? JSON.stringify(detectedJwt.payload, null, 2)
					: parseResult.formatted;
		} else if (isXmlFormat) {
			ext = "xml";
			mime = "application/xml";
			textToSave = formattedXml || effectivePayload;
		}

		const blob = new Blob([textToSave], { type: mime });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `payload_${Date.now()}.${ext}`;
		a.click();
		URL.revokeObjectURL(url);
	};

	return (
		<div
			className={`rounded-xl border border-border bg-card overflow-hidden flex flex-col ${className}`}
		>
			{/* Top Bar / Toolbar */}
			{showToolbar && (
				<div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-border bg-muted/40">
					<div className="flex items-center gap-2 flex-wrap">
						<span
							className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${formatTag.color}`}
						>
							{formatTag.label}
						</span>
						<span className="text-[11px] font-mono text-muted-foreground">
							{formatBytes(effectivePayload.length)}
						</span>
						{isBase64Encoded && (
							<button
								type="button"
								onClick={() => setDecodeBase64Enabled(!decodeBase64Enabled)}
								className={`text-[10px] font-mono px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
									decodeBase64Enabled
										? "bg-amber-500/20 text-amber-400 border-amber-500/40 font-bold"
										: "bg-muted text-muted-foreground border-border hover:text-foreground"
								}`}
								title="Toggle Base64 Decoding"
							>
								{decodeBase64Enabled ? "Base64: Decoded" : "Decode Base64"}
							</button>
						)}
						{parseResult.error && (
							<span
								className="flex items-center gap-1 text-[11px] text-amber-500 font-mono"
								title={parseResult.error}
							>
								<AlertCircle className="w-3 h-3" /> Syntax Notice
							</span>
						)}
					</div>

					<div className="flex items-center gap-1.5 flex-wrap">
						{/* View Mode Selector */}
						<div className="flex items-center bg-muted/70 dark:bg-black/40 rounded-lg p-0.5 border border-border/60">
							<button
								type="button"
								onClick={() => setMode("formatted")}
								className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer ${
									mode === "formatted"
										? "bg-primary/20 text-primary font-bold"
										: "text-muted-foreground hover:text-foreground"
								}`}
								title="Formatted code view with syntax highlighting"
							>
								<Code2 className="w-3 h-3" /> Formatted
							</button>

							{parseResult.isJson && (
								<button
									type="button"
									onClick={() => setMode("tree")}
									className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer ${
										mode === "tree"
											? "bg-primary/20 text-primary font-bold"
											: "text-muted-foreground hover:text-foreground"
									}`}
									title="Collapsible tree view"
								>
									<FolderTree className="w-3 h-3" /> Tree
								</button>
							)}

							{detectedJwt && (
								<button
									type="button"
									onClick={() => setMode("jwt")}
									className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer ${
										mode === "jwt"
											? "bg-purple-500/20 text-purple-400 font-bold"
											: "text-muted-foreground hover:text-foreground"
									}`}
									title="JWT claims and token inspector"
								>
									<KeyRound className="w-3 h-3" /> JWT
								</button>
							)}

							<button
								type="button"
								onClick={() => setMode("hex")}
								className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer ${
									mode === "hex"
										? "bg-primary/20 text-primary font-bold"
										: "text-muted-foreground hover:text-foreground"
								}`}
								title="Hexdump byte view"
							>
								<Binary className="w-3 h-3" /> Hex
							</button>

							<button
								type="button"
								onClick={() => setMode("raw")}
								className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer ${
									mode === "raw"
										? "bg-primary/20 text-primary font-bold"
										: "text-muted-foreground hover:text-foreground"
								}`}
								title="Raw payload view"
							>
								<FileText className="w-3 h-3" /> Raw
							</button>
						</div>

						{/* Word wrap toggle for raw/formatted */}
						{mode !== "hex" && (
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setWordWrap(!wordWrap)}
								className={`h-7 px-2 text-[11px] ${
									wordWrap ? "text-primary" : "text-muted-foreground"
								}`}
								title="Toggle word wrap"
							>
								<WrapText className="w-3.5 h-3.5 mr-1" /> Wrap
							</Button>
						)}

						{/* Quick Search */}
						<div className="relative w-32 sm:w-40">
							<Search className="w-3 h-3 absolute left-2 top-2 text-muted-foreground" />
							<input
								type="text"
								value={searchQuery}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
									setSearchQuery(e.target.value)
								}
								placeholder="Find in payload..."
								className="h-7 w-full text-[11px] pl-6 pr-2 bg-background dark:bg-black/30 border border-border rounded focus:border-primary focus:outline-none font-mono"
							/>
						</div>

						{/* Copy Button */}
						<Button
							variant="outline"
							size="sm"
							onClick={handleCopy}
							className="h-7 px-2 text-[11px] bg-background hover:bg-muted cursor-pointer"
						>
							{copied ? (
								<>
									<Check className="w-3 h-3 mr-1 text-emerald-500" /> Copied
								</>
							) : (
								<>
									<Copy className="w-3 h-3 mr-1" /> Copy
								</>
							)}
						</Button>

						{/* Download Button */}
						<Button
							variant="ghost"
							size="sm"
							onClick={handleDownload}
							className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
							title="Download file"
						>
							<Download className="w-3.5 h-3.5" />
						</Button>
					</div>
				</div>
			)}

			{/* Content Canvas */}
			<div
				className={`p-3 bg-slate-50/70 dark:bg-black/70 overflow-auto scrollbar-thin ${maxHeight} ${
					wordWrap && mode !== "hex" ? "whitespace-pre-wrap" : "whitespace-pre"
				}`}
			>
				{mode === "jwt" && detectedJwt ? (
					<div className="space-y-3 font-sans text-xs">
						{/* JWT Status Pill */}
						<div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg border border-border bg-card/60">
							<div className="flex items-center gap-2">
								{detectedJwt.isExpired ? (
									<ShieldAlert className="h-4 w-4 text-rose-500" />
								) : (
									<ShieldCheck className="h-4 w-4 text-emerald-500" />
								)}
								<span
									className={`font-semibold font-mono text-[11px] ${
										detectedJwt.isExpired ? "text-rose-400" : "text-emerald-400"
									}`}
								>
									{detectedJwt.timeStatus}
								</span>
							</div>

							<div className="flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
								{detectedJwt.expiresAt && (
									<span className="flex items-center gap-1">
										<Clock className="h-3 w-3" />
										Exp: {detectedJwt.expiresAt.toLocaleString()}
									</span>
								)}
								{Boolean(detectedJwt.header.alg) && (
									<span className="px-1.5 py-0.5 rounded bg-muted border border-border text-foreground text-[10px]">
										alg: {String(detectedJwt.header.alg)}
									</span>
								)}
							</div>
						</div>

						{/* Header Claims */}
						<div className="space-y-1">
							<span className="text-[11px] font-semibold text-muted-foreground block">
								Header
							</span>
							<div className="p-2 rounded border border-border bg-card/40">
								<JsonHighlighter
									content={JSON.stringify(detectedJwt.header, null, 2)}
									searchQuery={searchQuery}
									showLineNumbers={false}
								/>
							</div>
						</div>

						{/* Payload Claims */}
						<div className="space-y-1">
							<span className="text-[11px] font-semibold text-muted-foreground block">
								Decoded Payload Claims
							</span>
							<div className="p-2 rounded border border-border bg-card/40">
								<JsonHighlighter
									content={JSON.stringify(detectedJwt.payload, null, 2)}
									searchQuery={searchQuery}
									showLineNumbers={false}
								/>
							</div>
						</div>

						{/* Signature */}
						<div className="space-y-1">
							<span className="text-[11px] font-semibold text-muted-foreground block">
								Signature Hash
							</span>
							<div className="p-2 rounded border border-border bg-card/40 font-mono text-[11px] text-muted-foreground break-all">
								{detectedJwt.signature}
							</div>
						</div>
					</div>
				) : mode === "hex" ? (
					<div className="font-mono text-xs leading-relaxed overflow-x-auto select-text">
						<div className="text-muted-foreground/60 border-b border-border/40 pb-1 mb-1.5 flex text-[11px]">
							<span className="w-24">OFFSET</span>
							<span className="w-64">HEX DUMP</span>
							<span>ASCII</span>
						</div>
						{hexDump.lines.map((line, idx) => (
							<div
								key={idx}
								className="flex hover:bg-muted/30 py-0.5 rounded px-0.5"
							>
								<span className="w-24 text-muted-foreground select-none">
									{line.offset}
								</span>
								<span className="w-32 text-primary font-medium">
									{line.hexLeft}
								</span>
								<span className="w-32 text-primary/80 font-medium">
									{line.hexRight}
								</span>
								<span className="text-foreground tracking-widest pl-2">
									{line.ascii}
								</span>
							</div>
						))}
						{hexDump.truncated && (
							<p className="text-[11px] text-muted-foreground mt-2 italic font-sans">
								... Hex display capped at 2 KB (total payload size:{" "}
								{formatBytes(hexDump.totalBytes)}).
							</p>
						)}
					</div>
				) : mode === "tree" && parseResult.isJson ? (
					<JsonTreeViewer data={parseResult.data} searchQuery={searchQuery} />
				) : mode === "formatted" && parseResult.isJson ? (
					<JsonHighlighter
						content={parseResult.formatted}
						searchQuery={searchQuery}
						showLineNumbers
					/>
				) : mode === "formatted" && isXmlFormat && formattedXml ? (
					<pre className="text-xs font-mono text-sky-300 overflow-x-auto leading-relaxed">
						{formattedXml}
					</pre>
				) : (
					<pre className="text-xs font-mono text-foreground overflow-x-auto leading-relaxed break-all">
						{effectivePayload}
					</pre>
				)}
			</div>
		</div>
	);
};
