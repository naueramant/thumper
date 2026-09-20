import type {
	CollectionsExportFile,
	PublishHistoryEntry,
	TestCollection,
	TestMessageTemplate,
} from "./types.ts";

const STORAGE_KEY_COLLECTIONS = "rabbitdash_test_collections_v1";
const STORAGE_KEY_HISTORY = "rabbitdash_publish_history_v1";
const MAX_HISTORY_ITEMS = 50;

const DEFAULT_STARTER_COLLECTIONS: TestCollection[] = [
	{
		id: "starter-orders",
		name: "E-Commerce Events",
		description: "Common order, payment, and inventory domain events",
		color: "#10b981",
		createdAt: Date.now(),
		items: [
			{
				id: "tpl-order-created",
				name: "Order Created Event",
				description: "Dispatched upon checkout completion",
				targetType: "exchange",
				targetName: "amq.topic",
				vhost: "/",
				routingKey: "orders.created",
				deliveryMode: 2,
				contentType: "application/json",
				payload: JSON.stringify(
					{
						eventId: "{{$uuid}}",
						orderId: "ord_{{$randomInt}}",
						timestamp: "{{$isoDate}}",
						customer: {
							id: "cust_{{$randomInt}}",
							email: "alice@example.com",
						},
						total: 99.5,
						currency: "USD",
						items: [
							{ sku: "ITEM-A", quantity: 2, unitPrice: 24.75 },
							{ sku: "ITEM-B", quantity: 1, unitPrice: 50.0 },
						],
					},
					null,
					2,
				),
				headers: {
					"source-service": "checkout-api",
					"correlation-id": "{{$uuid}}",
				},
				createdAt: Date.now(),
				updatedAt: Date.now(),
			},
			{
				id: "tpl-payment-authorized",
				name: "Payment Authorized",
				description: "Sent after payment gateway succeeds",
				targetType: "exchange",
				targetName: "amq.direct",
				vhost: "/",
				routingKey: "payments.authorized",
				deliveryMode: 2,
				contentType: "application/json",
				payload: JSON.stringify(
					{
						transactionId: "tx_{{$uuid}}",
						orderId: "ord_{{$randomInt}}",
						amount: 99.5,
						status: "AUTHORIZED",
						gateway: "Stripe",
						authorizedAt: "{{$isoDate}}",
					},
					null,
					2,
				),
				createdAt: Date.now(),
				updatedAt: Date.now(),
			},
		],
	},
	{
		id: "starter-dlq-tests",
		name: "DLQ & Poison Pill Simulations",
		description: "Payloads to test dead-lettering, TTL, and malformed inputs",
		color: "#f43f5e",
		createdAt: Date.now(),
		items: [
			{
				id: "tpl-malformed-json",
				name: "Malformed Payload (Trigger Reject)",
				description: "Simulates consumer parsing error leading to dead letter",
				targetType: "queue",
				targetName: "orders",
				vhost: "/",
				routingKey: "orders",
				contentType: "application/json",
				payload: "{\n  \"invalidJson\": true,\n  \"missingQuote: 123\n}",
				createdAt: Date.now(),
				updatedAt: Date.now(),
			},
		],
	},
];

/**
 * Replaces dynamic placeholders like {{$uuid}} and {{$timestamp}}.
 */
export function interpolateVariables(template: string): string {
	if (!template) return "";
	return template
		.replace(/\{\{\$uuid\}\}/g, () => {
			if (typeof crypto !== "undefined" && crypto.randomUUID) {
				return crypto.randomUUID();
			}
			return Math.random().toString(36).substring(2, 15);
		})
		.replace(/\{\{\$timestamp\}\}/g, () => `${Date.now()}`)
		.replace(/\{\{\$isoDate\}\}/g, () => new Date().toISOString())
		.replace(/\{\{\$randomInt\}\}/g, () =>
			`${Math.floor(1000 + Math.random() * 9000)}`,
		);
}

/**
 * Loads test collections from localStorage with seed fallback.
 */
export function getStoredCollections(): TestCollection[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY_COLLECTIONS);
		if (!raw) {
			localStorage.setItem(
				STORAGE_KEY_COLLECTIONS,
				JSON.stringify(DEFAULT_STARTER_COLLECTIONS),
			);
			return DEFAULT_STARTER_COLLECTIONS;
		}
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : DEFAULT_STARTER_COLLECTIONS;
	} catch (e) {
		console.error("Failed to load test collections from localStorage:", e);
		return DEFAULT_STARTER_COLLECTIONS;
	}
}

/**
 * Saves all test collections to localStorage.
 */
