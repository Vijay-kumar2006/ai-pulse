import React, { useEffect, useState } from "react";
import { api } from "../api.js";

function getLevelBadgeClass(level) {
  switch (level) {
    case "Leader":
      return "badge-leader";
    case "Practitioner":
      return "badge-practitioner";
    case "Exploring":
      return "badge-exploring";
    case "Beginner":
      return "badge-beginner";
    default:
      return "badge-privacy";
  }
}

export default function Report({ onRetake, onSwitchOrg }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  function loadReport() {
    setLoading(true);
    api("/reports/me")
      .then((data) => {
        setReport(data);
      })
      .catch((err) => {
        setError(err.message || "Failed to load report.");
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    loadReport();
  }, []);

  function copyPrompt(id, text) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api("/diagnostic/responses", { method: "DELETE" });
      setDeleteSuccess(true);
      setShowConfirmDelete(false);
      loadReport();
    } catch (err) {
      setError(err.message || "Failed to delete responses.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
        <p style={{ color: "var(--text-secondary)" }}>Loading your personalized AI report…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="alert-box alert-danger">{error}</div>
        <button className="btn-primary" onClick={loadReport}>Retry</button>
      </div>
    );
  }

  if (!report || report.answered === 0) {
    return (
      <div style={{ maxWidth: "780px", margin: "0 auto" }}>
        {deleteSuccess && (
          <div className="alert-box alert-success" style={{ marginBottom: "1.5rem" }}>
            ✓ <strong>Data Deleted:</strong> All your diagnostic responses, scores, and risks have been permanently removed from the database and all dashboards immediately.
          </div>
        )}
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>📋</div>
          <h2 style={{ fontFamily: "var(--font-display)", color: "#fff", margin: "0 0 0.5rem 0" }}>
            No Completed Diagnostic
          </h2>
          <p style={{ color: "var(--text-secondary)", maxWidth: "480px", margin: "0 auto 1.5rem" }}>
            Take your quick 3-minute diagnostic to benchmark your AI maturity, check data handling risks, and unlock role-tailored safe prompts.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "1rem" }}>
            <button className="btn-primary" onClick={onRetake}>
              Take Diagnostic Now →
            </button>
            {onSwitchOrg && (
              <button className="btn-ghost" onClick={onSwitchOrg}>
                Switch Workspace
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto" }}>
      {/* Top Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span className="brand-badge">Personal Diagnostic Report</span>
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{report.organization}</span>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn-ghost" onClick={onRetake}>
            Retake Diagnostic
          </button>
          {onSwitchOrg && (
            <button className="btn-ghost" onClick={onSwitchOrg}>
              Switch Workspace
            </button>
          )}
        </div>
      </div>

      {/* Hero Overview Card */}
      <div className="card" style={{ background: "linear-gradient(145deg, #111827 0%, #1e1b4b 100%)", border: "1px solid #3730a3" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1.5rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "0.4rem" }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", margin: 0, color: "#fff" }}>
                {report.name}
              </h2>
              <span className={`badge ${getLevelBadgeClass(report.level)}`} style={{ fontSize: "0.85rem" }}>
                {report.level}
              </span>
            </div>
            <p style={{ margin: "0 0 1rem 0", color: "#c7d2fe", fontSize: "0.95rem" }}>
              Role: <strong style={{ color: "#fff", textTransform: "capitalize" }}>{report.job_role}</strong> · Seniority: <strong style={{ color: "#fff", textTransform: "capitalize" }}>{report.seniority}</strong>
            </p>
            <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#a5b4fc", fontWeight: 600 }}>
                  Average AI Maturity
                </div>
                <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#fff", fontFamily: "var(--font-display)" }}>
                  {report.average_score ? report.average_score.toFixed(1) : "—"} <span style={{ fontSize: "1rem", color: "#818cf8" }}>/ 5.0</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#a5b4fc", fontWeight: 600 }}>
                  Questions Answered
                </div>
                <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#fff", fontFamily: "var(--font-display)" }}>
                  {report.answered}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Compliance & Risk Flags */}
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: "0.75rem" }}>
          <span style={{ color: report.risks?.length > 0 ? "#f87171" : "#34d399" }}>●</span> AI Safety & Risk Analysis
        </h3>
        {report.risks && report.risks.length > 0 ? (
          <div>
            <div className="alert-box alert-danger" style={{ marginBottom: "1rem" }}>
              ⚠️ The AI evaluation detected potential policy risk flags in your responses. Review the items below:
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {report.risks.map((risk) => (
                <span key={risk} className="badge badge-danger" style={{ padding: "0.4rem 0.85rem", fontSize: "0.85rem" }}>
                  ⚠ {risk.replace(/_/g, " ").toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="alert-box alert-success" style={{ margin: 0 }}>
            ✓ <strong>Exemplary Safety:</strong> No data leakage or unverified output risks were identified in your diagnostic answers.
          </div>
        )}
      </div>

      {/* Our Feature: Role-Specific Safe AI Toolkit */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">
              <span style={{ color: "#818cf8" }}>⚡</span> Role-Specific Safe Prompt Toolkit
            </h3>
            <p className="card-subtitle">
              Pre-vetted, PII-sanitized prompt templates calibrated for your role as a <strong>{report.job_role}</strong>
            </p>
          </div>
          <span className="brand-badge">Productivity</span>
        </div>

        <div className="template-grid">
          {report.safe_templates?.map((tpl) => (
            <div key={tpl.id} className="template-card">
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                  <h4 style={{ margin: 0, color: "#fff", fontSize: "0.95rem" }}>{tpl.title}</h4>
                  <span className="badge badge-practitioner" style={{ fontSize: "0.7rem" }}>{tpl.category}</span>
                </div>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                  {tpl.description}
                </p>
                <div className="template-box">{tpl.prompt}</div>
              </div>
              <button
                className="btn-ghost"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={() => copyPrompt(tpl.id, tpl.prompt)}
              >
                {copiedId === tpl.id ? "✓ Copied to Clipboard!" : "Copy Safe Prompt 📋"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Next Steps Roadmap */}
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: "0.85rem" }}>
          Targeted Growth Recommendations
        </h3>
        <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "#cbd5e1" }}>
          {report.next_steps?.map((step, idx) => (
            <li key={idx} style={{ marginBottom: "0.6rem", fontSize: "0.92rem" }}>
              {step}
            </li>
          ))}
        </ul>
      </div>

      {/* Client Request #2: Right to Delete (GDPR Privacy Compliance) */}
      <div className="card" style={{ border: "1px solid rgba(239, 68, 68, 0.25)", background: "rgba(239, 68, 68, 0.04)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h3 className="card-title" style={{ color: "#f87171", fontSize: "1.1rem" }}>
              Privacy & Right to Delete
            </h3>
            <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.85rem", color: "var(--text-secondary)", maxWidth: "560px" }}>
              In accordance with corporate privacy policy and GDPR guidelines, you have the right to permanently erase your diagnostic answers and scoring records at any time. Your data will immediately vanish from all team dashboards.
            </p>
          </div>

          {!showConfirmDelete ? (
            <button
              className="btn-danger"
              onClick={() => setShowConfirmDelete(true)}
            >
              Delete My Data & Report
            </button>
          ) : (
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <button
                className="btn-danger"
                disabled={deleting}
                onClick={handleDelete}
              >
                {deleting ? "Deleting…" : "Confirm Permanent Deletion"}
              </button>
              <button
                className="btn-ghost"
                onClick={() => setShowConfirmDelete(false)}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
