import { useEffect, useRef, useState, useMemo } from 'react';
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  LineStyle,
} from 'lightweight-charts';
import { useTheme } from '../context/ThemeContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { buildChartIndicators } from '../utils/chartIndicators';
import InfoTip from './InfoTip';
import { GLOSSARY } from '../utils/glossary';

const DAILY_INTERVALS = new Set(['1d', '1wk', '1mo']);
const DESKTOP_HEIGHT = 720;
const MOBILE_HEIGHT = 480;

const COLORS = {
  ema9: '#f59e0b',
  ema21: '#3b82f6',
  ema50: '#ec4899',
  rsi: '#a78bfa',
  macd: '#60a5fa',
  macdSignal: '#fb923c',
  support: '#10B981',
  resistance: '#EF4444',
  histUp: '#10B981',
  histDown: '#EF4444',
};

function getChartColors() {
  const style = getComputedStyle(document.documentElement);
  return {
    bg: style.getPropertyValue('--chart-bg').trim() || '#161c2c',
    text: style.getPropertyValue('--chart-text').trim() || '#94a3b8',
    grid: style.getPropertyValue('--chart-grid').trim() || 'rgba(35,45,66,0.5)',
    border: style.getPropertyValue('--chart-border').trim() || '#232d42',
  };
}

function toChartTime(rawTime, interval) {
  if (DAILY_INTERVALS.has(interval)) {
    return rawTime.slice(0, 10);
  }
  const ms = Date.parse(rawTime);
  if (Number.isNaN(ms)) {
    return rawTime.slice(0, 10);
  }
  return Math.floor(ms / 1000);
}

function toLinePoints(history, values, interval) {
  return history
    .map((item, i) => {
      const value = values[i];
      if (value == null || Number.isNaN(value)) return null;
      return { time: toChartTime(item.time, interval), value };
    })
    .filter(Boolean)
    .sort((a, b) => (a.time > b.time ? 1 : -1));
}

function toHistPoints(history, values, interval) {
  return history
    .map((item, i) => {
      const value = values[i];
      if (value == null || Number.isNaN(value)) return null;
      return {
        time: toChartTime(item.time, interval),
        value,
        color: value >= 0 ? COLORS.histUp : COLORS.histDown,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a.time > b.time ? 1 : -1));
}

const TREND_STYLES = {
  uptrend: 'text-success bg-success/10 border-success/25',
  downtrend: 'text-danger bg-danger/10 border-danger/25',
  sideways: 'text-warning bg-warning/10 border-warning/25',
};

function formatChartAxisTime(time, exchangeTimezone) {
  if (typeof time === 'number') {
    return new Date(time * 1000).toLocaleString('th-TH', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: exchangeTimezone || undefined,
    });
  }
  if (time && typeof time === 'object' && 'year' in time) {
    return `${time.day} ${time.month} ${time.year}`;
  }
  return String(time);
}

