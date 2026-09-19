import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
			"@components": fileURLToPath(
				new URL("./src/components", import.meta.url),
			),
			"@hooks": fileURLToPath(new URL("./src/hooks", import.meta.url)),
			"@services": fileURLToPath(new URL("./src/services", import.meta.url)),
			"@utilities": fileURLToPath(new URL("./src/utilities", import.meta.url)),
			"@models": fileURLToPath(new URL("./src/models", import.meta.url)),
			"@pages": fileURLToPath(new URL("./src/pages", import.meta.url)),
		},
	},
	server: {
		watch: {
			usePolling: true,
			interval: 1000,
			ignored: ["**/node_modules/**", "**/dist/**", "**/.git/**"],
		},
		proxy: {
			"/api": {
				target: "http://localhost:15672",
				changeOrigin: true,
				configure: (proxy) => {
					// RabbitMQ's management API still sends `WWW-Authenticate: Basic` on 401s
					// even for XHR/fetch requests, which makes the browser pop its own native
					// credential dialog. Strip it so Thumber's own login/session-expiry UI
					// handles the failure instead.
					proxy.on("proxyRes", (proxyRes) => {
						delete proxyRes.headers["www-authenticate"];
					});
				},
			},
		},
	},
});
