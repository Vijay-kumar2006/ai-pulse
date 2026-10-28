import React, { useState } from "react";
import Login from "./pages/Login.jsx";
import OrgPicker from "./pages/OrgPicker.jsx";
import Diagnostic from "./pages/Diagnostic.jsx";
import Report from "./pages/Report.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import { clearToken } from "./api.js";

export default function App() {
  const [step, setStep] = useState("login");
  const [session, setSession] = useState(null);
  const [org, setOrg] = useState(null);

  function handleLogout() {
    clearToken();
    setSession(null);
    setOrg(null);
    setStep("login");
  }

  function handleSwitchOrg() {
    if (session && session.organizations && session.organizations.length > 1) {
      setStep("org");
    } else {
      handleLogout();
    }
  }

  return (
    <div>
      {/* Top Application Header */}
      <header className="app-header">
        <div className="header-container">
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div className="brand-logo">
              <div className="brand-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span>AI Pulse</span>
            </div>
            {org && (
              <span className="brand-badge" style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                <span>🏢</span> {org.org_name}
              </span>
            )}
          </div>

          {session && (
            <div className="header-nav">
              {org && org.role !== "admin" && (
                <div style={{ display: "flex", gap: "0.35rem" }}>
                  <button
                    className={step === "report" ? "btn-primary" : "btn-ghost"}
                    style={{ padding: "0.4rem 0.75rem", fontSize: "0.82rem" }}
                    onClick={() => setStep("report")}
                  >
                    My Report
                  </button>
                  <button
                    className={step === "diagnostic" ? "btn-primary" : "btn-ghost"}
                    style={{ padding: "0.4rem 0.75rem", fontSize: "0.82rem" }}
                    onClick={() => setStep("diagnostic")}
                  >
                    Take Diagnostic
                  </button>
                </div>
              )}

              {session.organizations && session.organizations.length > 1 && (
                <button
                  className="btn-ghost"
                  style={{ padding: "0.4rem 0.75rem", fontSize: "0.82rem" }}
                  onClick={handleSwitchOrg}
                  title="Switch organization workspace"
                >
                  ⇄ Workspaces ({session.organizations.length})
                </button>
              )}

              <button
                className="btn-ghost"
                style={{ padding: "0.4rem 0.75rem", fontSize: "0.82rem", color: "#f87171", borderColor: "rgba(239,68,68,0.3)" }}
                onClick={handleLogout}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="container">
        {step === "login" && (
          <Login
            onDone={async (s) => {
              setSession(s);
              if (s.organizations && s.organizations.length === 1) {
                const singleOrg = s.organizations[0];
                try {
                  const data = await api("/auth/select-org", {
                    method: "POST",
                    body: JSON.stringify({ org_id: singleOrg.org_id }),
                  });
                  setToken(data.token);
                } catch {
                  // Fallback to token already returned from login
                }
                setOrg(singleOrg);
                setStep(singleOrg.role === "admin" ? "dashboard" : "report");
              } else {
                setStep("org");
              }
            }}
          />
        )}

        {step === "org" && session && (
          <OrgPicker
            orgs={session.organizations}
            onPick={(o) => {
              setOrg(o);
              setStep(o.role === "admin" ? "dashboard" : "report");
            }}
          />
        )}

        {step === "diagnostic" && (
          <Diagnostic
            onDone={() => setStep("report")}
            onSwitchOrg={session?.organizations?.length > 1 ? handleSwitchOrg : null}
          />
        )}

        {step === "report" && (
          <Report
            onRetake={() => setStep("diagnostic")}
            onSwitchOrg={session?.organizations?.length > 1 ? handleSwitchOrg : null}
          />
        )}

        {step === "dashboard" && org && (
          <Dashboard
            org={org}
            onSwitchOrg={session?.organizations?.length > 1 ? handleSwitchOrg : null}
          />
        )}
      </main>
    </div>
  );
}
