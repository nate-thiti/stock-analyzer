"""Personalized portfolio decision layer — risk tolerance as safety constraint."""
from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional


PERSONALIZED_ACTION_LABELS = {
    "CONSIDER_ADDING": "พิจารณาซื้อเพิ่ม",
    "HOLD_DO_NOT_ADD": "ถือต่อ — ไม่ควรเพิ่ม",
    "HOLD": "ถือต่อ",
    "HOLD_WITH_TIGHT_RISK_CONTROL": "ถือต่อ — ควบคุมความเสี่ยง",
    "CONSIDER_REDUCING": "พิจารณาลดบางส่วน",
    "REDUCE_OR_SELL": "ลดหรือขาย",
    "REDUCE_RISK": "ลดความเสี่ยง",
    "CONSIDER_BUY_NEW": "พิจารณาเริ่มซื้อ",
    "WAIT": "รอดูก่อน",
    "AVOID_NEW": "อย่าเข้า / รอ",
}

RISK_USAGE_BANDS = {
    "ok": "อยู่ในระดับรับได้",
    "watch": "เริ่มเข้าเขตเฝ้าระวัง",
    "near_limit": "ใกล้ขีดจำกัด",
    "exceeded": "เกินความเสี่ยงที่กำหนด",
}


@dataclass
class PersonalizedRiskResult:
    action: str
    action_label: str
    summary: str
    max_loss_tolerance_pct: float
    max_position_pct: float
    current_loss_pct: Optional[float] = None
    risk_usage_pct: Optional[float] = None
    risk_usage_band: Optional[str] = None
    personal_risk_floor: Optional[float] = None
    technical_stop: Optional[float] = None
    effective_stop: Optional[float] = None
    position_pct: Optional[float] = None
    technical_stop_breached: bool = False
    has_position: bool = False
    notes: Optional[List[str]] = None

    def to_dict(self) -> dict:
        return {
            "action": self.action,
            "action_label": self.action_label,
            "summary": self.summary,
            "max_loss_tolerance_pct": self.max_loss_tolerance_pct,
            "max_position_pct": self.max_position_pct,
            "current_loss_pct": self.current_loss_pct,
            "risk_usage_pct": self.risk_usage_pct,
            "risk_usage_band": self.risk_usage_band,
            "personal_risk_floor": self.personal_risk_floor,
            "technical_stop": self.technical_stop,
            "effective_stop": self.effective_stop,
            "position_pct": self.position_pct,
            "technical_stop_breached": self.technical_stop_breached,
            "has_position": self.has_position,
            "notes": self.notes or [],
        }


def classify_signal_tier(score: float) -> str:
    if score >= 0.6:
        return "strong_buy"
    if score >= 0.3:
        return "lean_buy"
    if score <= -0.4:
        return "strong_sell"
    if score <= -0.2:
        return "lean_sell"
    return "hold"


def signal_tier_label(tier: str) -> str:
    return {
        "strong_buy": "ซื้อชัด",
        "lean_buy": "น่าจับตา",
        "hold": "ถือ/รอดู",
        "lean_sell": "ระวัง",
        "strong_sell": "ขายชัด",
    }.get(tier, tier)


def _risk_usage_band(risk_usage: float) -> str:
    if risk_usage >= 1.0:
        return "exceeded"
    if risk_usage >= 0.75:
        return "near_limit"
    if risk_usage >= 0.5:
        return "watch"
    return "ok"


