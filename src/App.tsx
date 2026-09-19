import { ConfirmDialogProvider } from "@/components/ConfirmDialog/index.tsx";
import { Toaster } from "@/components/ui/toast/index.tsx";
import { RefreshIntervalProvider } from "@/contexts/RefreshIntervalContext.tsx";
import { VHostProvider } from "@/contexts/VHostContext.tsx";
import { router } from "@/router/index.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 5,
			// Disabled to prevent all active queries firing simultaneously when the
			// user switches browser tabs back to the app, which caused fetch storms.
			refetchOnWindowFocus: false,
		},
	},
});

function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<RefreshIntervalProvider>
				<VHostProvider>
					<ConfirmDialogProvider>
						<RouterProvider router={router} />
						<Toaster />
					</ConfirmDialogProvider>
				</VHostProvider>
			</RefreshIntervalProvider>
		</QueryClientProvider>
	);
}

export default App;
