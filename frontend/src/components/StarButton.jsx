import { Star } from 'lucide-react';
import { useFavorites } from '../context/FavoritesContext';

export default function StarButton({ symbol, className = '', size = 20 }) {
  const { isFavorite, toggle, loading } = useFavorites();
  const active = isFavorite(symbol);

  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(symbol); }}
      disabled={loading}
      className={`inline-flex items-center justify-center rounded-lg transition-colors hover:bg-warning/10 disabled:opacity-50 shrink-0 ${className}`}
      aria-label={active ? 'เอาดาวออก' : 'ติดดาว'}
      title={active ? 'เอาดาวออก' : 'ติดดาว'}
    >
      <Star
        size={size}
        className={active ? 'text-warning fill-warning' : 'text-muted hover:text-warning'}
      />
    </button>
  );
}
