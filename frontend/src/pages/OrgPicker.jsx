import React, { useState } from "react";
import { api, setToken } from "../api.js";

export default function OrgPicker({ orgs, onPick }) {
  const [loadingOrgId, setLoadingOrgId] = useState(null);
  const [error, setError] = useState("");

  async function pick(o) {
    setLoadingOrgId(o.org_id);
    setError("");
    try {
      const data = await api("/auth/select-org", {
        method: "POST",
        body: JSON.stringify({ org_id: o.org_id }),
      });
      setToken(data.token);
      onPick(o);
    } catch (err) {
      setError(err.message || "Failed to select organization.");
    } finally {
      setLoadingOrgId(null);
    }
  }

  return (
    <div className="auth-wrapper" style={{ maxWidth: "520px" }}>
      <div className="auth-header">
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.65rem", margin: "0 0 0.5rem 0" }}>
          Select Organization
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", margin: 0 }}>
          Your account has access to multiple workspaces. Choose where you want to work:
        </p>
      </div>

      <div className="card">
        {error && <div className="alert-box alert-danger">{error}</div>}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {orgs.map((o) => (
            <div
              key={o.org_id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "1.1rem 1.25rem",
                background: "var(--bg-card-subtle)",
                border: "1px solid var(--border-card)",
                borderRadius: "var(--radius-md)",
                transition: "all 0.2s",
              }}
            >
              <div>
                <h4 style={{ margin: "0 0 0.25rem 0", fontSize: "1.05rem", color: "#fff" }}>
                  {o.org_name}
                </h4>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span
                    className={`badge ${
                      o.role === "admin" ? "badge-leader" : "badge-practitioner"
                    }`}
                  >
                    {o.role.toUpperCase()}
                  </span>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    {o.role === "admin" ? "Full access & dashboard" : "Personal diagnostic & toolkit"}
                  </span>
                </div>
              </div>

              <button
                className="btn-primary"
                onClick={() => pick(o)}
                disabled={loadingOrgId === o.org_id}
                style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
              >
                {loadingOrgId === o.org_id ? "Loading…" : "Launch →"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
