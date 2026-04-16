import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !user.is_platform_admin && !user.is_staff) return <Navigate to="/" replace />;
  return children;
};

export default ProtectedRoute;
