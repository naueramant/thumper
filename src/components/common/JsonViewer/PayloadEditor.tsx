import { Button } from "@/components/ui/button";
import {
	AlertCircle,
	CheckCircle2,
	Code2,
	Minimize2,
	Trash2,
} from "lucide-react";
import type React from "react";
import { useMemo } from "react";
import { formatBytes, tryParseJson } from "./utils";

export interface PayloadEditorProps {
	value: string;
	onChange: (val: string) => void;
	label?: string;
	rows?: number;
	placeholder?: string;
	className?: string;
	required?: boolean;
}

export const PayloadEditor: React.FC<PayloadEditorProps> = ({
	value,
	onChange,
	label = "Payload (JSON or Raw Text)",
	rows = 16,
	placeholder = "Enter message payload...",
	className = "",
	required = false,
}) => {
	const parseResult = useMemo(() => {
		return tryParseJson(value);
	}, [value]);

	const byteSize = useMemo(() => {
		return new Blob([value]).size;
	}, [value]);

	// Format with 2 spaces
	const handlePrettify = () => {
		if (!value.trim()) return;
		try {
			const parsed = JSON.parse(value);
			onChange(JSON.stringify(parsed, null, 2));
		} catch {
			// If not valid JSON, do nothing or leave as is
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

	// Handle Tab key for indentation
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

	return (
		<div className={`space-y-1.5 ${className}`}>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					{label && (
						<label className="text-xs font-semibold text-muted-foreground">
							{label} {required && <span className="text-destructive">*</span>}
						</label>
					)}

					{/* Live Validation Pill */}
					{value.trim() && (
						<span
							className={`inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border ${
								parseResult.isJson
									? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
									: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
							}`}
							title={parseResult.error || "Syntactically valid JSON"}
						>
							{parseResult.isJson ? (
								<>
									<CheckCircle2 className="w-3 h-3" /> Valid JSON
								</>
							) : (
								<>
									<AlertCircle className="w-3 h-3" /> Invalid JSON
								</>
							)}
						</span>
					)}

					<span className="text-[11px] font-mono text-muted-foreground">
						{formatBytes(byteSize)}
					</span>
				</div>

				{/* Editor Actions Toolbar */}
				<div className="flex items-center gap-1">
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={handlePrettify}
						disabled={!parseResult.isJson}
						className="h-6 px-2 text-[11px] text-primary hover:bg-primary/10"
						title="Prettify JSON with 2-space indentation"
					>
						<Code2 className="w-3 h-3 mr-1" /> Prettify
					</Button>

					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={handleMinify}
						disabled={!parseResult.isJson}
						className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
						title="Minify JSON to single line"
					>
						<Minimize2 className="w-3 h-3 mr-1" /> Minify
					</Button>

					{value && (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => onChange("")}
							className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-destructive"
							title="Clear payload"
						>
							<Trash2 className="w-3 h-3" />
						</Button>
					)}
				</div>
			</div>

			<div className="relative rounded-lg border border-border bg-slate-50/80 dark:bg-black/50 focus-within:ring-1 focus-within:ring-primary focus-within:border-primary overflow-hidden transition-colors">
				<textarea
					value={value}
					onChange={(e) => onChange(e.target.value)}
					onKeyDown={handleKeyDown}
					rows={rows}
					placeholder={placeholder}
					required={required}
					className="w-full bg-transparent p-3 text-xs font-mono text-foreground placeholder:text-muted-foreground/60 focus:outline-none resize-y leading-relaxed"
					spellCheck={false}
				/>
			</div>

			{parseResult.error && (
				<p className="text-[11px] text-rose-400 font-mono flex items-center gap-1">
					<AlertCircle className="w-3 h-3 flex-shrink-0" />
					<span>{parseResult.error}</span>
				</p>
			)}
		</div>
	);
};
