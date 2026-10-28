import React, { useEffect, useState } from "react";
import { api } from "../api.js";

export default function Diagnostic({ onDone, onSwitchOrg }) {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    api("/diagnostic/questions")
      .then((qs) => {
        setQuestions(qs);
      })
      .catch((err) => {
        setError(err.message || "Failed to load diagnostic questions.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  function handleAnswer(questionId, value) {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  }

  async function submit(e) {
    if (e) e.preventDefault();
    setError("");

    // Validate all questions answered
    const unanswered = questions.filter((q) => !answers[q.id] || !answers[q.id].trim());
    if (unanswered.length > 0) {
      setError(`Please complete all questions before submitting (${unanswered.length} remaining).`);
      return;
    }

    setSubmitting(true);
    try {
      const payload = Object.entries(answers).map(([question_id, answer]) => ({
        question_id,
        answer,
      }));
      await api("/diagnostic/submit", {
        method: "POST",
        body: JSON.stringify({ answers: payload }),
      });
      onDone();
    } catch (err) {
      setError(err.message || "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
        <p style={{ color: "var(--text-secondary)" }}>Loading your personalized AI diagnostic…</p>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).filter((k) => answers[k] && answers[k].trim()).length;
  const progressPct = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.65rem", margin: "0 0 0.35rem 0", color: "#fff" }}>
            AI Workplace Diagnostic
          </h2>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-secondary)" }}>
            Questions are adapted to your job role and seniority to measure practical adoption and data safety
          </p>
        </div>
        {onSwitchOrg && (
          <button className="btn-ghost" onClick={onSwitchOrg}>
            ⇄ Switch Org
          </button>
        )}
      </div>

      {/* Progress Track */}
      <div className="card" style={{ padding: "1.25rem 1.5rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
          <span>Diagnostic Progress</span>
          <strong style={{ color: "#fff" }}>{answeredCount} of {questions.length} answered ({progressPct}%)</strong>
        </div>
        <div className="progress-track" style={{ height: "8px" }}>
          <div className="progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {error && <div className="alert-box alert-danger">{error}</div>}

      <form onSubmit={submit}>
        {questions.map((q, idx) => (
          <div key={q.id} className="question-card">
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem" }}>
              <span className="brand-badge" style={{ fontSize: "0.68rem" }}>
                Question {idx + 1}
              </span>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                {q.type === "mcq" ? "Multiple Choice" : "Open Response (AI Evaluated)"}
              </span>
            </div>

            <p className="question-text">{q.text}</p>

            {q.type === "mcq" ? (
              <div className="option-pill-group">
                {q.options.map((optText) => {
                  const isSelected = answers[q.id] === optText;
                  return (
                    <div
                      key={optText}
                      className={`option-pill ${isSelected ? "active" : ""}`}
                      onClick={() => handleAnswer(q.id, optText)}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        checked={isSelected}
                        onChange={() => handleAnswer(q.id, optText)}
                        style={{ margin: 0, cursor: "pointer", accentColor: "var(--primary)" }}
                      />
                      <span>{optText}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div>
                <textarea
                  className="form-textarea"
                  rows={4}
                  placeholder="Share realistic examples of how you use AI tools in your work, what data you share, and how you verify the output…"
                  value={answers[q.id] || ""}
                  onChange={(e) => handleAnswer(q.id, e.target.value)}
                />
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                  💡 Tip: Mention whether you verify outputs or share client/internal data. An AI evaluator will score the depth and safety of your practice.
                </div>
              </div>
            )}
          </div>
        ))}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1.5rem" }}>
          <button
            type="submit"
            className="btn-primary"
            disabled={submitting}
            style={{ padding: "0.75rem 2rem", fontSize: "1rem" }}
          >
            {submitting ? "Scoring with AI & Generating Report…" : "Submit Diagnostic & View Report →"}
          </button>
        </div>
      </form>
    </div>
  );
}
