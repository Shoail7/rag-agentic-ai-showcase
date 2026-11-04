import pytest
import os
from pathlib import Path
from backend.app.core.config import SAMPLE_DOCS_DIR
from backend.app.core.database import init_db
from backend.app.services.pdf_service import pdf_service
from backend.app.services.embedding_service import embedding_service

# Ground truth benchmarks extracted directly from controlled copies of the two handbooks
GROUND_TRUTH_EVAL_SET = [
    {
        "doc": "Nexora_Employee_Handbook_2024.pdf",
        "topic": "Annual Leave Entitlement",
        "expected_fact": "18 working days",
        "expected_page": [19, 21, 63]
    },
    {
        "doc": "Nexora_Employee_Handbook_2025.pdf",
        "topic": "Annual Leave Entitlement",
        "expected_fact": "20 working days",
        "expected_page": [19, 21, 63]
    },
    {
        "doc": "Nexora_Employee_Handbook_2024.pdf",
        "topic": "Carry-Forward Cap",
        "expected_fact": "5 days",
        "expected_page": [21, 63]
    },
    {
        "doc": "Nexora_Employee_Handbook_2025.pdf",
        "topic": "Carry-Forward Cap",
        "expected_fact": "7 days",
        "expected_page": [21, 63]
    },
    {
        "doc": "Nexora_Employee_Handbook_2024.pdf",
        "topic": "Overtime Treatment",
        "expected_fact": "1.0 times",
        "expected_page": [31, 63]
    },
    {
        "doc": "Nexora_Employee_Handbook_2025.pdf",
        "topic": "Overtime Treatment",
        "expected_fact": "1.5 times",
        "expected_page": [31, 63]
    },
    {
        "doc": "Nexora_Employee_Handbook_2024.pdf",
        "topic": "Group Medical Cover",
        "expected_fact": "3,00,000",
        "expected_page": [45, 63]
    },
    {
        "doc": "Nexora_Employee_Handbook_2025.pdf",
        "topic": "Group Medical Cover",
        "expected_fact": "5,00,000",
        "expected_page": [45, 63]
    },
    {
        "doc": "Nexora_Employee_Handbook_2024.pdf",
        "topic": "Partner Leave",
        "expected_fact": "5 working days",
        "expected_page": [25, 63]
    },
    {
        "doc": "Nexora_Employee_Handbook_2025.pdf",
        "topic": "Partner Leave",
        "expected_fact": "10 working days",
        "expected_page": [25, 63]
    },
    {
        "doc": "Nexora_Employee_Handbook_2024.pdf",
        "topic": "Hybrid Work",
        "expected_fact": "2 remote-working days",
        "expected_page": [17, 63]
    },
    {
        "doc": "Nexora_Employee_Handbook_2025.pdf",
        "topic": "Hybrid Work",
        "expected_fact": "3 remote-working days",
        "expected_page": [17, 63]
    }
]

@pytest.fixture(scope="session", autouse=True)
def setup_eval():
    init_db()

@pytest.mark.parametrize("item", GROUND_TRUTH_EVAL_SET)
def test_evaluation_fact_retrieval(item):
    pdf_path = SAMPLE_DOCS_DIR / item["doc"]
    assert pdf_path.exists(), f"Sample handbook {item['doc']} missing"
    
    with open(pdf_path, "rb") as f:
        data = f.read()

    doc_data = pdf_service.extract_document(data)
    pages = doc_data["pages"]

    # Check that the expected fact appears on the expected page
    matched_pages = []
    for p in pages:
        if item["expected_fact"] in p["text"]:
            matched_pages.append(p["page_number"])

    assert len(matched_pages) > 0, f"Expected fact '{item['expected_fact']}' not found in {item['doc']}"
    
    # Confirm that at least one of the expected ground truth pages contains the fact
    page_overlap = set(matched_pages).intersection(set(item["expected_page"]))
    assert len(page_overlap) > 0, (
        f"Fact '{item['expected_fact']}' found on pages {matched_pages}, "
        f"expected pages {item['expected_page']}"
    )

