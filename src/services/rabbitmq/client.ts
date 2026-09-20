import {
	type RabbitMQClientOptions,
	type ResolvedRabbitMQClientConfig,
	resolveConfig,
} from "./config.ts";
import {
	AuthenticationError,
	ConflictError,
	ForbiddenError,
	NetworkError,
	NotFoundError,
	RabbitMQApiError,
} from "./errors.ts";
import { base64Encode, buildQueryParams } from "./utils.ts";

/** Fired on `window` whenever the API rejects a request with 401, so the app
 * can distinguish "session just expired" from a normal login-page failure. */
export const UNAUTHORIZED_EVENT = "rabbitdash:unauthorized";

import { BindingsApi } from "./endpoints/bindings.ts";
import { ChannelsApi } from "./endpoints/channels.ts";
import { ConnectionsApi } from "./endpoints/connections.ts";
import { ConsumersApi } from "./endpoints/consumers.ts";
import { DefinitionsApi } from "./endpoints/definitions.ts";
import { ExchangesApi } from "./endpoints/exchanges.ts";
import { HealthApi } from "./endpoints/health.ts";
import { NodesApi } from "./endpoints/nodes.ts";
import { OverviewApi } from "./endpoints/overview.ts";
import { ParametersApi } from "./endpoints/parameters.ts";
import { PermissionsApi } from "./endpoints/permissions.ts";
import { PoliciesApi } from "./endpoints/policies.ts";
import { QueuesApi } from "./endpoints/queues.ts";
import { ShovelsApi } from "./endpoints/shovels.ts";
import { UsersApi } from "./endpoints/users.ts";
import { VhostsApi } from "./endpoints/vhosts.ts";

export interface RequestOptions {
	method?: "GET" | "POST" | "PUT" | "DELETE";
	body?: unknown;
	query?: Record<string, unknown>;
	headers?: Record<string, string>;
}

export class RabbitMQClient {
	readonly config: ResolvedRabbitMQClientConfig;

	// Grouped API sub-clients
	readonly overview: OverviewApi;
	readonly nodes: NodesApi;
	readonly connections: ConnectionsApi;
	readonly channels: ChannelsApi;
	readonly consumers: ConsumersApi;
	readonly exchanges: ExchangesApi;
	readonly queues: QueuesApi;
	readonly bindings: BindingsApi;
	readonly vhosts: VhostsApi;
	readonly users: UsersApi;
	readonly permissions: PermissionsApi;
	readonly policies: PoliciesApi;
	readonly parameters: ParametersApi;
	readonly shovels: ShovelsApi;
	readonly health: HealthApi;
	readonly definitions: DefinitionsApi;

	constructor(options?: RabbitMQClientOptions) {
		this.config = resolveConfig(options);

		this.overview = new OverviewApi(this);
		this.nodes = new NodesApi(this);
		this.connections = new ConnectionsApi(this);
		this.channels = new ChannelsApi(this);
		this.consumers = new ConsumersApi(this);
		this.exchanges = new ExchangesApi(this);
		this.queues = new QueuesApi(this);
		this.bindings = new BindingsApi(this);
		this.vhosts = new VhostsApi(this);
		this.users = new UsersApi(this);
		this.permissions = new PermissionsApi(this);
		this.policies = new PoliciesApi(this);
		this.parameters = new ParametersApi(this);
		this.shovels = new ShovelsApi(this);
		this.health = new HealthApi(this);
		this.definitions = new DefinitionsApi(this);
	}

	/**
	 * Helper to build the default authorization header.
	 */
	private getAuthHeader(): string | null {
		if (this.config.token) {
			return `Bearer ${this.config.token}`;
		}
		if (
			this.config.username !== undefined &&
			this.config.password !== undefined
		) {
			return `Basic ${base64Encode(`${this.config.username}:${this.config.password}`)}`;
		}
		return null;
	}

	/**
	 * Performs an HTTP request to the RabbitMQ Management API with timeout and error handling.
	 */
	async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
		const { method = "GET", body, query, headers = {} } = options;

