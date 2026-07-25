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
  Percent,
  Upload,
  Download,
  FileText,
  LineChart,
  PieChart
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
  
  // Analysis states
  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [savedAnalyses, setSavedAnalyses] = useState([]);
  
  // Batch analysis states
  const [batchSymbols, setBatchSymbols] = useState('');
  const [batchResults, setBatchResults] = useState([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [showBatchResults, setShowBatchResults] = useState(false);

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

  // Load saved analyses from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('stockAnalyses');
    if (saved) {
      setSavedAnalyses(JSON.parse(saved));
    }
  }, []);

  // Save analysis to localStorage
  const saveAnalysis = (analysisData) => {
    const newAnalysis = {
      ...analysisData,
      savedAt: new Date().toISOString()
    };
    const updated = [...savedAnalyses.filter(a => a.symbol !== analysisData.symbol), newAnalysis];
    setSavedAnalyses(updated);
    localStorage.setItem('stockAnalyses', JSON.stringify(updated));
  };

  // Load saved analysis
  const loadSavedAnalysis = (symbol) => {
    const saved = savedAnalyses.find(a => a.symbol === symbol);
    if (saved) {
      setAnalysis(saved);
      setShowAnalysis(true);
      setSearchSymbol(symbol);
      setCurrentSymbol(symbol);
    }
  };

  // Delete saved analysis
  const deleteSavedAnalysis = (symbol) => {
    const updated = savedAnalyses.filter(a => a.symbol !== symbol);
    setSavedAnalyses(updated);
    localStorage.setItem('stockAnalyses', JSON.stringify(updated));
  };

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

  // CSV Import
  const handleCSVImport = async (e) => {
    e.preventDefault();
    if (!csvFile) return;

    setAnalysisLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const csvData = event.target.result;
      try {
        const response = await fetch(`${API_BASE_URL}/csv/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol: currentSymbol,
            csv_data: csvData
          })
        });
        
        if (!response.ok) throw new Error('Failed to import CSV');
        
        const result = await response.json();
        setAnalysis(result);
        setShowAnalysis(true);
        saveAnalysis(result); // Auto-save to localStorage
      } catch (err) {
        setError(err.message);
      } finally {
        setAnalysisLoading(false);
      }
    };
    reader.readAsText(csvFile);
  };

  // CSV Export
  const handleCSVExport = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/csv/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: currentSymbol,
          period: period,
          interval: interval
        })
      });
      
      if (!response.ok) throw new Error('Failed to export CSV');
      
      const result = await response.json();
      
      // Download CSV file
      const blob = new Blob([result.csv_data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentSymbol}_${period}_${interval}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err.message);
    }
  };

  // Full Analysis
  const handleFullAnalysis = async () => {
    setAnalysisLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/analysis/full?symbol=${currentSymbol}&period=${period}&interval=${interval}`);
      
      if (!response.ok) throw new Error('Failed to perform analysis');
      
      const result = await response.json();
      setAnalysis(result);
      setShowAnalysis(true);
      saveAnalysis(result); // Auto-save to localStorage
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalysisLoading(false);
    }
  };

  // Batch Analysis
  const handleBatchAnalysis = async () => {
    const symbols = batchSymbols.split(',').map(s => s.trim()).filter(s => s);
    if (symbols.length === 0) {
      setError('กรุณาระบุสัญลักษณ์หุ้นอย่างน้อย 1 ตัว');
      return;
    }

    setBatchLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/analysis/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbols: symbols,
          period: period,
          interval: interval
        })
      });
      
      if (!response.ok) throw new Error('Failed to perform batch analysis');
      
      const result = await response.json();
      setBatchResults(result.results);
      setShowBatchResults(true);
      
      // Save all results to localStorage
      result.results.forEach(item => {
        if (!item.error) {
          saveAnalysis(item);
        }
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBatchLoading(false);
    }
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
            <div className="bg-gradient-primary p-2.5 rounded-xl text-white shadow-lg shadow-blue-500/20 animate-glow">
              <Activity size={22} className="icon-animate" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                <span className="text-gradient">ANTIGRAVITY</span> <span className="text-primary font-medium text-xs bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">STOCKS</span>
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

              {/* CSV Import/Export & Analysis Buttons */}
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={handleCSVExport}
                  className="flex items-center gap-2 px-4 py-2 bg-[#0F1322] border border-border rounded-xl text-xs font-medium text-gray-300 hover:border-primary hover:text-white transition-all btn-hover"
                >
                  <Download size={14} className="icon-animate" />
                  Export CSV
                </button>
                
                <button
                  onClick={() => document.getElementById('csvInput').click()}
                  className="flex items-center gap-2 px-4 py-2 bg-[#0F1322] border border-border rounded-xl text-xs font-medium text-gray-300 hover:border-primary hover:text-white transition-all btn-hover"
                >
                  <Upload size={14} className="icon-animate" />
                  Import CSV
                </button>
                <input
                  id="csvInput"
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files[0])}
                  className="hidden"
                />
                
                {csvFile && (
                  <button
                    onClick={handleCSVImport}
                    disabled={analysisLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-primary border border-primary rounded-xl text-xs font-medium text-white hover:opacity-90 transition-all btn-hover disabled:opacity-50"
                  >
                    <FileText size={14} className="icon-animate" />
                    {analysisLoading ? 'Analyzing...' : 'Analyze CSV'}
                  </button>
                )}
                
                <button
                  onClick={handleFullAnalysis}
                  disabled={analysisLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 rounded-xl text-xs font-medium text-primary hover:bg-primary/20 transition-all btn-hover disabled:opacity-50"
                >
                  <LineChart size={14} className="icon-animate" />
                  {analysisLoading ? 'Analyzing...' : 'Full Analysis'}
                </button>
              </div>

              {/* Batch Analysis Section */}
              <div className="mt-6 pt-6 border-t border-border/40">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Layers size={14} className="text-primary icon-animate" />
                  Batch Analysis (วิเคราะห์หลายหุ้นพร้อมกัน)
                </h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="ใส่สัญลักษณ์หุ้นคั่นด้วยจุลภาค เช่น AAPL,TSLA,GOOGL"
                    value={batchSymbols}
                    onChange={(e) => setBatchSymbols(e.target.value)}
                    className="flex-1 bg-[#0F1322] border border-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                  <button
                    onClick={handleBatchAnalysis}
                    disabled={batchLoading || !batchSymbols.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-primary border border-primary rounded-xl text-xs font-medium text-white hover:opacity-90 transition-all btn-hover disabled:opacity-50 whitespace-nowrap"
                  >
                    {batchLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full icon-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <LineChart size={14} className="icon-animate" />
                        Analyze All
                      </>
                    )}
                  </button>
                </div>
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

            {/* Saved Analyses */}
            {savedAnalyses.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                  <FileText size={14} className="text-primary" />
                  การวิเคราะห์ที่บันทึกไว้ ({savedAnalyses.length})
                </h4>
                <div className="space-y-2">
                  {savedAnalyses.map((saved) => (
                    <div key={saved.symbol} className="flex items-center justify-between bg-[#0F1322]/40 p-3 rounded-xl border border-border/30">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-bold text-white">{saved.symbol}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          saved.recommendation === 'buy' ? 'bg-success/10 text-success' :
                          saved.recommendation === 'sell' ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'
                        }`}>
                          {saved.recommendation?.toUpperCase()}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {new Date(saved.savedAt).toLocaleDateString('th-TH')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => loadSavedAnalysis(saved.symbol)}
                          className="text-[10px] text-primary hover:text-white transition-colors"
                        >
                          โหลด
                        </button>
                        <button
                          onClick={() => deleteSavedAnalysis(saved.symbol)}
                          className="text-[10px] text-danger hover:text-red-400 transition-colors"
                        >
                          ลบ
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Batch Analysis Results */}
            {showBatchResults && batchResults.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Layers size={14} className="text-primary" />
                  ผลการวิเคราะห์แบบ Batch ({batchResults.length})
                </h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {batchResults.map((result) => (
                    <div key={result.symbol} className={`flex items-center justify-between p-3 rounded-xl border ${
                      result.error 
                        ? 'bg-danger/5 border-danger/20' 
                        : 'bg-[#0F1322]/40 border-border/30'
                    }`}>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-bold text-white">{result.symbol}</span>
                        {result.error ? (
                          <span className="text-[10px] text-danger">{result.error}</span>
                        ) : (
                          <>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              result.recommendation === 'buy' ? 'bg-success/10 text-success' :
                              result.recommendation === 'sell' ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'
                            }`}>
                              {result.recommendation?.toUpperCase()}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {Math.round(result.confidence * 100)}%
                            </span>
                          </>
                        )}
                      </div>
                      {!result.error && (
                        <button
                          onClick={() => loadSavedAnalysis(result.symbol)}
                          className="text-[10px] text-primary hover:text-white transition-colors"
                        >
                          ดูรายละเอียด
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Analysis Results */}
            {showAnalysis && analysis && (
              <div className="space-y-6 animate-fadeIn">
                {/* Recommendation Card */}
                <div className={`bg-card border rounded-2xl p-6 shadow-sm ${
                  analysis.recommendation === 'buy' ? 'border-success/30' :
                  analysis.recommendation === 'sell' ? 'border-danger/30' : 'border-warning/30'
                }`}>
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <PieChart size={16} className="text-primary" />
                    คำแนะนำการลงทุน
                  </h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className={`text-2xl font-black ${
                        analysis.recommendation === 'buy' ? 'text-success' :
                        analysis.recommendation === 'sell' ? 'text-danger' : 'text-warning'
                      }`}>
                        {analysis.recommendation?.toUpperCase()}
                      </span>
                      <p className="text-xs text-gray-400 mt-1">ความมั่นใจ: {(analysis.confidence * 100).toFixed(0)}%</p>
                    </div>
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                      analysis.recommendation === 'buy' ? 'bg-success/10' :
                      analysis.recommendation === 'sell' ? 'bg-danger/10' : 'bg-warning/10'
                    }`}>
                      {analysis.recommendation === 'buy' ? <TrendingUp size={24} className="text-success" /> :
                       analysis.recommendation === 'sell' ? <TrendingDown size={24} className="text-danger" /> :
                       <Activity size={24} className="text-warning" />}
                    </div>
                  </div>
                </div>

                {/* Fundamental Analysis */}
                {analysis.fundamental && (
                  <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                      <Building2 size={16} className="text-primary" />
                      Fundamental Analysis
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-[#0F1322]/40 p-3 rounded-xl border border-border/30">
                        <p className="text-[10px] text-gray-400 font-bold uppercase">P/E Ratio</p>
                        <p className="text-xs font-mono font-bold text-white mt-1">{analysis.fundamental.pe_ratio?.toFixed(2) || '-'}</p>
                      </div>
                      <div className="bg-[#0F1322]/40 p-3 rounded-xl border border-border/30">
                        <p className="text-[10px] text-gray-400 font-bold uppercase">PEG Ratio</p>
                        <p className="text-xs font-mono font-bold text-white mt-1">{analysis.fundamental.peg_ratio?.toFixed(2) || '-'}</p>
                      </div>
                      <div className="bg-[#0F1322]/40 p-3 rounded-xl border border-border/30">
                        <p className="text-[10px] text-gray-400 font-bold uppercase">P/S Ratio</p>
                        <p className="text-xs font-mono font-bold text-white mt-1">{analysis.fundamental.ps_ratio?.toFixed(2) || '-'}</p>
                      </div>
                      <div className="bg-[#0F1322]/40 p-3 rounded-xl border border-border/30">
                        <p className="text-[10px] text-gray-400 font-bold uppercase">P/B Ratio</p>
                        <p className="text-xs font-mono font-bold text-white mt-1">{analysis.fundamental.pb_ratio?.toFixed(2) || '-'}</p>
                      </div>
                      <div className="bg-[#0F1322]/40 p-3 rounded-xl border border-border/30">
                        <p className="text-[10px] text-gray-400 font-bold uppercase">ROE</p>
                        <p className="text-xs font-mono font-bold text-white mt-1">{analysis.fundamental.roe?.toFixed(2) || '-'}</p>
                      </div>
                      <div className="bg-[#0F1322]/40 p-3 rounded-xl border border-border/30">
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Debt/Equity</p>
                        <p className="text-xs font-mono font-bold text-white mt-1">{analysis.fundamental.debt_to_equity?.toFixed(2) || '-'}</p>
                      </div>
                      <div className="bg-[#0F1322]/40 p-3 rounded-xl border border-border/30">
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Revenue Growth</p>
                        <p className="text-xs font-mono font-bold text-white mt-1">{analysis.fundamental.revenue_growth?.toFixed(2) || '-'}</p>
                      </div>
                      <div className="bg-[#0F1322]/40 p-3 rounded-xl border border-border/30">
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Earnings Growth</p>
                        <p className="text-xs font-mono font-bold text-white mt-1">{analysis.fundamental.earnings_growth?.toFixed(2) || '-'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Technical Analysis */}
                {analysis.technical && (
                  <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                      <LineChart size={16} className="text-primary" />
                      Technical Analysis
                    </h3>
                    <div className="space-y-4">
                      <div className="bg-[#0F1322]/40 p-3 rounded-xl border border-border/30">
                        <p className="text-[10px] text-gray-400 font-bold uppercase">RSI Signal</p>
                        <p className={`text-xs font-bold mt-1 ${
                          analysis.technical.rsi_signal === 'buy' ? 'text-success' :
                          analysis.technical.rsi_signal === 'sell' ? 'text-danger' : 'text-warning'
                        }`}>
                          {analysis.technical.rsi_signal?.toUpperCase() || 'NEUTRAL'}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-[#0F1322]/40 p-3 rounded-xl border border-border/30">
                          <p className="text-[10px] text-gray-400 font-bold uppercase">Support Levels</p>
                          <p className="text-xs font-mono font-bold text-white mt-1">
                            {analysis.technical.support_levels?.slice(0, 3).join(', ') || '-'}
                          </p>
                        </div>
                        <div className="bg-[#0F1322]/40 p-3 rounded-xl border border-border/30">
                          <p className="text-[10px] text-gray-400 font-bold uppercase">Resistance Levels</p>
                          <p className="text-xs font-mono font-bold text-white mt-1">
                            {analysis.technical.resistance_levels?.slice(0, 3).join(', ') || '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Trend Analysis */}
                {analysis.trend && (
                  <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                      <Activity size={16} className="text-primary" />
                      Trend Analysis
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-[#0F1322]/40 p-3 rounded-xl border border-border/30">
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Trend</p>
                        <p className={`text-xs font-bold mt-1 ${
                          analysis.trend.trend_direction === 'uptrend' ? 'text-success' :
                          analysis.trend.trend_direction === 'downtrend' ? 'text-danger' : 'text-warning'
                        }`}>
                          {analysis.trend.trend_direction?.toUpperCase()}
                        </p>
                      </div>
                      <div className="bg-[#0F1322]/40 p-3 rounded-xl border border-border/30">
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Strength</p>
                        <p className="text-xs font-bold text-white mt-1">{analysis.trend.trend_strength?.toUpperCase()}</p>
                      </div>
                      <div className="bg-[#0F1322]/40 p-3 rounded-xl border border-border/30">
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Volume</p>
                        <p className="text-xs font-bold text-white mt-1">{analysis.trend.volume_trend?.toUpperCase()}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}

export default App;

