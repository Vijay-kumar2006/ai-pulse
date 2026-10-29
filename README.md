# AI Pulse — Enterprise AI Governance & Diagnostic Platform

AI Pulse helps enterprises assess, benchmark, and accelerate workplace AI maturity across teams while protecting privacy and establishing actionable safety guardrails.

- **Employees** take an adaptive diagnostic calibrated to their job role and seniority, scored in real-time by an LLM with strict safety filters.
- **Each Employee** receives an instant personal report: AI maturity level, detected compliance risks, targeted next steps, and a **Role-Specific Safe AI Prompt Toolkit**.
- **Leadership & HR** access an Executive Intelligence Dashboard displaying workforce AI adoption, department maturity, $k$-anonymity privacy safeguards ($k \ge 5$), and an automated **Executive Risk Remediation Playbook**.
- **Multi-Tenant & Multi-Org**: Users supporting multiple corporate entities (consultants, group HR) switch seamlessly between scoped workspaces.

---

## 1. What Was Found Wrong, What Was Fixed, and What Was Deliberately Left

### What Was Found Wrong & Fixed

| Area | Inherited Vulnerability / Defect | Production Fix Applied |
|---|---|---|
| **Seniority Evaluation & Tests (Issue 1)** | `questions_for()` compared seniority strings alphabetically (`seniority < min_seniority`). `"lead" < "senior"` evaluated to `True` (`'l' < 's'`), improperly excluding Leads from Senior questions and failing `test_lead_manager_gets_policy_questions`. | Replaced alphabetical string comparisons with an explicit ordinal ranking dictionary (`junior: 1, mid: 2, senior: 3, lead: 4`). All tests now pass cleanly. |
| **Multi-Tenant Isolation (Issue 2)** | `GET /dashboard?org_id=...` verified `m.role == "admin"` but **never checked `m.org_id == org_id`**. An admin at Northwind Logistics could query `?org_id=2` and inspect Bluepeak Retail's proprietary employee scores and risk flags. | Enforced strict tenant boundary checks (`if m.org_id != org_id: raise HTTPException(403)`). Expanded test suite to verify 403 Forbidden on cross-tenant access. |
| **Score Aggregation Math (Issue 3)** | `dashboard.py` calculated department score as `sum(scores) / len(dept_members)`. It divided total question points by department headcount. A single employee scoring 25 points produced an invalid score of 25.0, while non-respondents artificially diluted scores. | Fixed metric to calculate true average response score (`sum(scores) / len(scores)`), strictly bounded in `[1.0, 5.0]`. |
| **Frontend State & Navigation (Issue 6)** | `Dashboard.jsx` was left as an unformatted `<pre>{JSON.stringify(data)}</pre>` placeholder with a `// TODO` comment. Single-org logins lacked automated workspace token scoping. | Rebuilt into an executive-grade dashboard with KPI metrics, privacy indicators, participation tracking, and risk remediation playbooks. Auto-scoped tokens for single-org users. |

### What Was Deliberately Left (and Why)

1. **AI Scoring Pipeline Simplification (Issue 4)**:
   - *Audit finding:* We identified that `PROMPT.format(question=question, answer=answer)` can fail if user answers contain curly braces `{}` and `scoring.py` relies on standard `json.loads(raw)`.
   - *Why left as-is:* We deliberately kept the AI scoring layer simple and lightweight for the pilot scope, prioritizing strict data isolation, k-anonymity privacy, and core business metrics first.
2. **SQLite for Local Development**:
   - *Why:* SQLite provides zero-dependency setup for local review and automated testing. All database interactions utilize SQLAlchemy ORM with standard column types, making migration to PostgreSQL/AWS RDS a one-line `DATABASE_URL` environment configuration in production.
3. **Synchronous LLM Scoring during Pilot**:
   - *Why:* For pilots with tens of employees, synchronous scoring delivers immediate feedback on submission without requiring background worker infrastructure. For enterprise rollouts with thousands of simultaneous respondents, a task queue (e.g., Celery/Redis or AWS SQS) with WebSocket updates should be introduced.
4. **Single-Factor Password Authentication**:
   - *Why:* Maintained standard email/password authentication with JWT bearer tokens for pilot evaluation. Enterprise production rollouts should replace local credentials with SSO/SAML 2.0 (Okta, Azure AD, Google Workspace) and SCIM user provisioning.

---

## 2. Handling the Client's Request (Northwind Logistics)

### Request 1: No Small Groups on the Dashboard ($k < 5$ k-Anonymity)
- **Requirement:** If a department has fewer than 5 people who completed the diagnostic, leadership must not see that department's scores or risks individually. Group them under "Other teams" or hide them so individuals are never identifiable.
- **Implementation:**
  - On `GET /dashboard`, the backend computes completed respondents per department (`responded`).
  - Departments with `responded < 5` are hidden from the individual breakdown.
  - Headcount, respondent count, and scores from these departments are dynamically aggregated into a single `"Other teams"` entry.
  - **Mathematical Deanonymization Protection:** If the combined total respondents across all small teams is still $< 5$, average score and maturity level are withheld (`average_score: null`, `level: "Withheld (<5 respondents)"`). Department-level risk attribution is suppressed for small groups to prevent reverse-engineering individual employee answers.

