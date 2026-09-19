export interface QuickFilterDef {
	id: string;
	label: string;
	active: boolean;
	onToggle: () => void;
}

export function QuickFilters({ filters }: { filters: QuickFilterDef[] }) {
	return (
		<div className="flex flex-wrap items-center gap-1.5">
			{filters.map((f) => (
				<button
					key={f.id}
					type="button"
					onClick={f.onToggle}
					aria-pressed={f.active}
					className={`h-8 rounded-full border px-2.5 text-[11px] font-medium transition-colors ${
						f.active
							? "border-primary bg-primary/10 text-primary"
							: "border-border/70 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
					}`}
				>
					{f.label}
				</button>
			))}
		</div>
	);
}
