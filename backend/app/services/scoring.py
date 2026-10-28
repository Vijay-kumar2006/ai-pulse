import json
import re
from . import llm

ALLOWED_FLAGS = {
    "customer_data_shared",
    "confidential_data_shared",
    "unreviewed_output",
    "policy_unaware",
}

WORD_TO_NUM = {
    "one": 1.0,
    "two": 2.0,
    "three": 3.0,
    "four": 4.0,
    "five": 5.0,
}


def _clean_json_string(raw: str) -> str:
    """Extracts JSON object from text that may contain markdown or surrounding text."""
    if not raw or not isinstance(raw, str):
        return "{}"
    text = raw.strip()
    # Strip markdown code blocks ```json ... ``` or ``` ... ```
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text)
        text = text.strip()

    # If it still isn't pure JSON, find first { and last }
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        return text[start : end + 1]
    return text


def _parse_score(score_val) -> float:
    """Converts score value to float clamped between 1.0 and 5.0."""
    if score_val is None:
        return 3.0
    if isinstance(score_val, (int, float)):
        return max(1.0, min(5.0, float(score_val)))
    if isinstance(score_val, str):
        s = score_val.strip().lower()
        if s in WORD_TO_NUM:
            return WORD_TO_NUM[s]
        try:
            val = float(s)
            return max(1.0, min(5.0, val))
        except ValueError:
            pass
    return 3.0


def score_open_answer(question_text: str, answer: str) -> dict:
    """
    Parses and strictly validates LLM response for open answers.
    Ensures safe, bounded score, clean reason, and whitelisted flags.
    """
    raw = llm.score_answer(question_text, answer)
    cleaned = _clean_json_string(raw)
    
    data = {}
    try:
        data = json.loads(cleaned)
    except Exception:
        # Fallback if parsing completely fails
        data = {
            "score": 3,
            "reason": "AI response could not be fully parsed; assigned standard baseline.",
            "flags": [],
        }

    # Validate and clamp score
    score = _parse_score(data.get("score"))

    # Validate reason
    reason = data.get("reason")
    if not reason or not isinstance(reason, str) or not reason.strip():
        reason = "Assessed based on reported frequency, review habits, and data safety practices."
    else:
        reason = reason.strip()

    # Validate and whitelist risk flags
    raw_flags = data.get("flags") or []
    if not isinstance(raw_flags, list):
        raw_flags = [str(raw_flags)]
    
    validated_flags = []
    for f in raw_flags:
        if isinstance(f, str):
            flag_clean = f.strip().lower()
            if flag_clean in ALLOWED_FLAGS and flag_clean not in validated_flags:
                validated_flags.append(flag_clean)

    return {
        "score": round(score, 1),
        "reason": reason,
        "flags": validated_flags,
    }

