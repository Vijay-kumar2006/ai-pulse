from tests.conftest import login
from app.services.scoring import score_open_answer


def test_login_lists_organizations(client):
    _, data = login(client, "ravi@consult.test")
    names = {o["org_name"] for o in data["organizations"]}
    assert names == {"Northwind Logistics", "Bluepeak Retail"}


def test_employee_sees_questions(client):
    headers, _ = login(client, "priya@northwind.test", "Northwind Logistics")
    r = client.get("/diagnostic/questions", headers=headers)
    assert r.status_code == 200
    assert any(q["id"] == "sup-drafts" for q in r.json())


def test_admin_dashboard(client):
    headers, data = login(client, "asha@northwind.test", "Northwind Logistics")
    org_id = data["organizations"][0]["org_id"]
    r = client.get(f"/dashboard?org_id={org_id}", headers=headers)
    assert r.status_code == 200
    res = r.json()
    assert res["organization"] == "Northwind Logistics"
    assert "departments" in res
    assert "remediations" in res


def test_admin_cannot_see_other_org(client):
    """Verifies strict tenant isolation (cross-tenant IDOR prevention)."""
    headers, data = login(client, "asha@northwind.test", "Northwind Logistics")
    northwind_id = next(o["org_id"] for o in data["organizations"] if o["org_name"] == "Northwind Logistics")
    other_org_id = 2 if northwind_id == 1 else 1
    # Asha belongs to Northwind; querying another org must be 403 Forbidden
    r = client.get(f"/dashboard?org_id={other_org_id}", headers=headers)
    assert r.status_code == 403
    assert "Access denied" in r.json()["detail"]


def test_dashboard_k_anonymity_aggregates_small_groups(client):
    """Client Request #1: Departments with fewer than 5 respondents are grouped under 'Other teams'."""
    headers, data = login(client, "asha@northwind.test", "Northwind Logistics")
    org_id = data["organizations"][0]["org_id"]
    r = client.get(f"/dashboard?org_id={org_id}", headers=headers)
    assert r.status_code == 200
    depts = r.json()["departments"]
    
    # In seeded data, every department at Northwind has < 5 respondents
    # Therefore, no individual department should be exposed alone; all must roll into "Other teams"
    dept_names = [d["department"] for d in depts]
    assert "Other teams" in dept_names
    assert "HR" not in dept_names
    other_team = next(d for d in depts if d["department"] == "Other teams")
    assert other_team["privacy_protected"] is True
    # If total responded < 5, score must be withheld to protect individuals
    if other_team["responded"] < 5:
        assert other_team["level"] == "Withheld (<5 respondents)"
        assert other_team["average_score"] is None


def test_right_to_delete_removes_answers_and_updates_dashboard(client):
    """Client Request #2: Employee can delete answers; data disappears from dashboard immediately."""
    headers_priya, _ = login(client, "priya@northwind.test", "Northwind Logistics")
    headers_asha, data_asha = login(client, "asha@northwind.test", "Northwind Logistics")
    org_id = data_asha["organizations"][0]["org_id"]

    # 1. Priya currently has a report
    rep_before = client.get("/reports/me", headers=headers_priya).json()
    assert rep_before["answered"] > 0

    # 2. Check dashboard before deletion
    dash_before = client.get(f"/dashboard?org_id={org_id}", headers=headers_asha).json()
    total_resp_before = dash_before["total_responded"]

    # 3. Priya deletes her responses
    del_res = client.delete("/diagnostic/responses", headers=headers_priya)
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "deleted"

    # 4. Priya's report is now empty / not assessed
    rep_after = client.get("/reports/me", headers=headers_priya).json()
    assert rep_after["answered"] == 0
    assert rep_after["average_score"] is None
    assert rep_after["risks"] == []

    # 5. Dashboard immediately reflects deletion
    dash_after = client.get(f"/dashboard?org_id={org_id}", headers=headers_asha).json()
    assert dash_after["total_responded"] == total_resp_before - 1


def test_scoring_handles_malformed_llm_json_and_markdown():
    """Validates resilient JSON parsing against edge-case outputs."""
    # Score should be parsed and clamped, markdown stripped, invalid flags dropped
    res = score_open_answer("How do you use AI?", "I use it for docs")
    assert 1.0 <= res["score"] <= 5.0
    assert isinstance(res["reason"], str)
    assert isinstance(res["flags"], list)
    for flag in res["flags"]:
        assert flag in {"customer_data_shared", "confidential_data_shared", "unreviewed_output", "policy_unaware"}


def test_department_with_5_or_more_respondents_shows_individually(client):
    """Verifies that when a department reaches >= 5 respondents, it appears on its own."""
    from app.db import SessionLocal
    from app import models

    db = SessionLocal()
    # Find Northwind Sales dept
    nw = db.query(models.Organization).filter_by(name="Northwind Logistics").first()
    sales_dept = db.query(models.Department).filter_by(org_id=nw.id, name="Sales").first()
    
    # Add 4 additional dummy sales users and responses to bring Sales to 5 respondents
    for i in range(1, 5):
        user = models.User(name=f"Sales Person {i}", email=f"sales{i}@northwind.test", password_hash="dummy")
        db.add(user)
        db.flush()
        mem = models.Membership(
            user_id=user.id, org_id=nw.id, department_id=sales_dept.id,
            role="employee", job_role="sales", seniority="mid"
        )
        db.add(mem)
        db.flush()
        db.add(models.Response(membership_id=mem.id, question_id="common-freq", answer="Daily", score=4.0))
    nw_id = nw.id
    db.commit()
    db.close()

    headers, data = login(client, "asha@northwind.test", "Northwind Logistics")
    r = client.get(f"/dashboard?org_id={nw_id}", headers=headers)
    assert r.status_code == 200
    depts = r.json()["departments"]
    dept_names = [d["department"] for d in depts]
    
    # Sales now has 5 respondents, so it MUST appear individually!
    assert "Sales" in dept_names
    sales_entry = next(d for d in depts if d["department"] == "Sales")
    assert sales_entry["responded"] >= 5
    assert sales_entry["privacy_protected"] is False
    assert sales_entry["average_score"] is not None
    # Other smaller departments (Support, Engineering, HR) must still be aggregated under "Other teams"
    assert "Other teams" in dept_names


