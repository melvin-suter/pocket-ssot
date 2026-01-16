import React, { createContext, useContext, useReducer } from "react";
import { v4 as uuidv4 } from "uuid";

export type Toast = {
  id: string;
  message: string;
  type?: "success" | "error" | "info";
};

type State = Toast[];

type Action =
  | { type: "ADD"; toast: Toast }
  | { type: "REMOVE"; id: string };

const ToastContext = createContext<{
  toasts: State;
  addToast: (t: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
} | null>(null);

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD":
      return [...state, action.toast];
    case "REMOVE":
      return state.filter(t => t.id !== action.id);
    default:
      return state;
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, dispatch] = useReducer(reducer, []);

  const addToast = (toast: Omit<Toast, "id">) => {
    const id = uuidv4();
    dispatch({ type: "ADD", toast: { ...toast, id } });

    // auto-remove after 4s
    setTimeout(() => dispatch({ type: "REMOVE", id }), 4000);
  };

  const removeToast = (id: string) =>
    dispatch({ type: "REMOVE", id });

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToasts() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToasts must be used inside ToastProvider");
  return ctx;
}
