import { Button } from "@/components/ui/button/index.tsx";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card/index.tsx";
import { useRabbitOverview } from "@/hooks/useRabbitMQ/index.ts";
import {
	Activity,
	Bug,
	BookOpen,
	Code2,
	ExternalLink,
	LifeBuoy,
	Lightbulb,
	MessageSquareWarning,
	Star,
} from "lucide-react";

const RESOURCE_LINKS = [
	{
		label: "RabbitMQ Documentation",
		description: "Guides, concepts, and configuration reference.",
		href: "https://www.rabbitmq.com/docs",
		icon: BookOpen,
	},
	{
		label: "HTTP API Reference",
		description: "The management HTTP API this dashboard talks to.",
		href: "https://www.rabbitmq.com/docs/management#http-api",
		icon: ExternalLink,
	},
	{
		label: "RabbitMQ Discussions",
		description: "Community Q&A and troubleshooting help.",
		href: "https://github.com/rabbitmq/rabbitmq-server/discussions",
		icon: MessageSquareWarning,
	},
];

const REPO_URL = "https://github.com/naueramant/thumper";

const SUPPORT_LINKS = [
	{
		label: "Report a bug",
		description: "Something broken or behaving unexpectedly?",
		href: `${REPO_URL}/issues/new`,
		icon: Bug,
	},
	{
		label: "Request a feature",
		description: "Ideas for improving the dashboard are welcome.",
		href: `${REPO_URL}/issues/new`,
		icon: Lightbulb,
	},
];

export function HelpPage() {
	const { data: overview } = useRabbitOverview();

	return (
		<div className="space-y-6">
			{/* Top Banner / Title */}
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight text-foreground">
						Help &amp; About
					</h1>
					<p className="text-xs text-muted-foreground mt-0.5">
						Documentation, resources, and information about this dashboard.
					</p>
				</div>
			</div>

			{/* GitHub CTA banner */}
			<Card className="overflow-hidden border-border/60 bg-linear-to-br from-foreground to-foreground/80 text-background dark:from-muted/40 dark:to-muted/10 dark:text-foreground">
				<CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-center gap-3">
						<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-background/10 dark:bg-primary/15">
							<Code2 className="h-5.5 w-5.5" />
						</div>
						<div>
							<div className="text-sm font-semibold">
								Thumper is open source
							</div>
							<p className="text-xs opacity-80">
								Star it, browse the code, or contribute on GitHub.
							</p>
						</div>
					</div>
					<Button
						size="sm"
						className="bg-background text-foreground hover:bg-background/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90"
						asChild
					>
						<a href={REPO_URL} target="_blank" rel="noreferrer noopener">
							<Star className="h-4 w-4" />
							Star on GitHub
						</a>
					</Button>
				</CardContent>
			</Card>

			<div className="grid gap-4 lg:grid-cols-2">
				{/* About */}
				<Card>
					<CardHeader>
						<div className="flex items-center gap-2">
							<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm shadow-primary/25">
								<Activity className="h-4 w-4 stroke-[2.5]" />
							</div>
							<div>
								<CardTitle>Thumper</CardTitle>
								<CardDescription>
									A modern, fast dashboard for RabbitMQ.
								</CardDescription>
							</div>
						</div>
					</CardHeader>
					<CardContent className="space-y-3 text-sm text-muted-foreground">
						<p>
							Thumper is an alternative to the built-in RabbitMQ management
							UI, focused on speed, clarity, and a more modern editing
							experience for connections, channels, exchanges, queues, and
							cluster administration.
						</p>
						<div className="flex flex-wrap gap-4 pt-1 text-xs">
							<div>
								<span className="text-muted-foreground/70">
									Connected cluster
								</span>
								<div className="font-mono text-foreground">
									{overview?.cluster_name || "—"}
								</div>
							</div>
							<div>
								<span className="text-muted-foreground/70">
									RabbitMQ version
								</span>
								<div className="font-mono text-foreground">
									{overview?.rabbitmq_version || "—"}
								</div>
							</div>
							<div>
								<span className="text-muted-foreground/70">
									Erlang version
								</span>
								<div className="font-mono text-foreground">
									{overview?.erlang_version || "—"}
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* License / disclaimer */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">License</CardTitle>
						<CardDescription>
							Free and open source, under a copyleft license.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-2 text-sm text-muted-foreground">
						<p>
							Thumper is licensed under the{" "}
							<a
								href={`${REPO_URL}/blob/main/LICENSE`}
								target="_blank"
								rel="noreferrer noopener"
								className="font-medium text-foreground underline underline-offset-2"
							>
								GNU Affero General Public License v3.0
							</a>{" "}
							(AGPL-3.0). You're free to use, modify, and redistribute it —
							but if you run a modified version as a network service, you must
							make its source available to your users under the same license.
							Want to use it under different terms? Open an issue on GitHub to
							request a commercial license.
						</p>
						<p>
							Thumper is an independent project and is not affiliated with or
							endorsed by Broadcom/VMware or the RabbitMQ project.
						</p>
						<p>RabbitMQ is a trademark of Broadcom Inc.</p>
					</CardContent>
				</Card>

				{/* Resources */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-base">
							<LifeBuoy className="h-4 w-4 text-muted-foreground" />
							Resources
						</CardTitle>
						<CardDescription>
							Official RabbitMQ documentation and support channels.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-1">
						{RESOURCE_LINKS.map((link) => {
							const Icon = link.icon;
							return (
								<a
									key={link.href}
									href={link.href}
									target="_blank"
									rel="noreferrer noopener"
									className="flex items-start gap-3 rounded-lg p-2.5 -mx-2.5 transition-colors hover:bg-muted/60"
								>
									<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
										<Icon className="h-4 w-4" />
									</div>
									<div className="min-w-0">
										<div className="text-sm font-medium text-foreground">
											{link.label}
										</div>
										<div className="text-xs text-muted-foreground">
											{link.description}
										</div>
									</div>
								</a>
							);
						})}
					</CardContent>
				</Card>

				{/* Support & feedback */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-base">
							<Bug className="h-4 w-4 text-muted-foreground" />
							Support &amp; Feedback
						</CardTitle>
						<CardDescription>
							Run into a problem or have an idea? Let us know on GitHub.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-1">
						{SUPPORT_LINKS.map((link) => {
							const Icon = link.icon;
							return (
								<a
									key={link.label}
									href={link.href}
									target="_blank"
									rel="noreferrer noopener"
									className="flex items-start gap-3 rounded-lg p-2.5 -mx-2.5 transition-colors hover:bg-muted/60"
								>
									<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
										<Icon className="h-4 w-4" />
									</div>
									<div className="min-w-0">
										<div className="text-sm font-medium text-foreground">
											{link.label}
										</div>
										<div className="text-xs text-muted-foreground">
											{link.description}
										</div>
									</div>
								</a>
							);
						})}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
