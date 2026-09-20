import { cn } from "@/utilities/cn/index.ts";
import * as React from "react";

export interface RadioProps
	extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
	size?: "sm" | "default" | "lg";
	label?: React.ReactNode;
	description?: React.ReactNode;
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
	(
		{
			className,
			size = "default",
			disabled,
			checked,
			label,
			description,
			id,
			onChange,
			...props
		},
		ref,
	) => {
		const generatedId = React.useId();
		const inputId = id || (label ? generatedId : undefined);

		const sizeClasses = {
			sm: "h-3.5 w-3.5",
			default: "h-4 w-4",
			lg: "h-5 w-5",
		};

		const dotSizeClasses = {
			sm: "h-1.5 w-1.5",
			default: "h-2 w-2",
			lg: "h-2.5 w-2.5",
		};

		const circleElement = (
			<span
				className={cn(
					"relative inline-flex shrink-0 items-center justify-center rounded-full select-none",
					sizeClasses[size],
					disabled && "opacity-50 cursor-not-allowed",
				)}
			>
				<input
					type="radio"
					id={inputId}
					ref={ref}
					checked={checked}
					disabled={disabled}
					onChange={onChange}
					className="peer absolute inset-0 m-0 h-full w-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
					{...props}
				/>
				<span
					aria-hidden="true"
					className={cn(
						"flex h-full w-full items-center justify-center rounded-full border transition-all duration-150 ease-in-out",
						"border-border/80 bg-background dark:bg-muted/30 shadow-2xs",
						"peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40 peer-focus-visible:border-primary",
						"peer-hover:border-primary/60",
						checked
							? "border-primary bg-primary/10 shadow-xs"
							: "text-transparent",
						className,
					)}
				>
					<span
						className={cn(
							"rounded-full bg-primary transition-transform duration-100 ease-in-out",
							dotSizeClasses[size],
							checked ? "scale-100 opacity-100" : "scale-0 opacity-0",
						)}
					/>
				</span>
			</span>
		);

		if (!label && !description) {
			return circleElement;
		}

		return (
			<label
				htmlFor={inputId}
				className={cn(
					"inline-flex items-start gap-2.5 cursor-pointer select-none",
					disabled && "opacity-50 cursor-not-allowed pointer-events-none",
				)}
			>
				<div className="pt-0.5">{circleElement}</div>
				<div className="flex flex-col gap-0.5 text-xs">
					{label && (
						<span className="font-medium text-foreground leading-tight">
							{label}
						</span>
					)}
					{description && (
						<span className="text-[11px] text-muted-foreground leading-normal">
							{description}
						</span>
					)}
				</div>
			</label>
		);
	},
);

Radio.displayName = "Radio";
