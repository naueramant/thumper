import { Card, CardContent } from "@/components/ui/card/index.tsx";
import { cn } from "@/utilities/cn/index.ts";
import type * as React from "react";

export interface MetricCardProps {
	title: string;
	value: string | number;
	subValue?: string;
	rate?: string;
	trend?: "up" | "down" | "neutral";
	icon?: React.ReactNode;
	className?: string;
}

export function MetricCard({
	title,
	value,
	subValue,
	rate,
	trend,
	icon,
	className,
}: MetricCardProps) {
	return (
		<Card
			className={cn("relative overflow-hidden border-border/70", className)}
		>
			<CardContent className="p-5">
				<div className="flex items-center justify-between space-x-2">
					<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
						{title}
					</p>
					{icon && (
						<div className="text-primary/80 dark:text-primary">{icon}</div>
					)}
				</div>
				<div className="mt-3 flex items-baseline space-x-2">
					<div className="text-2xl font-bold tracking-tight text-foreground">
						{value}
					</div>
					{rate && (
						<span
							className={cn(
								"text-xs font-medium",
								trend === "up" && "text-emerald-600 dark:text-emerald-400",
								trend === "down" && "text-rose-600 dark:text-rose-400",
								trend === "neutral" && "text-muted-foreground",
							)}
						>
							{rate}
						</span>
					)}
				</div>
				{subValue && (
					<p className="mt-1 text-xs text-muted-foreground truncate">
						{subValue}
					</p>
				)}
			</CardContent>
		</Card>
	);
}

