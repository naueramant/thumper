export interface TestMessageTemplate {
	id: string;
	name: string;
	description?: string;
	targetType: "exchange" | "queue";
	targetName: string;
	vhost: string;
	routingKey: string;
	deliveryMode?: number;
	contentType?: string;
	headers?: Record<string, string>;
	properties?: Record<string, unknown>;
	payload: string;
	createdAt: number;
	updatedAt: number;
}

export interface TestCollection {
	id: string;
	name: string;
	description?: string;
	color?: string;
	items: TestMessageTemplate[];
	createdAt: number;
}

export interface PublishHistoryEntry {
	id: string;
	timestamp: number;
	targetType: "exchange" | "queue";
	targetName: string;
	vhost: string;
	routingKey: string;
	payload: string;
	status: "success" | "failed";
	error?: string;
}

export interface CollectionsExportFile {
	version: number;
	app: "RabbitDash";
	exportedAt: string;
	collections: TestCollection[];
}
