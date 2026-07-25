from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from .schemas import StockQuote, StockHistoryResponse, StockInfo, CSVImportRequest, CSVExportRequest, AnalysisResponse
from .services import get_stock_quote, get_stock_history, get_stock_info
from .analysis import parse_csv_data, export_to_csv, calculate_fundamental_analysis, calculate_technical_analysis, calculate_trend_analysis
import asyncio

app = FastAPI(
    title="Stock Analyzer API",
    description="API สำหรับดึงข้อมูลหุ้นดีเลย์ 5-15 นาที รองรับหุ้นไทย (SET), สหรัฐฯ (US), จีน (CN)",
    version="1.0.0"
)

# เปิด CORS เพื่อให้ Frontend (React) เชื่อมต่อได้
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ในโปรดักชันควรจำกัด origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "online", "message": "Stock Analyzer API is running"}

@app.get("/api/stock/quote", response_model=StockQuote)
def get_quote(symbol: str = Query(..., description="ชื่อย่อหุ้น เช่น AAPL, PTT.BK, 0700.HK")):
    quote = get_stock_quote(symbol)
    if not quote:
        raise HTTPException(status_code=404, detail=f"Stock symbol '{symbol}' not found or error fetching data")
    return quote

@app.get("/api/stock/info", response_model=StockInfo)
def get_info(symbol: str = Query(..., description="ชื่อย่อหุ้น เช่น AAPL, PTT.BK, 0700.HK")):
    info = get_stock_info(symbol)
    if not info:
        raise HTTPException(status_code=404, detail=f"Stock info for '{symbol}' not found")
    return info

@app.get("/api/stock/history", response_model=StockHistoryResponse)
def get_history(
    symbol: str = Query(..., description="ชื่อย่อหุ้น"),
    period: str = Query("1mo", description="ช่วงเวลา: 1d, 5d, 1mo, 3mo, 6mo, 1y, 5y, max"),
    interval: str = Query("15m", description="ระยะห่างของแท่งกราฟ: 1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo")
):
    # ป้องกันการดึง interval สั้นเกินไปกับ period ยาวมากๆ ซึ่ง Yahoo จะไม่อนุญาต
    history = get_stock_history(symbol, period, interval)
    if not history:
        raise HTTPException(status_code=404, detail=f"History for '{symbol}' not found with period={period} and interval={interval}")
    
    return StockHistoryResponse(
        symbol=symbol,
        interval=interval,
        history=history
    )

