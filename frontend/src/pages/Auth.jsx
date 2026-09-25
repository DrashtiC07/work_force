import { useState } from "react";
import { authApi } from "../services/api";

function Auth({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "employee",
    invite_code: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "signup") {
        await authApi.signup(form);
        setMode("login");
        setError("Account created — log in now");
      } else {
        const data = await authApi.login(form.email, form.password);
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        onLogin(data.user, data.token);
      }
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-tabs">
          <button
            className={`tab-btn ${mode === "login" ? "active" : ""}`}
            onClick={() => {
              setMode("login");
              setError("");
            }}
            type="button"
          >
            Login
          </button>
          <button
            className={`tab-btn ${mode === "signup" ? "active" : ""}`}
            onClick={() => {
              setMode("signup");
              setError("");
            }}
            type="button"
          >
            Sign Up
          </button>
        </div>

        <h1 className="auth-title">
          {mode === "login" ? "Welcome back." : "Create account."}
        </h1>
        <p className="auth-sub">
          {mode === "login"
            ? "Log in to manage your workforce."
            : "Join the platform in seconds."}
        </p>

        {error && (
          <div
            className={`auth-msg ${error.includes("created") ? "ok" : "err"}`}
          >
            {error}
          </div>
        )}

        <form onSubmit={submit} className="auth-form" autoComplete="on">
          {mode === "signup" && (
            <div className="field">
              <label>Full name</label>
              <input
                name="name"
                value={form.name}
                onChange={change}
                placeholder="Rahul Shah"
                required
                autoComplete="name"
              />
            </div>
          )}
          <div className="field">
            <label>Email</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={change}
              placeholder="you@company.com"
              required
              autoComplete="email"
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={change}
              placeholder="••••••••"
              required
              minLength={6}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
            />
          </div>
          {mode === "signup" && (
            <div className="field">
              <label>Role</label>
              <select name="role" value={form.role} onChange={change}>
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          )}
          {mode === "signup" && form.role === "employee" && (
            <div className="field">
              <label>Invite code</label>
              <input
                name="invite_code"
                value={form.invite_code || ""}
                onChange={change}
                placeholder="Get this from your mail"
                required
                autoComplete="off"
              />
            </div>
          )}
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading
              ? "Please wait…"
              : mode === "login"
                ? "Log In →"
                : "Sign Up →"}
          </button>
        </form>

        <p className="auth-switch">
          {mode === "login" ? "New here?" : "Already have an account?"}{" "}
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError("");
            }}
          >
            {mode === "login" ? "Create one" : "Log in"}
          </button>
        </p>
      </div>
    </div>
  );
}

export default Auth;
