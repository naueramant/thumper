import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "rabbitdash:syntax_highlighting";

export function useSyntaxHighlightPreference() {
	const [enabled, setEnabled] = useState<boolean>(() => {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			return stored !== null ? stored === "true" : true;
		} catch {
			return true;
		}
	});

	const toggle = useCallback(() => {
		setEnabled((prev) => {
			const next = !prev;
			try {
				localStorage.setItem(STORAGE_KEY, String(next));
				window.dispatchEvent(
					new CustomEvent("rabbitdash:syntax-highlight-change", {
						detail: next,
					}),
				);
			} catch {
				// ignore
			}
			return next;
		});
	}, []);

	const setPreference = useCallback((val: boolean) => {
		setEnabled(val);
		try {
			localStorage.setItem(STORAGE_KEY, String(val));
			window.dispatchEvent(
				new CustomEvent("rabbitdash:syntax-highlight-change", {
					detail: val,
				}),
			);
		} catch {
			// ignore
		}
	}, []);

	useEffect(() => {
		const handleStorage = (e: StorageEvent) => {
			if (e.key === STORAGE_KEY && e.newValue !== null) {
				setEnabled(e.newValue === "true");
			}
		};

		const handleCustom = (e: Event) => {
			const ce = e as CustomEvent<boolean>;
			if (typeof ce.detail === "boolean") {
				setEnabled(ce.detail);
			}
		};

		window.addEventListener("storage", handleStorage);
		window.addEventListener("rabbitdash:syntax-highlight-change", handleCustom);
		return () => {
			window.removeEventListener("storage", handleStorage);
			window.removeEventListener(
				"rabbitdash:syntax-highlight-change",
				handleCustom,
			);
		};
	}, []);

	return { enabled, toggle, setPreference };
}
