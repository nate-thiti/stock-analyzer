import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from .schemas import FundamentalAnalysis, TechnicalAnalysis, TrendAnalysis

def calculate_fundamental_analysis(df: pd.DataFrame, symbol: str, metrics: Dict = None) -> FundamentalAnalysis:
    """คำนวณ Fundamental indicators — metrics มาจาก backend คำนวณเองจากข้อมูลดิบ"""
    analysis_date = datetime.now().isoformat()
    m = metrics or {}

    pe_ratio = m.get("pe_ratio")
    forward_pe = m.get("forward_pe")
    peg_ratio = m.get("peg_ratio")
    ps_ratio = m.get("ps_ratio")
    pb_ratio = m.get("pb_ratio")
    roe = m.get("roe")
    debt_to_equity = m.get("debt_to_equity")
    current_ratio = m.get("current_ratio")
    quick_ratio = m.get("quick_ratio")
    gross_margin = m.get("gross_margin")
    operating_margin = m.get("operating_margin")
    net_margin = m.get("net_margin")
    revenue_growth = m.get("revenue_growth")
    earnings_growth = m.get("earnings_growth")

    valuation_grade = _grade_valuation(pe_ratio, peg_ratio, ps_ratio, pb_ratio)

    return FundamentalAnalysis(
        symbol=symbol,
        pe_ratio=pe_ratio,
        forward_pe=forward_pe,
        peg_ratio=peg_ratio,
        ps_ratio=ps_ratio,
        pb_ratio=pb_ratio,
        roe=roe,
        debt_to_equity=debt_to_equity,
        current_ratio=current_ratio,
        quick_ratio=quick_ratio,
        gross_margin=gross_margin,
        operating_margin=operating_margin,
        net_margin=net_margin,
        revenue_growth=revenue_growth,
        earnings_growth=earnings_growth,
        valuation_grade=valuation_grade,
        analysis_date=analysis_date
    )


def _grade_valuation(pe, peg, ps, pb) -> str:
    score = 0
    if pe is not None:
        if pe < 15: score += 2
        elif pe < 25: score += 1
        elif pe > 40: score -= 2
        elif pe > 30: score -= 1
    if peg is not None:
        if peg < 1: score += 2
        elif peg < 1.5: score += 1
        elif peg > 2: score -= 1
    if ps is not None:
        if ps < 2: score += 1
        elif ps > 10: score -= 1
    if pb is not None:
        if pb < 1.5: score += 1
        elif pb > 5: score -= 1
    if score >= 3: return "undervalued"
    if score >= 1: return "fair"
    if score <= -2: return "overvalued"
    return "neutral"

def calculate_technical_analysis(df: pd.DataFrame, symbol: str) -> TechnicalAnalysis:
    """คำนวณ Technical indicators โดยใช้ pandas-ta"""
    try:
        import pandas_ta as ta
    except ImportError:
        # ถ้าไม่มี pandas-ta ให้คำนวณแบบ manual
        return calculate_technical_manual(df, symbol)
    
    # คำนวณ Moving Averages
    ma_5 = ta.sma(df['Close'], length=5).tolist()
    ma_10 = ta.sma(df['Close'], length=10).tolist()
    ma_20 = ta.sma(df['Close'], length=20).tolist()
    ma_50 = ta.sma(df['Close'], length=50).tolist()
    ma_200 = ta.sma(df['Close'], length=200).tolist()
    
    # คำนวณ RSI
    rsi_values = ta.rsi(df['Close'], length=14).tolist()
    rsi_signal = None
    if rsi_values and not pd.isna(rsi_values[-1]):
        if rsi_values[-1] > 70:
            rsi_signal = "sell"
        elif rsi_values[-1] < 30:
            rsi_signal = "buy"
        else:
            rsi_signal = "neutral"
    
    # คำนวณ MACD
    macd_result = ta.macd(df['Close'])
    macd = macd_result['MACD_12_26_9'].tolist() if 'MACD_12_26_9' in macd_result.columns else []
    macd_signal = macd_result['MACDs_12_26_9'].tolist() if 'MACDs_12_26_9' in macd_result.columns else []
    macd_histogram = macd_result['MACDh_12_26_9'].tolist() if 'MACDh_12_26_9' in macd_result.columns else []
    
    # คำนวณ Bollinger Bands
    bb_result = ta.bbands(df['Close'], length=20)
    bollinger_upper = bb_result['BBU_20_2.0'].tolist() if 'BBU_20_2.0' in bb_result.columns else []
    bollinger_middle = bb_result['BBM_20_2.0'].tolist() if 'BBM_20_2.0' in bb_result.columns else []
    bollinger_lower = bb_result['BBL_20_2.0'].tolist() if 'BBL_20_2.0' in bb_result.columns else []
    
    # คำนวณ Support/Resistance levels
    support_levels, resistance_levels = calculate_support_resistance(df)
    
    # Timestamps
    timestamps = df.index.strftime('%Y-%m-%d %H:%M:%S').tolist()
    
    return TechnicalAnalysis(
        symbol=symbol,
        ma_5=ma_5,
        ma_10=ma_10,
        ma_20=ma_20,
        ma_50=ma_50,
        ma_200=ma_200,
        rsi=rsi_values,
        rsi_signal=rsi_signal,
        macd=macd,
        macd_signal=macd_signal,
        macd_histogram=macd_histogram,
        bollinger_upper=bollinger_upper,
        bollinger_middle=bollinger_middle,
        bollinger_lower=bollinger_lower,
        support_levels=support_levels,
        resistance_levels=resistance_levels,
        timestamps=timestamps
    )

