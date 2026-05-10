import { Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import AdminChatbotWidget from "./components/AdminChatbotWidget";
import AppLayout from "./components/layout/AppLayout";
import PublicLayout from "./components/layout/PublicLayout";
import AdminChatPage from "./pages/AdminChatPage";
import AdminPage from "./pages/AdminPage";
import DashboardPage from "./pages/DashboardPage";
import HomePage from "./pages/HomePage";
import JobInputPage from "./pages/JobInputPage";
import LoginPage from "./pages/LoginPage";
import PaymentPage from "./pages/PaymentPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ResumeEditorPage from "./pages/ResumeEditorPage";
import SignupPage from "./pages/SignupPage";
import ProtectedRoute from "./routes/ProtectedRoute";

const App = () => {
  const { logout, user } = useAuth();
  const baseNavItems = [
    { to: "/dashboard", label: "Overview", icon: "OV", description: "Status and next steps" },
    { to: "/resume", label: "Resume Builder", icon: "RB", description: "Draft and edit content" },
    { to: "/job", label: "Target Role", icon: "TR", description: "Add the role you want to target" },
    { to: "/payment", label: "Billing", icon: "BL", description: "Plans and payment rails" },
  ];
  const adminNavItems = [
    ...baseNavItems,
    { to: "/admin", label: "Overview", icon: "AO", description: "Ops summary" },
    { to: "/admin/users", label: "Users", icon: "US", description: "Accounts and access" },
    { to: "/admin/plans", label: "Plans", icon: "PL", description: "Pricing controls" },
    { to: "/admin/trial", label: "Trial", icon: "TR", description: "Default access" },
    { to: "/admin/chat", label: "Support Inbox", icon: "IN", description: "Reply to messages" },
    { to: "/admin/crypto/networks", label: "Networks", icon: "CN", description: "Stablecoin rails" },
    { to: "/admin/crypto/wallets", label: "Wallets", icon: "CW", description: "Receiving addresses" },
    { to: "/admin/crypto/availability", label: "Availability", icon: "CA", description: "Plan mappings" },
    { to: "/admin/crypto/reviews", label: "Reviews", icon: "CR", description: "Verify payments" },
    { to: "/admin/logs", label: "Logs", icon: "LG", description: "Audit trail" },
  ];
  const authNavItems = user?.is_platform_admin || user?.is_staff ? adminNavItems : baseNavItems;

  return (
    <div className="min-h-screen">
      <Routes>
        <Route path="/" element={<PublicLayout logout={logout} user={user}><HomePage /></PublicLayout>} />
        <Route path="/login" element={<PublicLayout logout={logout} user={user}><LoginPage /></PublicLayout>} />
        <Route path="/reset-password" element={<PublicLayout logout={logout} user={user}><ResetPasswordPage /></PublicLayout>} />
        <Route path="/reset-password/:uid/:token" element={<PublicLayout logout={logout} user={user}><ResetPasswordPage /></PublicLayout>} />
        <Route path="/signup" element={<PublicLayout logout={logout} user={user}><SignupPage /></PublicLayout>} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <AppLayout navItems={authNavItems} onLogout={logout} user={user}>
                <DashboardPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/resume"
          element={
            <ProtectedRoute>
              <AppLayout navItems={authNavItems} onLogout={logout} user={user}>
                <ResumeEditorPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/job"
          element={
            <ProtectedRoute>
              <AppLayout navItems={authNavItems} onLogout={logout} user={user}>
                <JobInputPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment"
          element={
            <ProtectedRoute>
              <AppLayout navItems={authNavItems} onLogout={logout} user={user}>
                <PaymentPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly>
              <AppLayout navItems={adminNavItems} onLogout={logout} user={user}>
                <AdminPage section="overview" />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute adminOnly>
              <AppLayout navItems={adminNavItems} onLogout={logout} user={user}>
                <AdminPage section="users" />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/plans"
          element={
            <ProtectedRoute adminOnly>
              <AppLayout navItems={adminNavItems} onLogout={logout} user={user}>
                <AdminPage section="plans" />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/trial"
          element={
            <ProtectedRoute adminOnly>
              <AppLayout navItems={adminNavItems} onLogout={logout} user={user}>
                <AdminPage section="trial" />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/crypto/networks"
          element={
            <ProtectedRoute adminOnly>
              <AppLayout navItems={adminNavItems} onLogout={logout} user={user}>
                <AdminPage section="crypto-networks" />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/crypto/wallets"
          element={
            <ProtectedRoute adminOnly>
              <AppLayout navItems={adminNavItems} onLogout={logout} user={user}>
                <AdminPage section="crypto-wallets" />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/crypto/availability"
          element={
            <ProtectedRoute adminOnly>
              <AppLayout navItems={adminNavItems} onLogout={logout} user={user}>
                <AdminPage section="crypto-availability" />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/crypto/reviews"
          element={
            <ProtectedRoute adminOnly>
              <AppLayout navItems={adminNavItems} onLogout={logout} user={user}>
                <AdminPage section="crypto-reviews" />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/logs"
          element={
            <ProtectedRoute adminOnly>
              <AppLayout navItems={adminNavItems} onLogout={logout} user={user}>
                <AdminPage section="logs" />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/chat"
          element={
            <ProtectedRoute adminOnly>
              <AppLayout navItems={adminNavItems} onLogout={logout} user={user}>
                <AdminChatPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
      {user ? <AdminChatbotWidget /> : null}
    </div>
  );
};

export default App;
