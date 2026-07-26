import { useState, useEffect } from 'react';
import { Coffee } from 'lucide-react';
import { BMC_URL as VITE_BMC_URL } from '../config';

async function fetchSupportUrl() {
  const res = await fetch('/api/config/public', { credentials: 'include' });
  if (!res.ok) return '';
  const data = await res.json();
  return (data.bmc_url || '').trim();
}

function isKoFi(url) {
  return url.includes('ko-fi.com');
}

export default function SupportButton({ className = '', compact = false }) {
  const [url, setUrl] = useState(VITE_BMC_URL);

  useEffect(() => {
    if (VITE_BMC_URL) return;
    fetchSupportUrl().then(setUrl).catch(() => {});
  }, []);

  const koFi = url ? isKoFi(url) : false;
  const baseClass = koFi
    ? `inline-flex items-center gap-1.5 rounded-xl font-medium transition-all duration-300 border border-[#29abe0]/45 bg-[#29abe0]/10 text-[#29abe0] hover:bg-[#29abe0]/20 hover:border-[#29abe0]/65 hover:scale-[1.02] ${compact ? 'p-2' : 'text-xs px-3 py-2'} ${className}`
    : `inline-flex items-center gap-1.5 rounded-xl font-medium transition-all duration-300 border border-[#FFDD00]/40 bg-[#FFDD00]/10 text-[#c9a800] hover:bg-[#FFDD00]/20 hover:border-[#FFDD00]/60 hover:scale-[1.02] dark:text-[#FFDD00] ${compact ? 'p-2' : 'text-xs px-3 py-2'} ${className}`;

  const label = koFi ? 'Ko-fi' : 'Buy me a coffee';

  if (!url) {
    return (
      <span
        className={`${baseClass} opacity-45 cursor-not-allowed`}
        title="ตั้ง BMC_URL ใน .env แล้ว restart backend"
      >
        <Coffee size={compact ? 16 : 14} className="shrink-0" />
        {!compact && <span>สนับสนุน</span>}
      </span>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={baseClass}
      title={koFi ? 'สนับสนุนผ่าน Ko-fi' : 'สนับสนุนค่า server'}
    >
      <Coffee size={compact ? 16 : 14} className="shrink-0" />
      {!compact && <span>{label}</span>}
    </a>
  );
}
