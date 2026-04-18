import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Bets from "./pages/Bets";
import ImportCsv from "./pages/ImportCsv";
import Analytics from "./pages/Analytics";
import Markets from "./pages/Markets";
import Parlay from "./pages/Parlay";
import Simulator from "./pages/Simulator";
import Alerts from "./pages/Alerts";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const Protected = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute><AppLayout>{children}</AppLayout></ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
            <Route path="/bets" element={<Protected><Bets /></Protected>} />
            <Route path="/import" element={<Protected><ImportCsv /></Protected>} />
            <Route path="/analytics" element={<Protected><Analytics /></Protected>} />
            <Route path="/markets" element={<Protected><Markets /></Protected>} />
            <Route path="/parlay" element={<Protected><Parlay /></Protected>} />
            <Route path="/simulator" element={<Protected><Simulator /></Protected>} />
            <Route path="/alerts" element={<Protected><Alerts /></Protected>} />
            <Route path="/settings" element={<Protected><Settings /></Protected>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
