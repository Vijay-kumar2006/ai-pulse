from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from .. import models
from ..auth import current_membership

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

MIN_ANONYMITY_THRESHOLD = 5

REMEDIATION_GUIDE = {
    "customer_data_shared": {
        "title": "Deploy PII Boundary & Masking Guardrails",
        "severity": "Critical",
        "recommended_action": "Implement automated PII scrubbing for all web AI tools and mandate a 15-minute customer privacy training for client-facing teams.",
        "target_roles": ["Support", "Sales"],
    },
    "confidential_data_shared": {
        "title": "Establish Source Code & IP Sanitization Protocols",
        "severity": "High",
        "recommended_action": "Route team LLM traffic through enterprise-licensed endpoints with zero-data-retention guarantees; prohibit raw internal IP copy-pasting.",
        "target_roles": ["Engineering", "HR", "Legal"],
    },
    "unreviewed_output": {
        "title": "Mandate Human-in-the-Loop Review Verification",
        "severity": "Medium",
        "recommended_action": "Require a signed checklist verification before merging AI-assisted code or delivering AI-drafted client communications.",
        "target_roles": ["Engineering", "Support", "Marketing"],
    },
    "policy_unaware": {
        "title": "Publish & Track Corporate AI Acceptable Use Policy",
        "severity": "Medium",
        "recommended_action": "Publish the company AI policy in the internal knowledge base with mandatory annual read-and-acknowledge signoff.",
        "target_roles": ["All Departments"],
    },
}


def level_for(avg):
    if avg is None:
        return "Not assessed"
    if avg < 1.5:
        return "Beginner"
    if avg < 2.5:
        return "Exploring"
    if avg < 3.5:
        return "Practitioner"
    return "Leader"


@router.get("")
def org_dashboard(org_id: int, m: models.Membership = Depends(current_membership), db: Session = Depends(get_db)):
    if m.role != "admin":
        raise HTTPException(403, "Admins only")

    # Strict multi-tenant authorization check
    if m.org_id != org_id:
        raise HTTPException(403, "Access denied: cannot view another organization's dashboard")

    org = db.get(models.Organization, org_id)
    if not org:
        raise HTTPException(404, "Organization not found")

    members = db.query(models.Membership).filter_by(org_id=org_id).all()
    departments = []
    all_flags = {}
    all_org_scores = []

    # Small groups aggregation bucket (Client Request #1: k-anonymity threshold < 5)
    other_employees = 0
    other_responded = 0
    other_scores = []
    small_groups_count = 0

    for dept in org.departments:
        dept_members = [x for x in members if x.department_id == dept.id]
        dept_scores = []
        responded = 0

        for dm in dept_members:
            rows = db.query(models.Response).filter_by(membership_id=dm.id).all()
            if rows:
                responded += 1
            for r in rows:
                if r.score is not None:
                    dept_scores.append(r.score)
                    all_org_scores.append(r.score)
                for f in r.flags or []:
                    all_flags[f] = all_flags.get(f, 0) + 1

        # Calculate average per answered question score
        avg = sum(dept_scores) / len(dept_scores) if dept_scores else None

        if responded >= MIN_ANONYMITY_THRESHOLD:
            # Department meets anonymity threshold: display individually
            departments.append({
                "department": dept.name,
                "employees": len(dept_members),
                "responded": responded,
                "average_score": round(avg, 2) if avg is not None else None,
                "level": level_for(avg),
                "privacy_protected": False,
            })
        else:
            # Department has fewer than 5 respondents: group under "Other teams"
            other_employees += len(dept_members)
            other_responded += responded
            other_scores.extend(dept_scores)
            small_groups_count += 1

    # Include aggregated "Other teams" if any small group exists
    if small_groups_count > 0:
        # If even combined other teams have < 5 respondents, suppress score to ensure individuals cannot be fingerprinted
        other_avg = (
            sum(other_scores) / len(other_scores)
            if (other_scores and other_responded >= MIN_ANONYMITY_THRESHOLD)
            else None
        )
        departments.append({
            "department": "Other teams",
            "employees": other_employees,
            "responded": other_responded,
            "average_score": round(other_avg, 2) if other_avg is not None else None,
            "level": level_for(other_avg) if other_responded >= MIN_ANONYMITY_THRESHOLD else "Withheld (<5 respondents)",
            "privacy_protected": True,
            "note": f"Aggregated {small_groups_count} department(s) with under {MIN_ANONYMITY_THRESHOLD} respondents to protect privacy.",
        })

    # Overall organization metrics
    total_employees = len(members)
    total_responded = sum(
        1 for dm in members if db.query(models.Response).filter_by(membership_id=dm.id).first()
    )
    overall_avg = sum(all_org_scores) / len(all_org_scores) if all_org_scores else None

    # Ranked top risks with remediation advice
    ranked_risks = sorted(all_flags.items(), key=lambda kv: -kv[1])
    remediations = []
    for flag, count in ranked_risks[:5]:
        guide = REMEDIATION_GUIDE.get(flag, {
            "title": f"Review {flag.replace('_', ' ').title()}",
            "severity": "Medium",
            "recommended_action": "Conduct targeted review and provide guidance to affected team members.",
            "target_roles": ["All Teams"],
        })
        remediations.append({
            "risk": flag,
            "count": count,
            **guide,
        })

    return {
        "organization": org.name,
        "org_id": org.id,
        "total_employees": total_employees,
        "total_responded": total_responded,
        "overall_average_score": round(overall_avg, 2) if overall_avg is not None else None,
        "overall_level": level_for(overall_avg),
        "departments": departments,
        "top_risks": ranked_risks[:5],
        "remediations": remediations,
        "anonymity_threshold": MIN_ANONYMITY_THRESHOLD,
    }

