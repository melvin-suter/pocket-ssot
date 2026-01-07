import PocketBase from "pocketbase";

export const api = new PocketBase(import.meta.env.VITE_PB_URL ?? "/");

// optional: make auth persist across refreshes (default LocalAuthStore already does)
api.autoCancellation(false); // helpful in React dev to avoid aborted requests
