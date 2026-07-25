import pandas as pd
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from .schemas import FundamentalAnalysis, TechnicalAnalysis, TrendAnalysis, TradingPlan


def _pct(val: Optional[float]) -> Optional[float]:
    if val is None:
        return None
    return val * 100 if abs(val) < 1 else val


def calculate_atr(df: pd.DataFrame, period: int = 14) -> Optional[float]:
    if len(df) < period + 1:
        return None
    high = df["High"]
    low = df["Low"]
    close = df["Close"]
    tr1 = high - low
    tr2 = (high - close.shift()).abs()
    tr3 = (low - close.shift()).abs()
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    atr = tr.rolling(window=period).mean().iloc[-1]
    return round(float(atr), 2) if not pd.isna(atr) else None


def _score_fundamentals(fundamental: FundamentalAnalysis) -> Tuple[float, List[str]]:
    score = 0.0
    reasons: List[str] = []
    factors = 0

    grade_map = {
        "undervalued": (1.0, "มูลค่าโดยรวม: ถูกกว่าค่า intrinsic โดยประมาณ"),
        "fair": (0.5, "มูลค่าโดยรวม: อยู่ในเกณฑ์เหมาะสม"),
        "neutral": (0.0, "มูลค่าโดยรวม: กลางๆ ยังไม่ชัดว่าถูกหรือแพง"),
        "overvalued": (-1.0, "มูลค่าโดยรวม: แพงกว่าค่าพื้นฐาน"),
    }
    if fundamental.valuation_grade in grade_map:
        g_score, g_reason = grade_map[fundamental.valuation_grade]
        score += g_score
        factors += 1
        reasons.append(g_reason)

    if fundamental.pe_ratio is not None:
        factors += 1
        if fundamental.pe_ratio < 15:
            score += 1.5
            reasons.append(f"P/E {fundamental.pe_ratio:.1f} — ต่ำกว่าค่าเฉลี่ยตลาด ราคาอาจยังไม่สะท้อนกำไรในอนาคต")
        elif fundamental.pe_ratio < 25:
            score += 0.5
            reasons.append(f"P/E {fundamental.pe_ratio:.1f} — อยู่ในช่วงปกติของหุ้นคุณภาพ")
        elif fundamental.pe_ratio > 40:
            score -= 1.5
            reasons.append(f"P/E {fundamental.pe_ratio:.1f} — สูงมาก ตลาดคาดหวังการเติบโตสูงหรือราคา overheat")
        else:
            score -= 0.5
            reasons.append(f"P/E {fundamental.pe_ratio:.1f} — เริ่มสูง ควรเทียบกับ growth rate")

    if fundamental.forward_pe is not None and fundamental.pe_ratio is not None:
        factors += 1
        if fundamental.forward_pe < fundamental.pe_ratio * 0.85:
            score += 0.5
            reasons.append(
                f"Forward P/E {fundamental.forward_pe:.1f} < trailing P/E — กำไรคาดว่าจะดีขึ้นในไตรมาสถัดไป"
            )
        elif fundamental.forward_pe > fundamental.pe_ratio * 1.1:
            score -= 0.5
            reasons.append(f"Forward P/E {fundamental.forward_pe:.1f} สูงกว่า trailing — กำไรอาจ decelerate")

    if fundamental.peg_ratio is not None:
        factors += 1
        if fundamental.peg_ratio < 1:
            score += 1.5
            reasons.append(f"PEG {fundamental.peg_ratio:.2f} < 1 — ราคาสมเหตุสมผลเมื่อเทียบ growth")
        elif fundamental.peg_ratio < 2:
            score += 0.5
            reasons.append(f"PEG {fundamental.peg_ratio:.2f} — ยอมรับได้ถ้า growth ยั่งยืน")
        else:
            score -= 1
            reasons.append(f"PEG {fundamental.peg_ratio:.2f} — ราคา advance เร็วกว่ากำไร")

    if fundamental.ps_ratio is not None:
        factors += 1
        if fundamental.ps_ratio < 2:
            score += 1
            reasons.append(f"P/S {fundamental.ps_ratio:.1f} — revenue valuation ต่ำ")
        elif fundamental.ps_ratio > 10:
            score -= 1
            reasons.append(f"P/S {fundamental.ps_ratio:.1f} — ตลาดให้ premium สูงบนรายได้")

    if fundamental.pb_ratio is not None:
        factors += 1
        if fundamental.pb_ratio < 1.5:
            score += 0.5
            reasons.append(f"P/B {fundamental.pb_ratio:.1f} — ใกล้ book value")
        elif fundamental.pb_ratio > 8:
            score -= 0.5
            reasons.append(f"P/B {fundamental.pb_ratio:.1f} — intangible premium สูง")

    if fundamental.roe is not None:
        factors += 1
        roe_pct = _pct(fundamental.roe) or 0
        if roe_pct > 15:
            score += 1
            reasons.append(f"ROE {roe_pct:.1f}% — บริษัทใช้เงินทุนได้มีประสิทธิภาพ")
        elif roe_pct < 8:
            score -= 0.5
            reasons.append(f"ROE {roe_pct:.1f}% — ผลตอบแทนต่อผู้ถือหุ้นต่ำ")

    if fundamental.net_margin is not None:
        factors += 1
        nm = _pct(fundamental.net_margin) or 0
        if nm > 15:
            score += 0.5
            reasons.append(f"Net margin {nm:.1f}% — profitability แข็งแรง")
        elif nm < 5:
            score -= 0.5
            reasons.append(f"Net margin {nm:.1f}% — margin บาง แข่งขันสูง")

    if fundamental.revenue_growth is not None:
        factors += 1
        growth_pct = _pct(fundamental.revenue_growth) or 0
        if growth_pct > 10:
            score += 1
            reasons.append(f"รายได้ YoY +{growth_pct:.1f}% — top-line ขยายตัว")
        elif growth_pct < 0:
            score -= 1
            reasons.append(f"รายได้ YoY {growth_pct:.1f}% — ธุรกิจหดตัว ต้องระวัง")

    if fundamental.earnings_growth is not None:
        factors += 1
        eg = _pct(fundamental.earnings_growth) or 0
        if eg > 15:
            score += 0.5
            reasons.append(f"กำไร YoY +{eg:.1f}% — earnings momentum ดี")
        elif eg < -10:
            score -= 0.5
            reasons.append(f"กำไร YoY {eg:.1f}% — กำไร decelerate")

    if fundamental.debt_to_equity is not None:
        factors += 1
        if fundamental.debt_to_equity > 2:
            score -= 0.5
            reasons.append(f"Debt/Equity {fundamental.debt_to_equity:.2f} — leverage สูง")
        elif fundamental.debt_to_equity < 0.5:
            score += 0.3
            reasons.append(f"Debt/Equity {fundamental.debt_to_equity:.2f} — balance sheet แข็ง")

    avg = score / factors if factors else 0
    return avg, reasons


