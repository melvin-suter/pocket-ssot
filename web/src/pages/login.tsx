import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";

export default function Login() {
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // "users" is the default auth collection in PocketBase
      await api.collection("users").authWithPassword(username + "@localhost.local", password);

      // success: token + user model are now in pb.authStore
      nav("/", { replace: true });
    } catch (err: any) {
      // PocketBase throws a structured error; this is a simple fallback
      setError(err?.message ?? "Login failed");
      api.authStore.clear();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <main>
        <h1>Login</h1>

        <form onSubmit={onSubmit}>

          <label>Username</label>
          
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}/>

          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}/>

          <input type="submit"  disabled={loading} value="Login"/>

          {error && <p style={{ color: "crimson" }}>{error}</p>}
        </form>
      </main>
    </>
  );
}
