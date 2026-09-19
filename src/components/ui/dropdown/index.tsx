import { cn } from "@/utilities/cn/index.ts";
import { Check, ChevronDown, Search } from "lucide-react";
import * as React from "react";
import { createPortal } from "react-dom";

export interface DropdownOption<T = string | number> {
	label: string;
	value: T;
	subLabel?: string;
	icon?: React.ReactNode;
}

export interface DropdownProps<T = string | number> {
	trigger?: React.ReactNode;
	value?: T;
	options: DropdownOption<T>[];
	onChange: (value: T) => void;
	searchable?: boolean;
	searchPlaceholder?: string;
	align?: "left" | "right";
	className?: string;
	buttonClassName?: string;
	contentClassName?: string;
	width?: string;
}

interface FloatingPosition {
	top: number;
	left: number;
	right: number;
	width: number;
}

// Tracks a fixed-position anchor for a portalled menu so it can float above any
// scrollable/overflow-clipped ancestor (e.g. a modal body) instead of being
// confined and forced to scroll inside it.
function useFloatingPosition(
	isOpen: boolean,
	triggerRef: React.RefObject<HTMLButtonElement | null>,
) {
	const [position, setPosition] = React.useState<FloatingPosition | null>(null);

	React.useLayoutEffect(() => {
		if (!isOpen) {
			setPosition(null);
			return;
		}
		const update = () => {
			const rect = triggerRef.current?.getBoundingClientRect();
			if (!rect) return;
			// Use clientWidth (excludes the scrollbar), matching the edge
			// `position: fixed; right: 0` actually aligns to.
			const next = {
				top: rect.bottom + 4,
				left: rect.left,
				right: document.documentElement.clientWidth - rect.right,
				width: rect.width,
			};
			// The scroll listener below is capture-phase, so it fires for every
			// scroll anywhere in the app. Bail out when nothing actually moved,
			// otherwise each of those events forces a re-render + portal update.
			setPosition((prev) =>
				prev &&
				prev.top === next.top &&
				prev.left === next.left &&
				prev.right === next.right &&
				prev.width === next.width
					? prev
					: next,
			);
		};
		update();
		window.addEventListener("resize", update);
		window.addEventListener("scroll", update, true);
		return () => {
			window.removeEventListener("resize", update);
			window.removeEventListener("scroll", update, true);
		};
	}, [isOpen, triggerRef]);

	return position;
}

export function Dropdown<T = string | number>({
	trigger,
	value,
	options,
	onChange,
	searchable = false,
	searchPlaceholder = "Search...",
	align = "right",
	className,
	buttonClassName,
	contentClassName,
}: DropdownProps<T>) {
	const [isOpen, setIsOpen] = React.useState(false);
	const [search, setSearch] = React.useState("");
	const triggerRef = React.useRef<HTMLButtonElement>(null);
	const menuRef = React.useRef<HTMLDivElement>(null);
	const searchInputRef = React.useRef<HTMLInputElement>(null);
	const position = useFloatingPosition(isOpen, triggerRef);

	// Focus without letting the browser scroll the page to "reveal" it - the
	// menu is already fully visible (fixed-positioned), and a normal autoFocus
	// can drag the whole document sideways when the header content is wider
	// than the viewport, which throws off the menu's apparent alignment.
	React.useEffect(() => {
		if (isOpen && searchable) {
			searchInputRef.current?.focus({ preventScroll: true });
		}
	}, [isOpen, searchable]);

	const filteredOptions = React.useMemo(() => {
		if (!searchable || !search.trim()) return options;
		return options.filter(
			(opt) =>
				opt.label.toLowerCase().includes(search.toLowerCase()) ||
				(opt.subLabel &&
					opt.subLabel.toLowerCase().includes(search.toLowerCase())),
		);
	}, [options, searchable, search]);

	const selectedOption = options.find((opt) => opt.value === value);
	const isFullWidth = contentClassName?.split(/\s+/).includes("w-full");

	React.useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			const target = event.target as Node;
			if (
				!triggerRef.current?.contains(target) &&
				!menuRef.current?.contains(target)
			) {
				setIsOpen(false);
			}
		}
		if (isOpen) {
			const timer = setTimeout(() => {
				document.addEventListener("click", handleClickOutside);
			}, 0);
			return () => {
				clearTimeout(timer);
				document.removeEventListener("click", handleClickOutside);
			};
		}
	}, [isOpen]);

	return (
		<div className={cn("relative inline-block", className)}>
			{/* Trigger Button */}
			<button
				ref={triggerRef}
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				aria-expanded={isOpen}
				aria-haspopup="listbox"
				className={cn(
					"flex h-8 items-center gap-1.5 rounded-md border border-border/70 bg-muted/20 px-2.5 text-xs text-foreground transition-colors hover:bg-muted/50 hover:border-border focus:outline-none focus:ring-1 focus:ring-primary",
					isOpen && "border-primary bg-muted/50 ring-1 ring-primary",
					buttonClassName,
				)}
			>
				{trigger ? (
					trigger
				) : (
					<div className="flex items-center gap-1.5">
						{selectedOption?.icon}
						<span className="font-medium truncate">
							{selectedOption?.label}
						</span>
					</div>
				)}
				<ChevronDown
					className={cn(
						"h-3 w-3 text-muted-foreground ml-0.5 shrink-0 transition-transform duration-150",
						isOpen && "rotate-180",
					)}
				/>
			</button>

			{/* Dropdown Menu: portalled to <body> and fixed-positioned so it floats above modals/scroll containers */}
			{isOpen &&
				position &&
				createPortal(
					<div
						ref={menuRef}
						role="listbox"
						style={{
							position: "fixed",
							top: position.top,
							left: align === "right" ? undefined : position.left,
							right: align === "right" ? position.right : undefined,
							width: isFullWidth ? position.width : undefined,
						}}
						className={cn(
							"z-50 min-w-44 rounded-md border border-border bg-card p-1 text-foreground shadow-lg animate-in fade-in-50 zoom-in-95",
							contentClassName,
						)}
					>
						{searchable && (
							<div className="relative mb-1">
								<Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
								<input
									type="text"
									placeholder={searchPlaceholder}
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									ref={searchInputRef}
									className="h-7 w-full rounded border border-border/80 bg-muted/30 pl-8 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
								/>
							</div>
						)}

						<div className="max-h-56 overflow-y-auto space-y-0.5">
							{filteredOptions.length > 0 ? (
								filteredOptions.map((opt) => {
									const isSelected = opt.value === value;
									return (
										<button
											key={String(opt.value)}
											type="button"
											role="option"
											aria-selected={isSelected}
											onClick={() => {
												onChange(opt.value);
												setIsOpen(false);
												setSearch("");
											}}
											className={cn(
												"flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted/80",
												isSelected
													? "bg-primary/10 text-primary font-semibold"
													: "text-foreground",
											)}
										>
											<div className="flex items-center gap-2 truncate">
												{opt.icon}
												<span className="truncate">{opt.label}</span>
											</div>
											<div className="flex items-center gap-1 shrink-0 text-[10px] text-muted-foreground font-mono">
												{opt.subLabel && <span>{opt.subLabel}</span>}
												{isSelected && (
													<Check className="h-3 w-3 text-primary ml-1" />
												)}
											</div>
										</button>
									);
								})
							) : (
								<div className="p-2 text-center text-xs text-muted-foreground">
									No results found
								</div>
							)}
						</div>
					</div>,
					document.body,
				)}
		</div>
	);
}

