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
    { to: "/admin", label: "Admin Console", icon: "AD", description: "Users and support" },
    { to: "/admin/chat", label: "Support Inbox", icon: "IN", description: "Reply to messages" },
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
                <AdminPage />
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
