import React, { useState, useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Globe, 
  Info, 
  AlertTriangle, 
  ShieldCheck,
  Building2,
  Coins,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Layers,
  Percent
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:8010/api';

// หุ้นยอดนิยมที่แนะนำให้คลิกง่ายๆ
const POPULAR_STOCKS = [
  { symbol: 'PTT.BK', name: 'PTT', market: 'TH' },
  { symbol: 'CPALL.BK', name: 'CP ALL', market: 'TH' },
  { symbol: 'AAPL', name: 'Apple', market: 'US' },
  { symbol: 'TSLA', name: 'Tesla', market: 'US' },
  { symbol: '0700.HK', name: 'Tencent', market: 'CN' },
  { symbol: 'BABA', name: 'Alibaba', market: 'CN' }
];

function App() {
  const [searchSymbol, setSearchSymbol] = useState('PTT.BK');
  const [currentSymbol, setCurrentSymbol] = useState('PTT.BK');
  const [quote, setQuote] = useState(null);
  const [info, setInfo] = useState(null);
  const [history, setHistory] = useState([]);
  const [period, setPeriod] = useState('1mo');
  const [interval, setInterval] = useState('15m');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);

  // โหลดข้อมูลหุ้นล่าสุด
  const fetchStockData = async (symbol) => {
    setLoading(true);
    setError(null);
    try {
      // ดึงข้อมูลพร้อมกัน
      const [quoteRes, infoRes, historyRes] = await Promise.all([
        fetch(`${API_BASE_URL}/stock/quote?symbol=${symbol}`).then(res => {
          if (!res.ok) throw new Error("ไม่พบสัญลักษณ์หุ้นนี้");
          return res.json();
        }),
        fetch(`${API_BASE_URL}/stock/info?symbol=${symbol}`).then(res => res.ok ? res.json() : null),
        fetch(`${API_BASE_URL}/stock/history?symbol=${symbol}&period=${period}&interval=${interval}`).then(res => res.ok ? res.json() : { history: [] })
      ]);

      setQuote(quoteRes);
      setInfo(infoRes);
      setHistory(historyRes.history || []);
      setCurrentSymbol(symbol);
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  // โหลดข้อมูลเมื่อกดปุ่มค้นหา หรือเปลี่ยน period/interval
  useEffect(() => {
    fetchStockData(currentSymbol);
  }, [currentSymbol, period, interval]);

  // วาดกราฟ TradingView Lightweight Chart
  useEffect(() => {
    if (!chartContainerRef.current || history.length === 0) return;

    // เคลียร์กราฟเก่า
    if (chartRef.current) {
      chartRef.current.remove();
    }

    // สร้างกราฟใหม่
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: 'solid', color: '#161C2C' },
        textColor: '#94A3B8',
        fontSize: 11,
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(35, 45, 66, 0.5)' },
        horzLines: { color: 'rgba(35, 45, 66, 0.5)' },
      },
      rightPriceScale: {
        borderColor: '#232D42',
      },
      timeScale: {
        borderColor: '#232D42',
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: 380,
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#10B981',
      downColor: '#EF4444',
      borderVisible: false,
      wickUpColor: '#10B981',
      wickDownColor: '#EF4444',
    });

    // รูปแบบข้อมูลให้สอดคล้องกับ Lightweight Charts
    const chartData = history.map(item => {
      // แปลงเวลาให้เป็น UNIX Timestamp (วินาที)
      const timestamp = Math.floor(new Date(item.time).getTime() / 1000);
      return {
        time: timestamp,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
      };
    }).sort((a, b) => a.time - b.time);

    candleSeries.setData(chartData);

    // ปรับความพอดีของกราฟ
    chart.timeScale().fitContent();

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    // ปรับขนาดกราฟอัตโนมัติเมื่อจอเปลี่ยนขนาด
    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [history]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchSymbol.trim()) {
      setCurrentSymbol(searchSymbol.trim());
    }
  };

  const handlePopularClick = (sym) => {
    setSearchSymbol(sym);
    setCurrentSymbol(sym);
  };

  const formatMarketCap = (num) => {
    if (!num) return '-';
    if (num >= 1.0e12) return (num / 1.0e12).toFixed(2) + 'T';
    if (num >= 1.0e9) return (num / 1.0e9).toFixed(2) + 'B';
    if (num >= 1.0e6) return (num / 1.0e6).toFixed(2) + 'M';
    return num.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-background text-[#F3F4F6] font-sans antialiased pb-16">
      {/* Clean Premium Header */}
      <header className="border-b border-border bg-card/65 backdrop-blur-md sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2.5 rounded-xl text-primary border border-primary/20 shadow-lg shadow-primary/5">
              <Activity size={22} className="animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                ANTIGRAVITY <span className="text-primary font-medium text-xs bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">STOCKS</span>
              </h1>
              <p className="text-[10px] text-gray-400 font-mono tracking-wider uppercase">Global Market Intelligence</p>
            </div>
          </div>

          {/* Minimalist Search Box */}
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="ค้นหาหุ้น เช่น AAPL, PTT.BK, 0700.HK..."
              value={searchSymbol}
              onChange={(e) => setSearchSymbol(e.target.value)}
              className="w-full bg-[#0F1322] border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
            <Search className="absolute left-3.5 top-3 text-gray-500" size={16} />
          </form>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 mt-8">
        
        {/* Popular Tags */}
        <div className="flex flex-wrap items-center gap-2 mb-8 bg-card/30 p-2 rounded-2xl border border-border/40 backdrop-blur-sm">
          <span className="text-xs text-gray-400 flex items-center gap-1.5 px-3 py-1 font-medium">
            <Globe size={14} className="text-gray-500" /> ตลาด:
          </span>
          <div className="flex flex-wrap gap-2">
            {POPULAR_STOCKS.map((stock) => (
              <button
                key={stock.symbol}
                onClick={() => handlePopularClick(stock.symbol)}
                className={`px-4 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 border ${
                  currentSymbol === stock.symbol
                    ? 'bg-primary border-primary text-white shadow-lg shadow-primary/15'
                    : 'bg-[#161C2C]/50 border-border/70 text-gray-300 hover:border-gray-500 hover:text-white'
                }`}
              >
                {stock.name} <span className="opacity-50 text-[10px] ml-1 font-mono">{stock.symbol}</span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-danger/5 border border-danger/25 rounded-2xl p-4.5 mb-8 flex items-start gap-3.5 animate-fadeIn">
            <div className="p-2 bg-danger/10 rounded-xl text-danger border border-danger/20">
              <AlertTriangle size={18} />
            </div>
            <div>
              <p className="text-danger font-semibold text-sm">ไม่พบข้อมูลสัญลักษณ์หุ้น</p>
              <p className="text-xs text-gray-400 mt-1">กรุณาระบุสัญลักษณ์ให้ถูกต้อง เช่น หุ้นไทยต้องมี <span className="font-mono text-white bg-card px-1 py-0.5 rounded border border-border">.BK</span> หรือตรวจสอบว่าเซิร์ฟเวอร์ Backend รันอยู่</p>
            </div>
          </div>
        )}

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Chart Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              
              {/* Chart Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-6">
                <div>
                  {quote ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 bg-border rounded text-gray-300 border border-border/60">
                          {quote.exchange}
                        </span>
                        <h2 className="text-2xl font-bold tracking-tight text-white">{quote.symbol}</h2>
                        <span className="text-sm text-gray-400 truncate max-w-[200px]">{quote.name}</span>
                      </div>
                      
                      <div className="flex items-baseline gap-3 pt-1">
                        <span className="text-3xl font-black tracking-tight text-white">
                          {quote.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-xs font-mono text-gray-500 uppercase">{quote.currency}</span>
                        
                        <div className={`flex items-center text-xs font-semibold px-2.5 py-1 rounded-lg border ${
                          quote.change >= 0 
                            ? 'bg-success/5 border-success/20 text-success' 
                            : 'bg-danger/5 border-danger/20 text-danger'
                        }`}>
                          {quote.change >= 0 
                            ? <ArrowUpRight size={14} className="mr-1" /> 
                            : <ArrowDownRight size={14} className="mr-1" />
                          }
                          {quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2)} ({quote.change_percent.toFixed(2)}%)
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-16 flex items-center">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2"></div>
                      <span className="text-sm text-gray-400 font-medium">กำลังโหลดข้อมูลราคา...</span>
                    </div>
                  )}
                </div>

                {/* Dropdowns */}
                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">ช่วงเวลา</span>
                    <select
                      value={period}
                      onChange={(e) => setPeriod(e.target.value)}
                      className="bg-[#0F1322] border border-border rounded-xl text-xs py-2 px-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all cursor-pointer font-medium"
                    >
                      <option value="1d">1 วัน</option>
                      <option value="5d">5 วัน</option>
                      <option value="1mo">1 เดือน</option>
                      <option value="3mo">3 เดือน</option>
                      <option value="6mo">6 เดือน</option>
                      <option value="1y">1 ปี</option>
                      <option value="max">สูงสุด</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">ระยะเวลาแท่ง</span>
                    <select
                      value={interval}
                      onChange={(e) => setInterval(e.target.value)}
                      className="bg-[#0F1322] border border-border rounded-xl text-xs py-2 px-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all cursor-pointer font-medium"
                    >
                      <option value="5m">5 นาที</option>
                      <option value="15m">15 นาที</option>
                      <option value="60m">1 ชั่วโมง</option>
                      <option value="1d">1 วัน</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Chart Container */}
              <div className="relative">
                {loading && (
                  <div className="absolute inset-0 bg-card/80 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center gap-2.5 rounded-xl transition-all duration-300">
                    <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs text-gray-400 font-medium">กำลังปรับปรุงข้อมูล...</span>
                  </div>
                )}
                <div ref={chartContainerRef} className="w-full rounded-xl overflow-hidden border border-border/80 bg-[#161C2C]" />
              </div>

              {/* Chart Footer */}
              <div className="mt-4 pt-4 border-t border-border/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-gray-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-success" /> 
                  ระบบ Cache ข้อมูลเปิดทำงาน (อัปเดตทุก 5 นาที)
                </span>
                <span>ข้อมูลจาก Yahoo Finance • อ้างอิงเวลาเซิร์ฟเวอร์</span>
              </div>

            </div>
          </div>

          {/* Stats & Info Section */}
          <div className="space-y-6">
            
            {/* Fundamental Card */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-white mb-5 flex items-center gap-2 border-b border-border/60 pb-3.5">
                <Building2 size={16} className="text-primary" />
                ข้อมูลทางการเงินและบริษัท
              </h3>

              {info ? (
                <div className="space-y-5">
                  {/* Grid details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#0F1322]/40 p-3 rounded-xl border border-border/30">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Layers size={11} className="text-gray-500" /> กลุ่มธุรกิจ
                      </p>
                      <p className="text-xs font-semibold text-white mt-1 truncate">{info.sector || '-'}</p>
                    </div>
                    
                    <div className="bg-[#0F1322]/40 p-3 rounded-xl border border-border/30">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Building2 size={11} className="text-gray-500" /> อุตสาหกรรม
                      </p>
                      <p className="text-xs font-semibold text-white mt-1 truncate">{info.industry || '-'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#0F1322]/40 p-3 rounded-xl border border-border/30">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        <BarChart3 size={11} className="text-gray-500" /> Market Cap
                      </p>
                      <p className="text-xs font-mono font-bold text-white mt-1">{formatMarketCap(info.market_cap)}</p>
                    </div>

                    <div className="bg-[#0F1322]/40 p-3 rounded-xl border border-border/30">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Coins size={11} className="text-gray-500" /> P/E Ratio
                      </p>
                      <p className="text-xs font-mono font-bold text-white mt-1">{info.pe_ratio ? info.pe_ratio.toFixed(2) : '-'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#0F1322]/40 p-3 rounded-xl border border-border/30">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Percent size={11} className="text-gray-500" /> Dividend Yield
                      </p>
                      <p className="text-xs font-mono font-bold text-white mt-1">{info.dividend_yield ? (info.dividend_yield * 100).toFixed(2) + '%' : '-'}</p>
                    </div>

                    <div className="bg-[#0F1322]/40 p-3 rounded-xl border border-border/30">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Info size={11} className="text-gray-500" /> 52-W High/Low
                      </p>
                      <p className="text-[11px] font-mono font-bold text-white mt-1">
                        {info.fifty_two_week_high?.toLocaleString() || '-'} / {info.fifty_two_week_low?.toLocaleString() || '-'}
                      </p>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="pt-2">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Info size={12} className="text-gray-500" /> สรุปธุรกิจ
                    </p>
                    <div className="bg-[#0F1322]/30 p-3.5 rounded-xl border border-border/30">
                      <p className="text-xs text-gray-300 leading-relaxed max-h-40 overflow-y-auto pr-1 text-justify scrollbar-thin">
                        {info.summary || 'ไม่มีข้อมูลสรุปสำหรับหุ้นตัวนี้'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center bg-[#0F1322]/20 rounded-xl border border-border/20">
                  <p className="text-xs text-gray-500 font-medium">ไม่พบข้อมูลบริษัทเพิ่มเติม</p>
                </div>
              )}
            </div>

            {/* Quick Tips */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">คำแนะนำในการค้นหา</h4>
              <ul className="text-xs text-gray-400 space-y-2.5 list-none">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <span><strong className="text-white">หุ้นไทย:</strong> ต่อท้ายด้วย <code className="text-primary font-mono bg-[#0F1322] px-1 py-0.5 rounded border border-border">.BK</code> เช่น PTT.BK, CPALL.BK</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <span><strong className="text-white">หุ้นสหรัฐฯ:</strong> ใส่ตัวย่อตรงๆ เช่น AAPL, TSLA, NVDA</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <span><strong className="text-white">หุ้นจีน/ฮ่องกง:</strong> ค้นหารหัสตามด้วยตลาด เช่น 0700.HK</span>
                </li>
              </ul>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

export default App;

