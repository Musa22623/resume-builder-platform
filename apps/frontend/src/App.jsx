import { Link, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import AdminChatbotWidget from "./components/AdminChatbotWidget";
import AdminChatPage from "./pages/AdminChatPage";
import AdminPage from "./pages/AdminPage";
import DashboardPage from "./pages/DashboardPage";
import HomePage from "./pages/HomePage";
import JobInputPage from "./pages/JobInputPage";
import LoginPage from "./pages/LoginPage";
import PaymentPage from "./pages/PaymentPage";
import ResumeEditorPage from "./pages/ResumeEditorPage";
import SignupPage from "./pages/SignupPage";
import ProtectedRoute from "./routes/ProtectedRoute";

const App = () => {
  const { logout, user } = useAuth();

  return (
    <div>
      <nav style={{ display: "flex", gap: 12 }}>
        <Link to="/">Home</Link>
        {user ? (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/resume">Resume</Link>
            <Link to="/job">Job</Link>
            <Link to="/payment">Payment</Link>
            <Link to="/admin">Admin</Link>
            {user?.is_platform_admin || user?.is_staff ? <Link to="/admin/chat">Admin Chat</Link> : null}
            <button onClick={logout}>Logout</button>
          </>
        ) : (
          <>
            <a href="#intro">Intro</a>
            <a href="#desktop">Desktop App</a>
            <a href="#contact">Contact</a>
            <a href="#faq">FAQ</a>
            <Link to="/login">Login</Link>
            <Link to="/signup">Sign Up</Link>
          </>
        )}
      </nav>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/" element={<HomePage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/resume"
          element={
            <ProtectedRoute>
              <ResumeEditorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/job"
          element={
            <ProtectedRoute>
              <JobInputPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment"
          element={
            <ProtectedRoute>
              <PaymentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly>
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/chat"
          element={
            <ProtectedRoute adminOnly>
              <AdminChatPage />
            </ProtectedRoute>
          }
        />
      </Routes>
      {user ? <AdminChatbotWidget /> : null}
    </div>
  );
};

export default App;
