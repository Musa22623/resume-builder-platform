import os
import json

from openai import OpenAI


def _get_openai_client() -> OpenAI:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY missing")
    return OpenAI(api_key=api_key)


def _build_change_summary(original: dict, optimized: dict) -> list[str]:
    changes: list[str] = []
    if original.get("headline") != optimized.get("headline"):
        changes.append("Headline refined for target role.")
    if original.get("summary") != optimized.get("summary"):
        changes.append("Summary refined for target role.")
    if original.get("skills") != optimized.get("skills"):
        changes.append("Skills wording updated.")
    if original.get("experience") != optimized.get("experience"):
        changes.append("Experience highlights refined.")
    return changes


def _merge_protected_resume_fields(original: dict, optimized: dict) -> dict:
    protected_top_level_keys = {"name", "contact_details", "companies", "dates", "education"}
    merged = dict(optimized)

    for key in protected_top_level_keys:
        if key in original:
            merged[key] = original[key]

    original_experience = original.get("experience") or []
    optimized_experience = optimized.get("experience") or []
    merged_experience = []
    for index, item in enumerate(optimized_experience):
        original_item = original_experience[index] if index < len(original_experience) else {}
        merged_experience.append(
            {
                "role": original_item.get("role", item.get("role", "")),
                "company": original_item.get("company", item.get("company", "")),
                "location": original_item.get("location", item.get("location", "")),
                "start_date": original_item.get("start_date", item.get("start_date", "")),
                "end_date": original_item.get("end_date", item.get("end_date", "")),
                "highlights": item.get("highlights", original_item.get("highlights", "")),
            }
        )

    if merged_experience:
        merged["experience"] = merged_experience
    elif "experience" in original:
        merged["experience"] = original["experience"]

    for key, value in original.items():
        merged.setdefault(key, value)

    return merged


def optimize_resume_content(resume_content: dict, job_text: str) -> dict:
    client = _get_openai_client()

    prompt = (
        "You are a safe resume optimizer. Rewrite only wording for headline, summary, skills, and experience highlights. "
        "Never alter names, contact details, companies, roles, locations, dates, school names, degrees, or any factual data. "
        "Never invent claims. Return valid JSON only, using the same schema as the input resume JSON."
    )
    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.2,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": prompt},
            {
                "role": "user",
                "content": (
                    "Optimize this resume for the target job.\n\n"
                    f"Resume JSON:\n{json.dumps(resume_content, ensure_ascii=False)}\n\n"
                    f"Target job:\n{job_text}"
                ),
            },
        ],
    )
    output = completion.choices[0].message.content or "{}"

    try:
        parsed_output = json.loads(output)
    except json.JSONDecodeError as exc:
        raise ValueError("OpenAI returned invalid JSON.") from exc

    if not isinstance(parsed_output, dict):
        raise ValueError("OpenAI returned an unexpected response format.")

    optimized_content = _merge_protected_resume_fields(resume_content, parsed_output)
    change_summary = _build_change_summary(resume_content, optimized_content)
    usage = getattr(completion, "usage", None)

    return {
        "optimized_content": optimized_content,
        "change_summary": change_summary,
        "model_name": "gpt-4o-mini",
        "usage": {
            "prompt_tokens": getattr(usage, "prompt_tokens", None),
            "completion_tokens": getattr(usage, "completion_tokens", None),
            "total_tokens": getattr(usage, "total_tokens", None),
        },
    }
