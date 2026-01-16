import PocketBase from "pocketbase";

export const api = new PocketBase(import.meta.env.VITE_PB_URL ?? "/");

// optional: make auth persist across refreshes (default LocalAuthStore already does)
api.autoCancellation(false); // helpful in React dev to avoid aborted requests


export const baseURL = import.meta.env.VITE_API_URL ?? "";

export function getToken(): string | null {
  return localStorage.getItem("access_token");
}

export function setToken(token: string) {
  localStorage.setItem("access_token", token);
}

export function clearToken() {
  localStorage.removeItem("access_token");
}


export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const res = await fetch(baseURL + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (res.status === 401) {
    // token invalid/expired, kick user out
    clearToken();
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }

  // handle empty responses
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return undefined as unknown as T;
  }
  return (await res.json()) as T;
}

export async function login(username: string, password: string) {
  const data = await apiFetch<{ token: string }>(baseURL + "/api/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  setToken(data.token);
}

export function logout() {
  clearToken();
}


type JwtPayload = { exp?: number; sub?: string };

function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function isAuthed(): boolean {
  const token = getToken();
  if (!token) return false;

  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true; // no exp? treat as valid (or return false if you want strict)

  // exp is seconds since epoch
  const nowSec = Math.floor(Date.now() / 1000);
  return payload.exp > nowSec;
}