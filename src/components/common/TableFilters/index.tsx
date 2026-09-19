import { Dropdown, DropdownMenu } from "@/components/ui/dropdown/index.tsx";
import { Filter } from "lucide-react";

export interface TableFilterOption {
	label: string;
	value: string;
}

export interface TableFilterConfig {
	id: string;
	label: string;
	value: string;
	onChange: (value: string) => void;
	options: TableFilterOption[];
}

export interface TableFiltersProps {
	filters: TableFilterConfig[];
	onClearAll: () => void;
}

export function TableFilters({ filters, onClearAll }: TableFiltersProps) {
	const activeCount = filters.filter((f) => f.value !== "all").length;

	return (
		<DropdownMenu
			align="left"
			trigger={
				<span className="flex items-center gap-1">
					<Filter className="h-3.5 w-3.5" />
					{activeCount > 0 && (
						<span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
							{activeCount}
						</span>
					)}
				</span>
			}
			contentClassName="w-56 space-y-2 p-2.5"
		>
			{filters.map((f) => (
				<div key={f.id} data-keep-open className="space-y-1">
					<label className="text-[11px] font-medium text-muted-foreground">
						{f.label}
					</label>
					<Dropdown
						value={f.value}
						onChange={f.onChange}
						options={f.options}
						align="left"
						className="block w-full"
						buttonClassName="w-full justify-between"
						contentClassName="w-full"
					/>
				</div>
			))}
			{activeCount > 0 && (
				<button
					type="button"
					onClick={onClearAll}
					className="w-full rounded border border-border/70 px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
				>
					Clear filters
				</button>
			)}
		</DropdownMenu>
	);
}

