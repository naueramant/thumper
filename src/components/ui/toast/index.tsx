import { cn } from "@/utilities/cn/index.ts";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import * as React from "react";
import { subscribeToasts, toast, type ToastItem } from "./store.ts";

const VARIANT_STYLES: Record<
	ToastItem["variant"],
	{ icon: React.ElementType; className: string }
> = {
	success: {
		icon: CheckCircle2,
		className: "border-emerald-500/40 text-emerald-500",
	},
	error: {
		icon: AlertTriangle,
		className: "border-destructive/40 text-destructive",
	},
	info: { icon: Info, className: "border-primary/40 text-primary" },
};

export function Toaster() {
	const [items, setItems] = React.useState<ToastItem[]>([]);

	React.useEffect(() => subscribeToasts(setItems), []);

	if (items.length === 0) return null;

	return (
		<div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
			{items.map((item) => {
				const { icon: Icon, className } = VARIANT_STYLES[item.variant];
				return (
					<div
						key={item.id}
						className={cn(
							"pointer-events-auto flex items-start gap-2 rounded-lg border bg-card p-3 shadow-2xl animate-in slide-in-from-bottom-2 fade-in duration-150",
							className,
						)}
					>
						<Icon className="h-4 w-4 shrink-0 mt-0.5" />
						<div className="flex-1 min-w-0">
							<div className="text-xs font-semibold font-mono text-foreground break-words">
								{item.title}
							</div>
							{item.description && (
								<div className="text-[11px] text-muted-foreground break-words mt-0.5">
									{item.description}
								</div>
							)}
						</div>
						<button
							type="button"
							onClick={() => toast.dismiss(item.id)}
							className="shrink-0 text-muted-foreground hover:text-foreground"
						>
							<X className="h-3.5 w-3.5" />
						</button>
					</div>
				);
			})}
		</div>
	);
}

export { toast } from "./store.ts";
