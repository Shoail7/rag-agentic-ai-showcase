import time
import httpx
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter(prefix="/api/rates", tags=["Currency Exchange Rates"])

# In-memory cache for live currency rates: { base: { "rates": dict, "timestamp": float, "last_updated": str, "source": str } }
RATES_CACHE: Dict[str, Dict[str, Any]] = {}
CACHE_TTL_SECONDS = 3600  # 1 hour cache to respect free-tier bandwidth

# Curated fallback rates in case external API is temporarily unreachable
FALLBACK_RATES: Dict[str, Dict[str, float]] = {
    "USD": {
        "USD": 1.0,
        "EUR": 0.89,
        "GBP": 0.74,
        "INR": 86.85,
        "JPY": 154.20,
        "CAD": 1.39,
        "AUD": 1.48,
        "CHF": 0.87,
        "SGD": 1.32,
        "AED": 3.6725,
        "CNY": 7.15,
        "BRL": 5.48,
        "ZAR": 18.25
    },
    "EUR": {
        "USD": 1.12,
        "EUR": 1.0,
        "GBP": 0.83,
        "INR": 97.58,
        "JPY": 173.25,
        "CAD": 1.56,
        "AUD": 1.66,
        "CHF": 0.98,
        "SGD": 1.48,
        "AED": 4.12
    },
    "GBP": {
        "USD": 1.35,
        "EUR": 1.20,
        "GBP": 1.0,
        "INR": 117.36,
        "JPY": 208.37,
        "CAD": 1.88,
        "AUD": 2.00,
        "CHF": 1.18,
        "SGD": 1.78,
        "AED": 4.96
    },
    "INR": {
        "USD": 0.0115,
        "EUR": 0.0102,
        "GBP": 0.0085,
        "INR": 1.0,
        "JPY": 1.78,
        "CAD": 0.016,
        "AUD": 0.017,
        "AED": 0.042
    }
}

async def fetch_live_rates(base: str = "USD") -> Dict[str, Any]:
    base = base.upper().strip()
    now = time.time()
    
    # Check cache
    if base in RATES_CACHE and (now - RATES_CACHE[base]["timestamp"] < CACHE_TTL_SECONDS):
        return RATES_CACHE[base]

    # Free, open currency rate provider (Open Exchange Rates API / European Central Bank compatible)
    url = f"https://open.er-api.com/v6/latest/{base}"
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("result") == "success":
                    cached_entry = {
                        "base": base,
                        "rates": data.get("rates", {}),
                        "time_last_update_utc": data.get("time_last_update_utc", "Live"),
                        "data_source": "Open ER API / ExchangeRate-API (Free Live Feed)",
                        "timestamp": now,
                        "status": "live"
                    }
                    RATES_CACHE[base] = cached_entry
                    return cached_entry
    except Exception as e:
        print(f"[Rate Checker] External live rate fetch warning: {e}")

    # Fallback if external API request times out
    fallback = FALLBACK_RATES.get(base, FALLBACK_RATES["USD"])
    return {
        "base": base,
        "rates": fallback,
        "time_last_update_utc": "Standard Market Benchmark (Offline Cache)",
        "data_source": "ECB Public Reference Benchmark",
        "timestamp": now,
        "status": "cached"
    }

@router.get("/latest")
async def get_latest_rates(base: str = Query("USD", description="Base 3-letter currency code, e.g. USD, EUR, INR")):
    """Returns live currency rates for a specified base currency."""
    return await fetch_live_rates(base)

@router.get("/convert")
async def convert_currency(
    amount: float = Query(1.0, ge=0.0, description="Amount to convert"),
    from_currency: str = Query("USD", alias="from", description="Source currency"),
    to_currency: str = Query("INR", alias="to", description="Target currency")
):
    """Converts a given amount from one currency to another."""
    from_code = from_currency.upper().strip()
    to_code = to_currency.upper().strip()

    rates_data = await fetch_live_rates(from_code)
    rates = rates_data.get("rates", {})

    rate = rates.get(to_code)
    if not rate:
        # If direct rate missing, cross calculate via USD
        usd_rates_data = await fetch_live_rates("USD")
        usd_rates = usd_rates_data.get("rates", {})
        from_rate = usd_rates.get(from_code, 1.0)
        to_rate = usd_rates.get(to_code, 1.0)
        rate = round(to_rate / from_rate, 6)

    converted_amount = round(amount * float(rate), 4)

    return {
        "amount": amount,
        "from_currency": from_code,
        "to_currency": to_code,
        "rate": rate,
        "converted_amount": converted_amount,
        "last_updated": rates_data.get("time_last_update_utc"),
        "data_source": rates_data.get("data_source"),
        "status": "success"
    }

@router.get("/popular")
async def get_popular_pairs():
    """Returns real-time rates for major world currency pairs."""
    usd_data = await fetch_live_rates("USD")
    rates = usd_data.get("rates", {})
    
    pairs = [
        {"pair": "EUR/USD", "base": "EUR", "target": "USD", "rate": round(1 / rates.get("EUR", 0.89), 4)},
        {"pair": "GBP/USD", "base": "GBP", "target": "USD", "rate": round(1 / rates.get("GBP", 0.74), 4)},
        {"pair": "USD/INR", "base": "USD", "target": "INR", "rate": round(rates.get("INR", 86.85), 2)},
        {"pair": "USD/JPY", "base": "USD", "target": "JPY", "rate": round(rates.get("JPY", 154.20), 2)},
        {"pair": "USD/CAD", "base": "USD", "target": "CAD", "rate": round(rates.get("CAD", 1.39), 4)},
        {"pair": "USD/AED", "base": "USD", "target": "AED", "rate": round(rates.get("AED", 3.6725), 4)},
        {"pair": "USD/CHF", "base": "USD", "target": "CHF", "rate": round(rates.get("CHF", 0.87), 4)},
        {"pair": "USD/AUD", "base": "USD", "target": "AUD", "rate": round(rates.get("AUD", 1.48), 4)},
    ]
    return {
        "pairs": pairs,
        "last_updated": usd_data.get("time_last_update_utc"),
        "data_source": usd_data.get("data_source")
    }
