import json
from typing import Dict, Any, Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException
from backend.app.core.database import get_db
from backend.app.services.agent_service import (
    agent_service,
    SafeCalculator,
    DateCalculator,
    MockTravelSearch,
    TextAnalysisTool,
    SimpleDataAnalysisTool,
    OpenMeteoWeatherTool
)

router = APIRouter(prefix="/api/agent", tags=["AI Agent Studio"])

class AgentRunRequest(BaseModel):
    goal: str

class CalculatorRequest(BaseModel):
    expression: str

class DateCalcRequest(BaseModel):
    action: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    days: Optional[int] = 0

class TravelSearchRequest(BaseModel):
    destination: str
    duration_days: int = 2
    budget_tier: str = "budget"

class DataAnalysisRequest(BaseModel):
    csv_content: str
    column_name: Optional[str] = None

class WeatherRequest(BaseModel):
    location: str

class TextAnalysisRequest(BaseModel):
    text: str

@router.get("/tools")
def list_agent_tools():
    return [
        {
            "id": "calculator",
            "name": "Arithmetic Calculator",
            "description": "Safe math evaluator for sums, products, division, percentages, and formulas.",
            "capabilities": ["Addition (+)", "Subtraction (-)", "Multiplication (*)", "Division (/)", "Percentages (%)"]
        },
        {
            "id": "date_calculator",
            "name": "Date & Deadline Calculator",
            "description": "Calculates date intervals, working days, calendar offsets, and deadline countdowns.",
            "capabilities": ["Days between dates", "Offset future/past dates", "Deadline countdown", "Working days"]
        },
        {
            "id": "mock_travel_search",
            "name": "Simulated Travel Search",
            "description": "Local mock travel estimator returning transport costs, hotel rates, and daily food budgets (fictional data for education).",
            "capabilities": ["Simulated transport pricing", "Hotel accommodation options", "Daily meal estimates", "Budget tier matching"]
        },
        {
            "id": "text_analysis",
            "name": "Text & Key Phrase Extractor",
            "description": "Analyzes text length, word statistics, and extracts salient key terms and bulleted highlights.",
            "capabilities": ["Word count", "Key phrase extraction", "Sentence structure analysis", "Extractive summary"]
        },
        {
            "id": "simple_data_analysis",
            "name": "CSV Dataset Analyzer",
            "description": "Performs fast aggregations, min/max ranges, averages, and column stats on tabular CSV records.",
            "capabilities": ["Column totals", "Averages", "Min / Max bounds", "Row count and schema detection"]
        },
        {
            "id": "open_meteo_weather",
            "name": "Open-Meteo Weather Tool",
            "description": "Fetches real-time temperature, humidity, wind speed, precipitation, and sky conditions using the free Open-Meteo API (no API key required).",
            "capabilities": ["Live global forecast", "Temperature & Feels Like", "Humidity & Wind speed", "WMO Weather classification"]
        }
    ]

@router.post("/run")
async def run_agent(req: AgentRunRequest):
    if not req.goal.strip():
        raise HTTPException(status_code=400, detail="Goal cannot be empty.")
    try:
        res = await agent_service.run_agent(req.goal)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent execution error: {str(e)}")

@router.get("/run/{run_id}")
def get_agent_run(run_id: str):
    with get_db() as db:
        run = db.execute("SELECT * FROM agent_runs WHERE id = ?", (run_id,)).fetchone()
        if not run:
            raise HTTPException(status_code=404, detail="Agent run not found")
        
        steps = db.execute("SELECT * FROM agent_steps WHERE agent_run_id = ? ORDER BY step_number ASC", (run_id,)).fetchall()
        parsed_steps = []
        for s in steps:
            s_dict = dict(s)
            try:
                s_dict["tool_input"] = json.loads(s_dict["tool_input"]) if s_dict["tool_input"] else {}
            except Exception:
                pass
            try:
                s_dict["tool_output"] = json.loads(s_dict["tool_output"]) if s_dict["tool_output"] else {}
            except Exception:
                pass
            parsed_steps.append(s_dict)

        return {
            **dict(run),
            "steps": parsed_steps
        }

@router.post("/run/{run_id}/stop")
def stop_agent_run(run_id: str):
    agent_service.stop_run(run_id)
    with get_db() as db:
        db.execute("UPDATE agent_runs SET status = 'stopped' WHERE id = ?", (run_id,))
        db.commit()
    return {"status": "stopped", "run_id": run_id}

# Interactive individual tool endpoints for live classroom experimentation
@router.post("/tools/calculate")
def direct_calculate(req: CalculatorRequest):
    return SafeCalculator.evaluate(req.expression)

@router.post("/tools/date")
def direct_date_calc(req: DateCalcRequest):
    return DateCalculator.calculate(
        action=req.action,
        start_date=req.start_date,
        end_date=req.end_date,
        days=req.days
    )

@router.post("/tools/travel")
def direct_travel_search(req: TravelSearchRequest):
    return MockTravelSearch.search(
        destination=req.destination,
        duration_days=req.duration_days,
        budget_tier=req.budget_tier
    )

@router.post("/tools/data-analysis")
def direct_data_analysis(req: DataAnalysisRequest):
    return SimpleDataAnalysisTool.analyze_csv(req.csv_content, req.column_name)

@router.post("/tools/weather")
async def direct_weather(req: WeatherRequest):
    return await OpenMeteoWeatherTool.get_weather(req.location)

@router.post("/tools/text-analysis")
def direct_text_analysis(req: TextAnalysisRequest):
    return TextAnalysisTool.analyze(req.text)


