import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Web3Provider } from "@/components/web3/Web3Provider";
import Layout from "@/components/layout/Layout";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import BaseBadge from "./components/BaseBadge";

const HomePage = lazy(() => import("./pages/HomePage"));
const ChatInterface = lazy(() => import("./pages/ChatInterface"));
const MyContractsPage = lazy(() => import("./pages/MyContractsPage"));
const Resources = lazy(() => import("./pages/Resources"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

const RouteFallback = () => (
  <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">
    Loading…
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Web3Provider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<Layout><RouteFallback /></Layout>}>
            <Routes>
              <Route path="/" element={<Layout><HomePage /></Layout>} />
              <Route path="/chat" element={<Layout><ChatInterface /></Layout>} />
              <Route path="/contracts" element={<Layout><MyContractsPage /></Layout>} />
              <Route path="/resources" element={<Layout><Resources /></Layout>} />
              <Route path="*" element={<Layout><NotFound /></Layout>} />
            </Routes>
          </Suspense>
          <BaseBadge />
        </BrowserRouter>
      </TooltipProvider>
    </Web3Provider>
  </QueryClientProvider>
);

export default App;
