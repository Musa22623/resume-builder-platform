from __future__ import annotations

from io import BytesIO

from docx import Document
from pypdf import PdfReader


def build_empty_resume_content() -> dict:
    return {
        "name": "",
        "headline": "",
        "summary": "",
        "skills": [],
        "contact_details": {
            "email": "",
            "phone": "",
            "location": "",
            "website": "",
            "linkedin": "",
        },
        "experience": [
            {
                "role": "",
                "company": "",
                "location": "",
                "start_date": "",
                "end_date": "",
                "highlights": "",
            }
        ],
        "education": [
            {
                "school": "",
                "degree": "",
                "field": "",
                "start_date": "",
                "end_date": "",
            }
        ],
        "companies": [],
        "dates": [],
    }


def extract_text_from_uploaded_file(upload) -> str:
    upload.file.open("rb")
    try:
        file_bytes = upload.file.read()
    finally:
        upload.file.close()

    if upload.mime_type == "text/plain":
        return file_bytes.decode("utf-8", errors="ignore")

    if upload.mime_type == "application/pdf":
        reader = PdfReader(BytesIO(file_bytes))
        pages = [page.extract_text() or "" for page in reader.pages]
        return "\n".join(page.strip() for page in pages if page.strip())

    if upload.mime_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        document = Document(BytesIO(file_bytes))
        return "\n".join(paragraph.text.strip() for paragraph in document.paragraphs if paragraph.text.strip())

    if upload.mime_type == "application/msword":
        raise ValueError("Legacy .doc parsing is not supported yet. Please upload PDF, DOCX, or TXT.")

    raise ValueError("Unsupported file format for parsing.")


def _unique_nonempty(values: list[str]) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for value in values:
        item = value.strip()
        if not item:
            continue
        lowered = item.lower()
        if lowered in seen:
            continue
        seen.add(lowered)
        result.append(item)
    return result


def parse_resume_text_to_content(raw_text: str) -> dict:
    content = build_empty_resume_content()
    lines = [line.strip() for line in raw_text.splitlines()]
    nonempty_lines = [line for line in lines if line]

    if nonempty_lines:
        content["name"] = nonempty_lines[0]
    if len(nonempty_lines) > 1:
        content["headline"] = nonempty_lines[1]

    for line in nonempty_lines[:12]:
        lowered = line.lower()
        if "@" in line and not content["contact_details"]["email"]:
            content["contact_details"]["email"] = line
        elif ("linkedin.com" in lowered or lowered.startswith("linkedin")) and not content["contact_details"]["linkedin"]:
            content["contact_details"]["linkedin"] = line
        elif ("http://" in lowered or "https://" in lowered or "www." in lowered) and not content["contact_details"]["website"]:
            content["contact_details"]["website"] = line
        elif any(char.isdigit() for char in line) and not content["contact_details"]["phone"] and ("+" in line or "(" in line or "-" in line):
            content["contact_details"]["phone"] = line

    section_keywords = {
        "summary": ("summary", "profile", "professional summary"),
        "skills": ("skills", "technical skills", "core skills"),
        "experience": ("experience", "work experience", "employment"),
        "education": ("education", "academic background"),
    }

    current_section = None
    section_lines: dict[str, list[str]] = {key: [] for key in section_keywords}

    for line in nonempty_lines:
        lowered = line.lower().rstrip(":")
        matched = False
        for section, keywords in section_keywords.items():
            if lowered in keywords:
                current_section = section
                matched = True
                break
        if matched:
            continue
        if current_section:
            section_lines[current_section].append(line)

    if section_lines["summary"]:
        content["summary"] = " ".join(section_lines["summary"][:5])

    skill_candidates: list[str] = []
    for line in section_lines["skills"]:
        cleaned_line = line.replace("|", ",").replace("*", ",").replace("•", ",")
        parts = [part.strip(" -\t") for part in cleaned_line.split(",")]
        skill_candidates.extend(parts)
    content["skills"] = _unique_nonempty(skill_candidates)

    if section_lines["experience"]:
        experience_text = "\n".join(section_lines["experience"])
        content["experience"] = [
            {
                "role": "",
                "company": "",
                "location": "",
                "start_date": "",
                "end_date": "",
                "highlights": experience_text,
            }
        ]

    if section_lines["education"]:
        education_text = " ".join(section_lines["education"][:4])
        content["education"] = [
            {
                "school": education_text,
                "degree": "",
                "field": "",
                "start_date": "",
                "end_date": "",
            }
        ]

    content["companies"] = _unique_nonempty(
        [line for line in nonempty_lines if any(token in line.lower() for token in ("inc", "llc", "corp", "company", "ltd"))]
    )
    content["dates"] = _unique_nonempty(
        [
            line
            for line in nonempty_lines
            if any(char.isdigit() for char in line)
            and any(
                month in line.lower()
                for month in ("jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec", "20")
            )
        ]
    )

    if not content["summary"]:
        summary_candidates = []
        for line in nonempty_lines[2:8]:
            lowered = line.lower()
            if any(section_name in lowered for section_name in ("experience", "education", "skills")):
                break
            summary_candidates.append(line)
        content["summary"] = " ".join(summary_candidates[:3])

    return content