def _macd_signal(technical: TechnicalAnalysis) -> Optional[str]:
    if not technical.macd or not technical.macd_signal:
        return None
    m = technical.macd[-1]
    s = technical.macd_signal[-1]
    if m is None or s is None:
        return None
    if m > s and technical.macd_histogram and len(technical.macd_histogram) > 1:
        prev_h = technical.macd_histogram[-2]
        curr_h = technical.macd_histogram[-1]
        if prev_h is not None and curr_h is not None and prev_h < 0 <= curr_h:
            return "bullish_cross"
    if m < s:
        return "bearish"
    return "bullish" if m > s else "neutral"


def _ma_alignment(technical: TechnicalAnalysis, price: float) -> str:
    ma20 = technical.ma_20[-1] if technical.ma_20 else None
    ma50 = technical.ma_50[-1] if technical.ma_50 else None
    if ma20 is None or ma50 is None:
        return "unknown"
    if price > ma20 > ma50:
        return "bullish_stack"
    if price < ma20 < ma50:
        return "bearish_stack"
    return "mixed"


def _score_technical(
    technical: TechnicalAnalysis,
    trend: TrendAnalysis,
    current_price: float,
) -> Tuple[float, List[str]]:
    score = 0.0
    reasons: List[str] = []
    factors = 0

    rsi_val = technical.rsi[-1] if technical.rsi else None
    if technical.rsi_signal:
        factors += 1
        if technical.rsi_signal == "buy":
            score += 1.5
            reasons.append(f"RSI {rsi_val:.0f} — oversold zone โอกาส mean reversion" if rsi_val else "RSI oversold")
        elif technical.rsi_signal == "sell":
            score -= 1.5
            reasons.append(f"RSI {rsi_val:.0f} — overbought ระวัง profit taking" if rsi_val else "RSI overbought")
        else:
            reasons.append(f"RSI {rsi_val:.0f} — neutral ไม่ extreme" if rsi_val else "RSI neutral")

    macd = _macd_signal(technical)
    if macd:
        factors += 1
        if macd == "bullish_cross":
            score += 1
            reasons.append("MACD bullish crossover — momentum เปลี่ยนเป็นบวก")
        elif macd == "bearish":
            score -= 0.5
            reasons.append("MACD อยู่ใต้ signal line — momentum อ่อน")
        elif macd == "bullish":
            score += 0.3
            reasons.append("MACD อยู่เหนือ signal — momentum สนับสนุน")

    alignment = _ma_alignment(technical, current_price)
    factors += 1
    if alignment == "bullish_stack":
        score += 1
        reasons.append("ราคา > MA20 > MA50 — bullish alignment (Golden structure)")
    elif alignment == "bearish_stack":
        score -= 1
        reasons.append("ราคา < MA20 < MA50 — bearish alignment")
    else:
        reasons.append("MA ไม่ align ชัด — รอ confirmation")

    if trend.trend_direction == "uptrend":
        score += 1.5
        factors += 1
        reasons.append(f"เทรนด์ {trend.trend_direction} ({trend.trend_strength}) — higher high/low structure")
    elif trend.trend_direction == "downtrend":
        score -= 1.5
        factors += 1
        reasons.append(f"เทรนด์ {trend.trend_direction} — อย่า catch falling knife")
    else:
        factors += 1
        reasons.append("Sideways — รอ breakout จาก range")

    if trend.volume_trend == "increasing" and trend.trend_direction == "uptrend":
        score += 0.5
        factors += 1
        reasons.append("Volume ยืนยัน uptrend — smart money อาจเข้า")
    elif trend.volume_trend == "decreasing" and trend.trend_direction == "uptrend":
        score -= 0.3
        factors += 1
        reasons.append("Volume ลดใน uptrend — rally อาจไม่ sustainable")

    if technical.bollinger_upper and technical.bollinger_lower:
        upper = technical.bollinger_upper[-1]
        lower = technical.bollinger_lower[-1]
        if upper and lower and upper != lower:
            factors += 1
            pct_b = (current_price - lower) / (upper - lower)
            if pct_b > 0.95:
                score -= 0.5
                reasons.append("ราคาใกล้ Bollinger upper — short-term extended")
            elif pct_b < 0.05:
                score += 0.5
                reasons.append("ราคาใกล้ Bollinger lower — อาจ oversold ระยะสั้น")

    if technical.support_levels:
        sup = technical.support_levels[0]
        dist = (current_price - sup) / current_price * 100
        reasons.append(f"Support ใกล้สุด {sup:,.2f} (ห่าง {dist:.1f}%)")
    if technical.resistance_levels:
        res = technical.resistance_levels[0]
        dist = (res - current_price) / current_price * 100
        reasons.append(f"Resistance ใกล้สุด {res:,.2f} (อีก {dist:.1f}%)")

    avg = score / factors if factors else 0
    return avg, reasons