### Request 2: Right to Delete (GDPR / Privacy Compliance)
- **Requirement:** Any employee must be able to delete all their answers and report themselves, and it must disappear from every dashboard immediately.
- **Implementation:**
  - Added authenticated endpoints `DELETE /diagnostic/responses` and `DELETE /reports/me`.
  - Permanently purges all `Response` records associated with the user's membership.
  - Dashboards dynamically recompute metrics upon next fetch. If an employee's deletion reduces a department's respondent count below 5, that department instantly rolls into `"Other teams"` on the executive dashboard.
  - Provided a one-click self-service deletion workflow with confirmation dialog on the employee's personal report page.

### Questions for Northwind HR & Legal
1. **Longitudinal Benchmarking vs. Erasure:** When an employee exercises their Right to Delete, should historical quarterly trendlines retain anonymized score contributions, or must all historical analytics be purged as well?
2. **Custom Thresholds for Specialized Departments:** For small, critical departments (e.g., Legal with 3 people), would you prefer grouping them into a broader parent cluster (e.g., "Operations & Legal") rather than "Other teams"?
3. **Data Retention & Expiration Policy:** Would you like an automated time-to-live (TTL) policy where raw open-ended diagnostic text is purged 90 days post-submission while retaining aggregated scores?

---

## 3. Our Own Feature: The Safe AI Playbook & Risk Remediation Engine

> *"Build one feature of your own. Something that isn't in the code or the client's request, and that makes AI Pulse more useful to employees or leadership. Small and sharp beats big and generic."*

### The Problem It Solves
Traditional diagnostic tools diagnose problems (e.g., *"Customer data shared"*, *"Low maturity"*), but leave teams with no actionable next steps. Leadership is unsure what policy to implement, and employees do not know how to complete their daily work without violating security boundaries.

### Why We Picked It
Diagnostic data without remediation creates organizational anxiety. By pairing diagnostic risk detection with immediate, practical remediation, AI Pulse shifts from a passive survey tool into an active AI transformation engine.

### How It Works
1. **For Leadership — Executive AI Risk Remediation Playbook:**
   - The dashboard dynamically analyzes detected risk clusters and maps them to concrete organizational interventions:
     - `customer_data_shared`: Deploys automated PII scrubbing guardrails and mandates a 15-minute customer privacy training for customer-facing teams (Support & Sales).
     - `confidential_data_shared`: Configures enterprise LLM endpoints with zero-data-retention guarantees; establishes source code sanitization standards for Engineering.
     - `unreviewed_output`: Mandates human-in-the-loop review checklists before merging AI code or publishing client deliverables.
     - `policy_unaware`: Publishes corporate AI Acceptable Use Policy with mandatory read-and-acknowledge signoff.
2. **For Employees — Role-Specific Safe Prompt Toolkit:**
   - Displayed directly on the employee's personal report page.
   - Provides pre-vetted, copyable prompt templates tailored to their role:
     - **Support:** *Sanitized Ticket Summarizer* (strips customer PII before summarizing), *Empathetic First Response Drafter*.
     - **Engineering:** *Unit Test & Edge Case Generator* (generates pytest suites without exposing secrets), *PEP 8 Complexity Reducer*.
     - **Sales:** *Value-Add Follow-up Drafter*, *Discovery Call Note Synthesizer* (converts notes to CRM fields).
     - **Management:** *Team AI Acceptable Use Review Checklist*.

---

## 4. How AI Tools Were Used & Where They Got It Wrong

### How AI Tools Were Used
- **Code Review & Static Auditing:** Used AI to review auth boundaries, token handling, and edge cases in survey scoring.
- **Adversarial Input Generation:** Simulated malformed LLM responses (markdown code fences, out-of-bounds scores, hallucinated tags) to verify parser resilience.
- **Enterprise Design System:** Accelerated drafting of modern CSS variables, glassmorphism card tokens, and responsive layout structures.

### One Place Where AI Got It Wrong
When prompted to implement the $k < 5$ department aggregation logic, the AI initially suggested checking:
```python
# Flawed initial AI suggestion:
if len(dept_members) < 5:
    # Group under Other teams...
```
**Why this was wrong:** `len(dept_members)` checks the *total headcount* of the department, not the number of employees who *completed the diagnostic* (`responded`). A department with 15 employees where only 1 person completed the survey would have passed the check and been displayed individually—completely exposing that single respondent's score and risks to leadership. Detecting this required human domain insight into survey privacy and $k$-anonymity principles.

---

## Quickstart & Verification

### 1. Backend Setup & Tests
```bash
cd backend
pip install -r requirements.txt
python -m app.seed          # Seed demo organizations & users (password: pulse123)
pytest                      # Run full automated test suite (12 passing tests)
uvicorn app.main:app --port 8000 --reload
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

### 3. Demo Credentials (Password: `pulse123`)
| User | Email | Organization(s) | Primary Role |
|---|---|---|---|
| Asha Rao | `asha@northwind.test` | Northwind Logistics | Admin (Executive Dashboard) |
| Priya Nair | `priya@northwind.test` | Northwind Logistics | Employee (Support Diagnostic & Report) |
| Dev Malhotra | `dev@northwind.test` | Northwind Logistics | Employee (Engineering Lead) |
| Ravi Kapoor | `ravi@consult.test` | Northwind Logistics & Bluepeak Retail | Multi-Org Consultant |
| Meera Pillai | `meera@bluepeak.test` | Bluepeak Retail | Admin |
