import { Link } from 'react-router-dom';
import {
  BookOpen, ChevronRight, Home, Search, Star, Bell, Briefcase,
  GitCompare, BarChart3, LogIn, UserPlus,
} from 'lucide-react';
import {
  MockFrame, MockHeader, MockNavPills, MockSearchBar, MockStockCard,
  MockRecentChip, MockSignalSection, MockStockHeader, MockChart,
  MockTradingPlan, MockPortfolioForm, MockFavoriteCard, MockAlertModal,
  MockAlertsPage, MockCompare, MockLogin, StepList, TipBox,
} from '../components/guide/GuideMockups';

const SECTIONS = [
  { id: 'start', label: 'เริ่มต้น', icon: LogIn },
  { id: 'home', label: 'หน้าแรก', icon: Home },
  { id: 'stock', label: 'หน้าหุ้น', icon: BarChart3 },
  { id: 'portfolio', label: 'พอร์ต', icon: Briefcase },
  { id: 'favorites', label: 'ติดดาว', icon: Star },
  { id: 'alerts', label: 'แจ้งเตือน', icon: Bell },
  { id: 'compare', label: 'เปรียบเทียบ', icon: GitCompare },
  { id: 'tips', label: 'Tips & ข้อจำกัด', icon: BookOpen },
];