# CSV Import/Export Endpoints
@app.post("/api/csv/import")
def import_csv(request: CSVImportRequest):
    """Import CSV data และวิเคราะห์"""
    try:
        df = parse_csv_data(request.csv_data)
        
        # คำนวณ analysis
        fundamental = calculate_fundamental_analysis(df, request.symbol)
        technical = calculate_technical_analysis(df, request.symbol)
        trend = calculate_trend_analysis(df, request.symbol)
        
        # สร้าง recommendation
        recommendation = generate_recommendation(fundamental, technical, trend)
        
        return AnalysisResponse(
            symbol=request.symbol,
            fundamental=fundamental,
            technical=technical,
            trend=trend,
            recommendation=recommendation["action"],
            confidence=recommendation["confidence"]
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing CSV: {str(e)}")

@app.post("/api/csv/export")
def export_csv(request: CSVExportRequest):
    """Export ข้อมูลหุ้นเป็น CSV"""
    try:
        history = get_stock_history(request.symbol, request.period, request.interval)
        if not history:
            raise HTTPException(status_code=404, detail=f"History for '{request.symbol}' not found")
        
        # แปลงเป็น DataFrame
        import pandas as pd
        data = []
        for item in history:
            data.append({
                'Date': item.time,
                'Open': item.open,
                'High': item.high,
                'Low': item.low,
                'Close': item.close,
                'Volume': item.volume
            })
        
        df = pd.DataFrame(data)
        df['Date'] = pd.to_datetime(df['Date'])
        df.set_index('Date', inplace=True)
        
        csv_data = export_to_csv(df)
        
        return {
            "symbol": request.symbol,
            "csv_data": csv_data,
            "period": request.period,
            "interval": request.interval
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting CSV: {str(e)}")

# Analysis Endpoints
@app.get("/api/analysis/full", response_model=AnalysisResponse)
def get_full_analysis(
    symbol: str = Query(..., description="ชื่อย่อหุ้น"),
    period: str = Query("1mo", description="ช่วงเวลา"),
    interval: str = Query("1d", description="ระยะห่างของแท่งกราฟ")
):
    """วิเคราะห์หุ้นแบบเต็มรูปแบบ (Fundamental + Technical + Trend)"""
    try:
        # ดึงข้อมูล history
        history = get_stock_history(symbol, period, interval)
        if not history:
            raise HTTPException(status_code=404, detail=f"History for '{symbol}' not found")
        
        # แปลงเป็น DataFrame
        import pandas as pd
        data = []
        for item in history:
            data.append({
                'Date': item.time,
                'Open': item.open,
                'High': item.high,
                'Low': item.low,
                'Close': item.close,
                'Volume': item.volume
            })
        
        df = pd.DataFrame(data)
        df['Date'] = pd.to_datetime(df['Date'])
        df.set_index('Date', inplace=True)
        
        # ดึงข้อมูล info สำหรับ fundamental
        info = get_stock_info(symbol)
        info_dict = None
        if info:
            info_dict = {
                "trailingPE": info.pe_ratio,
                "pegRatio": None,  # ต้องดึงจาก yfinance โดยตรง
                "priceToBook": None,
                "returnOnEquity": None,
                "debtToEquity": None,
                "currentRatio": None,
                "quickRatio": None,
                "grossMargins": None,
                "operatingMargins": None,
                "profitMargins": None,
                "revenueGrowth": None,
                "earningsGrowth": None,
                "marketCap": info.market_cap,
                "totalRevenue": None
            }
        
        # คำนวณ analysis
        fundamental = calculate_fundamental_analysis(df, symbol, info_dict)
        technical = calculate_technical_analysis(df, symbol)
        trend = calculate_trend_analysis(df, symbol)
        
        # สร้าง recommendation
        recommendation = generate_recommendation(fundamental, technical, trend)
        
        return AnalysisResponse(
            symbol=symbol,
            fundamental=fundamental,
            technical=technical,
            trend=trend,
            recommendation=recommendation["action"],
            confidence=recommendation["confidence"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error performing analysis: {str(e)}")

def generate_recommendation(fundamental, technical, trend) -> dict:
    """สร้าง recommendation จากข้อมูลวิเคราะห์"""
    score = 0
    factors = 0
    
    # Technical Analysis Score
    if technical.rsi_signal == "buy":
        score += 1
        factors += 1
    elif technical.rsi_signal == "sell":
        score -= 1
        factors += 1
    
    if trend.trend_direction == "uptrend":
        score += 2
        factors += 1
    elif trend.trend_direction == "downtrend":
        score -= 2
        factors += 1
    
    if trend.trend_strength == "strong":
        score += 1
        factors += 1
    elif trend.trend_strength == "weak":
        score -= 0.5
        factors += 1
    
    # Fundamental Analysis Score (ถ้ามีข้อมูล)
    if fundamental.pe_ratio and fundamental.pe_ratio < 20:
        score += 1
        factors += 1
    elif fundamental.pe_ratio and fundamental.pe_ratio > 30:
        score -= 1
        factors += 1
    
    if fundamental.peg_ratio and fundamental.peg_ratio < 1:
        score += 1
        factors += 1
    elif fundamental.peg_ratio and fundamental.peg_ratio > 2:
        score -= 1
        factors += 1
    
    if fundamental.roe and fundamental.roe > 15:
        score += 1
        factors += 1
    elif fundamental.roe and fundamental.roe < 10:
        score -= 1
        factors += 1
    
    # สรุป recommendation
    if factors == 0:
        return {"action": "hold", "confidence": 0.5}
    
    avg_score = score / factors
    
    if avg_score >= 0.5:
        action = "buy"
    elif avg_score <= -0.5:
        action = "sell"
    else:
        action = "hold"
    
    confidence = min(abs(avg_score) + 0.5, 1.0)
    
    return {"action": action, "confidence": confidence}

# Batch Analysis Endpoint
@app.post("/api/analysis/batch")
async def batch_analysis(symbols: List[str], period: str = "1mo", interval: str = "1d"):
    """วิเคราะห์หุ้นหลายตัวพร้อมกัน"""
    results = []
    
    for symbol in symbols:
        try:
            # ดึงข้อมูล history
            history = get_stock_history(symbol, period, interval)
            if not history:
                results.append({
                    "symbol": symbol,
                    "error": f"History for '{symbol}' not found"
                })
                continue
            
            # แปลงเป็น DataFrame
            import pandas as pd
            data = []
            for item in history:
                data.append({
                    'Date': item.time,
                    'Open': item.open,
                    'High': item.high,
                    'Low': item.low,
                    'Close': item.close,
                    'Volume': item.volume
                })
            
            df = pd.DataFrame(data)
            df['Date'] = pd.to_datetime(df['Date'])
            df.set_index('Date', inplace=True)
            
            # ดึงข้อมูล info สำหรับ fundamental
            info = get_stock_info(symbol)
            info_dict = None
            if info:
                info_dict = {
                    "trailingPE": info.pe_ratio,
                    "pegRatio": None,
                    "priceToBook": None,
                    "returnOnEquity": None,
                    "debtToEquity": None,
                    "currentRatio": None,
                    "quickRatio": None,
                    "grossMargins": None,
                    "operatingMargins": None,
                    "profitMargins": None,
                    "revenueGrowth": None,
                    "earningsGrowth": None,
                    "marketCap": info.market_cap,
                    "totalRevenue": None
                }
            
            # คำนวณ analysis
            fundamental = calculate_fundamental_analysis(df, symbol, info_dict)
            technical = calculate_technical_analysis(df, symbol)
            trend = calculate_trend_analysis(df, symbol)
            
            # สร้าง recommendation
            recommendation = generate_recommendation(fundamental, technical, trend)
            
            results.append({
                "symbol": symbol,
                "fundamental": fundamental,
                "technical": technical,
                "trend": trend,
                "recommendation": recommendation["action"],
                "confidence": recommendation["confidence"]
            })
            
            # Rate limiting ระหว่าง symbols
            await asyncio.sleep(2)
            
        except Exception as e:
            results.append({
                "symbol": symbol,
                "error": str(e)
            })
    
    return {"results": results}
