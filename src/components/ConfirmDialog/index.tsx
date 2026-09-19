import { Button } from "@/components/ui/button/index.tsx";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card/index.tsx";
import { AlertTriangle } from "lucide-react";
import * as React from "react";

export interface ConfirmOptions {
	title: string;
	description?: React.ReactNode;
	confirmLabel?: string;
	cancelLabel?: string;
	/** "destructive" renders the confirm button in the destructive color (default for this dialog). */
	variant?: "destructive" | "warning";
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmDialogContext = React.createContext<ConfirmFn | null>(null);

interface PendingConfirm extends ConfirmOptions {
	resolve: (value: boolean) => void;
}

export function ConfirmDialogProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [pending, setPending] = React.useState<PendingConfirm | null>(null);

	const confirm = React.useCallback<ConfirmFn>((options) => {
		return new Promise<boolean>((resolve) => {
			setPending({ ...options, resolve });
		});
	}, []);

	const close = (result: boolean) => {
		pending?.resolve(result);
		setPending(null);
	};

	const isWarning = pending?.variant === "warning";

	return (
		<ConfirmDialogContext.Provider value={confirm}>
			{children}
			{pending && (
				<div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
					<Card
						className={
							isWarning
								? "max-w-md w-full border-amber-500/40 animate-in zoom-in-95 fade-in duration-150"
								: "max-w-md w-full border-destructive/40 animate-in zoom-in-95 fade-in duration-150"
						}
					>
						<CardHeader className="pb-2">
							<CardTitle
								className={
									isWarning
										? "text-base text-amber-500 flex items-center gap-2"
										: "text-base text-destructive flex items-center gap-2"
								}
							>
								<AlertTriangle className="h-5 w-5" />
								{pending.title}
							</CardTitle>
							{pending.description && (
								<CardDescription className="text-xs">
									{pending.description}
								</CardDescription>
							)}
						</CardHeader>
						<CardContent className="pt-4 flex justify-end gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => close(false)}
								className="h-8 text-xs"
							>
								{pending.cancelLabel ?? "Cancel"}
							</Button>
							<Button
								variant="destructive"
								size="sm"
								onClick={() => close(true)}
								className={
									isWarning
										? "h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white"
										: "h-8 text-xs"
								}
							>
								{pending.confirmLabel ?? "Confirm"}
							</Button>
						</CardContent>
					</Card>
				</div>
			)}
		</ConfirmDialogContext.Provider>
	);
}

export function useConfirm(): ConfirmFn {
	const ctx = React.useContext(ConfirmDialogContext);
	if (!ctx) {
		throw new Error("useConfirm must be used within a ConfirmDialogProvider");
	}
	return ctx;
}
