import type * as React from "react";

/** Plain breadcrumb trail with room to breathe below it, separated from the page title. */
export function Breadcrumbs({ children }: { children: React.ReactNode }) {
	return (
		<nav
			aria-label="Breadcrumb"
			className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"
		>
			{children}
		</nav>
	);
}
