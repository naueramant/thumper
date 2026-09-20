import { cn } from "@/utilities/cn/index.ts";
import * as React from "react";
import { createPortal } from "react-dom";

export interface TooltipProps {
	content: React.ReactNode;
	children: React.ReactNode;
	className?: string;
}

// Portal-based (not pure CSS) so it isn't clipped by table wrappers' overflow-auto.
export function Tooltip({ content, children, className }: TooltipProps) {
	const [isOpen, setIsOpen] = React.useState(false);
	const [position, setPosition] = React.useState({ top: 0, left: 0 });
	const triggerRef = React.useRef<HTMLSpanElement>(null);

	const show = () => {
		const rect = triggerRef.current?.getBoundingClientRect();
		if (!rect) return;
		setPosition({ top: rect.top - 6, left: rect.left + rect.width / 2 });
		setIsOpen(true);
	};
	const hide = () => setIsOpen(false);

	return (
		<span
			ref={triggerRef}
			className="inline-flex"
			onMouseEnter={show}
			onMouseLeave={hide}
			onFocus={show}
			onBlur={hide}
		>
			{children}
			{isOpen &&
				createPortal(
					<div
						role="tooltip"
						className={cn(
							"fixed z-50 max-w-64 -translate-x-1/2 -translate-y-full rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs font-normal normal-case text-popover-foreground shadow-md pointer-events-none",
							className,
						)}
						style={{ top: position.top, left: position.left }}
					>
						{content}
					</div>,
					document.body,
				)}
		</span>
	);
}
