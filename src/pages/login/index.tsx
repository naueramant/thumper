import { ThemeToggle } from "@/components/ThemeToggle/index.tsx";
import { Button } from "@/components/ui/button/index.tsx";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card/index.tsx";
import { useAuth } from "@/hooks/useAuth/index.ts";
import { createRabbitMQClient } from "@/services/rabbitmq/index.ts";
import { useRouter, useSearch } from "@tanstack/react-router";
import {
	Activity,
	AlertCircle,
	ArrowRight,
	Clock,
	Eye,
	EyeOff,
	Lock,
	Server,
	User,
} from "lucide-react";
import * as React from "react";

export function LoginPage() {
	const router = useRouter();
	const search = useSearch({ strict: false }) as {
		redirect?: string;
		expired?: boolean;
	};
	const { login } = useAuth();

	const [username, setUsername] = React.useState("");
	const [password, setPassword] = React.useState("");
	const [clusterUrl, setClusterUrl] = React.useState("http://localhost:15672");
	const [showPassword, setShowPassword] = React.useState(false);
	const [showAdvanced, setShowAdvanced] = React.useState(false);
	const [isLoading, setIsLoading] = React.useState(false);
	const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

	const isFormValid = username.trim().length > 0 && password.trim().length > 0;

	const handleAuth = async (
		userToAuth: string,
		passToAuth: string,
		urlToAuth: string,
	) => {
		setIsLoading(true);
		setErrorMessage(null);

		try {
			// Test credentials with RabbitMQ /api/whoami
			const client = createRabbitMQClient({
				baseUrl: urlToAuth,
				username: userToAuth,
				password: passToAuth,
				timeoutMs: 5000,
			});

			const whoami = await client.overview.whoami();
			login(
				userToAuth,
				passToAuth,
				urlToAuth,
				whoami.tags || ["administrator"],
			);
			setIsLoading(false);
			router.navigate({ to: search.redirect || "/overview" });
		} catch (err: any) {
			console.error("Authentication error:", err);
			// Provide helpful message
			let message = "Failed to authenticate with RabbitMQ.";
			if (err.status === 401) {
				message = "Invalid username or password (HTTP 401 Unauthorized).";
			} else if (
				err.name === "NetworkError" ||
				err.message?.includes("Network")
			) {
				message =
					"Could not connect to RabbitMQ broker. Is the container running on localhost:15672?";
			} else if (err.message) {
				message = err.message;
			}
			setErrorMessage(message);
			setIsLoading(false);
		}
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!isFormValid) return;
		handleAuth(username.trim(), password, clusterUrl.trim());
	};

	return (
		<div className="login-canvas min-h-screen flex flex-col items-center justify-center p-4 relative">
			<div className="absolute top-4 right-4">
				<ThemeToggle />
			</div>
			<div className="w-full max-w-sm space-y-5 animate-in slide-in-from-bottom-4 fade-in duration-300">
				{/* Brand Header */}
				<div className="flex flex-col items-center text-center space-y-2">
					<div className="relative flex h-12 w-12 items-center justify-center animate-in zoom-in-95 duration-300">
						<div className="absolute inset-0 rounded-xl bg-primary/50 blur-md animate-pulse" />
						<div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
							<Activity className="h-6 w-6 stroke-[2.5]" />
						</div>
					</div>
					<h1 className="text-xl font-bold tracking-tight text-foreground">
						Thumber
					</h1>
					<p className="text-xs text-muted-foreground">
						Management Dashboard for RabbitMQ 4.x &amp; 3.x
					</p>
				</div>

				{/* Login Card */}
				<Card className="border border-border shadow-md">
					<CardHeader className="pb-3">
						<CardTitle className="text-base">Sign In</CardTitle>
						<CardDescription className="text-xs">
							Enter your RabbitMQ Management credentials to connect.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{search.expired && !errorMessage && (
							<div className="flex items-start gap-2 p-2.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs animate-in slide-in-from-top-2 fade-in duration-200">
								<Clock className="h-4 w-4 shrink-0 mt-0.5" />
								<div className="flex-1 leading-relaxed">
									Your session has expired. Please sign in again.
								</div>
							</div>
						)}

						{errorMessage && (
							<div className="flex items-start gap-2 p-2.5 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs animate-in slide-in-from-top-2 fade-in duration-200">
								<AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
								<div className="flex-1 leading-relaxed">{errorMessage}</div>
							</div>
						)}

						<form onSubmit={handleSubmit} className="space-y-3.5">
							<div className="space-y-1">
								<label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
									<User className="h-3.5 w-3.5 text-muted-foreground" />
									Username
								</label>
								<input
									type="text"
									required
									value={username}
									onChange={(e) => setUsername(e.target.value)}
									placeholder="e.g. guest or admin"
									className="h-8 w-full rounded-md border border-border bg-muted/20 px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary font-mono transition-colors"
								/>
							</div>

							<div className="space-y-1">
								<label className="text-xs font-medium text-muted-foreground flex items-center justify-between">
									<span className="flex items-center gap-1.5">
										<Lock className="h-3.5 w-3.5 text-muted-foreground" />
										Password
									</span>
									<button
										type="button"
										onClick={() => setShowPassword(!showPassword)}
										className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
									>
										{showPassword ? (
											<EyeOff className="h-3 w-3" />
										) : (
											<Eye className="h-3 w-3" />
										)}
										{showPassword ? "Hide" : "Show"}
									</button>
								</label>
								<input
									type={showPassword ? "text" : "password"}
									required
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									placeholder="Password"
									className="h-8 w-full rounded-md border border-border bg-muted/20 px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary font-mono transition-colors"
								/>
							</div>

							{/* Advanced toggle: Server URL */}
							<div className="space-y-2 pt-1">
								<button
									type="button"
									onClick={() => setShowAdvanced(!showAdvanced)}
									className="text-[11px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
								>
									<Server className="h-3 w-3" />
									{showAdvanced
										? "Hide connection endpoint"
										: "Custom cluster URL..."}
								</button>

								{showAdvanced && (
									<div className="space-y-1 animate-in fade-in duration-100">
										<label className="text-[11px] font-medium text-muted-foreground">
											Server API Endpoint
										</label>
										<input
											type="text"
											value={clusterUrl}
											onChange={(e) => setClusterUrl(e.target.value)}
											placeholder="http://localhost:15672"
											className="h-8 w-full rounded-md border border-border bg-muted/20 px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none font-mono"
										/>
									</div>
								)}
							</div>

							<Button
								type="submit"
								disabled={isLoading || !isFormValid}
								className="w-full h-8 mt-2 text-xs font-semibold"
							>
								{isLoading ? (
									"Connecting to RabbitMQ..."
								) : (
									<>
										Sign In <ArrowRight className="h-3.5 w-3.5 ml-1" />
									</>
								)}
							</Button>
						</form>
					</CardContent>
				</Card>

				{/* Footer */}
				<div className="text-center text-[11px] text-muted-foreground">
					RabbitMQ 3.12+ / 4.x Compatible • TLS 1.3 Supported
				</div>
			</div>
		</div>
	);
}

