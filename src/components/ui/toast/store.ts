export type ToastVariant = "success" | "error" | "info";

export interface ToastItem {
	id: number;
	title: string;
	description?: string;
	variant: ToastVariant;
}

type Listener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
let listeners: Listener[] = [];
let idCounter = 0;

const TOAST_DURATION_MS = 5000;

function emit() {
	for (const listener of listeners) listener(toasts);
}

function dismiss(id: number) {
	toasts = toasts.filter((t) => t.id !== id);
	emit();
}

function push(variant: ToastVariant, title: string, description?: string) {
	const id = ++idCounter;
	toasts = [...toasts, { id, title, description, variant }];
	emit();
	setTimeout(() => dismiss(id), TOAST_DURATION_MS);
	return id;
}

export const toast = {
	success: (title: string, description?: string) =>
		push("success", title, description),
	error: (title: string, description?: string) =>
		push("error", title, description),
	info: (title: string, description?: string) =>
		push("info", title, description),
	dismiss,
};

export function subscribeToasts(listener: Listener) {
	listeners.push(listener);
	listener(toasts);
	return () => {
		listeners = listeners.filter((l) => l !== listener);
	};
}
