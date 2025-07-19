import "./App.css";
import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthErrorBoundary } from "@/components/AuthErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load pages for better initial load performance
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const NetworkingDashboard = lazy(() => import("./pages/NetworkingDashboard"));
const IntroductionPage = lazy(() => import("./pages/IntroductionPage"));
const IntroductionRequest = lazy(() => import("./pages/IntroductionRequest"));
const OmniscientAdmin = lazy(() => import("./pages/OmniscientAdmin"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen bg-terminal-bg flex items-center justify-center">
    <div className="space-y-4 w-full max-w-md p-6">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-8 w-1/2" />
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      // Enable stale-while-revalidate by default
      staleTime: 0, // Data is immediately stale, but...
      gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes (renamed from cacheTime)
      // This enables background refetching while showing stale data
      refetchOnMount: "always",
      refetchOnReconnect: "always",
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <AuthErrorBoundary>
            <AuthProvider>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/onboarding"
                    element={
                      <ProtectedRoute>
                        <Onboarding />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute adminOnly>
                        <AdminDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/networking"
                    element={
                      <ProtectedRoute>
                        <NetworkingDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/introduction/:token"
                    element={<IntroductionPage />}
                  />
                  <Route
                    path="/introduction"
                    element={
                      <ProtectedRoute>
                        <IntroductionRequest />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/omniscient"
                    element={
                      <ProtectedRoute adminOnly>
                        <OmniscientAdmin />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </AuthProvider>
          </AuthErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
