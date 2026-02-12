import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import Medications from "./pages/Medications";
import MedicationLogs from "./pages/MedicationLogs";
import Family from "./pages/Family";
import Notifications from "./pages/Notifications";
import EmailSettings from "./pages/EmailSettings";
import Login from "./pages/Login";

function Router() {
  return (
    <Switch>
      <Route path={"/login"} component={Login} />
      <Route>
        <DashboardLayout>
          <Switch>
            <Route path={"/"} component={Home} />
            <Route path={"/medications"} component={Medications} />
            <Route path={"/logs"} component={MedicationLogs} />
            <Route path={"/family"} component={Family} />
            <Route path={"/notifications"} component={Notifications} />
            <Route path={"/email-settings"} component={EmailSettings} />
            <Route path={"/404"} component={NotFound} />
            <Route component={NotFound} />
          </Switch>
        </DashboardLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                fontSize: "1.1rem",
                padding: "16px 20px",
              },
            }}
          />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
