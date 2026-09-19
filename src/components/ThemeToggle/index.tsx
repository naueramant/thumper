import { useTheme } from "@/hooks/useTheme/index.ts";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
	const { resolvedTheme, toggleTheme } = useTheme();

	return (
		<button
			type="button"
			onClick={toggleTheme}
			className="flex h-8 w-8 items-center justify-center rounded-md border border-border/70 bg-muted/20 text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all duration-150 active:scale-90 focus:outline-none focus:ring-1 focus:ring-primary"
			title={`Theme: ${resolvedTheme}. Click to toggle.`}
			aria-label="Toggle theme"
		>
			{resolvedTheme === "dark" ? (
				<Sun className="h-3.5 w-3.5 text-amber-400 animate-in zoom-in-50 spin-in-45 duration-200" />
			) : (
				<Moon className="h-3.5 w-3.5 text-orange-600 animate-in zoom-in-50 spin-in-45 duration-200" />
			)}
		</button>
	);
}

