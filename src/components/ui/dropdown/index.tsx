import { cn } from "@/utilities/cn/index.ts";
import { Check, ChevronDown, Plus, Search, X } from "lucide-react";
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
	placeholder?: string;
	clearable?: boolean;
	allowCustom?: boolean;
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
	placeholder,
	clearable = false,
	allowCustom = false,
	searchable = false,
	searchPlaceholder = "Search...",
	align = "right",
	className,
	buttonClassName,
	contentClassName,
}: DropdownProps<T>) {
	const [isOpen, setIsOpen] = React.useState(false);
	const [search, setSearch] = React.useState("");
	const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
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
			setHighlightedIndex(-1);
		} else if (!isOpen) {
			setSearch("");
			setHighlightedIndex(-1);
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

	const isCustomSearchValue =
		allowCustom &&
		search.trim() !== "" &&
		!options.some(
			(opt) =>
				String(opt.value).toLowerCase() === search.trim().toLowerCase() ||
				opt.label.toLowerCase() === search.trim().toLowerCase(),
		);

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
					<div className="flex items-center gap-1.5 min-w-0 flex-1 text-left">
						{selectedOption?.icon}
						<span
							className={cn(
								"font-medium truncate",
								!selectedOption && !value && "text-muted-foreground font-normal",
							)}
						>
							{selectedOption?.label ||
								(value !== undefined && value !== ""
									? String(value)
									: placeholder || "Select...")}
						</span>
					</div>
				)}
				{clearable && value !== undefined && value !== "" && (
					<span
						role="button"
						tabIndex={-1}
						onClick={(e) => {
							e.stopPropagation();
							onChange("" as unknown as T);
						}}
						className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
						title="Clear selection"
					>
						<X className="h-3 w-3" />
					</span>
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
								<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
								<input
									type="text"
									placeholder={searchPlaceholder}
									value={search}
									onChange={(e) => {
										setSearch(e.target.value);
										setHighlightedIndex(-1);
									}}
									onKeyDown={(e) => {
										if (e.key === "ArrowDown") {
											e.preventDefault();
											const totalCount =
												filteredOptions.length + (isCustomSearchValue ? 1 : 0);
											setHighlightedIndex((prev) =>
												totalCount === 0
													? -1
													: prev < totalCount - 1
														? prev + 1
														: 0,
											);
										} else if (e.key === "ArrowUp") {
											e.preventDefault();
											const totalCount =
												filteredOptions.length + (isCustomSearchValue ? 1 : 0);
											setHighlightedIndex((prev) =>
												totalCount === 0
													? -1
													: prev > 0
														? prev - 1
														: totalCount - 1,
											);
										} else if (e.key === "Enter") {
											e.preventDefault();
											if (
												highlightedIndex >= 0 &&
												highlightedIndex < filteredOptions.length
											) {
												onChange(filteredOptions[highlightedIndex].value);
												setIsOpen(false);
												setSearch("");
											} else if (
												isCustomSearchValue &&
												highlightedIndex === filteredOptions.length
											) {
												onChange(search.trim() as unknown as T);
												setIsOpen(false);
												setSearch("");
											} else if (filteredOptions.length > 0) {
												onChange(filteredOptions[0].value);
												setIsOpen(false);
												setSearch("");
											} else if (isCustomSearchValue) {
												onChange(search.trim() as unknown as T);
												setIsOpen(false);
												setSearch("");
											}
										} else if (e.key === "Escape") {
											e.preventDefault();
											setIsOpen(false);
										}
									}}
									ref={searchInputRef}
									className="h-7 w-full rounded border border-border/80 bg-muted/30 pl-8 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
								/>
							</div>
						)}

						<div className="max-h-56 overflow-y-auto space-y-0.5 scrollbar-thin">
							{filteredOptions.length > 0 || isCustomSearchValue ? (
								<>
									{filteredOptions.map((opt, idx) => {
										const isSelected = opt.value === value;
										const isHighlighted = highlightedIndex === idx;
										return (
											<button
												key={String(opt.value)}
												type="button"
												role="option"
												aria-selected={isSelected}
												onMouseEnter={() => setHighlightedIndex(idx)}
												onClick={() => {
													onChange(opt.value);
													setIsOpen(false);
													setSearch("");
												}}
												className={cn(
													"flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted/80 cursor-pointer",
													isSelected
														? "bg-primary/10 text-primary font-semibold"
														: isHighlighted
															? "bg-muted/80 text-foreground"
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
									})}
									{isCustomSearchValue && (
										<button
											type="button"
											role="option"
											onMouseEnter={() =>
												setHighlightedIndex(filteredOptions.length)
											}
											onClick={() => {
												onChange(search.trim() as unknown as T);
												setIsOpen(false);
												setSearch("");
											}}
											className={cn(
												"flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted/80 text-primary border-t border-border/40 mt-1 pt-1.5 font-mono cursor-pointer",
												highlightedIndex === filteredOptions.length &&
													"bg-muted/80",
											)}
										>
											<Plus className="h-3 w-3 shrink-0" />
											<span className="truncate">Use &ldquo;{search.trim()}&rdquo;</span>
										</button>
									)}
								</>
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
