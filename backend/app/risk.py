import pandas as pd
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from .schemas import FundamentalAnalysis, TechnicalAnalysis, TrendAnalysis, TradingPlan


def _pct(val: Optional[float]) -> Optional[float]:
    if val is None:
        return None
    return val * 100 if abs(val) < 1 else val


def _trend_label(direction: str) -> str:
    return {
        "uptrend": "ขาขึ้น",
        "downtrend": "ขาลง",
        "sideways": "ไปด้านข้าง (Sideways)",
    }.get(direction, direction.replace("_", " "))


def _grade_label(grade: Optional[str]) -> str:
    return {
        "undervalued": "ถูกกว่ามูลค่า",
        "fair": "เหมาะสม",
        "neutral": "ปานกลาง",
        "overvalued": "แพงกว่ามูลค่า",
    }.get(grade or "neutral", "ปานกลาง")


def _fundamental_intro(fundamental: FundamentalAnalysis, fund_score: float) -> str:
    grade = _grade_label(fundamental.valuation_grade)
    tone = "น่าสนใจ" if fund_score >= 0.5 else "ควรระวัง" if fund_score <= -0.3 else "ปานกลาง"
    pe = f"P/E {fundamental.pe_ratio:.1f}" if fundamental.pe_ratio else "ไม่มี P/E"
    return (
        f"ภาพรวมพื้นฐาน: มูลค่าโดยรวม「{grade}」คะแนน {fund_score:+.2f} ({tone}) — "
        f"ดูจากงบการเงินและตัวชี้วัดมูลค่า ({pe}) ว่าราคาสะท้อนผลประกอบการแค่ไหน"
    )


def _technical_intro(trend: TrendAnalysis, tech_score: float, current_price: float, currency: str) -> str:
    trend_th = _trend_label(trend.trend_direction)
    tone = "สนับสนุนขาขึ้น" if tech_score >= 0.5 else "กดดันราคา" if tech_score <= -0.3 else "ยังไม่ชัด"
    return (
        f"ภาพรวมเทคนิค: ราคา {current_price:,.2f} {currency} อยู่ในเทรนด์{trend_th} "
        f"ความแรง {trend.trend_strength} — สัญญาณรวม {tone} (คะแนน {tech_score:+.2f})"
    )