def calculate_technical_manual(df: pd.DataFrame, symbol: str) -> TechnicalAnalysis:
    """คำนวณ Technical indicators แบบ manual (ถ้าไม่มี pandas-ta)"""
    # Moving Averages
    ma_5 = df['Close'].rolling(window=5).mean().tolist()
    ma_10 = df['Close'].rolling(window=10).mean().tolist()
    ma_20 = df['Close'].rolling(window=20).mean().tolist()
    ma_50 = df['Close'].rolling(window=50).mean().tolist()
    ma_200 = df['Close'].rolling(window=200).mean().tolist()
    
    # RSI
    rsi_values = calculate_rsi(df['Close'], 14).tolist()
    rsi_signal = None
    if rsi_values and not pd.isna(rsi_values[-1]):
        if rsi_values[-1] > 70:
            rsi_signal = "sell"
        elif rsi_values[-1] < 30:
            rsi_signal = "buy"
        else:
            rsi_signal = "neutral"
    
    # MACD
    macd, macd_signal, macd_histogram = calculate_macd(df['Close'])
    
    # Bollinger Bands
    bollinger_upper, bollinger_middle, bollinger_lower = calculate_bollinger_bands(df['Close'], 20)
    
    # Support/Resistance
    support_levels, resistance_levels = calculate_support_resistance(df)
    
    timestamps = df.index.strftime('%Y-%m-%d %H:%M:%S').tolist()
    
    return TechnicalAnalysis(
        symbol=symbol,
        ma_5=ma_5,
        ma_10=ma_10,
        ma_20=ma_20,
        ma_50=ma_50,
        ma_200=ma_200,
        rsi=rsi_values,
        rsi_signal=rsi_signal,
        macd=macd,
        macd_signal=macd_signal,
        macd_histogram=macd_histogram,
        bollinger_upper=bollinger_upper,
        bollinger_middle=bollinger_middle,
        bollinger_lower=bollinger_lower,
        support_levels=support_levels,
        resistance_levels=resistance_levels,
        timestamps=timestamps
    )

def calculate_rsi(prices: pd.Series, period: int = 14) -> pd.Series:
    """คำนวณ RSI"""
    delta = prices.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return rsi

def calculate_macd(prices: pd.Series) -> Tuple[List, List, List]:
    """คำนวณ MACD"""
    exp12 = prices.ewm(span=12, adjust=False).mean()
    exp26 = prices.ewm(span=26, adjust=False).mean()
    macd = exp12 - exp26
    signal = macd.ewm(span=9, adjust=False).mean()
    histogram = macd - signal
    return macd.tolist(), signal.tolist(), histogram.tolist()

def calculate_bollinger_bands(prices: pd.Series, period: int = 20, std_dev: int = 2) -> Tuple[List, List, List]:
    """คำนวณ Bollinger Bands"""
    sma = prices.rolling(window=period).mean()
    std = prices.rolling(window=period).std()
    upper = sma + (std * std_dev)
    lower = sma - (std * std_dev)
    return upper.tolist(), sma.tolist(), lower.tolist()

