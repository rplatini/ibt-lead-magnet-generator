import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Generator from "./routes/Generator";
import HistoryDetail from "./routes/HistoryDetail";
import TemplateBuilder from "./routes/TemplateBuilder";
import TemplateReports from "./routes/TemplateReports";
import TemplatesList from "./routes/TemplatesList";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
		},
	},
});

export default function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<BrowserRouter>
				<Routes>
					<Route element={<Layout />}>
						<Route path="/" element={<TemplatesList />} />
						<Route path="/templates/new" element={<TemplateBuilder />} />
						<Route path="/templates/:id/edit" element={<TemplateBuilder />} />
						<Route path="/templates/:id/generate" element={<Generator />} />
						<Route path="/templates/:id/reports" element={<TemplateReports />} />
						<Route path="/history/:runId" element={<HistoryDetail />} />
					</Route>
				</Routes>
			</BrowserRouter>
		</QueryClientProvider>
	);
}