export default function StockChart({ history, interval = '1d', exchangeTimezone }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const [error, setError] = useState(null);
  const chartHeight = isMobile ? MOBILE_HEIGHT : DESKTOP_HEIGHT;

  const indicators = useMemo(() => buildChartIndicators(history), [history]);

  useEffect(() => {
    if (!containerRef.current || !history?.length) return;

    setError(null);

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    let chart;
    try {
      const colors = getChartColors();

      chart = createChart(containerRef.current, {
        layout: {
          background: { type: 'solid', color: colors.bg },
          textColor: colors.text,
          fontSize: 12,
          fontFamily: 'Inter, system-ui, sans-serif',
        },
        grid: {
          vertLines: { color: colors.grid },
          horzLines: { color: colors.grid },
        },
        rightPriceScale: { borderColor: colors.border },
        timeScale: {
          borderColor: colors.border,
          timeVisible: !DAILY_INTERVALS.has(interval),
          secondsVisible: false,
        },
        ...(exchangeTimezone && !DAILY_INTERVALS.has(interval)
          ? {
              localization: {
                timeFormatter: (time) => formatChartAxisTime(time, exchangeTimezone),
              },
            }
          : {}),
        width: containerRef.current.clientWidth,
        height: chartHeight,
      });

      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#10B981',
        downColor: '#EF4444',
        borderVisible: false,
        wickUpColor: '#10B981',
        wickDownColor: '#EF4444',
      }, 0);

      const candleData = history
        .map((item) => ({
          time: toChartTime(item.time, interval),
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
        }))
        .sort((a, b) => (a.time > b.time ? 1 : -1));

      candleSeries.setData(candleData);

      const ema9Series = chart.addSeries(LineSeries, {
        color: COLORS.ema9,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        title: 'EMA9',
      }, 0);
      ema9Series.setData(toLinePoints(history, indicators.ema9, interval));

      const ema21Series = chart.addSeries(LineSeries, {
        color: COLORS.ema21,
        lineWidth: 1.5,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        title: 'EMA21',
      }, 0);
      ema21Series.setData(toLinePoints(history, indicators.ema21, interval));

      const ema50Series = chart.addSeries(LineSeries, {
        color: COLORS.ema50,
        lineWidth: 1.5,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        title: 'EMA50',
      }, 0);
      ema50Series.setData(toLinePoints(history, indicators.ema50, interval));

      indicators.support.forEach((price, idx) => {
        candleSeries.createPriceLine({
          price,
          color: COLORS.support,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: idx === 0 ? 'S' : `S${idx + 1}`,
        });
      });

      indicators.resistance.forEach((price, idx) => {
        candleSeries.createPriceLine({
          price,
          color: COLORS.resistance,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: idx === 0 ? 'R' : `R${idx + 1}`,
        });
      });

      chart.panes()[0].setStretchFactor(isMobile ? 4 : 5.5);

      const rsiPane = chart.addPane();
      rsiPane.setStretchFactor(isMobile ? 1.2 : 2);
      const rsiSeries = rsiPane.addSeries(LineSeries, {
        color: COLORS.rsi,
        lineWidth: 1.5,
        priceLineVisible: false,
        lastValueVisible: true,
        title: 'RSI',
      });
      rsiSeries.setData(toLinePoints(history, indicators.rsi, interval));
      rsiSeries.createPriceLine({
        price: 70,
        color: 'rgba(239,68,68,0.45)',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: false,
        title: '',
      });
      rsiSeries.createPriceLine({
        price: 30,
        color: 'rgba(16,185,129,0.45)',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: false,
        title: '',
      });

      const macdPane = chart.addPane();
      macdPane.setStretchFactor(isMobile ? 1.3 : 2.5);
      const histSeries = macdPane.addSeries(HistogramSeries, {
        priceLineVisible: false,
        lastValueVisible: false,
        title: 'MACD',
      });
      histSeries.setData(toHistPoints(history, indicators.macdHistogram, interval));

      const macdLineSeries = macdPane.addSeries(LineSeries, {
        color: COLORS.macd,
        lineWidth: 1.5,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        title: 'MACD',
      });
      macdLineSeries.setData(toLinePoints(history, indicators.macd, interval));

      const macdSignalSeries = macdPane.addSeries(LineSeries, {
        color: COLORS.macdSignal,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        title: 'Signal',
      });
      macdSignalSeries.setData(toLinePoints(history, indicators.macdSignal, interval));

      chart.timeScale().fitContent();
      chartRef.current = chart;
    } catch (err) {
      chart?.remove();
      chartRef.current = null;
      setError(err.message || 'ไม่สามารถแสดงกราฟได้');
    }

    const onResize = () => {
      if (chartRef.current && containerRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chartRef.current?.remove();
      chartRef.current = null;
    };
  }, [history, theme, interval, indicators, isMobile, chartHeight, exchangeTimezone]);

  if (error) {
    return (
      <div className="h-[480px] sm:h-[720px] flex items-center justify-center text-sm text-danger bg-surface/40 rounded-xl border border-danger/20">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-[10px]">
        <span className={`px-2 py-0.5 rounded-md border font-semibold ${TREND_STYLES[indicators.trend]}`}>
          <InfoTip term={GLOSSARY.trend} label={`เทรนด์: ${indicators.trendLabel}`} />
        </span>
        <LegendDot color={COLORS.ema9} label="EMA 9" tip={GLOSSARY.ema} />
        <LegendDot color={COLORS.ema21} label="EMA 21" tip={GLOSSARY.ema} />
        <LegendDot color={COLORS.ema50} label="EMA 50" tip={GLOSSARY.ema} />
        <LegendDot color={COLORS.support} label="Support" tip={GLOSSARY.support} dashed />
        <LegendDot color={COLORS.resistance} label="Resistance" tip={GLOSSARY.resistance} dashed />
        <LegendDot color={COLORS.rsi} label="RSI" tip={GLOSSARY.rsi} />
        <LegendDot color={COLORS.macd} label="MACD" tip={GLOSSARY.macd} />
        <LegendDot color={COLORS.macdSignal} label="Signal" tip={GLOSSARY.macd} />
      </div>
      <div ref={containerRef} className="w-full rounded-xl overflow-hidden border border-border/80 bg-card" />
    </div>
  );
}

function LegendDot({ color, label, tip, dashed = false }) {
  return (
    <span className="inline-flex items-center gap-1 text-muted">
      <span
        className="w-3 h-0.5 rounded-full shrink-0"
        style={{
          backgroundColor: dashed ? 'transparent' : color,
          borderTop: dashed ? `2px dashed ${color}` : undefined,
          height: dashed ? 0 : undefined,
        }}
      />
      <InfoTip term={tip} label={label} />
    </span>
  );
}
