import { ThemeToggle } from "@/components/ThemeToggle/index.tsx";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card/index.tsx";
import { useAuth } from "@/hooks/useAuth/index.ts";
import { createRabbitMQClient } from "@/services/rabbitmq/index.ts";
import { cn } from "@/utilities/cn/index.ts";
import { useRouter, useSearch } from "@tanstack/react-router";
import {
	Activity,
	AlertCircle,
	ArrowRight,
	Clock,
	Eye,
	EyeOff,
	Loader2,
	Lock,
	User,
} from "lucide-react";
import * as React from "react";

const BROKER_URL = "http://localhost:15672";

export function LoginPage() {
	const router = useRouter();
	const search = useSearch({ strict: false }) as {
		redirect?: string;
		expired?: boolean;
	};
	const { login } = useAuth();

	const [username, setUsername] = React.useState("");
	const [password, setPassword] = React.useState("");
	const [showPassword, setShowPassword] = React.useState(false);
	const [isLoading, setIsLoading] = React.useState(false);
	const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

	const isFormValid = username.trim().length > 0 && password.trim().length > 0;

	const handleAuth = async (userToAuth: string, passToAuth: string) => {
		setIsLoading(true);
		setErrorMessage(null);

		try {
			// Test credentials with RabbitMQ /api/whoami
			const client = createRabbitMQClient({
				baseUrl: BROKER_URL,
				username: userToAuth,
				password: passToAuth,
				timeoutMs: 6000,
			});

			const whoami = await client.overview.whoami();
			login(
				userToAuth,
				passToAuth,
				BROKER_URL,
				whoami.tags || ["administrator"],
			);
			setIsLoading(false);
			router.navigate({ to: search.redirect || "/overview" });
		} catch (err: any) {
			console.error("Authentication error:", err);
			let message = "Failed to authenticate with RabbitMQ.";
			if (err.status === 401) {
				message = "Invalid username or password (HTTP 401 Unauthorized).";
			} else if (
				err.name === "NetworkError" ||
				err.message?.includes("Network") ||
				err.message?.includes("Failed to fetch")
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
		if (!isFormValid || isLoading) return;
		handleAuth(username.trim(), password);
	};

	return (
		<div className="login-canvas min-h-screen flex flex-col items-center justify-center p-4 relative selection:bg-primary/20 selection:text-primary">
			{/* Dot grid backdrop */}
			<div className="login-dots-bg" />

			{/* Theme Toggle in top-right */}
			<div className="absolute top-4 right-4 z-20">
				<ThemeToggle />
			</div>

			{/* Center Container */}
			<div className="relative z-10 w-full max-w-[420px] space-y-6">
				{/* Brand Hero */}
				<div className="flex flex-col items-center text-center space-y-2.5">
					<div className="login-pop-in flex h-13 w-13 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
						<Activity className="h-6.5 w-6.5 stroke-[2.5]" />
					</div>

					<div>
						<h1 className="login-pop-in login-pop-in-delay text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
							thumper<span className="text-primary">.</span>
						</h1>
						<p className="login-pop-in login-pop-in-delay text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
							RabbitMQ Management Console
						</p>
					</div>
				</div>

				{/* Flat Card */}
				<Card className="rounded-2xl border border-border bg-card animate-in fade-in slide-in-from-bottom-2 duration-300">
					<CardHeader className="pb-3 pt-6 px-6 sm:px-8">
						<CardTitle className="text-lg font-bold tracking-tight">
							Sign In
						</CardTitle>
						<CardDescription className="text-xs text-muted-foreground mt-0.5">
							Enter your RabbitMQ Management credentials to connect.
						</CardDescription>
					</CardHeader>

					<CardContent className="px-6 sm:px-8 pb-7 space-y-4">
						{/* Session Expired Banner */}
						{search.expired && !errorMessage && (
							<div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 text-xs animate-in slide-in-from-top-2 fade-in duration-200">
								<Clock className="h-4 w-4 shrink-0 mt-0.5" />
								<div className="flex-1 leading-relaxed">
									Your session has expired. Please sign in again.
								</div>
							</div>
						)}

						{/* Error Banner */}
						{errorMessage && (
							<div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-600 dark:text-red-400 text-xs animate-in slide-in-from-top-2 fade-in duration-200">
								<AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
								<div className="flex-1 leading-relaxed">{errorMessage}</div>
							</div>
						)}

						{/* Form */}
						<form onSubmit={handleSubmit} className="space-y-4">
							{/* Username field */}
							<div className="space-y-1.5 group">
								<label className="text-xs font-medium text-foreground/85 block">
									Username
								</label>
								<div className="relative flex items-center">
									<User className="absolute left-3.5 h-4 w-4 text-muted-foreground pointer-events-none transition-colors group-focus-within:text-primary" />
									<input
										type="text"
										required
										autoFocus
										autoCapitalize="none"
										autoCorrect="off"
										spellCheck={false}
										value={username}
										onChange={(e) => setUsername(e.target.value)}
										placeholder="e.g. guest or admin"
										className="h-11 w-full rounded-xl border border-border bg-background hover:border-muted-foreground/40 focus:border-primary pl-10 pr-3.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
									/>
								</div>
							</div>

							{/* Password field */}
							<div className="space-y-1.5 group">
								<label className="text-xs font-medium text-foreground/85 block">
									Password
								</label>
								<div className="relative flex items-center">
									<Lock className="absolute left-3.5 h-4 w-4 text-muted-foreground pointer-events-none transition-colors group-focus-within:text-primary" />
									<input
										type={showPassword ? "text" : "password"}
										required
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										placeholder="Password"
										className="h-11 w-full rounded-xl border border-border bg-background hover:border-muted-foreground/40 focus:border-primary pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
									/>
									<button
										type="button"
										onClick={() => setShowPassword(!showPassword)}
										tabIndex={-1}
										className="absolute right-2.5 p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg focus:outline-none hover:bg-muted"
										title={showPassword ? "Hide password" : "Show password"}
										aria-label={showPassword ? "Hide password" : "Show password"}
									>
										{showPassword ? (
											<EyeOff className="h-4 w-4" />
										) : (
											<Eye className="h-4 w-4" />
										)}
									</button>
								</div>
							</div>

							{/* Flat Submit Button */}
							<button
								type="submit"
								disabled={isLoading || !isFormValid}
								className={cn(
									"w-full h-11 mt-1 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors select-none",
									isFormValid && !isLoading
										? "bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
										: "bg-muted text-muted-foreground border border-border cursor-not-allowed opacity-60",
								)}
							>
								{isLoading ? (
									<>
										<Loader2 className="h-4 w-4 animate-spin" />
										<span>Connecting to RabbitMQ...</span>
									</>
								) : (
									<>
										<span>Sign In</span>
										<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
									</>
								)}
							</button>
						</form>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
