import { Navigate } from "react-router-dom";
import { api } from "./api";
import type { JSX } from "react";

export function RequireAuth({ children }: { children: JSX.Element }) {
  if (!api.authStore.isValid) return <Navigate to="/login" replace />;

  return children;
}