def personalized_action(
    analysis_score: float,
    analysis_action: str,
    pnl_pct: Optional[float],
    max_loss_tolerance_pct: float,
    technical_stop_breached: bool,
    position_pct: Optional[float],
    max_position_pct: float,
    has_position: bool,
) -> str:
    if technical_stop_breached:
        return "REDUCE_OR_SELL"

    loss_pct = max(0.0, -(pnl_pct or 0.0))
    risk_usage = loss_pct / max(max_loss_tolerance_pct, 1.0)

    if has_position and risk_usage >= 1.0:
        return "REDUCE_OR_SELL"

    at_position_cap = position_pct is not None and position_pct >= max_position_pct

    if at_position_cap:
        if analysis_score >= 0.6:
            return "HOLD_DO_NOT_ADD"
        if analysis_score <= -0.4:
            return "REDUCE_OR_SELL"
        return "REDUCE_RISK"

    if not has_position:
        if analysis_action == "sell" or analysis_score <= -0.4:
            return "AVOID_NEW"
        if analysis_score >= 0.6 and risk_usage == 0:
            return "CONSIDER_BUY_NEW"
        if analysis_score >= 0.3:
            return "WAIT"
        return "WAIT"

    # Has position
    if analysis_score >= 0.6:
        if risk_usage < 0.5:
            return "CONSIDER_ADDING"
        return "HOLD_DO_NOT_ADD"

    if analysis_score <= -0.4:
        if risk_usage >= 0.75:
            return "REDUCE_OR_SELL"
        return "CONSIDER_REDUCING"

    if analysis_action == "sell":
        if risk_usage >= 0.75:
            return "REDUCE_OR_SELL"
        return "CONSIDER_REDUCING"

    if risk_usage >= 0.75:
        return "HOLD_WITH_TIGHT_RISK_CONTROL"

    return "HOLD"


def _build_summary(
    action: str,
    analysis_score: float,
    risk_usage: Optional[float],
    has_position: bool,
    position_pct: Optional[float],
    max_position_pct: float,
) -> str:
    band_note = ""
    if risk_usage is not None and has_position:
        band = _risk_usage_band(risk_usage)
        band_note = RISK_USAGE_BANDS[band]

    if action == "CONSIDER_ADDING":
        return (
            "สัญญาณพื้นฐานและเทคนิคเป็นบวก ขณะที่สถานะยังอยู่ในระดับความเสี่ยงที่คุณรับได้ "
            "— พิจารณาเพิ่มแบบจำกัดขนาดตามแผน DCA"
        )
    if action == "HOLD_DO_NOT_ADD":
        if position_pct is not None and position_pct >= max_position_pct * 0.8:
            return (
                f"สัญญาณยังดี แต่สัดส่วนหุ้นนี้ในพอร์ต ~{position_pct:.1f}% ใกล้เพดาน {max_position_pct:.0f}% "
                "— ถือต่อได้ แต่ไม่ควรเพิ่ม"
            )
        if risk_usage is not None and risk_usage >= 0.5:
            return (
                f"สัญญาณยังดี แต่ใช้งบการขาดทุนไปแล้ว ~{risk_usage * 100:.0f}% ของขีดจำกัด "
                "— ถือต่อ รอฟื้นตัวก่อนเพิ่ม"
            )
        return "สัญญาณเป็นบวกแต่ยังไม่เหมาะเพิ่ม — ถือต่อตามแผน"
    if action == "REDUCE_OR_SELL":
        if risk_usage is not None and risk_usage >= 1.0:
            return "เกินขีดจำกัดการขาดทุนส่วนบุคคล — ควรลดสัดส่วนหรือขายตามแผนจัดการความเสี่ยง"
        return "สัญญาณกดดันหรือราคาทะลุ stop — พิจารณาลดหรือขายเพื่อปกป้องพอร์ต"
    if action == "HOLD_WITH_TIGHT_RISK_CONTROL":
        return (
            f"ใกล้ขีดจำกัดการขาดทุนที่ยอมรับ ({band_note}) "
            "— ถือต่อได้แต่ตั้ง stop ชัดเจน อย่าเพิ่มสถานะ"
        )
    if action == "CONSIDER_REDUCING":
        return (
            "แม้ยังไม่ถึงขีดจำกัดการขาดทุนส่วนบุคคล แต่แนวโน้มและคะแนนวิเคราะห์ไม่สนับสนุนการเพิ่มสถานะ "
            "— พิจารณาลดบางส่วน"
        )
    if action == "CONSIDER_BUY_NEW":
        return "สัญญาณวิเคราะห์เป็นบวกและยังไม่มีสถานะ — เหมาะเริ่มเข้าแบบแบ่งงวดตามแผน"
    if action == "AVOID_NEW":
        return "สัญญาณไม่สนับสนุน — ยังไม่เหมาะเปิดสถานะใหม่ รอจน score ดีขึ้น"
    if action == "REDUCE_RISK":
        return f"สัดส่วนหุ้นในพอร์ต ~{position_pct:.1f}% สูง — ลดความเสี่ยงก่อนเพิ่มสถานะ"
    if has_position and abs(analysis_score) < 0.3:
        return (
            "สถานะปัจจุบันยังอยู่ห่างจากขีดจำกัดการขาดทุนของคุณ "
            "แต่สัญญาณวิเคราะห์ยังไม่ชัด — ถือต่อ รอ breakout หรือ pullback ใกล้แนวรับ"
        )
    return "ถือหรือรอดู — สัญญาณยังไม่ชัดเจนพอสำหรับการตัดสินใจใหญ่"