function saveStoredCollections(collections: TestCollection[]): void {
	try {
		localStorage.setItem(STORAGE_KEY_COLLECTIONS, JSON.stringify(collections));
	} catch (e) {
		console.error("Failed to save test collections to localStorage:", e);
	}
}

/**
 * Saves or updates a single collection.
 */
export function addOrUpdateCollection(collection: TestCollection): void {
	const current = getStoredCollections();
	const index = current.findIndex((c) => c.id === collection.id);
	if (index >= 0) {
		current[index] = collection;
	} else {
		current.push(collection);
	}
	saveStoredCollections(current);
}

/**
 * Deletes a collection by ID.
 */
export function deleteCollection(id: string): void {
	const current = getStoredCollections();
	const filtered = current.filter((c) => c.id !== id);
	saveStoredCollections(filtered);
}

/**
 * Saves or updates a template inside a collection.
 */
export function saveTemplateToCollection(
	collectionId: string,
	template: TestMessageTemplate,
): void {
	const collections = getStoredCollections();
	let collection = collections.find((c) => c.id === collectionId);

	if (!collection) {
		// If collection does not exist, create a default one
		collection = {
			id: collectionId || `col-${Date.now()}`,
			name: "Saved Templates",
			items: [],
			createdAt: Date.now(),
		};
		collections.push(collection);
	}

	const templateIndex = collection.items.findIndex((t) => t.id === template.id);
	if (templateIndex >= 0) {
		collection.items[templateIndex] = {
			...template,
			updatedAt: Date.now(),
		};
	} else {
		collection.items.push({
			...template,
			createdAt: Date.now(),
			updatedAt: Date.now(),
		});
	}

	saveStoredCollections(collections);
}

/**
 * Removes a template from a collection.
 */
export function deleteTemplateFromCollection(
	collectionId: string,
	templateId: string,
): void {
	const collections = getStoredCollections();
	const collection = collections.find((c) => c.id === collectionId);
	if (collection) {
		collection.items = collection.items.filter((t) => t.id !== templateId);
		saveStoredCollections(collections);
	}
}

/**
 * Retrieves the local publish history log.
 */
export function getPublishHistory(): PublishHistoryEntry[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

/**
 * Appends an execution to the publish history.
 */
export function addPublishHistoryEntry(
	entry: Omit<PublishHistoryEntry, "id" | "timestamp">,
): void {
	try {
		const current = getPublishHistory();
		const newEntry: PublishHistoryEntry = {
			...entry,
			id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
			timestamp: Date.now(),
		};
		const updated = [newEntry, ...current].slice(0, MAX_HISTORY_ITEMS);
		localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
	} catch (e) {
		console.error("Failed to append publish history:", e);
	}
}

/**
 * Clears the publish history.
 */
export function clearPublishHistory(): void {
	localStorage.removeItem(STORAGE_KEY_HISTORY);
}

/**
 * Downloads all test collections as a JSON file.
 */
export function exportCollectionsJson(): void {
	const collections = getStoredCollections();
	const fileData: CollectionsExportFile = {
		version: 1,
		app: "RabbitDash",
		exportedAt: new Date().toISOString(),
		collections,
	};

	const blob = new Blob([JSON.stringify(fileData, null, 2)], {
		type: "application/json",
	});
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `rabbitdash-collections-${new Date().toISOString().slice(0, 10)}.json`;
	a.click();
	URL.revokeObjectURL(url);
}

/**
 * Parses and validates an uploaded collections JSON file.
 */
export function importCollectionsJson(
	jsonStr: string,
	mode: "merge" | "replace",
): { success: boolean; count: number; error?: string } {
	try {
		const parsed = JSON.parse(jsonStr);
		let incomingCollections: TestCollection[] = [];

		if (Array.isArray(parsed)) {
			incomingCollections = parsed;
		} else if (parsed && Array.isArray(parsed.collections)) {
			incomingCollections = parsed.collections;
		} else {
			return {
				success: false,
				count: 0,
				error: "Invalid file format: expected collections array",
			};
		}

		if (mode === "replace") {
			saveStoredCollections(incomingCollections);
			return { success: true, count: incomingCollections.length };
		}

		// Merge mode: append or update by ID
		const current = getStoredCollections();
		const idMap = new Map<string, TestCollection>();
		for (const c of current) {
			idMap.set(c.id, c);
		}
		for (const incoming of incomingCollections) {
			idMap.set(incoming.id, incoming);
		}

		const merged = Array.from(idMap.values());
		saveStoredCollections(merged);
		return { success: true, count: incomingCollections.length };
	} catch (err: any) {
		return {
			success: false,
			count: 0,
			error: err.message || "Failed to parse JSON file",
		};
	}
}
