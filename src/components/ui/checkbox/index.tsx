import { cn } from "@/utilities/cn/index.ts";
import { Check } from "lucide-react";
import * as React from "react";

export interface CheckboxProps
	extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
	size?: "sm" | "default" | "lg";
	label?: React.ReactNode;
	description?: React.ReactNode;
	onCheckedChange?: (checked: boolean) => void;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
	(
		{
			className,
			size = "default",
			disabled,
			checked,
			defaultChecked,
			label,
			description,
			onCheckedChange,
			onChange,
			id,
			...props
		},
		ref,
	) => {
		const generatedId = React.useId();
		const inputId = id || (label ? generatedId : undefined);

		const sizeClasses = {
			sm: "h-3.5 w-3.5 rounded-[3px]",
			default: "h-4 w-4 rounded-[4px]",
			lg: "h-5 w-5 rounded-[5px]",
		};

		const iconSizeClasses = {
			sm: "h-2.5 w-2.5 stroke-[3]",
			default: "h-3 w-3 stroke-[2.5]",
			lg: "h-3.5 w-3.5 stroke-[2.5]",
		};

		const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
			onChange?.(e);
			onCheckedChange?.(e.target.checked);
		};

		const boxElement = (
			<span
				className={cn(
					"relative inline-flex shrink-0 items-center justify-center select-none",
					sizeClasses[size],
					disabled && "opacity-50 cursor-not-allowed",
				)}
			>
				<input
					type="checkbox"
					id={inputId}
					ref={ref}
					checked={checked}
					defaultChecked={defaultChecked}
					disabled={disabled}
					onChange={handleChange}
					className="peer absolute inset-0 m-0 h-full w-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
					{...props}
				/>
				<span
					aria-hidden="true"
					className={cn(
						"flex h-full w-full items-center justify-center border transition-all duration-150 ease-in-out",
						sizeClasses[size],
						"border-border/80 bg-background dark:bg-muted/30 shadow-2xs",
						"peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40 peer-focus-visible:border-primary",
						"peer-hover:border-primary/60",
						checked
							? "border-primary bg-primary text-primary-foreground shadow-xs"
							: "text-transparent",
						className,
					)}
				>
					<Check
						className={cn(
							"transition-transform duration-100 ease-in-out",
							iconSizeClasses[size],
							checked ? "scale-100 opacity-100" : "scale-75 opacity-0",
						)}
					/>
				</span>
			</span>
		);

		if (!label && !description) {
			return boxElement;
		}

		return (
			<label
				htmlFor={inputId}
				className={cn(
					"inline-flex items-start gap-2.5 cursor-pointer select-none",
					disabled && "opacity-50 cursor-not-allowed pointer-events-none",
				)}
			>
				<div className="pt-0.5">{boxElement}</div>
				<div className="flex flex-col gap-0.5 text-xs">
					{label && (
						<span className="font-medium text-foreground leading-tight">
							{label}
						</span>
					)}
					{description && (
						<p className="text-[11px] text-muted-foreground leading-normal">
							{description}
						</p>
					)}
				</div>
			</label>
		);
	},
);

Checkbox.displayName = "Checkbox";