def generate_recommendation(
    fundamental: FundamentalAnalysis,
    technical: TechnicalAnalysis,
    trend: TrendAnalysis,
    current_price: float = 0,
) -> dict:
    fund_score, fund_reasons = _score_fundamentals(fundamental)
    tech_score, tech_reasons = _score_technical(technical, trend, current_price)

    total_score = fund_score * 0.45 + tech_score * 0.55
    all_reasons = fund_reasons + tech_reasons

    if total_score >= 0.6:
        action = "buy"
    elif total_score <= -0.4:
        action = "sell"
    else:
        action = "hold"

    confidence = min(abs(total_score) + 0.4, 1.0)

    return {
        "action": action,
        "confidence": round(confidence, 2),
        "reasons": all_reasons,
        "fundamental_notes": fund_reasons,
        "technical_notes": tech_reasons,
        "score": round(total_score, 2),
        "fund_score": round(fund_score, 2),
        "tech_score": round(tech_score, 2),
    }


def _build_detailed_analysis(
    action: str,
    fundamental: FundamentalAnalysis,
    technical: TechnicalAnalysis,
    trend: TrendAnalysis,
    recommendation: dict,
    current_price: float,
    stop_loss: float,
    target_price: float,
    atr: Optional[float],
    currency: str,
) -> str:
    grade_th = {
        "undervalued": "ถูก",
        "fair": "เหมาะสม",
        "neutral": "ปานกลาง",
        "overvalued": "แพง",
    }.get(fundamental.valuation_grade or "neutral", "ปานกลาง")

    action_th = {"buy": "ซื้อ/สะสม", "sell": "ลด/ขาย", "hold": "ถือหรือรอดู"}.get(action, "รอดู")

    pe = f"{fundamental.pe_ratio:.1f}" if fundamental.pe_ratio else "N/A"
    peg = f"{fundamental.peg_ratio:.2f}" if fundamental.peg_ratio else "N/A"
    rsi = f"{technical.rsi[-1]:.0f}" if technical.rsi and technical.rsi[-1] else "N/A"

    p1 = (
        f"จากการวิเคราะห์ข้อมูลย้อนหลัง หุ้นนี้อยู่ในเกณฑ์มูลค่า「{grade_th}」"
        f" (P/E {pe}, PEG {peg}) "
        f"โดยคะแนน fundamental {recommendation.get('fund_score', 0):+.2f} "
        f"และ technical {recommendation.get('tech_score', 0):+.2f} "
        f"รวมเป็น {recommendation.get('score', 0):+.2f}"
    )

    p2 = (
        f"ด้านเทคนิค ราคา {current_price:,.2f} {currency} อยู่ในเทรนด์{trend.trend_direction.replace('_', ' ')} "
        f"ความแรง {trend.trend_strength} RSI {rsi} "
        f"volume {trend.volume_trend} — "
        f"{'momentum สนับสนุนขาขึ้น' if trend.trend_direction == 'uptrend' else 'ยังไม่มี trend ชัด' if trend.trend_direction == 'sideways' else 'pressure ด้านลบ'}"
    )

    upside = ((target_price - current_price) / current_price * 100) if target_price > current_price else 0
    downside = ((current_price - stop_loss) / current_price * 100) if stop_loss < current_price else 0
    p3 = (
        f"แนวโน้มระยะสั้น (คาดการณ์): แนะนำ「{action_th}」"
        f" เป้าหมาย {target_price:,.2f} (+{upside:.1f}%) "
        f"Stop Loss {stop_loss:,.2f} (-{downside:.1f}%)"
    )
    if atr:
        p3 += f" ATR(14) {atr:,.2f} แสดง volatility ระยะสั้น ~{(atr/current_price*100):.1f}%"

    p4 = (
        "หมายเหตุ: การวิเคราะห์นี้อิงข้อมูลราคาและงบการเงินที่ผ่านมา "
        "ไม่ใช่คำแนะนำการลงทุนโดยตรง ควรพิจารณาข่าว ผลประกอบการล่าสุด และ macro ก่อนตัดสินใจ"
    )

    return "\n\n".join([p1, p2, p3, p4])