def build_personalized_risk(
    *,
    analysis_score: float,
    analysis_action: str,
    current_price: float,
    stop_loss: Optional[float],
    max_loss_tolerance_pct: float,
    max_position_pct: float,
    avg_cost: Optional[float] = None,
    pnl_pct: Optional[float] = None,
    position_pct: Optional[float] = None,
    currency: str = "USD",
) -> PersonalizedRiskResult:
    has_position = avg_cost is not None and avg_cost > 0

    personal_risk_floor = None
    effective_stop = stop_loss
    if has_position and avg_cost:
        personal_risk_floor = round(avg_cost * (1 - max_loss_tolerance_pct / 100), 2)
        if stop_loss is not None:
            effective_stop = round(max(stop_loss, personal_risk_floor), 2)

    technical_stop_breached = (
        stop_loss is not None
        and current_price <= stop_loss
    )

    loss_pct = max(0.0, -(pnl_pct or 0.0)) if has_position else None
    risk_usage = (loss_pct / max(max_loss_tolerance_pct, 1.0)) if has_position else None
    risk_band = _risk_usage_band(risk_usage) if risk_usage is not None else None

    action = personalized_action(
        analysis_score=analysis_score,
        analysis_action=analysis_action,
        pnl_pct=pnl_pct,
        max_loss_tolerance_pct=max_loss_tolerance_pct,
        technical_stop_breached=technical_stop_breached,
        position_pct=position_pct,
        max_position_pct=max_position_pct,
        has_position=has_position,
    )

    notes: List[str] = []
    notes.append(
        f"ยอมรับขาดทุนสูงสุดต่อหุ้น {max_loss_tolerance_pct:.0f}% "
        "(ลดลงจากต้นทุนเฉลี่ย ไม่ใช่คำแนะนำให้ถือจนถึงระดับนี้)"
    )
    if personal_risk_floor is not None:
        notes.append(f"เส้นขอบเขตส่วนบุคคล (Personal Risk Floor): {personal_risk_floor:,.2f} {currency}")
    if stop_loss is not None:
        notes.append(f"Technical Stop: {stop_loss:,.2f} {currency}")
    if effective_stop is not None and has_position:
        notes.append(f"Stop ที่ระบบใช้ (สูงกว่า = ป้องกันเร็วกว่า): {effective_stop:,.2f} {currency}")
    if position_pct is not None:
        notes.append(f"สัดส่วนในพอร์ต: ~{position_pct:.1f}% (เพดาน {max_position_pct:.0f}%)")

    summary = _build_summary(
        action, analysis_score, risk_usage, has_position, position_pct, max_position_pct,
    )

    return PersonalizedRiskResult(
        action=action,
        action_label=PERSONALIZED_ACTION_LABELS.get(action, action),
        summary=summary,
        max_loss_tolerance_pct=max_loss_tolerance_pct,
        max_position_pct=max_position_pct,
        current_loss_pct=round(loss_pct, 2) if loss_pct is not None else None,
        risk_usage_pct=round(risk_usage * 100, 1) if risk_usage is not None else None,
        risk_usage_band=risk_band,
        personal_risk_floor=personal_risk_floor,
        technical_stop=stop_loss,
        effective_stop=effective_stop,
        position_pct=round(position_pct, 1) if position_pct is not None else None,
        technical_stop_breached=technical_stop_breached,
        has_position=has_position,
        notes=notes,
    )
