import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function RequireAuth({ children }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "checking") return <div className="page-loading">Loading…</div>;
  if (status === "anonymous") return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}
