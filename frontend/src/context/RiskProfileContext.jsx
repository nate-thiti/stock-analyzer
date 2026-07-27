import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { useAuth } from './AuthContext';

const RiskProfileContext = createContext(null);

export function RiskProfileProvider({ children }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return null;
    }
    setLoading(true);
    try {
      const p = await api.getRiskProfile();
      setProfile(p);
      return p;
    } catch {
      setProfile(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(async (data) => {
    const p = await api.updateRiskProfile(data);
    setProfile(p);
    return p;
  }, []);

  const needsSetup = Boolean(user && profile && !profile.configured);

  return (
    <RiskProfileContext.Provider value={{ profile, loading, load, save, needsSetup }}>
      {children}
    </RiskProfileContext.Provider>
  );
}

export function useRiskProfile() {
  const ctx = useContext(RiskProfileContext);
  if (!ctx) throw new Error('useRiskProfile must be used within RiskProfileProvider');
  return ctx;
}

export function riskToleranceLabel(pct) {
  if (pct == null) return '-';
  if (pct <= 15) return 'อนุรักษนิยม';
  if (pct <= 25) return 'ปานกลาง';
  if (pct <= 40) return 'สูง';
  return 'สูงมาก';
}

export const RISK_USAGE_BAND_LABELS = {
  ok: 'อยู่ในระดับรับได้',
  watch: 'เริ่มเข้าเขตเฝ้าระวัง',
  near_limit: 'ใกล้ขีดจำกัด',
  exceeded: 'เกินความเสี่ยงที่กำหนด',
};
