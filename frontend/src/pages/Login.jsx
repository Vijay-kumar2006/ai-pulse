import React, { useState } from "react";
import { api, setToken } from "../api.js";

const DEMO_USERS = [
  { name: "Asha Rao", email: "asha@northwind.test", desc: "Admin · Northwind Logistics" },
  { name: "Priya Nair", email: "priya@northwind.test", desc: "Employee · Support (Northwind)" },
  { name: "Dev Malhotra", email: "dev@northwind.test", desc: "Engineering Lead · Northwind" },
  { name: "Ravi Kapoor", email: "ravi@consult.test", desc: "Consultant · Northwind & Bluepeak" },
  { name: "Meera Pillai", email: "meera@bluepeak.test", desc: "Admin · Bluepeak Retail" },
];

export default function Login({ onDone }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("pulse123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    if (e) e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(data.token);
      onDone(data);
    } catch (err) {
      setError(err.message || "Failed to authenticate. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  function pickDemo(demoEmail) {
    setEmail(demoEmail);
    setPassword("pulse123");
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-header">
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
          <div className="brand-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span style={{ fontSize: "1.5rem", fontWeight: 800, fontFamily: "var(--font-display)" }}>AI Pulse</span>
          <span className="brand-badge">Enterprise</span>
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", margin: 0 }}>
          Sign in to access your organization's diagnostic & intelligence dashboard
        </p>
      </div>

      <div className="card">
        {error && <div className="alert-box alert-danger">{error}</div>}

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email-input">Work Email</label>
            <input
              id="email-input"
              className="form-input"
              type="email"
              placeholder="e.g. asha@northwind.test"
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password-input">Password</label>
            <input
              id="password-input"
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={password}
              required
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button id="signin-button" className="btn-primary" type="submit" disabled={loading} style={{ width: "100%", padding: "0.75rem" }}>
            {loading ? "Authenticating…" : "Sign In to AI Pulse"}
          </button>
        </form>

        <div style={{ marginTop: "1.75rem", paddingTop: "1.25rem", borderTop: "1px solid var(--border-card)" }}>
          <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 0.75rem 0" }}>
            Quick Demo Accounts (Password: pulse123)
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
            {DEMO_USERS.map((u) => (
              <button
                key={u.email}
                type="button"
                className="demo-account-chip"
                onClick={() => pickDemo(u.email)}
              >
                <strong style={{ color: "#e2e8f0" }}>{u.name}</strong> <span style={{ color: "var(--text-muted)" }}>({u.desc})</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