		const queryString = buildQueryParams(query);
		const normalizedPath = path.startsWith("/") ? path : `/${path}`;
		const url = `${this.config.baseUrl}${normalizedPath}${queryString}`;

		const requestHeaders: Record<string, string> = {
			Accept: "application/json",
			// Tells RabbitMQ's management API to omit `WWW-Authenticate` on 401s so the
			// browser doesn't pop its own native Basic Auth dialog over our login form.
			"X-Requested-With": "XMLHttpRequest",
			...this.config.headers,
			...headers,
		};

		const authHeader = this.getAuthHeader();
		if (
			authHeader &&
			!requestHeaders.Authorization &&
			!requestHeaders.authorization
		) {
			requestHeaders.Authorization = authHeader;
		}

		let requestBody: BodyInit | null = null;
		if (body !== undefined && body !== null) {
			if (typeof FormData !== "undefined" && body instanceof FormData) {
				requestBody = body;
				// Let browser set Content-Type with boundary for multipart/form-data
				delete requestHeaders["Content-Type"];
			} else if (typeof body === "string") {
				requestBody = body;
				if (!requestHeaders["Content-Type"]) {
					requestHeaders["Content-Type"] = "application/json";
				}
			} else {
				requestBody = JSON.stringify(body);
				if (!requestHeaders["Content-Type"]) {
					requestHeaders["Content-Type"] = "application/json";
				}
			}
		}

		const controller = new AbortController();
		const timeoutId = setTimeout(
			() => controller.abort(),
			this.config.timeoutMs,
		);

		try {
			const response = await this.config.fetch(url, {
				method,
				headers: requestHeaders,
				body: requestBody,
				signal: controller.signal,
			});

			if (!response.ok) {
				await this.handleErrorResponse(response, normalizedPath);
			}

			// 204 No Content or empty responses
			if (response.status === 204) {
				return undefined as unknown as T;
			}

			const contentType = response.headers.get("content-type") || "";
			if (contentType.includes("application/json")) {
				return (await response.json()) as T;
			}

			const text = await response.text();
			if (!text) {
				return undefined as unknown as T;
			}

			try {
				return JSON.parse(text) as T;
			} catch {
				return text as unknown as T;
			}
		} catch (error) {
			if (error instanceof RabbitMQApiError) {
				throw error;
			}
			if (error instanceof Error && error.name === "AbortError") {
				throw new NetworkError(
					`Request timed out after ${this.config.timeoutMs}ms for ${normalizedPath}`,
					error,
				);
			}
			throw new NetworkError(
				`Network error during ${method} ${normalizedPath}: ${error instanceof Error ? error.message : String(error)}`,
				error,
			);
		} finally {
			clearTimeout(timeoutId);
		}
	}

	private async handleErrorResponse(
		response: Response,
		endpoint: string,
	): Promise<never> {
		let errorData: { error?: string; reason?: string } | undefined;
		let responseText = "";

		try {
			responseText = await response.text();
			if (responseText) {
				errorData = JSON.parse(responseText);
			}
		} catch {
			// Body not JSON
		}

		const reason =
			errorData?.reason ||
			errorData?.error ||
			responseText ||
			response.statusText;
		const message = `RabbitMQ API error [${response.status} ${response.statusText}]: ${reason}`;

		switch (response.status) {
			case 401:
				if (typeof window !== "undefined") {
					window.dispatchEvent(
						new CustomEvent(UNAUTHORIZED_EVENT, { detail: { endpoint } }),
					);
				}
				throw new AuthenticationError(message, endpoint);
			case 403:
				throw new ForbiddenError(message, endpoint);
			case 404:
				throw new NotFoundError(message, endpoint);
			case 409:
				throw new ConflictError(message, endpoint);
			default:
				throw new RabbitMQApiError(
					message,
					response.status,
					response.statusText,
					{
						error: errorData?.error,
						reason,
						endpoint,
					},
				);
		}
	}
}
