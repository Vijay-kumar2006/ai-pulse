# Client request (received after the previous developer left)

> **From:** HR team, Northwind Logistics
> **Subject:** AI Pulse pilot: two changes before rollout
>
> Hi team, our legal and HR teams reviewed the AI Pulse pilot and need two changes before we can roll it out:
>
> 1. **No small groups on the dashboard.** If a department has fewer than 5 people who completed the diagnostic, leadership must not see that department's scores or risks on their own. Group them under "Other teams" or hide them, but individuals must never be identifiable.
> 2. **Right to delete.** Any employee must be able to delete all their answers and their report themselves, and it must disappear from every dashboard immediately.
>
> Thanks, Northwind HR

---

## Status: COMPLETED & VERIFIED

### 1. No Small Groups on the Dashboard (k < 5 k-Anonymity) — COMPLETED
- **Implementation:** In `backend/app/routes/dashboard.py`, each department's completed respondent count (`responded`) is checked against `MIN_ANONYMITY_THRESHOLD = 5`.
- **Aggregation:** Departments with `responded < 5` are suppressed from individual display. Their headcount, respondent counts, and scores are aggregated under `"Other teams"`.
- **Mathematical Deanonymization Protection:** If the combined respondent count across all small teams is still $< 5$, average scores are strictly withheld (`level: "Withheld (<5 respondents)"`, `average_score: null`) to prevent deducing individual scores algebraically. Small group risks are suppressed from department-level attribution.
- **Frontend Presentation:** Rendered in `frontend/src/pages/Dashboard.jsx` with a distinctive `k < 5 Aggregated` badge, privacy notice banner, and clear notes.
- **Automated Tests:** Verified in `tests/test_api.py::test_dashboard_k_anonymity_aggregates_small_groups` and `tests/test_api.py::test_department_with_5_or_more_respondents_shows_individually`.

### 2. Right to Delete (GDPR / Privacy Compliance) — COMPLETED
- **Implementation:** Added authenticated endpoint `DELETE /diagnostic/responses` (and `DELETE /reports/me`).
- **Immediate Cascade:** Permanently deletes all `Response` records for the user's membership.
- **Dynamic Recalculation:** Because dashboard scores are dynamically computed from active responses, the employee's data disappears from every dashboard immediately upon next fetch or refresh. If the deletion causes a department to drop below 5 respondents, that department automatically rolls into `"Other teams"`.
- **Frontend Self-Service:** In `frontend/src/pages/Report.jsx`, employees have a dedicated "Privacy & Right to Delete" card with a confirmation modal to immediately wipe their answers and report.
- **Automated Tests:** Verified in `tests/test_api.py::test_right_to_delete_removes_answers_and_updates_dashboard`.