function GuideSection({ id, title, icon: Icon, children }) {
  return (
    <section id={id} className="scroll-mt-24 w-full min-w-0">
      <h2 className="text-lg sm:text-xl font-black text-foreground flex items-center gap-2 mb-4 pb-2 border-b border-border/40">
        <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
          <Icon size={18} />
        </span>
        {title}
      </h2>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function GuideBlock({ title, steps, mock, tip, reverse = false }) {
  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start ${reverse ? 'lg:[direction:rtl]' : ''}`}>
      <div className={`space-y-3 min-w-0 ${reverse ? 'lg:[direction:ltr]' : ''}`}>
        {title && <h3 className="text-sm font-bold text-foreground">{title}</h3>}
        {steps && <StepList items={steps} />}
        {tip && <TipBox variant={tip.variant}>{tip.text}</TipBox>}
      </div>
      {mock && (
        <div className={`min-w-0 ${reverse ? 'lg:[direction:ltr]' : ''}`}>
          {mock}
        </div>
      )}
    </div>
  );
}

export default function GuidePage() {
  return (
    <div className="w-full min-w-0 space-y-8 sm:space-y-10">
      {/* Hero */}
      <div className="text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl font-black text-foreground flex items-center justify-center sm:justify-start gap-2">
          <BookOpen size={28} className="text-primary shrink-0" />
          คู่มือการใช้งาน
        </h1>
        <p className="text-sm text-muted mt-2 max-w-2xl mx-auto sm:mx-0">
          สอนทีละขั้น พร้อมภาพจำลองหน้าจอ — ใช้ได้ทั้งมือถือ แท็บเล็ต และคอมพิวเตอร์
          {' '}• ข้อมูลราคาและวิเคราะห์อัปเดตอัตโนมัติทุก <span className="font-bold text-primary">1 นาที</span>
        </p>
      </div>

      {/* TOC */}
      <nav className="glass-card rounded-2xl p-4 sm:p-5 lg:sticky lg:top-[60px] lg:z-20">
        <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-3">สารบัญ</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <a
              key={id}
              href={`#${id}`}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-medium bg-surface/60 border border-border/40 text-muted hover:text-primary hover:border-primary/30 transition-colors min-w-0"
            >
              <Icon size={12} className="shrink-0" />
              <span className="truncate">{label}</span>
            </a>
          ))}
        </div>
      </nav>

      {/* ── เริ่มต้น ── */}
      <GuideSection id="start" title="เริ่มต้น — สมัคร & เข้าใช้งาน" icon={LogIn}>
        <GuideBlock
          title="สมัครสมาชิก (ครั้งแรก)"
          steps={[
            'เปิดเมนูแล้วไปที่ สมัครสมาชิก หรือเปิด /register',
            'กรอก ชื่อผู้ใช้, อีเมล, รหัสผ่าน (อย่างน้อย 6 ตัว) และยืนยันรหัสผ่าน',
            'กด สมัครสมาชิก — ระบบ login ให้อัตโนมัติและพาเข้าหน้าแรก',
          ]}
          mock={
            <MockFrame title="stock-analyzer.app/register">
              <MockLogin />
              <p className="text-[9px] text-center text-muted mt-2">→ เปลี่ยนเป็นลิงก์ สมัครสมาชิก</p>
            </MockFrame>
          }
        />
        <GuideBlock
          title="เข้าสู่ระบบ (ครั้งถัดไป)"
          steps={[
            'ไปที่ /login กรอก อีเมล + รหัสผ่าน',
            'Session เก็บใน cookie — ปิดแท็บแล้วเปิดใหม่ยัง login อยู่ (จนกว่าจะ logout)',
          ]}
          reverse
          mock={
            <MockFrame title="เข้าสู่ระบบ">
              <MockLogin />
            </MockFrame>
          }
        />
        <GuideBlock
          title="เมนูหลัก & การนำทาง"
          steps={[
            'มือถือ/แท็บเล็ต: กด ☰ มุมขวาบน → เลือกหน้า',
            'คอมพิวเตอร์ (จอใหญ่): เมนูแสดงที่ header — หน้าแรก, พอร์ต, ติดดาว, แจ้งเตือน, เปรียบเทียบ, คู่มือ',
            'กระดิ่ง 🔔 มุมขวา — แสดง badge เมื่อมี alert ถึงราคาเป้า → คลิกไปหน้า แจ้งเตือน',
            'ปุ่มดวงอาทิตย์/พระจันทร์ — สลับ Dark / Light theme',
          ]}
          mock={
            <MockFrame title="Header & เมนู">
              <MockHeader />
              <MockNavPills />
            </MockFrame>
          }
        />
      </GuideSection>

      {/* ── หน้าแรก ── */}
      <GuideSection id="home" title="หน้าแรก" icon={Home}>
        <GuideBlock
          title="ค้นหาหุ้น"
          steps={[
            'พิมพ์สัญลักษณ์หรือชื่อบริษัทในช่องค้นหา แล้วกด Enter',
            'ถ้าเจอ 1 รายการ → ไปหน้าหุ้นทันที',
            'ถ้าเจอหลายรายการ → เลือกจากรายการ dropdown',
            'ตัวอย่าง: AAPL (US), PTT.BK (ไทย), 0700.HK (ฮ่องกง)',
          ]}
          mock={
            <MockFrame title="/">
              <MockSearchBar />
              <div className="rounded-xl border border-border/40 divide-y divide-border/30 text-[10px]">
                <div className="px-3 py-2 flex justify-between"><span><b>AAPL</b> Apple Inc.</span><span className="text-muted">NASDAQ</span></div>
                <div className="px-3 py-2 flex justify-between"><span><b>PTT.BK</b> PTT</span><span className="text-muted">SET</span></div>
              </div>
            </MockFrame>
          }
        />
        <GuideBlock
          title="ดูล่าสุด"
          steps={[
            'หุ้นที่เปิดล่าสุดจะเก็บในเบราว์เซอร์ (สูงสุด 10 รายการ)',
            'แสดงราคา + % เปลี่ยนแปลง — อัปเดต auto ทุก 1 นาที',
            'กด × มุมขวาบนการ์ดเพื่อลบออกจากรายการ',
            'ข้อมูลไม่ sync ข้ามเครื่อง (เก็บ localStorage)',
          ]}
          reverse
          mock={
            <MockFrame title="ดูล่าสุด">
              <div className="flex gap-2 overflow-x-auto pb-1">
                <MockRecentChip />
                <MockStockCard symbol="AAPL" name="Apple" price="189.2" pct="+0.5" />
              </div>
            </MockFrame>
          }
        />
        <GuideBlock
          title="หุ้นยอดนิยม"
          steps={[
            'การ์ดหุ้นที่ admin ตั้งเป็น popular — คลิกการ์ดเพื่อเข้าหน้าวิเคราะห์',
            'ราคาบนการ์ดอัปเดต auto ทุก 1 นาที',
            'กด ⭐ มุมขวาล่างเพื่อเพิ่มรายการโปรด (ต้อง login)',
          ]}
          mock={
            <MockFrame title="หุ้นยอดนิยม">
              <div className="grid grid-cols-2 gap-2">
                <MockStockCard />
                <MockStockCard symbol="NVDA" name="NVIDIA" price="892" pct="+1.2" />
              </div>
            </MockFrame>
          }
        />
        <GuideBlock
          title="สัญญาณจากระบบ (Market Signals)"
          steps={[
            'ระบบสแกนหุ้นใน watchlist แล้วจัดกลุ่ม: ควรซื้อ / ถือต่อ / ขาย',
            'Watchlist ทั่วไป — หุ้นที่ admin ตั้ง (default 15 ตัว)',
            'รายการโปรด — ใช้หุ้นที่คุณติดดาว (ถ้าไม่มีจะ fallback เป็น watchlist ทั่วไป)',
            'อัปเดต auto ทุก 1 นาที — กด รีเฟรช เพื่อบังคับสแกนใหม่',
            'ครั้งแรกอาจใช้เวลา 20–40 วินาที',
          ]}
          reverse
          mock={
            <MockFrame title="Market Signals">
              <MockSignalSection />
            </MockFrame>
          }
        />
        <GuideBlock
          title="เปรียบเทียบด่วน"
          steps={[
            'เลือก preset หมวด (Big Tech, SET ยอดนิยม ฯลฯ) ด้านล่างหน้าแรก',
            'กด เปรียบเทียบ → ไปหน้า Compare พร้อมหุ้นที่เลือก',
          ]}
          tip={{ text: 'Preset มี 23 หมวด — ครอบคลุม US, ไทย, ฮ่องกง', variant: 'info' }}
        />
      </GuideSection>

      {/* ── หน้าหุ้น ── */}
      <GuideSection id="stock" title="หน้าหุ้น — วิเคราะห์เชิงลึก" icon={BarChart3}>
        <GuideBlock
          title="ราคา & กราฟแท่งเทียน"
          steps={[
            'แสดงราคาปัจจุบัน, % เปลี่ยนแปลง, เวลาซื้อขายล่าสุด (จาก Yahoo)',
            'เลือก ช่วงเวลา (1mo–5y) และ แท่งเทียน (รายวัน / สัปดาห์ / ชม.)',
            'กราฟมี EMA 9/21/50, RSI, MACD, Support/Resistance อัตโนมัติ',
            'hover ที่ ? ข้างคำศัพท์เพื่อดูความหมาย',
            'ราคา, กราฟ และวิเคราะห์ refresh ทุก 1 นาที',
          ]}
          mock={
            <MockFrame title="/stock/MSFT">
              <MockStockHeader />
              <div className="flex gap-2 mt-2 mb-2">
                <span className="text-[9px] px-2 py-1 rounded-lg bg-surface border border-border/40">6 เดือน ▾</span>
                <span className="text-[9px] px-2 py-1 rounded-lg bg-surface border border-border/40">รายวัน ▾</span>
              </div>
              <MockChart />
            </MockFrame>
          }
        />
        <GuideBlock
          title="⭐ ติดดาว & 🔔 แจ้งเตือน"
          steps={[
            '⭐ — เพิ่ม/เอาหุ้นออกจากรายการโปรด',
            '🔔 Alert — เปิด modal ตั้งราคาแจ้งเตือน',
            'เลือกเงื่อนไข: ราคา ≥ เป้า (ขึ้นถึง) หรือ ราคา ≤ เป้า (ลงถึง)',
            'ใส่ราคาเป้าแล้วกด ตั้ง Alert',
          ]}
          reverse
          mock={
            <MockFrame title="ตั้ง Price Alert">
              <MockAlertModal />
            </MockFrame>
          }
        />
        <GuideBlock
          title="ข้อมูลบริษัท & เงินปันผล"
          steps={[
            'ด้านขวา (มือถือ: ด้านล่างกราฟ) — Sector, Industry, Market Cap, P/E, Div Yield, Beta',
            'สรุปธุรกิจ (summary) เลื่อนอ่านได้',
            'แผงเงินปันผล — ประวัติงวด, กราฟ bar, Div Yield ประจำปี',
          ]}
          mock={
            <MockFrame title="ข้อมูลบริษัท">
              <div className="grid grid-cols-2 gap-2 text-[9px]">
                {['Sector: Technology', 'P/E: 32.5', 'Div Yield: 0.7%', 'Beta: 0.89'].map((t) => (
                  <div key={t} className="bg-surface/60 rounded-lg p-2 border border-border/30">{t}</div>
                ))}
              </div>
            </MockFrame>
          }
        />
        <GuideBlock
          title="Valuation & Trading Plan"
          steps={[
            'Valuation — คะแนน ถูก/แพง, Radar chart, งบรายไตรมาส, ประวัติ P/E',
            'Trading Plan (แผงขวา) — คำแนะนำ ซื้อ/ถือ/ขาย, Stop Loss, Target, จำนวนหุ้น, R:R',
            'สลับ ถืออยู่แล้ว / ยังไม่ได้ซื้อ — คำแนะนำเปลี่ยนตามสถานะ',
            'ถ้าบันทึกหุ้นในพอร์ต → ใช้จำนวนหุ้นจริงในแผน',
            'วิเคราะห์ refresh ทุก 1 นาที',
          ]}
          reverse
          mock={
            <MockFrame title="Trading Plan">
              <MockTradingPlan />
            </MockFrame>
          }
        />
        {(
          <TipBox variant="warn">
            ถ้าถือหุ้นในพอร์ต จะมีแบนเนอร์ด้านบนลิงก์ไป /portfolio พร้อมแสดงกำไร/ขาดทุน
          </TipBox>
        )}
      </GuideSection>

      {/* ── พอร์ต ── */}
      <GuideSection id="portfolio" title="พอร์ตของฉัน" icon={Briefcase}>
        <GuideBlock
          title="เพิ่ม & จัดการหุ้น"
          steps={[
            'กรอก สัญลักษณ์ + จำนวนหุ้น + ราคาซื้อเฉลี่ย → กด เพิ่ม',
            'ตารางแสดง มูลค่า, กำไร/ขาดทุน (unrealized) — อัปเดตราคา auto ทุก 1 นาที',
            'กด แก้ เพื่อเปลี่ยนจำนวน/ทุน | กด ลบ เพื่อเอาออก',
            '🔔 ตั้ง alert ได้จากคอลัมน์จัดการ',
          ]}
          mock={
            <MockFrame title="/portfolio">
              <MockPortfolioForm />
            </MockFrame>
          }
        />
        <GuideBlock
          title="Dashboard"
          steps={[
            'การ์ดสรุป — มูลค่ารวม, ต้นทุน, กำไร/ขาดทุน, % P/L',
            'Pie chart — สัดส่วนแต่ละหุ้น',
            'Bar chart — แยกตาม Sector',
            'การ์ด กำไรสูงสุด / ขาดทุนสูงสุด',
            'ราคาและ P/L อัปเดต auto ทุก 1 นาที',
          ]}
          reverse
          mock={
            <MockFrame title="Portfolio Dashboard">
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="rounded-lg p-2 bg-surface/60 border border-border/40 text-center">
                  <p className="text-[8px] text-muted">มูลค่ารวม</p>
                  <p className="text-sm font-black">125,400</p>
                </div>
                <div className="rounded-lg p-2 bg-success/10 border border-success/25 text-center">
                  <p className="text-[8px] text-muted">กำไร</p>
                  <p className="text-sm font-black text-success">+8,200</p>
                </div>
              </div>
              <div className="h-20 rounded-lg bg-surface/40 border border-border/30 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full border-[6px] border-primary/40 border-r-accent/40 border-b-success/40" />
              </div>
            </MockFrame>
          }
        />
      </GuideSection>

      {/* ── ติดดาว ── */}
      <GuideSection id="favorites" title="หุ้นติดดาว" icon={Star}>
        <GuideBlock
          title="รายการโปรด"
          steps={[
            'เพิ่มหุ้นจาก ⭐ ในหน้าหุ้น, การ์ดหน้าแรก, หรือ Market Signals',
            'หน้า /favorites แสดงการ์ดทุกหุ้นพร้อมราคา live (ทุก 1 นาที)',
            'กด ⭐ อีกครั้งบนการ์ดเพื่อเอาดาวออก',
            '🔔 กดกระดิ่งบนการ์ดเพื่อตั้ง alert โดยไม่ต้องเข้าหน้าหุ้น',
            'รายการโปรดใช้เป็น watchlist สำหรับ Market Signals (โหมด รายการโปรด)',
          ]}
          mock={
            <MockFrame title="/favorites">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <MockFavoriteCard />
                <MockFavoriteCard />
              </div>
            </MockFrame>
          }
        />
      </GuideSection>

      {/* ── แจ้งเตือน ── */}
      <GuideSection id="alerts" title="แจ้งเตือนราคา" icon={Bell}>
        <GuideBlock
          title="หน้าจัดการ Alert (/alerts)"
          steps={[
            'ดูสรุป: ทั้งหมด / กำลังเฝ้า / ถึงเป้าแล้ว',
            'Notifications — alert ที่ trigger แล้ว (พื้นหลังสีเหลือง)',
            'ฟอร์ม ตั้ง Alert ใหม่ — ใส่ symbol, เงื่อนไข, ราคาเป้า',
            'ตารางด้านล่าง — filter ทั้งหมด / เฝ้า / ถึงเป้า, ลบได้',
            'ตรวจราคา auto ทุก 1 นาที — badge กระดิ่งใน header เมื่อถึงเป้า',
          ]}
          mock={
            <MockFrame title="/alerts">
              <MockAlertsPage />
            </MockFrame>
          }
        />
        <GuideBlock
          title="ตั้ง Alert ได้จากที่ไหนบ้าง"
          steps={[
            'หน้าหุ้น — ปุ่ม 🔔 ข้าง ⭐',
            'รายการโปรด — 🔔 มุมขวาบนการ์ด',
            'พอร์ต — 🔔 ในตาราง',
            'หน้า /alerts — ฟอร์มตั้งใหม่',
          ]}
          reverse
          tip={{ text: 'Alert ไม่ส่ง push notification ทาง email — ต้องเปิดเว็บเพื่อดู (ตรวจทุก 1 นาที)', variant: 'warn' }}
        />
      </GuideSection>

      {/* ── เปรียบเทียบ ── */}
      <GuideSection id="compare" title="เปรียบเทียบหุ้น" icon={GitCompare}>
        <GuideBlock
          title="วิธีเปรียบเทียบ"
          steps={[
            'เลือก 2–5 หุ้น — ค้นหา, กด preset, หรือ + เพิ่มด่วน',
            'กด preset เพื่อ preview รายชื่อ (ยังไม่ compare จนกว่าจะกดปุ่ม)',
            'กด + เลือกหุ้นจาก preset เพื่อใส่ทั้งชุด',
            'กด เปรียบเทียบ — รอผล (อาจใช้เวลาสักครู่)',
            'ดู Best Pick, กราฟ valuation, ตารางละเอียด (กด แสดงรายละเอียด)',
            'กด แชร์ลิงก์ — copy URL แชร์ให้คนอื่น',
            'หน้า Compare ไม่ auto-refresh — กดเปรียบเทียบใหม่เมื่อต้องการข้อมูลล่าสุด',
          ]}
          mock={
            <MockFrame title="/compare">
              <MockCompare />
            </MockFrame>
          }
        />
      </GuideSection>

      {/* ── Tips ── */}
      <GuideSection id="tips" title="Tips & ข้อจำกัดข้อมูล" icon={BookOpen}>
        <div className="space-y-4">
          <TipBox variant="warn">
            <p className="font-bold mb-2">ข้อมูลจาก Yahoo Finance</p>
            <ul className="space-y-1 text-muted list-disc pl-4">
              <li>อาจดีเลย์ 5–15 นาที — ไม่เหมาะสำหรับ day trading แบบ real-time</li>
              <li>เวลาซื้อขายล่าสุด อาจเป็นข้อมูลย้อนหลังเมื่อตลาดปิด</li>
              <li>คำแนะนำซื้อ/ขายเป็น rule-based — ใช้เพื่อการศึกษา ไม่ใช่คำแนะนำลงทุน</li>
            </ul>
          </TipBox>

          <TipBox variant="info">
            <p className="font-bold mb-1">อัปเดตอัตโนมัติทุก 1 นาที</p>
            <p className="text-muted">
              ราคา, กราฟ, วิเคราะห์, Market Signals, พอร์ต, ติดดาว และ Price Alerts ดึงข้อมูลใหม่ทุก 1 นาที
              — เมื่อสลับกลับมาแท็บนี้ ระบบจะ refresh ทันที
            </p>
          </TipBox>

          <div className="glass-card rounded-2xl p-4 sm:p-5">
            <p className="text-sm font-bold text-foreground mb-3">ช่วงเวลาอัปเดตอัตโนมัติ</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm min-w-[280px]">
                <thead>
                  <tr className="text-[10px] text-muted uppercase border-b border-border/40">
                    <th className="text-left py-2 pr-4">หน้า / ฟีเจอร์</th>
                    <th className="text-left py-2">Refresh</th>
                  </tr>
                </thead>
                <tbody className="text-muted">
                  {[
                    ['หน้าหุ้น — ราคา / กราฟ / วิเคราะห์', '1 นาที'],
                    ['หน้าแรก — การ์ดราคา / ดูล่าสุด', '1 นาที'],
                    ['Market Signals', '1 นาที'],
                    ['พอร์ต / ติดดาว', '1 นาที'],
                    ['Price Alerts (ตรวจ trigger)', '1 นาที'],
                    ['เปรียบเทียบหุ้น', 'เมื่อกดเปรียบเทียบเท่านั้น'],
                    ['Backend cache (Yahoo Finance)', '1 นาที'],
                  ].map(([a, b]) => (
                    <tr key={a} className="border-b border-border/20">
                      <td className="py-2 pr-4">{a}</td>
                      <td className="py-2 font-mono text-primary">{b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-4 sm:p-5">
            <p className="text-sm font-bold text-foreground mb-3">รูปแบบสัญลักษณ์หุ้น</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted">
              <p><span className="font-mono font-bold text-foreground">AAPL</span> — สหรัฐฯ</p>
              <p><span className="font-mono font-bold text-foreground">PTT.BK</span> — ไทย SET</p>
              <p><span className="font-mono font-bold text-foreground">0700.HK</span> — ฮ่องกง</p>
              <p><span className="font-mono font-bold text-foreground">BABA</span> — จีน ADR</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link to="/" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              ไปหน้าแรก <ChevronRight size={14} />
            </Link>
            <Link to="/register" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              <UserPlus size={14} /> สมัครสมาชิก
            </Link>
          </div>
        </div>
      </GuideSection>
    </div>
  );
}
