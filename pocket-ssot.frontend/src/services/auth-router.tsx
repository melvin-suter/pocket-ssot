import { Navigate } from "react-router-dom";
import { isAuthed } from "./api";
import type { JSX } from "react";

export function RequireAuth({ children }: { children: JSX.Element }) {
  if (!isAuthed()) return <Navigate to="/login" replace />;

  return children;
}