def _build_risk_notes(
    stop_method: str,
    stop_loss: float,
    stop_loss_pct: float,
    rr_ratio: Optional[float],
    atr: Optional[float],
    account_size: float,
    risk_pct: float,
    shares: int,
) -> List[str]:
    notes = [
        f"Stop Loss คำนวณจาก {stop_method.upper()} — ตัดขาดทุนที่ {stop_loss:,.2f} (-{stop_loss_pct}%)",
    ]
    if rr_ratio:
        notes.append(f"Risk:Reward = 1:{rr_ratio} — เป้าหมายคุ้มความเสี่ยง" if rr_ratio >= 1.5 else f"R:R 1:{rr_ratio} — reward ต่ำกว่า ideal 1:2")
    if atr:
        notes.append(f"ATR 14 วัน = {atr:,.2f} — ใช้กำหนด volatility-adjusted stop")
    notes.append(f"Position sizing: เสี่ยง {risk_pct}% ของพอร์ต {account_size:,.0f} → ~{shares} หุ้น")
    notes.append("ไม่ควรลงทุนเกิน 5-10% ของพอร์ตในหุ้นตัวเดียว ( diversification )")
    return notes


def generate_trading_plan(
    df: pd.DataFrame,
    fundamental: FundamentalAnalysis,
    technical: TechnicalAnalysis,
    trend: TrendAnalysis,
    recommendation: dict,
    current_price: float,
    account_size: float = 100_000,
    risk_pct: float = 2.0,
    currency: str = "USD",
) -> TradingPlan:
    atr = calculate_atr(df)
    support = technical.support_levels[0] if technical.support_levels else None
    resistance = technical.resistance_levels[0] if technical.resistance_levels else None

    if support and support < current_price:
        stop_loss = round(support * 0.98, 2)
        stop_method = "support"
    elif atr:
        stop_loss = round(current_price - atr * 2, 2)
        stop_method = "atr"
    else:
        stop_loss = round(current_price * 0.93, 2)
        stop_method = "percent"

    stop_loss_pct = round((current_price - stop_loss) / current_price * 100, 2)

    if resistance and resistance > current_price:
        target_price = round(resistance, 2)
    else:
        target_price = round(current_price + (current_price - stop_loss) * 2, 2)

    risk_amount = account_size * (risk_pct / 100)
    risk_per_share = current_price - stop_loss
    shares = int(risk_amount / risk_per_share) if risk_per_share > 0 else 0
    position_amount = round(shares * current_price, 2)
    allocation_pct = round(position_amount / account_size * 100, 1) if account_size > 0 else 0

    rr_ratio = None
    if stop_loss and target_price:
        reward = target_price - current_price
        risk = current_price - stop_loss
        rr_ratio = round(reward / risk, 2) if risk > 0 else None

    dca_splits: List[Dict[str, Any]] = []
    action = recommendation["action"]
    if action == "buy" and shares > 0:
        splits = [
            {"tranche": 1, "pct": 40, "price_target": current_price, "shares": int(shares * 0.4), "note": "ซื้อ 40% ที่ราคาปัจจุบัน ถ้า trend ยืนยัน"},
            {"tranche": 2, "pct": 30, "price_target": round(current_price * 0.97, 2), "shares": int(shares * 0.3), "note": "รอ pullback -3% ลด average cost"},
            {"tranche": 3, "pct": 30, "price_target": round(current_price * 0.95, 2), "shares": shares - int(shares * 0.4) - int(shares * 0.3), "note": "รอ dip -5% ใกล้ support"},
        ]
        for s in splits:
            s["amount"] = round(s["shares"] * s["price_target"], 2)
            dca_splits.append(s)
    elif action == "hold":
        dca_splits = [{
            "tranche": 1, "pct": 100,
            "price_target": round(support * 1.01, 2) if support else round(current_price * 0.95, 2),
            "shares": 0, "amount": 0,
            "note": "ยังไม่เข้า — รอราคาใกล้ support หรือ breakout ยืนยัน",
        }]
    elif action == "sell":
        dca_splits = [{
            "tranche": 1, "pct": 100, "price_target": current_price,
            "shares": 0, "amount": 0,
            "note": "พิจารณา take profit / ลด exposure บริเวณ resistance",
        }]

    summary = _build_summary(action, current_price, stop_loss, target_price, shares, allocation_pct, currency)
    detailed = _build_detailed_analysis(
        action, fundamental, technical, trend, recommendation,
        current_price, stop_loss, target_price, atr, currency,
    )
    risk_notes = _build_risk_notes(
        stop_method, stop_loss, stop_loss_pct, rr_ratio, atr, account_size, risk_pct, shares,
    )

    plan_date = datetime.now().strftime("%Y-%m-%d")

    return TradingPlan(
        action=action,
        confidence=recommendation["confidence"],
        reasons=recommendation.get("reasons", []),
        score=recommendation.get("score", 0),
        entry_price=current_price,
        target_price=target_price,
        stop_loss=stop_loss,
        stop_loss_pct=stop_loss_pct,
        stop_loss_method=stop_method,
        position_size_shares=shares if action == "buy" else 0,
        position_size_amount=position_amount if action == "buy" else 0,
        portfolio_allocation_pct=allocation_pct if action == "buy" else 0,
        dca_splits=dca_splits,
        risk_reward_ratio=rr_ratio,
        atr=atr,
        account_size=account_size,
        risk_pct=risk_pct,
        currency=currency,
        summary=summary,
        plan_date=plan_date,
        detailed_analysis=detailed,
        fundamental_notes=recommendation.get("fundamental_notes", []),
        technical_notes=recommendation.get("technical_notes", []),
        risk_notes=risk_notes,
    )


def _build_summary(action, price, stop, target, shares, alloc, currency) -> str:
    if action == "buy":
        return (
            f"แนะนำซื้อ {shares} หุ้น มูลค่า ~{shares * price:,.0f} {currency} "
            f"({alloc}% ของพอร์ต) | Stop Loss {stop:,.2f} | Target {target:,.2f}"
        )
    if action == "sell":
        return f"แนะนำขาย/ลดสัดส่วน — ราคา {price:,.2f} ใกล้ resistance {target:,.2f}"
    return f"ถือ/รอดู — ราคา {price:,.2f} ยังไม่ชัดเจน รอสัญญาณ confirmation เพิ่ม"