export interface DropdownMenuProps {
	trigger: React.ReactNode;
	children: React.ReactNode;
	align?: "left" | "right";
	className?: string;
	contentClassName?: string;
}

export function DropdownMenu({
	trigger,
	children,
	align = "right",
	className,
	contentClassName,
}: DropdownMenuProps) {
	const [isOpen, setIsOpen] = React.useState(false);
	const triggerRef = React.useRef<HTMLButtonElement>(null);
	const menuRef = React.useRef<HTMLDivElement>(null);
	const position = useFloatingPosition(isOpen, triggerRef);

	React.useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			const target = event.target as Node;
			if (
				!triggerRef.current?.contains(target) &&
				!menuRef.current?.contains(target)
			) {
				setIsOpen(false);
			}
		}
		if (isOpen) {
			const timer = setTimeout(() => {
				document.addEventListener("click", handleClickOutside);
			}, 0);
			return () => {
				clearTimeout(timer);
				document.removeEventListener("click", handleClickOutside);
			};
		}
	}, [isOpen]);

	return (
		<div className={cn("relative inline-block", className)}>
			<button
				ref={triggerRef}
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				aria-expanded={isOpen}
				className={cn(
					"flex h-8 items-center gap-1.5 rounded-md border border-border/70 bg-muted/20 px-2.5 text-xs text-foreground transition-colors hover:bg-muted/50 hover:border-border focus:outline-none focus:ring-1 focus:ring-primary",
					isOpen && "border-primary bg-muted/50 ring-1 ring-primary",
				)}
			>
				{trigger}
				<ChevronDown className="h-3 w-3 text-muted-foreground ml-0.5 shrink-0" />
			</button>

			{isOpen &&
				position &&
				createPortal(
					<div
						ref={menuRef}
						onClick={(e) => {
							// Close when clicking an action item, unless it has data-keep-open
							if (!(e.target as HTMLElement).closest("[data-keep-open]")) {
								setIsOpen(false);
							}
						}}
						style={{
							position: "fixed",
							top: position.top,
							left: align === "right" ? undefined : position.left,
							right: align === "right" ? position.right : undefined,
						}}
						className={cn(
							"z-50 rounded-md border border-border bg-card p-1 text-foreground shadow-lg animate-in fade-in-50 zoom-in-95",
							contentClassName,
						)}
					>
						{children}
					</div>,
					document.body,
				)}
		</div>
	);
}
