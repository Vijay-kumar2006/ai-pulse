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

export default function Dashboard({ org, onSwitchOrg }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function loadDashboard() {
    setLoading(true);
    setError("");
    api(`/dashboard?org_id=${org.org_id}`)
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        setError(err.message || "Failed to load dashboard data.");
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    loadDashboard();
  }, [org]);

  if (loading) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
        <div style={{ fontSize: "1.1rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
          Aggregating diagnostic intelligence…
        </div>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
          Applying k-anonymity privacy filters and risk evaluation
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="alert-box alert-danger">
          <strong>Error loading dashboard:</strong> {error}
        </div>
        <button className="btn-primary" onClick={loadDashboard}>
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const responseRate = data.total_employees
    ? Math.round((data.total_responded / data.total_employees) * 100)
    : 0;

  return (
    <div>
      {/* Page Title & Context */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", margin: 0, color: "#fff" }}>
              {data.organization}
            </h2>
            <span className="brand-badge">Executive View</span>
          </div>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-secondary)" }}>
            Real-time AI workforce maturity, risk distribution, and department-level diagnostics
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.65rem" }}>
          <button className="btn-ghost" onClick={loadDashboard} title="Refresh metrics">
            ↻ Refresh Data
          </button>
          {onSwitchOrg && (
            <button className="btn-ghost" onClick={onSwitchOrg}>
              ⇄ Switch Workspace
            </button>
          )}
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Overall AI Maturity</div>
          <div className="metric-value">
            {data.overall_average_score ? data.overall_average_score.toFixed(1) : "—"}
            <span style={{ fontSize: "1rem", color: "var(--text-muted)", fontWeight: 400 }}> / 5.0</span>
          </div>
          <div style={{ marginTop: "0.4rem" }}>
            <span className={`badge ${getLevelBadgeClass(data.overall_level)}`}>
              {data.overall_level}
            </span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Workforce Response Rate</div>
          <div className="metric-value">{responseRate}%</div>
          <div className="metric-caption">
            {data.total_responded} of {data.total_employees} members completed
          </div>
          <div className="progress-track" style={{ marginTop: "0.65rem" }}>
            <div className="progress-fill" style={{ width: `${responseRate}%` }} />
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Privacy Shield (k-Anonymity)</div>
          <div className="metric-value" style={{ color: "#c084fc", fontSize: "1.45rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>k ≥ {data.anonymity_threshold || 5}</span>
            <span className="badge badge-privacy" style={{ fontSize: "0.75rem" }}>Active</span>
          </div>
          <div className="metric-caption">
            Teams with &lt;5 respondents aggregated under "Other teams"
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Identified Risk Flags</div>
          <div className="metric-value" style={{ color: data.top_risks.length > 0 ? "#f87171" : "#34d399" }}>
            {data.top_risks.reduce((acc, curr) => acc + curr[1], 0)}
          </div>
          <div className="metric-caption">
            Across {data.top_risks.length} distinct compliance categories
          </div>
        </div>
      </div>

      {/* Privacy Protection Banner (Client Request #1) */}
      <div className="privacy-alert">
        <div className="privacy-alert-icon">🔒</div>
        <div className="privacy-alert-text">
          <strong>Client Privacy Policy Enforcement:</strong> In accordance with Northwind legal & HR guidelines, departments with fewer than {data.anonymity_threshold || 5} completed diagnostics are strictly aggregated under <em>"Other teams"</em>. Individual employee responses and department-level scores are mathematically protected to guarantee anonymity.
        </div>
      </div>

      {/* Department Breakdown Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Department AI Maturity Breakdown</h3>
            <p className="card-subtitle">
              Evaluating adoption scores and completion rates across organizational units
            </p>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table-custom">
            <thead>
              <tr>
                <th>Department</th>
                <th>Participation</th>
                <th>Headcount</th>
                <th>Average Score</th>
                <th>Maturity Level</th>
                <th>Privacy Status</th>
              </tr>
            </thead>
            <tbody>
              {data.departments.map((dept, idx) => {
                const deptPct = dept.employees ? Math.round((dept.responded / dept.employees) * 100) : 0;
                return (
                  <tr key={idx}>
                    <td>
                      <strong style={{ color: dept.privacy_protected ? "#c084fc" : "#fff" }}>
                        {dept.department}
                      </strong>
                      {dept.note && (
                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                          {dept.note}
                        </div>
                      )}
                    </td>
                    <td style={{ minWidth: "150px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                        <span>{dept.responded} responded</span>
                        <span>{deptPct}%</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${deptPct}%` }} />
                      </div>
                    </td>
                    <td>{dept.employees} employees</td>
                    <td>
                      {dept.average_score !== null ? (
                        <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                          {dept.average_score.toFixed(2)} <small style={{ color: "var(--text-muted)" }}>/ 5</small>
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontStyle: "italic", fontSize: "0.85rem" }}>
                          Withheld for privacy
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${getLevelBadgeClass(dept.level)}`}>
                        {dept.level}
                      </span>
                    </td>
                    <td>
                      {dept.privacy_protected ? (
                        <span className="badge badge-privacy">
                          k &lt; 5 Aggregated
                        </span>
                      ) : (
                        <span className="badge badge-leader" style={{ fontSize: "0.72rem" }}>
                          ✓ Disclosed (k ≥ 5)
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Risk Remediation Playbook (Our Feature) */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">
              <span style={{ color: "#818cf8" }}>⚡</span> Executive AI Risk Remediation Playbook
            </h3>
            <p className="card-subtitle">
              Prioritized organizational interventions mapped directly to detected workplace risk flags
            </p>
          </div>
          <span className="badge badge-danger">
            {data.remediations?.length || 0} Recommended Actions
          </span>
        </div>

        {data.remediations && data.remediations.length > 0 ? (
          <div className="risk-grid">
            {data.remediations.map((item, idx) => (
              <div key={idx} className="remediation-card">
                <div>
                  <div className="remediation-header">
                    <span className="badge badge-danger">
                      {item.count} Incidents Detected
                    </span>
                    <span className="badge badge-exploring">
                      {item.severity} Severity
                    </span>
                  </div>
                  <h4 className="remediation-title">{item.title}</h4>
                  <p className="remediation-body" style={{ marginTop: "0.5rem" }}>
                    {item.recommended_action}
                  </p>
                </div>
                <div className="remediation-footer">
                  <span>Target: <strong>{item.target_roles?.join(", ") || "All"}</strong></span>
                  <span style={{ color: "#a5b4fc", cursor: "pointer", fontWeight: 600 }}>Action Protocol →</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
            ✓ No critical compliance or data exposure flags detected across respondents.
          </div>
        )}
      </div>
    </div>
  );
}
