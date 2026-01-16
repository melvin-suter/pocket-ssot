import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api, apiFetch, login } from "../services/api";

export default function Login() {
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [me, setMe] = useState<any>({});

  async function loadMe() {
    setError(null);
    try {
      const data = await apiFetch<any>("/api/me");
      console.log("data", data);
      setMe(data);
    } catch (e: any) {
      setMe(null);
      setError("Login failed");
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(username, password);
      await loadMe();
      nav("/", { replace: true });
    } catch (err: any) {
      setError("Login failed");
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
