import os

from openai import OpenAI


def optimize_resume_content(resume_content: dict, job_text: str) -> dict:
    protected_keys = {"name", "contact_details", "dates", "education", "companies"}
    for key in protected_keys:
        if key not in resume_content:
            continue

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY missing")

    client = OpenAI(api_key=api_key)
    prompt = (
        "You are a safe resume optimizer. Rewrite only wording for summary, work descriptions, and skills. "
        "Never alter names, dates, company names, school names, or any factual data. Never invent claims. "
        "Return JSON with same schema as input."
    )
    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.2,
        messages=[
            {"role": "system", "content": prompt},
            {
                "role": "user",
                "content": f"Resume JSON:\n{resume_content}\n\nTarget job:\n{job_text}",
            },
        ],
    )
    output = completion.choices[0].message.content
    return {"optimized_text": output}
