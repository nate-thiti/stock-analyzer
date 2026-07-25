export function computeEMA(values, period) {
  const result = new Array(values.length).fill(null);
  if (values.length < period) return result;

  let sum = 0;
  for (let i = 0; i < period; i += 1) sum += values[i];
  let ema = sum / period;
  result[period - 1] = ema;

  const k = 2 / (period + 1);
  for (let i = period; i < values.length; i += 1) {
    ema = values[i] * k + ema * (1 - k);
    result[i] = ema;
  }
  return result;
}

export function computeRSI(closes, period = 14) {
  const result = new Array(closes.length).fill(null);
  if (closes.length <= period) return result;

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i += 1) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) avgGain += diff;
    else avgLoss -= diff;
  }
  avgGain /= period;
  avgLoss /= period;
  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < closes.length; i += 1) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return result;
}

export function computeMACD(closes, fast = 12, slow = 26, signalPeriod = 9) {
  const emaFast = computeEMA(closes, fast);
  const emaSlow = computeEMA(closes, slow);
  const macd = new Array(closes.length).fill(null);
  const signal = new Array(closes.length).fill(null);
  const histogram = new Array(closes.length).fill(null);

  const macdRaw = [];
  for (let i = 0; i < closes.length; i += 1) {
    if (emaFast[i] != null && emaSlow[i] != null) {
      macd[i] = emaFast[i] - emaSlow[i];
      macdRaw.push(macd[i]);
    } else {
      macdRaw.push(null);
    }
  }

  const macdValues = macd.filter((v) => v != null);
  if (macdValues.length >= signalPeriod) {
    const signalEma = computeEMA(macdValues, signalPeriod);
    let signalIdx = 0;
    for (let i = 0; i < closes.length; i += 1) {
      if (macd[i] == null) continue;
      signal[i] = signalEma[signalIdx];
      histogram[i] = macd[i] - signal[i];
      signalIdx += 1;
    }
  }

  return { macd, signal, histogram };
}

export function computeSupportResistance(history, window = 20) {
  if (!history?.length) return { support: [], resistance: [] };

  const lows = history.map((h) => h.low);
  const highs = history.map((h) => h.high);
  const currentPrice = history[history.length - 1].close;
  const half = Math.floor(window / 2);

  const localMinima = [];
  const localMaxima = [];

  for (let i = 1; i < history.length - 1; i += 1) {
    const start = Math.max(0, i - half);
    const end = Math.min(history.length - 1, i + half);

    let isMin = true;
    let isMax = true;
    for (let j = start; j <= end; j += 1) {
      if (lows[j] < lows[i]) isMin = false;
      if (highs[j] > highs[i]) isMax = false;
    }

    if (isMin && lows[i] < lows[i - 1] && lows[i] < lows[i + 1]) {
      localMinima.push(lows[i]);
    }
    if (isMax && highs[i] > highs[i - 1] && highs[i] > highs[i + 1]) {
      localMaxima.push(highs[i]);
    }
  }

  const support = [...new Set(localMinima.filter((l) => l < currentPrice))]
    .sort((a, b) => b - a)
    .slice(0, 3);
  const resistance = [...new Set(localMaxima.filter((l) => l > currentPrice))]
    .sort((a, b) => a - b)
    .slice(0, 3);

  return {
    support: support.length ? support : [Math.min(...lows)],
    resistance: resistance.length ? resistance : [Math.max(...highs)],
  };
}

export function detectTrend(closes, ema21, ema50) {
  const price = closes[closes.length - 1];
  const e21 = ema21[ema21.length - 1];
  const e50 = ema50[ema50.length - 1];
  if (e21 == null || e50 == null) return 'sideways';
  if (price > e21 && e21 > e50) return 'uptrend';
  if (price < e21 && e21 < e50) return 'downtrend';
  return 'sideways';
}

const TREND_LABELS = {
  uptrend: 'ขาขึ้น',
  downtrend: 'ขาลง',
  sideways: 'ไซด์เวย์',
};

export function buildChartIndicators(history) {
  if (!history?.length) {
    return {
      ema9: [], ema21: [], ema50: [],
      rsi: [], macd: [], macdSignal: [], macdHistogram: [],
      support: [], resistance: [], trend: 'sideways', trendLabel: TREND_LABELS.sideways,
    };
  }

  const closes = history.map((h) => h.close);
  const ema9 = computeEMA(closes, 9);
  const ema21 = computeEMA(closes, 21);
  const ema50 = computeEMA(closes, 50);
  const rsi = computeRSI(closes, 14);
  const { macd, signal, histogram } = computeMACD(closes);
  const { support, resistance } = computeSupportResistance(history);
  const trend = detectTrend(closes, ema21, ema50);

  return {
    ema9, ema21, ema50,
    rsi,
    macd,
    macdSignal: signal,
    macdHistogram: histogram,
    support,
    resistance,
    trend,
    trendLabel: TREND_LABELS[trend] || TREND_LABELS.sideways,
  };
}
