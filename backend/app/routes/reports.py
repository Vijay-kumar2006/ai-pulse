from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_db
from .. import models
from ..auth import current_membership
from ..utils import maturity_level

router = APIRouter(prefix="/reports", tags=["reports"])

NEXT_STEPS = {
    "support": ["Use AI to draft first replies, then edit", "Summarise long ticket threads before escalating", "Never paste customer details into public chatbots"],
    "engineering": ["Use a code assistant for tests and refactors", "Review every AI suggestion before merging", "Keep secrets and customer data out of prompts"],
    "sales": ["Draft outreach emails with AI and personalise them", "Summarise call notes into CRM updates", "Check AI-written claims before sending"],
    "manager": ["Agree an AI usage policy with your team", "Pick one workflow per quarter to improve with AI", "Track time saved, not tool licences"],
}


ROLE_SAFE_TEMPLATES = {
    "support": [
        {
            "id": "sup-summarizer",
            "title": "Sanitized Ticket Summarizer",
            "category": "Data Privacy",
            "description": "Condense lengthy customer ticket history without leaking PII or account credentials.",
            "prompt": "Summarize this support conversation into (1) root cause, (2) steps already attempted, and (3) current customer blocker. Strip all customer names, emails, phone numbers, and account IDs before analyzing:\n[Paste sanitized ticket text here]",
        },
        {
            "id": "sup-replies",
            "title": "Empathetic First Response Drafter",
            "category": "Customer Communication",
            "description": "Generate an empathetic resolution draft adhering to SLA tone.",
            "prompt": "Draft a polite, empathetic support reply addressing the issue of [describe issue generically]. Acknowledge inconvenience, outline our next troubleshooting step: [step], and ask for confirmation. Keep tone professional and friendly.",
        },
    ],
    "engineering": [
        {
            "id": "eng-tests",
            "title": "Unit Test & Boundary Case Generator",
            "category": "Code Quality",
            "description": "Produce test cases without sharing internal business logic or API keys.",
            "prompt": "Given the following pure function signature and specification, write comprehensive pytest unit tests covering happy paths, null values, empty collections, and extreme boundary cases:\n[Paste sanitized function signature]",
        },
        {
            "id": "eng-refactor",
            "title": "Code Refactoring & Complexity Reducer",
            "category": "Refactoring",
            "description": "Simplify nested logic and improve readability without modifying behavior.",
            "prompt": "Refactor this code block to improve readability, reduce cyclomatic complexity, and adhere to PEP 8 standards. Preserve exact function signatures and return types:\n[Paste code snippet]",
        },
    ],
    "sales": [
        {
            "id": "sales-outreach",
            "title": "Value-Add Follow-up Drafter",
            "category": "Outreach",
            "description": "Draft personalized outreach without exposing confidential prospect pricing.",
            "prompt": "Draft a concise 4-sentence follow-up email to a prospective enterprise buyer who expressed interest in [product area]. Highlight our key benefit [benefit] and suggest a 15-minute sync on [day]. Keep tone consultative and low-pressure.",
        },
        {
            "id": "sales-crm",
            "title": "Discovery Call Note Synthesizer",
            "category": "CRM Productivity",
            "description": "Structure raw meeting notes into MEDDPICC or CRM opportunity fields.",
            "prompt": "Convert the following bullet-point meeting notes into a structured summary with: (1) Business Pain, (2) Identified Champion, (3) Decision Timeline, and (4) Action Items with Owners. Exclude confidential pricing notes:\n[Paste notes]",
        },
    ],
    "manager": [
        {
            "id": "mgr-checklist",
            "title": "Team AI Acceptable Use Checklist",
            "category": "Governance",
            "description": "A quick 4-point review checklist for managers evaluating team AI workflows.",
            "prompt": "Review our team's proposed AI workflow for [workflow name] against 4 criteria: (1) Does it touch customer/financial PII? (2) Is there mandatory human verification before publishing? (3) Does it use company-approved tools? (4) Is value/time-saved tracked?",
        },
    ],
}


@router.get("/me")
def my_report(m: models.Membership = Depends(current_membership), db: Session = Depends(get_db)):
    rows = db.query(models.Response).filter_by(membership_id=m.id).all()
    scores = [r.score for r in rows if r.score is not None]
    avg = sum(scores) / len(scores) if scores else None
    flags = sorted({f for r in rows for f in (r.flags or [])})
    
    job_key = m.job_role.lower() if m.job_role else "manager"
    templates = ROLE_SAFE_TEMPLATES.get(job_key, ROLE_SAFE_TEMPLATES["manager"])
    steps = NEXT_STEPS.get(job_key, NEXT_STEPS["manager"])

    return {
        "name": m.user.name,
        "email": m.user.email,
        "organization": m.org.name,
        "job_role": m.job_role,
        "seniority": m.seniority,
        "answered": len(rows),
        "average_score": round(avg, 2) if avg is not None else None,
        "level": maturity_level(avg),
        "risks": flags,
        "next_steps": steps,
        "safe_templates": templates,
    }


@router.delete("/me")
def delete_my_report(m: models.Membership = Depends(current_membership), db: Session = Depends(get_db)):
    """Client Request #2: Right to delete.
    Permanently deletes all submitted diagnostic answers and report data for this user.
    """
    deleted_count = (
        db.query(models.Response)
        .filter_by(membership_id=m.id)
        .delete(synchronize_session="fetch")
    )
    db.commit()
    return {"status": "deleted", "deleted_count": deleted_count}

