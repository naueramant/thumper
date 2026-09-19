import { cn } from "@/utilities/cn/index.ts";
import { Check } from "lucide-react";
import * as React from "react";

export interface CheckboxProps
	extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
	size?: "sm" | "default";
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
	({ className, size = "default", disabled, checked, ...props }, ref) => {
		return (
			<span
				className={cn(
					"relative inline-flex shrink-0 items-center justify-center",
					size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4",
					disabled && "opacity-50",
				)}
			>
				<input
					type="checkbox"
					ref={ref}
					checked={checked}
					disabled={disabled}
					className="peer absolute inset-0 m-0 h-full w-full cursor-pointer appearance-none disabled:cursor-not-allowed"
					{...props}
				/>
				<span
					aria-hidden="true"
					className={cn(
						"pointer-events-none flex h-full w-full items-center justify-center rounded border border-border bg-muted/20 text-primary-foreground transition-colors",
						"peer-focus-visible:ring-1 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-background",
						checked
							? "border-primary bg-primary"
							: "peer-hover:border-primary/60",
						className,
					)}
				>
					<Check
						className={cn(
							"transition-opacity",
							checked ? "opacity-100" : "opacity-0",
							size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3",
						)}
					/>
				</span>
			</span>
		);
	},
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
