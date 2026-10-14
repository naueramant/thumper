import { Button } from "@/components/ui/button";
import { Dropdown, type DropdownOption } from "@/components/ui/dropdown/index.tsx";
import {
	AlertCircle,
	CheckCircle2,
	Code2,
	Highlighter,
	Minimize2,
	Trash2,
} from "lucide-react";
import React, {
	useCallback,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	detectLanguage,
	isJwt,
	type SupportedLanguage,
} from "./syntaxDetection";
import { tokenizeLine } from "./syntaxTokenizer";
import { useSyntaxHighlightPreference } from "./useSyntaxHighlightPreference";
import { formatBytes, formatXml, isXml, tryParseJson } from "./utils";

export interface PayloadEditorProps {
	value: string;
	onChange: (val: string) => void;
	label?: string;
	rows?: number;
	placeholder?: string;
	className?: string;
	required?: boolean;
	disabled?: boolean;
	defaultLanguage?: SupportedLanguage | "auto";
}

export const PayloadEditor: React.FC<PayloadEditorProps> = ({
	value,
	onChange,
	label = "Payload",
	rows = 16,
	placeholder = "Enter message payload...",
	className = "",
	required = false,
	disabled = false,
	defaultLanguage = "auto",
}) => {
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const overlayRef = useRef<HTMLDivElement>(null);

	const { enabled: globalHighlightEnabled, toggle: toggleGlobalHighlight } =
		useSyntaxHighlightPreference();
	const [selectedLanguage, setSelectedLanguage] = useState<
		SupportedLanguage | "auto"
	>(defaultLanguage);

	// Parse JSON
	const parseResult = useMemo(() => {
		return tryParseJson(value);
	}, [value]);

	// Size in bytes
	const byteSize = useMemo(() => {
		return new Blob([value]).size;
	}, [value]);

	// Auto detect language
	const detectedLanguage = useMemo(() => {
		if (parseResult.isJson) return "json";
		if (isJwt(value)) return "jwt";
		if (isXml(value)) return "xml";
		return detectLanguage(value);
	}, [value, parseResult.isJson]);

	// Effective language to use for highlighting
	const activeLanguage = useMemo<SupportedLanguage>(() => {
		if (selectedLanguage === "auto") {
			return detectedLanguage;
		}
		return selectedLanguage;
	}, [selectedLanguage, detectedLanguage]);

	const languageOptions = useMemo<DropdownOption<SupportedLanguage | "auto">[]>(
		() => [
			{
				label: `Auto (${detectedLanguage.toUpperCase()})`,
				value: "auto",
				subLabel: "Detected",
			},
			{ label: "JSON", value: "json" },
			{ label: "XML", value: "xml" },
			{ label: "YAML", value: "yaml" },
			{ label: "JWT", value: "jwt" },
			{ label: "Plain Text", value: "text" },
		],
		[detectedLanguage],
	);

	// Sync scroll positions
	const handleScroll = useCallback(
		(e: React.UIEvent<HTMLTextAreaElement>) => {
			if (overlayRef.current) {
				overlayRef.current.scrollTop = e.currentTarget.scrollTop;
				overlayRef.current.scrollLeft = e.currentTarget.scrollLeft;
			}
		},
		[],
	);

	// Ensure scroll sync whenever value or language changes
	useLayoutEffect(() => {
		if (textareaRef.current && overlayRef.current) {
			overlayRef.current.scrollTop = textareaRef.current.scrollTop;
			overlayRef.current.scrollLeft = textareaRef.current.scrollLeft;
		}
	}, [value, activeLanguage, globalHighlightEnabled]);

	// Format / Prettify
	const handlePrettify = () => {
		if (!value.trim()) return;
		if (parseResult.isJson) {
			try {
				const parsed = JSON.parse(value);
				onChange(JSON.stringify(parsed, null, 2));
				return;
			} catch {
				// ignore
			}
		}
		if (isXml(value)) {
			onChange(formatXml(value));
		}
	};

	// Minify to single line
	const handleMinify = () => {
		if (!value.trim()) return;
		try {
			const parsed = JSON.parse(value);
			onChange(JSON.stringify(parsed));
		} catch {
			// ignore
		}
	};

	// Handle Tab key for 2-space indentation
	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Tab") {
			e.preventDefault();
			const target = e.currentTarget;
			const start = target.selectionStart;
			const end = target.selectionEnd;
			const val = target.value;

			target.value = val.substring(0, start) + "  " + val.substring(end);
			target.selectionStart = target.selectionEnd = start + 2;
			onChange(target.value);
		}
	};

	// Tokenized lines for the overlay
	const lines = useMemo(() => value.split("\n"), [value]);

	const isAttemptedJson = useMemo(() => {
		const trimmed = value.trim();
		return trimmed.startsWith("{") || trimmed.startsWith("[");
	}, [value]);

	return (
		<div className={`space-y-1.5 ${className}`}>
			<div className="flex flex-wrap items-center justify-between gap-2">
				{/* Left side: Label + Format Pills + Byte count */}
				<div className="flex items-center gap-2 flex-wrap">
					{label && (
						<label className="text-xs font-semibold text-muted-foreground">
							{label} {required && <span className="text-destructive">*</span>}
						</label>
					)}

					{/* Valid JSON chip if JSON */}
					{parseResult.isJson && value.trim() && (
						<span
							className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
							title="Syntactically valid JSON"
						>
							<CheckCircle2 className="w-3 h-3" /> Valid JSON
						</span>
					)}

					{/* If not JSON, but another format is detected, show format badge */}
					{!parseResult.isJson && value.trim() && (
						<>
							{detectedLanguage === "xml" && (
								<span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30">
									XML
								</span>
							)}
							{detectedLanguage === "yaml" && (
								<span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30">
									YAML
								</span>
							)}
							{detectedLanguage === "jwt" && (
								<span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/30">
									JWT
								</span>
							)}
							{isAttemptedJson && parseResult.error && (
								<span
									className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
									title={parseResult.error}
								>
									<AlertCircle className="w-3 h-3" /> JSON syntax notice
								</span>
							)}
						</>
					)}

					<span className="text-[11px] font-mono text-muted-foreground">
						{formatBytes(byteSize)}
					</span>
				</div>

				{/* Right side: Editor Actions Toolbar */}
				<div className="flex items-center gap-1 flex-wrap">
					{/* Language Selector Dropdown */}
					<Dropdown<SupportedLanguage | "auto">
						value={selectedLanguage}
						onChange={(val) => setSelectedLanguage(val)}
						options={languageOptions}
						align="right"
						buttonClassName="h-6 px-2 text-[11px] font-mono border-border/70 bg-muted/30 hover:bg-muted/60"
						contentClassName="min-w-44 text-xs font-mono"
					/>

					{/* Syntax Highlighting Toggle */}
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={toggleGlobalHighlight}
						className={`h-6 px-2 text-[11px] transition-colors cursor-pointer ${
							globalHighlightEnabled
								? "text-primary bg-primary/10 hover:bg-primary/20"
								: "text-muted-foreground hover:text-foreground"
						}`}
						title={
							globalHighlightEnabled
								? "Syntax highlighting is active (click to turn off)"
								: "Syntax highlighting is off (click to turn on)"
						}
					>
						<Highlighter className="w-3 h-3 mr-1" />
						{globalHighlightEnabled ? "Highlight On" : "Highlight Off"}
					</Button>

					{/* Prettify */}
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={handlePrettify}
						disabled={!parseResult.isJson && !isXml(value)}
						className="h-6 px-2 text-[11px] text-primary hover:bg-primary/10 cursor-pointer disabled:opacity-40"
						title="Prettify JSON or XML format"
					>
						<Code2 className="w-3 h-3 mr-1" /> Prettify
					</Button>

					{/* Minify */}
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={handleMinify}
						disabled={!parseResult.isJson}
						className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-40"
						title="Minify JSON to single line"
					>
						<Minimize2 className="w-3 h-3 mr-1" /> Minify
					</Button>

					{/* Clear */}
					{value && (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => onChange("")}
							className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-destructive cursor-pointer"
							title="Clear payload"
						>
							<Trash2 className="w-3 h-3" />
						</Button>
					)}
				</div>
			</div>

			{/* Editor Box */}
			<div className="relative rounded-lg border border-border bg-slate-50/80 dark:bg-black/50 focus-within:ring-1 focus-within:ring-primary focus-within:border-primary overflow-hidden transition-colors">
				{/* Highlight overlay (synchronous display layer) */}
				{globalHighlightEnabled && (
					<div
						ref={overlayRef}
						aria-hidden="true"
						className="pointer-events-none absolute inset-0 overflow-hidden font-mono text-xs leading-relaxed p-3 select-none whitespace-pre-wrap break-all"
						style={{ tabSize: 2 }}
					>
						{lines.map((line, idx) => (
							<React.Fragment key={idx}>
								{idx > 0 && "\n"}
								{tokenizeLine(line, activeLanguage, true)}
							</React.Fragment>
						))}
						{value.endsWith("\n") ? " " : ""}
					</div>
				)}

				{/* Native editable textarea */}
				<textarea
					ref={textareaRef}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					onScroll={handleScroll}
					onKeyDown={handleKeyDown}
					rows={rows}
					placeholder={placeholder}
					required={required}
					disabled={disabled}
					spellCheck={false}
					style={{ tabSize: 2 }}
					className={`w-full bg-transparent p-3 text-xs font-mono leading-relaxed resize-y focus:outline-none placeholder:text-muted-foreground/60 whitespace-pre-wrap break-all ${
						globalHighlightEnabled
							? "text-transparent caret-foreground selection:bg-primary/25"
							: "text-foreground"
					} ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
				/>
			</div>

			{/* Gentle syntax notice only when clearly attempting JSON and failing */}
			{isAttemptedJson && parseResult.error && (
				<p className="text-[11px] text-amber-500 dark:text-amber-400 font-mono flex items-center gap-1">
					<AlertCircle className="w-3 h-3 flex-shrink-0" />
					<span>{parseResult.error}</span>
				</p>
			)}
		</div>
	);
};
