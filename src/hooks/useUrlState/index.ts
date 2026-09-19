import { useNavigate, useRouterState, useSearch } from "@tanstack/react-router";
import * as React from "react";

type SearchRecord = Record<string, string | undefined>;

const DEFAULT_DEBOUNCE_MS = 300;

/**
 * Syncs a flat set of string filters (search text, dropdown filters, sort
 * column/direction, quick-filter ids, ...) to the current route's URL search
 * params, so table state survives reloads and can be shared via the URL.
 *
 * Local state is what components render, so typing/clicking is instant and
 * never blocked on the router. The URL is written through on a debounce, and
 * only when it would actually differ — a navigation per keystroke re-renders
 * the routed tree and makes large tables feel frozen.
 *
 * Values matching their default (or empty) are omitted from the URL.
 */
export function useUrlState<T extends SearchRecord>(
	defaults: T,
	debounceMs = DEFAULT_DEBOUNCE_MS,
) {
	const navigate = useNavigate();
	const rawSearch = useSearch({ strict: false } as never) as Partial<T>;
	// A plain string, so this only re-renders when the query string truly
	// changes — unlike subscribing to the whole router state.
	const searchStr = useRouterState({ select: (s) => s.location.searchStr });

	const [local, setLocal] = React.useState<T>(() => ({
		...defaults,
		...rawSearch,
	}));

	// Read inside effects without making them re-run on every render.
	const latest = React.useRef({ defaults, rawSearch });
	latest.current = { defaults, rawSearch };

	// Set just before this hook writes to the URL, so its own write is never
	// mistaken for an external navigation and echoed back into local state.
	// Without this, any value that doesn't round-trip through the router's
	// search serializer would ping-pong between the two effects forever.
	const selfWrite = React.useRef(false);
	const appliedSearchStr = React.useRef(searchStr);

	const isSynced = (Object.keys(defaults) as (keyof T)[]).every((key) => {
		const value = local[key];
		const expected =
			value === defaults[key] || value === "" ? undefined : value;
		return (rawSearch[key] ?? undefined) === expected;
	});

	// Adopts URL changes this hook didn't make: back/forward, pasted links.
	// Guarded by a ref rather than deps alone so StrictMode's double-invoked
	// effects can't apply the same query string twice.
	React.useEffect(() => {
		if (appliedSearchStr.current === searchStr) return;
		appliedSearchStr.current = searchStr;
		if (selfWrite.current) {
			selfWrite.current = false;
			return;
		}
		const { defaults: d, rawSearch: raw } = latest.current;
		setLocal({ ...d, ...raw });
	}, [searchStr]);

	React.useEffect(() => {
		if (isSynced) {
			selfWrite.current = false;
			return;
		}
		const handle = setTimeout(() => {
			const { defaults: d } = latest.current;
			selfWrite.current = true;
			navigate({
				search: ((prev: SearchRecord) => {
					const next: SearchRecord = { ...prev };
					for (const key of Object.keys(d) as (keyof T)[]) {
						const value = local[key];
						if (value === d[key] || value === "" || value === undefined) {
							delete next[key as string];
						} else {
							next[key as string] = value;
						}
					}
					return next;
				}) as never,
				replace: true,
			} as never);
		}, debounceMs);
		return () => clearTimeout(handle);
	}, [isSynced, local, debounceMs, navigate]);

	const setState = React.useCallback(
		(patch: Partial<T> | ((state: T) => Partial<T>)) => {
			setLocal((current) => {
				const resolved = typeof patch === "function" ? patch(current) : patch;
				const next = { ...current, ...resolved };
				// Re-selecting the value a filter already has shouldn't churn state
				// or trigger a navigation.
				const changed = (Object.keys(next) as (keyof T)[]).some(
					(key) => next[key] !== current[key],
				);
				return changed ? next : current;
			});
		},
		[],
	);

	return [local, setState] as const;
}
