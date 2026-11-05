import pytest
import os
from pathlib import Path
from backend.app.core.config import settings, SAMPLE_DOCS_DIR
from backend.app.core.database import init_db, get_db
from backend.app.services.pdf_service import pdf_service
from backend.app.services.embedding_service import embedding_service
from backend.app.services.agent_service import (
    SafeCalculator,
    DateCalculator,
    MockTravelSearch,
    TextAnalysisTool,
    SimpleDataAnalysisTool
)
from backend.app.services.agentic_rag_service import agentic_rag_service

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    init_db()

def test_safe_calculator():
    # Basic math
    r1 = SafeCalculator.evaluate("15 + 25 * 2")
    assert r1["status"] == "success"
    assert r1["result"] == 65.0

    # Percentage
    r2 = SafeCalculator.evaluate("5000 * 18%")
    assert r2["status"] == "success"
    assert r2["result"] == 900.0

    # Division by zero safety
    r3 = SafeCalculator.evaluate("10 / 0")
    assert r3["status"] == "error"

def test_date_calculator():
    # Date diff
    r1 = DateCalculator.calculate(action="diff", start_date="2025-01-01", end_date="2025-01-15")
    assert r1["status"] == "success"
    assert r1["calendar_days"] == 14

    # Date offset
    r2 = DateCalculator.calculate(action="add", start_date="2025-01-01", days=10)
    assert r2["status"] == "success"
    assert r2["resulting_date"] == "2025-01-11"

def test_mock_travel_search():
    r = MockTravelSearch.search(destination="Goa", duration_days=2, budget_tier="budget")
    assert r["status"] == "success"
    assert "transport_selected" in r
    assert "hotel_selected" in r
    assert r["estimated_totals"]["subtotal"] < 10000

def test_text_analysis():
    text = "Nexora provides employee benefits including annual leave, medical insurance, and hybrid work."
    r = TextAnalysisTool.analyze(text)
    assert r["status"] == "success"
    assert r["word_count"] > 5
    assert len(r["key_phrases"]) > 0

def test_csv_analysis():
    csv_data = "Item,Cost\nLaptop,60000\nMouse,1500\nChair,8500"
    r = SimpleDataAnalysisTool.analyze_csv(csv_data)
    assert r["status"] == "success"
    assert r["row_count"] == 3
    assert r["statistics"]["total"] == 70000

def test_pdf_extraction_sample_docs():
    pdf_2024 = SAMPLE_DOCS_DIR / "Nexora_Employee_Handbook_2024.pdf"
    if pdf_2024.exists():
        with open(pdf_2024, "rb") as f:
            data = f.read()
        extracted = pdf_service.extract_document(data)
        assert extracted["page_count"] == 64
        assert extracted["char_count"] > 1000
        assert "Nexora" in extracted["preview_text"]

def test_token_chunking_constraints():
    sample_pages = [
        {"page_number": 1, "text": "Annual leave is intended for planned rest and personal time. " * 30}
    ]
    # Valid chunking
    chunks = embedding_service.chunk_document(sample_pages, chunk_size=128, chunk_overlap=20)
    assert len(chunks) > 0
    assert chunks[0]["token_count"] <= 128

    # Check validation when overlap >= chunk_size
    with pytest.raises(ValueError):
        embedding_service.chunk_document(sample_pages, chunk_size=100, chunk_overlap=100)

    # Check validation when chunk_size > max sequence length (512)
    with pytest.raises(ValueError):
        embedding_service.chunk_document(sample_pages, chunk_size=600, chunk_overlap=20)

def test_agentic_rag_decomposition():
    docs = [
        {"id": "doc_1", "filename": "Nexora_Employee_Handbook_2024.pdf", "hash": "h1"},
        {"id": "doc_2", "filename": "Nexora_Employee_Handbook_2025.pdf", "hash": "h2"}
    ]
    plan, sub_q = agentic_rag_service._decompose_question(
        "Compare annual leave and overtime between 2024 and 2025",
        docs
    )
    assert len(sub_q) >= 2
    assert any("2024" in sq["text"] for sq in sub_q)
    assert any("2025" in sq["text"] for sq in sub_q)

def test_currency_rates_service():
    import asyncio
    from backend.app.routers.rates_router import fetch_live_rates, convert_currency, get_popular_pairs
    
    # Test latest rates
    rates_data = asyncio.run(fetch_live_rates("USD"))
    assert rates_data["base"] == "USD"
    assert "EUR" in rates_data["rates"]
    assert "INR" in rates_data["rates"]

    # Test conversion
    conv = asyncio.run(convert_currency(amount=100.0, from_currency="USD", to_currency="INR"))
    assert conv["status"] == "success"
    assert conv["amount"] == 100.0
    assert conv["converted_amount"] > 1000  # 100 USD > 1000 INR
    assert conv["rate"] > 0

    # Test popular pairs
    popular = asyncio.run(get_popular_pairs())
    assert len(popular["pairs"]) >= 6


def test_open_meteo_weather_tool():
    import asyncio
    from backend.app.services.agent_service import OpenMeteoWeatherTool

    res = asyncio.run(OpenMeteoWeatherTool.get_weather("Tokyo"))
    assert res["status"] == "success"
    assert "Tokyo" in res["location"]
    assert "temperature" in res
    assert "condition" in res


