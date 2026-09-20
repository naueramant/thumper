import {
	createRabbitMQClient,
	type RabbitMQClient,
} from "@/services/rabbitmq/index.ts";
import { useEffect, useState } from "react";

export interface UserProfile {
	username: string;
	password?: string;
	token?: string;
	tags: string[];
	clusterUrl?: string;
	loggedInAt: string;
}

const AUTH_KEY = "rabbitdash-auth";

export function getStoredAuth(): UserProfile | null {
	if (typeof window === "undefined") return null;
	const stored = localStorage.getItem(AUTH_KEY);
	if (!stored) return null;
	try {
		return JSON.parse(stored) as UserProfile;
	} catch {
		// Corrupt entry; treat as logged out rather than silently faking a session.
		localStorage.removeItem(AUTH_KEY);
		return null;
	}
}

/** Clears the persisted session and the cached API client. Used by both an
 * explicit logout and by the global 401/session-expired handler. */
export function clearSession() {
	if (typeof window !== "undefined") {
		localStorage.removeItem(AUTH_KEY);
	}
	cachedClient = null;
	cachedAuthKey = "";
}

let cachedClient: RabbitMQClient | null = null;
let cachedAuthKey = "";

export function getRabbitMQClient(): RabbitMQClient {
	const auth = getStoredAuth();
	const key = `${auth?.username ?? ""}:${auth?.password ?? ""}:${auth?.token ?? ""}:${auth?.clusterUrl ?? ""}`;

	if (!cachedClient || cachedAuthKey !== key) {
		cachedAuthKey = key;
		cachedClient = createRabbitMQClient({
			baseUrl: auth?.clusterUrl,
			username: auth?.username || "guest",
			password: auth?.password || "guest",
			token: auth?.token,
		});
	}

	return cachedClient;
}

export function updateStoredClusterUrl(newUrl: string): UserProfile | null {
	const auth = getStoredAuth();
	if (!auth) return null;
	const updated = { ...auth, clusterUrl: newUrl };
	if (typeof window !== "undefined") {
		localStorage.setItem(AUTH_KEY, JSON.stringify(updated));
	}
	cachedClient = null;
	cachedAuthKey = "";
	return updated;
}

export function useAuth() {
	const [user, setUser] = useState<UserProfile | null>(() => getStoredAuth());

	useEffect(() => {
		if (user) {
			localStorage.setItem(AUTH_KEY, JSON.stringify(user));
		} else {
			localStorage.removeItem(AUTH_KEY);
		}
		cachedClient = null;
	}, [user]);

	const login = (
		username: string,
		password?: string,
		clusterUrl?: string,
		tags: string[] = ["administrator"],
		token?: string,
	) => {
		const profile: UserProfile = {
			username,
			password,
			token,
			tags,
			clusterUrl: clusterUrl || "http://localhost:15672",
			loggedInAt: new Date().toISOString(),
		};
		setUser(profile);
		cachedClient = null;
		return profile;
	};

	const logout = () => {
		setUser(null);
		localStorage.removeItem(AUTH_KEY);
		cachedClient = null;
	};

	const updateClusterUrl = (newUrl: string) => {
		setUser((prev) => {
			if (!prev) return null;
			return { ...prev, clusterUrl: newUrl };
		});
		cachedClient = null;
		cachedAuthKey = "";
	};

	return {
		user,
		isAuthenticated: !!user,
		login,
		logout,
		updateClusterUrl,
	};
}

