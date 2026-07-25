import { useEffect, useRef } from 'react';
import { createChart, LineSeries } from 'lightweight-charts';
import { useTheme } from '../../context/ThemeContext';

function getChartColors() {
  const style = getComputedStyle(document.documentElement);
  return {
    bg: style.getPropertyValue('--chart-bg').trim() || '#161c2c',
    text: style.getPropertyValue('--chart-text').trim() || '#94a3b8',
    grid: style.getPropertyValue('--chart-grid').trim() || 'rgba(35,45,66,0.5)',
    border: style.getPropertyValue('--chart-border').trim() || '#232d42',
  };
}

export default function PeHistoryChart({ history, large = false }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const { theme } = useTheme();
  const height = large ? 300 : 220;

  useEffect(() => {
    if (!containerRef.current || !history?.length) return;

    chartRef.current?.remove();
    chartRef.current = null;

    const colors = getChartColors();
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: 'solid', color: colors.bg },
        textColor: colors.text,
        fontSize: 13,
      },
      grid: {
        vertLines: { color: colors.grid },
        horzLines: { color: colors.grid },
      },
      rightPriceScale: { borderColor: colors.border },
      timeScale: { borderColor: colors.border },
      width: containerRef.current.clientWidth,
      height,
    });

    const series = chart.addSeries(LineSeries, {
      color: '#8b5cf6',
      lineWidth: 2,
      priceLineVisible: false,
    });

    const data = history
      .filter((h) => h.pe_ratio != null)
      .map((h) => ({ time: h.time.slice(0, 10), value: h.pe_ratio }))
      .sort((a, b) => (a.time > b.time ? 1 : -1));

    if (data.length) {
      series.setData(data);
      chart.timeScale().fitContent();
    }

    chartRef.current = chart;

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
  }, [history, theme, height]);

  if (!history?.length) {
    return (
      <div
        className="flex items-center justify-center text-xs text-muted rounded-xl border border-border/80 bg-card"
        style={{ height }}
      >
        ไม่มีประวัติ P/E
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full flex-1 rounded-xl overflow-hidden border border-border/80 bg-card min-h-[300px]"
    />
  );
}
