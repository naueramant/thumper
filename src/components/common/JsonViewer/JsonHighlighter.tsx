import { Button } from "@/components/ui/button";
import { Highlighter } from "lucide-react";
import React, { useMemo } from "react";
import { detectLanguage, type SupportedLanguage } from "./syntaxDetection";
import { tokenizeLine } from "./syntaxTokenizer";
import { useSyntaxHighlightPreference } from "./useSyntaxHighlightPreference";

export interface JsonHighlighterProps {
	content: string;
	searchQuery?: string;
	showLineNumbers?: boolean;
	language?: SupportedLanguage | "auto";
	highlightEnabled?: boolean;
	showToggle?: boolean;
	onToggleHighlight?: (enabled: boolean) => void;
	className?: string;
}

export const JsonHighlighter: React.FC<JsonHighlighterProps> = ({
	content,
	searchQuery,
	showLineNumbers = true,
	language = "json",
	highlightEnabled: explicitHighlightEnabled,
	showToggle = false,
	onToggleHighlight,
	className = "",
}) => {
	const { enabled: globalEnabled, toggle: toggleGlobal } =
		useSyntaxHighlightPreference();

	const isHighlightActive =
		explicitHighlightEnabled !== undefined
			? explicitHighlightEnabled
			: globalEnabled;

	const handleToggle = () => {
		if (onToggleHighlight) {
			onToggleHighlight(!isHighlightActive);
		} else {
			toggleGlobal();
		}
	};

	const resolvedLanguage = useMemo<SupportedLanguage>(() => {
		if (language === "auto") {
			return detectLanguage(content);
		}
		return language;
	}, [language, content]);

	const lines = useMemo(() => content.split("\n"), [content]);

	return (
		<div className={`space-y-1.5 ${className}`}>
			{showToggle && (
				<div className="flex items-center justify-between pb-1 mb-1 border-b border-border/40 text-[11px]">
					<span className="font-mono text-muted-foreground uppercase text-[10px]">
						{resolvedLanguage}
					</span>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={handleToggle}
						className={`h-6 px-2 text-[10px] cursor-pointer ${
							isHighlightActive
								? "text-primary bg-primary/10 hover:bg-primary/20"
								: "text-muted-foreground hover:text-foreground"
						}`}
						title={
							isHighlightActive
								? "Syntax highlighting active (click to turn off)"
								: "Syntax highlighting disabled (click to turn on)"
						}
					>
						<Highlighter className="w-3 h-3 mr-1" />
						{isHighlightActive ? "Highlight On" : "Highlight Off"}
					</Button>
				</div>
			)}

			<div className="font-mono text-xs leading-relaxed select-text">
				{lines.map((line, idx) => (
					<div
						key={idx}
						className="flex hover:bg-muted/15 px-2 py-0.5 rounded group"
					>
						{showLineNumbers && (
							<span className="w-9 pr-3 text-right text-[11px] text-muted-foreground/40 select-none group-hover:text-muted-foreground font-mono flex-shrink-0">
								{idx + 1}
							</span>
						)}
						<span className="whitespace-pre flex-1 break-all overflow-x-auto">
							{tokenizeLine(
								line,
								resolvedLanguage,
								isHighlightActive,
								searchQuery,
							)}
						</span>
					</div>
				))}
			</div>
		</div>
	);
};