def calculate_support_resistance(df: pd.DataFrame, window: int = 20) -> Tuple[List[float], List[float]]:
    """คำนวณ Support และ Resistance levels"""
    # หา local minima และ local maxima
    lows = df['Low'].rolling(window=window, center=True).min()
    highs = df['High'].rolling(window=window, center=True).max()
    
    # หาจุดที่เป็น local minima/maxima จริงๆ
    local_minima = df['Low'][(df['Low'] == lows) & (df['Low'].shift(1) > df['Low']) & (df['Low'].shift(-1) > df['Low'])]
    local_maxima = df['High'][(df['High'] == highs) & (df['High'].shift(1) < df['High']) & (df['High'].shift(-1) < df['High'])]
    
    # เลือก levels ที่สำคัญ (ใกล้ราคาปัจจุบัน)
    current_price = df['Close'].iloc[-1]
    
    support_levels = sorted([level for level in local_minima.tolist() if level < current_price], reverse=True)[:3]
    resistance_levels = sorted([level for level in local_maxima.tolist() if level > current_price])[:3]
    
    # ถ้าไม่พบเพียงพอให้ใช้ min/max จากช่วงเวลา
    if len(support_levels) < 3:
        support_levels = [df['Low'].min()]
    if len(resistance_levels) < 3:
        resistance_levels = [df['High'].max()]
    
    return support_levels, resistance_levels

def calculate_trend_analysis(df: pd.DataFrame, symbol: str) -> TrendAnalysis:
    """คำนวณ Trend Analysis"""
    analysis_date = datetime.now().isoformat()
    
    # วิเคราะห์ trend direction จาก Moving Averages
    ma_20 = df['Close'].rolling(window=20).mean().iloc[-1]
    ma_50 = df['Close'].rolling(window=50).mean().iloc[-1]
    current_price = df['Close'].iloc[-1]
    
    if current_price > ma_20 > ma_50:
        trend_direction = "uptrend"
    elif current_price < ma_20 < ma_50:
        trend_direction = "downtrend"
    else:
        trend_direction = "sideways"
    
    # วิเคราะห์ trend strength จาก slope ของ MA20
    ma_20_slope = (ma_20 - df['Close'].rolling(window=20).mean().iloc[-20]) / 20
    if abs(ma_20_slope) > current_price * 0.001:
        trend_strength = "strong"
    elif abs(ma_20_slope) > current_price * 0.0005:
        trend_strength = "moderate"
    else:
        trend_strength = "weak"
    
    # วิเคราะห์ volume trend
    recent_volume = df['Volume'].tail(10).mean()
    earlier_volume = df['Volume'].head(len(df) - 10).mean() if len(df) > 10 else recent_volume
    
    if recent_volume > earlier_volume * 1.1:
        volume_trend = "increasing"
    elif recent_volume < earlier_volume * 0.9:
        volume_trend = "decreasing"
    else:
        volume_trend = "stable"
    
    # หา key levels
    support_levels, resistance_levels = calculate_support_resistance(df)
    key_levels = {
        "current_price": current_price,
        "support_1": support_levels[0] if support_levels else None,
        "support_2": support_levels[1] if len(support_levels) > 1 else None,
        "resistance_1": resistance_levels[0] if resistance_levels else None,
        "resistance_2": resistance_levels[1] if len(resistance_levels) > 1 else None,
        "ma_20": ma_20,
        "ma_50": ma_50
    }
    
    return TrendAnalysis(
        symbol=symbol,
        trend_direction=trend_direction,
        trend_strength=trend_strength,
        volume_trend=volume_trend,
        price_pattern=None,  # ต้องการ algorithm เพิ่มเติม
        key_levels=key_levels,
        analysis_date=analysis_date
    )

def parse_csv_data(csv_data: str) -> pd.DataFrame:
    """แปลง CSV string เป็น DataFrame"""
    from io import StringIO
    df = pd.read_csv(StringIO(csv_data))
    
    # แปลงคอลัมน์ให้ตรงกับ format ของ yfinance
    column_mapping = {
        'Date': 'Date',
        'Open': 'Open',
        'High': 'High',
        'Low': 'Low',
        'Close': 'Close',
        'Volume': 'Volume'
    }
    
    # ถ้าคอลัมน์ไม่ตรงให้ทำ mapping
    if 'Date' not in df.columns and 'date' in df.columns:
        df = df.rename(columns={'date': 'Date'})
    
    # แปลง Date เป็น datetime
    if 'Date' in df.columns:
        df['Date'] = pd.to_datetime(df['Date'])
        df.set_index('Date', inplace=True)
    
    return df

def export_to_csv(df: pd.DataFrame) -> str:
    """แปลง DataFrame เป็น CSV string"""
    from io import StringIO
    output = StringIO()
    df.to_csv(output)
    return output.getvalue()
