import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import HomePage from "@/pages/home-page";
import MalaDiretaPage from "@/pages/mala-direta-page";
import EmailConfigPage from "@/pages/email-config-page";
import UserManagementPage from "@/pages/user-management-page";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import ResetPasswordPage from "@/pages/reset-password-page";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/">
        <ProtectedRoute>
          <HomePage />
        </ProtectedRoute>
      </Route>
      <Route path="/mala-direta">
        <ProtectedRoute requirePermission="maladireta">
          <MalaDiretaPage />
        </ProtectedRoute>
      </Route>
      <Route path="/email-config">
        <ProtectedRoute requirePermission="emailConfig">
          <EmailConfigPage />
        </ProtectedRoute>
      </Route>
      <Route path="/user-management">
        <ProtectedRoute requirePermission="userManagement">
          <UserManagementPage />
        </ProtectedRoute>
      </Route>
      <Route path="*" component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;