def _risk_intro(action: str, confidence: float) -> str:
    action_tip = {
        "buy": "เน้นควบคุมความเสี่ยงต่อไม้ — อย่าลงเกินสัดส่วนที่คำนวณ",
        "sell": "เน้นปกป้องกำไร — ตั้งจุดขาย/ลดสัดส่วนเมื่อราคาใกล้แนวต้าน",
        "hold": "ยังไม่ควรเพิ่มความเสี่ยง — รอสัญญาณชัดขึ้นก่อนตัดสินใจใหญ่",
    }.get(action, "จัดการความเสี่ยงให้สอดคล้องกับพอร์ต")
    return f"หลักการจัดการความเสี่ยง (ความมั่นใจ {confidence * 100:.0f}%): {action_tip}"


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
        "undervalued": (1.0, "มูลค่าโดยรวม「ถูกกว่ามูลค่า」— ราคาต่ำกว่าที่งบการเงินและอัตราส่วนบ่งชี้ อาจเป็นโอกาสซื้อถ้าธุรกิจยังแข็ง"),
        "fair": (0.5, "มูลค่าโดยรวม「เหมาะสม」— ราคาใกล้เคียงมูลค์ที่ตลาดให้ ไม่ถูกหรือแพงจนเกินไป"),
        "neutral": (0.0, "มูลค่าโดยรวม「ปานกลาง」— ยังแยกไม่ออกชัดว่าถูกหรือแพง ควรดู growth และเทคนิคประกอบ"),
        "overvalued": (-1.0, "มูลค่าโดยรวม「แพงกว่ามูลค่า」— ราคาสูงเมื่อเทียบงบ ระวัง correction ถ้า growth ไม่ตาม"),
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
            reasons.append(
                f"P/E {fundamental.pe_ratio:.1f} — ต่ำ (จ่าย ~{fundamental.pe_ratio:.0f} บาทต่อกำไร 1 บาท/หุ้น) "
                f"มักหมายถึงราคายังไม่แพงหรือตลาดมองแย่เกินจริง"
            )
        elif fundamental.pe_ratio < 25:
            score += 0.5
            reasons.append(
                f"P/E {fundamental.pe_ratio:.1f} — อยู่ในช่วงปกติของหุ้นคุณภาพ "
                f"ไม่ถูกหรือแพงจนเกินไป"
            )
        elif fundamental.pe_ratio > 40:
            score -= 1.5
            reasons.append(
                f"P/E {fundamental.pe_ratio:.1f} — สูงมาก ตลาดคาดหวังกำไรโตเร็ว "
                f"ถ้า growth ไม่ถึงเป้าราคามักปรับตัวลง"
            )
        else:
            score -= 0.5
            reasons.append(
                f"P/E {fundamental.pe_ratio:.1f} — เริ่มสูง ควรเทียบกับอัตราเติบโตกำไร (ดู PEG)"
            )

    if fundamental.forward_pe is not None and fundamental.pe_ratio is not None:
        factors += 1
        if fundamental.forward_pe < fundamental.pe_ratio * 0.85:
            score += 0.5
            reasons.append(
                f"Forward P/E {fundamental.forward_pe:.1f} < P/E ปัจจุบ — "
                f"ตลาดคาดว่ากำไรไตรมาดข้างหน้าจะดีขึ้น"
            )
        elif fundamental.forward_pe > fundamental.pe_ratio * 1.1:
            score -= 0.5
            reasons.append(
                f"Forward P/E {fundamental.forward_pe:.1f} สูงกว่าปัจจุบัน — "
                f"กำไรอาจชะลอหรือตลาดมองแย่ลง"
            )

    if fundamental.peg_ratio is not None:
        factors += 1
        if fundamental.peg_ratio < 1:
            score += 1.5
            reasons.append(
                f"PEG {fundamental.peg_ratio:.2f} < 1 — ราคาไม่แพงเมื่อเทียบความเร็วเติบโตกำไร (สูตร P/E ÷ growth%)"
            )
        elif fundamental.peg_ratio < 2:
            score += 0.5
            reasons.append(
                f"PEG {fundamental.peg_ratio:.2f} — ยอมรับได้ ถ้ากำไรโตต่อเนื่องและมีคุณภาพ"
            )
        else:
            score -= 1
            reasons.append(
                f"PEG {fundamental.peg_ratio:.2f} — ราคาวิ่งเร็วกว่ากำไร ระวังถ้า growth ชะลอ"
            )

    if fundamental.ps_ratio is not None:
        factors += 1
        if fundamental.ps_ratio < 2:
            score += 1
            reasons.append(
                f"P/S {fundamental.ps_ratio:.1f} — ราคาต่ำเมื่อเทียบรายได้ (เหมาะกับธุรกิจที่ margin ยังไม่สูง)"
            )
        elif fundamental.ps_ratio > 10:
            score -= 1
            reasons.append(
                f"P/S {fundamental.ps_ratio:.1f} — ตลาดให้ premium สูงบนรายได้ คาดหวังโตเร็วหรือ margin ดี"
            )

    if fundamental.pb_ratio is not None:
        factors += 1
        if fundamental.pb_ratio < 1.5:
            score += 0.5
            reasons.append(
                f"P/B {fundamental.pb_ratio:.1f} — ใกล้มูลค่าทางบัญชี (book value) มี margin of safety"
            )
        elif fundamental.pb_ratio > 8:
            score -= 0.5
            reasons.append(
                f"P/B {fundamental.pb_ratio:.1f} — ราคาสะท้อนมูลค่า intangible/brand สูง ไม่เหมาะ value investing"
            )

    if fundamental.roe is not None:
        factors += 1
        roe_pct = _pct(fundamental.roe) or 0
        if roe_pct > 15:
            score += 1
            reasons.append(
                f"ROE {roe_pct:.1f}% — บริษัทใช้เงินทุนผู้ถือหุ้นได้คุ้ม (ยิ่งสูงยิ่งดี โดยทั่วไป >15% ถือว่าดี)"
            )
        elif roe_pct < 8:
            score -= 0.5
            reasons.append(
                f"ROE {roe_pct:.1f}% — ผลตอบแทนต่อทุนต่ำ อาจแข่งขันหนักหรือใช้ทุนไม่คุ้ม"
            )

    if fundamental.net_margin is not None:
        factors += 1
        nm = _pct(fundamental.net_margin) or 0
        if nm > 15:
            score += 0.5
            reasons.append(
                f"กำไรสุทธิ {nm:.1f}% ของรายได้ — margin แข็ง มี pricing power หรือต้นทุนควบคุมดี"
            )
        elif nm < 5:
            score -= 0.5
            reasons.append(
                f"กำไรสุทธิ {nm:.1f}% ของรายได้ — margin บาง แข่งขันสูง กำไรเปราะบาง"
            )

    if fundamental.revenue_growth is not None:
        factors += 1
        growth_pct = _pct(fundamental.revenue_growth) or 0
        if growth_pct > 10:
            score += 1
            reasons.append(
                f"รายได้โต YoY +{growth_pct:.1f}% — ธุรกิจขยายตัว แรงซื้อจาก top-line ยังมี"
            )
        elif growth_pct < 0:
            score -= 1
            reasons.append(
                f"รายได้ YoY {growth_pct:.1f}% — ธุรกิจหดตัว ต้องดูว่าเป็นชั่วคราวหรือโครงสร้าง"
            )

    if fundamental.earnings_growth is not None:
        factors += 1
        eg = _pct(fundamental.earnings_growth) or 0
        if eg > 15:
            score += 0.5
            reasons.append(
                f"กำไรโต YoY +{eg:.1f}% — earnings momentum ดี สนับสนุน rerating ราคา"
            )
        elif eg < -10:
            score -= 0.5
            reasons.append(
                f"กำไร YoY {eg:.1f}% — กำไรชะลอ/ลด ตลาดอาจ de-rate มูลค่า"
            )

    if fundamental.debt_to_equity is not None:
        factors += 1
        if fundamental.debt_to_equity > 2:
            score -= 0.5
            reasons.append(
                f"หนี้/ทุน {fundamental.debt_to_equity:.2f} — ใช้ leverage สูง ระวังดอกเบี้ยและ cash flow ในรอบ downturn"
            )
        elif fundamental.debt_to_equity < 0.5:
            score += 0.3
            reasons.append(
                f"หนี้/ทุน {fundamental.debt_to_equity:.2f} — งบแข็ง หนี้น้อย มีความยืดหยุ่นลงทุน/จ่ายปันผล"
            )

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
            reasons.append(
                f"RSI {rsi_val:.0f} — ต่ำ (โซน oversold) ราคาอาจถูกขายมากเกินไปในระยะสั้น มีโอกาสเด้งตัว"
                if rsi_val else "RSI ต่ำ — โซน oversold ระยะสั้น"
            )
        elif technical.rsi_signal == "sell":
            score -= 1.5
            reasons.append(
                f"RSI {rsi_val:.0f} — สูง (โซน overbought) ราคาอาจร้อนเกินไป ระวัง take profit"
                if rsi_val else "RSI สูง — โซน overbought"
            )
        else:
            reasons.append(
                f"RSI {rsi_val:.0f} — กลางๆ ยังไม่ overbought/oversold รอสัญญาณชัดขึ้น"
                if rsi_val else "RSI กลางๆ — ไม่ extreme"
            )

    macd = _macd_signal(technical)
    if macd:
        factors += 1
        if macd == "bullish_cross":
            score += 1
            reasons.append("MACD ตัดขึ้นเหนือเส้น signal — แรงซื้อเริ่มมากขึ้น (สัญญาณ momentum บวก)")
        elif macd == "bearish":
            score -= 0.5
            reasons.append("MACD อยู่ใต้ signal — แรงขายแรงกว่า ระยะสั้นกดดัน")
        elif macd == "bullish":
            score += 0.3
            reasons.append("MACD อยู่เหนือ signal — momentum ยังสนับสนุนขาขึ้น")

    alignment = _ma_alignment(technical, current_price)
    factors += 1
    if alignment == "bullish_stack":
        score += 1
        reasons.append(
            "ราคาอยู่เหนือ MA20 และ MA20 อยู่เหนือ MA50 — โครงสร้างขาขึ้นชัด (Golden alignment) "
            "แนวโน้มกลาง-ยาวยังสนับสนุน"
        )
    elif alignment == "bearish_stack":
        score -= 1
        reasons.append(
            "ราคาอยู่ใต้ MA20 และ MA20 อยู่ใต้ MA50 — โครงสร้างขาลง "
            "อย่ารีบสวนเทรนด์ถ้าไม่มีสัญญาณกลับตัว"
        )
    else:
        reasons.append(
            "ค่าเฉลี่ยเคลื่อนที่ไม่เรียงชัด — ตลาดยังเลือกทิศทาง รอ breakout หรือ pullback ยืนยัน"
        )

    if trend.trend_direction == "uptrend":
        score += 1.5
        factors += 1
        reasons.append(
            f"เทรนด์{_trend_label(trend.trend_direction)} ({trend.trend_strength}) — "
            f"ราคาทำจุดสูง-ต่ำที่สูงขึ้น แนวโน้มหลักยังเป็นขาขึ้น"
        )
    elif trend.trend_direction == "downtrend":
        score -= 1.5
        factors += 1
        reasons.append(
            f"เทรนด์{_trend_label(trend.trend_direction)} — "
            f"ราคาทำจุดต่ำที่ต่ำลง อย่าจับมีดตก (catch falling knife)"
        )
    else:
        factors += 1
        reasons.append(
            "เทรนด์ไปด้านข้าง — ราคาแกว่งในกรอบ รอทะลุแนวต้านหรือหลุดแนวรับเพื่อยืนยันทิศ"
        )

    if trend.volume_trend == "increasing" and trend.trend_direction == "uptrend":
        score += 0.5
        factors += 1
        reasons.append("ปริมาณซื้อขายเพิ่มใน uptrend — แรงซื้อยืนยัน เงินใหญ่น่าจะเข้า")
    elif trend.volume_trend == "decreasing" and trend.trend_direction == "uptrend":
        score -= 0.3
        factors += 1
        reasons.append(
            "ปริมาณซื้อขายลดใน uptrend — ราคาขึ้นแต่ volume ไม่ตาม อาจไม่ยั่งยืน"
        )

    if technical.bollinger_upper and technical.bollinger_lower:
        upper = technical.bollinger_upper[-1]
        lower = technical.bollinger_lower[-1]
        if upper and lower and upper != lower:
            factors += 1
            pct_b = (current_price - lower) / (upper - lower)
            if pct_b > 0.95:
                score -= 0.5
                reasons.append(
                    "ราคาใกล้แถบ Bollinger บน — ระยะสั้นอาจแพงเกิน รอ pullback ก่อนเพิ่ม"
                )
            elif pct_b < 0.05:
                score += 0.5
                reasons.append(
                    "ราคาใกล้แถบ Bollinger ล่าง — ระยะสั้น oversold อาจมีโอกาสเด้ง"
                )

    if technical.support_levels:
        sup = technical.support_levels[0]
        dist = (current_price - sup) / current_price * 100
        reasons.append(f"แนวรับใกล้สุด {sup:,.2f} — ห่างจากราคาปัจจุบัน {dist:.1f}% (จุดที่ราคามักเด้งในอดีต)")
    if technical.resistance_levels:
        res = technical.resistance_levels[0]
        dist = (res - current_price) / current_price * 100
        reasons.append(f"แนวต้านใกล้สุด {res:,.2f} — อีก {dist:.1f}% (จุดที่แรงขายมักเข้มในอดีต)")

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
    grade_th = _grade_label(fundamental.valuation_grade or "neutral")
    action_th = {"buy": "ซื้อ/สะสม", "sell": "ลด/ขาย", "hold": "ถือหรือรอดู"}.get(action, "รอดู")
    trend_th = _trend_label(trend.trend_direction)

    pe = f"{fundamental.pe_ratio:.1f}" if fundamental.pe_ratio else "ไม่มีข้อมูล"
    peg = f"{fundamental.peg_ratio:.2f}" if fundamental.peg_ratio else "ไม่มีข้อมูล"
    rsi = f"{technical.rsi[-1]:.0f}" if technical.rsi and technical.rsi[-1] else "ไม่มีข้อมูล"
    fund_score = recommendation.get("fund_score", 0)
    tech_score = recommendation.get("tech_score", 0)
    total_score = recommendation.get("score", 0)

    p1 = (
        f"【พื้นฐาน】หุ้นนี้อยู่ในเกณฑ์มูลค่า「{grade_th}」"
        f" โดย P/E {pe} และ PEG {peg} "
        f"คะแนนพื้นฐาน {fund_score:+.2f} แปลว่า"
        f"{' งบและมูลค่าสนับสนุนการถือ/ซื้อ' if fund_score >= 0.3 else ' งบ/มูลค่ายังไม่แข็งพอ ควรระวัง' if fund_score <= -0.3 else ' งบปานกลาง ต้องดูเทคนิคประกอบ'}"
    )

    vol_th = {"increasing": "เพิ่มขึ้น", "decreasing": "ลดลง", "stable": "คงที่"}.get(
        trend.volume_trend, trend.volume_trend or "คงที่"
    )
    momentum = {
        "uptrend": "แรงซื้อยังมี — ราคามีแนวโน้มต่อขาขึ้น",
        "sideways": "ตลาดยังลังเลทิศทาง — รอ breakout หรือ pullback ชัดขึ้น",
        "downtrend": "แรงขายกดดัน — อย่ารีบสวนเทรนด์ถ้าไม่มีสัญญาณกลับตัว",
    }.get(trend.trend_direction, "")

    p2 = (
        f"【เทคนิค】ราคา {current_price:,.2f} {currency} อยู่ในเทรนด์{trend_th} "
        f"(ความแรง {trend.trend_strength}) RSI {rsi} ปริมาณซื้อขาย{vol_th} — {momentum}"
        f" คะแนนเทคนิค {tech_score:+.2f}"
    )

    upside = ((target_price - current_price) / current_price * 100) if target_price > current_price else 0
    downside = ((current_price - stop_loss) / current_price * 100) if stop_loss < current_price else 0
    conf = recommendation.get("confidence", 0.5)

    p3 = (
        f"【แผนปฏิบัติ】จากคะแนนรวม {total_score:+.2f} (ความมั่นใจ {conf * 100:.0f}%) "
        f"แนะนำ「{action_th}」"
        f" เป้าหมาย {target_price:,.2f} (+{upside:.1f}%) "
        f"จุดตัดขาดทุน {stop_loss:,.2f} (-{downside:.1f}%)"
    )
    if atr:
        p3 += (
            f" ความผันผวน ATR(14) {atr:,.2f} (~{(atr / current_price * 100):.1f}% ของราคา) "
            f"ใช้กำหนด stop ให้เหมาะกับ swing ระยะสั้น"
        )

    p4 = (
        "【ข้อควรทราบ】การวิเคราะห์นี้อิงข้อมูลราคาและงบการเงินที่ผ่านมา "
        "ไม่ใช่คำแนะนำการลงทุนโดยตรง ก่อนตัดสินใจควรตรวจข่าว ผลประกอบการล่าสุด "
        "และปัจจัย macro (ดอกเบี้ย ภาวะเศรษฐกิจ) เสมอ"
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
    method_th = {
        "support": "แนวรับ (support)",
        "atr": "ความผันผวน ATR",
        "percent": "เปอร์เซ็นต์คงที่",
    }.get(stop_method, stop_method.upper())

    notes = [
        f"จุดตัดขาดทุน {stop_loss:,.2f} (-{stop_loss_pct}%) คำนวณจาก{method_th} — "
        f"ถ้าราคาหลุดจุดนี้ แสดงว่า thesis ระยะสั้นผิด ควรออกตามแผน",
    ]
    if rr_ratio:
        if rr_ratio >= 2:
            notes.append(
                f"อัตราความเสี่ยง:ผลตอบแทน 1:{rr_ratio} — เป้าหมายคุ้มความเสี่ยง (ideal ≥ 1:2)"
            )
        elif rr_ratio >= 1.5:
            notes.append(
                f"อัตราความเสี่ยง:ผลตอบแทน 1:{rr_ratio} — ยอมรับได้ แต่ควรเข้มงวด stop loss"
            )
        else:
            notes.append(
                f"อัตราความเสี่ยง:ผลตอบแทน 1:{rr_ratio} — ผลตอบแทนต่ำกว่าความเสี่ยง ควรรอจังหวะที่ R:R ดีขึ้น"
            )
    if atr:
        notes.append(
            f"ATR 14 วัน = {atr:,.2f} — วัดความผันผวนเฉลี่ย ใช้กำหนด stop ให้ไม่โดน shake-out ง่ายเกินไป"
        )
    notes.append(
        f"ขนาดสถานะ: ยอมเสี่ยง {risk_pct}% ของพอร์ต {account_size:,.0f} → แนะนำ ~{shares} หุ้น "
        f"(ถ้าราคาถึง stop จะเสียไม่เกิน {risk_pct}% ของพอร์ต)"
    )
    notes.append(
        "กฎ diversification: ไม่ควรลงทุนเกิน 5–10% ของพอร์ตในหุ้นตัวเดียว "
        "กระจายหลาย sector เพื่อลดความเสี่ยงเฉพาะตัว"
    )
    notes.append(
        "เมื่อราคาไปถึงเป้าหมาย ควรพิจารณ take profit บางส่วน "
        "และเลื่อน stop loss มา break-even เพื่อล็อกกำไร"
    )
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
            {
                "tranche": 1, "pct": 40, "price_target": current_price,
                "shares": int(shares * 0.4),
                "note": "งวด 1 (40%): ซื้อที่ราคาปัจจุบัน — เริ่มสะสมเมื่อสัญญาณและเทรนด์ยืนยันแล้ว",
            },
            {
                "tranche": 2, "pct": 30, "price_target": round(current_price * 0.97, 2),
                "shares": int(shares * 0.3),
                "note": "งวด 2 (30%): รอราคาปรับลง ~3% — ช่วยเฉลี่ยต้นทุนลงถ้าตลาด pullback",
            },
            {
                "tranche": 3, "pct": 30, "price_target": round(current_price * 0.95, 2),
                "shares": shares - int(shares * 0.4) - int(shares * 0.3),
                "note": "งวด 3 (30%): รอ dip ~5% ใกล้แนวรับ — ซื้อเมื่อได้ราคาดีกว่า",
            },
        ]
        for s in splits:
            s["amount"] = round(s["shares"] * s["price_target"], 2)
            dca_splits.append(s)
    elif action == "hold":
        dca_splits = [{
            "tranche": 1, "pct": 100,
            "price_target": round(support * 1.01, 2) if support else round(current_price * 0.95, 2),
            "shares": 0, "amount": 0,
            "note": "ยังไม่เข้า — รอราคาใกล้แนวรับหรือ breakout ยืนยันก่อน อย่ารีบ all-in",
        }]
    elif action == "sell":
        dca_splits = [{
            "tranche": 1, "pct": 100, "price_target": current_price,
            "shares": 0, "amount": 0,
            "note": "พิจารณ take profit / ลดสัดส่วนเมื่อราคาใกล้แนวต้าน — อย่ารอจนกลับตัวลง",
        }]

    summary = _build_summary(action, current_price, stop_loss, target_price, shares, allocation_pct, currency)
    detailed = _build_detailed_analysis(
        action, fundamental, technical, trend, recommendation,
        current_price, stop_loss, target_price, atr, currency,
    )
    risk_notes = [_risk_intro(action, recommendation["confidence"])] + _build_risk_notes(
        stop_method, stop_loss, stop_loss_pct, rr_ratio, atr, account_size, risk_pct, shares,
    )

    fund_notes = [_fundamental_intro(fundamental, recommendation.get("fund_score", 0))] + recommendation.get("fundamental_notes", [])
    tech_notes = [_technical_intro(trend, recommendation.get("tech_score", 0), current_price, currency)] + recommendation.get("technical_notes", [])

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
        fundamental_notes=fund_notes,
        technical_notes=tech_notes,
        risk_notes=risk_notes,
    )


def _build_summary(action, price, stop, target, shares, alloc, currency) -> str:
    if action == "buy":
        return (
            f"สรุป: แนะนำซื้อ/สะสม ~{shares} หุ้น มูลค่าประมาณ {shares * price:,.0f} {currency} "
            f"({alloc}% ของพอร์ต) | เป้าหมาย {target:,.2f} | ตัดขาดทุนที่ {stop:,.2f} "
            f"— แบ่งซื้อ 3 งวดตามแผน DCA ด้านล่าง"
        )
    if action == "sell":
        return (
            f"สรุป: แนะนำลดสัดส่วนหรือ take profit — ราคาปัจจุบัน {price:,.2f} {currency} "
            f"ใกล้แนวต้าน {target:,.2f} สัญญาณรวมกดดัน ควรปกป้องกำไร"
        )
    return (
        f"สรุป: ถือหรือรอดู — ราคา {price:,.2f} {currency} สัญญาณยังไม่ชัด "
        f"รอราคาใกล้แนวรับ {stop:,.2f} หรือทะลุเป้า {target:,.2f} ก่อนตัดสินใจใหญ่"
    )
