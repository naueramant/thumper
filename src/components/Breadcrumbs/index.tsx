import { cn } from "@/utilities/cn/index.ts";
import type * as React from "react";

/** Plain breadcrumb trail with room to breathe below it, separated from the page title. */
export function Breadcrumbs({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<nav
			aria-label="Breadcrumb"
			className={cn(
				"mb-4 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground",
				className,
			)}
		>
			{children}
		</nav>
	);
}

