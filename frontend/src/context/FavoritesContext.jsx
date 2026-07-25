import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { api } from '../api';
import { useAuth } from './AuthContext';

const FavoritesContext = createContext(null);

export function FavoritesProvider({ children }) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [symbolSet, setSymbolSet] = useState(new Set());

  const refresh = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      setSymbolSet(new Set());
      return;
    }
    setLoading(true);
    try {
      const list = await api.listFavorites();
      setFavorites(list);
      setSymbolSet(new Set(list.map((f) => f.symbol)));
    } catch {
      setFavorites([]);
      setSymbolSet(new Set());
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const isFavorite = useCallback((symbol) => symbolSet.has(symbol?.toUpperCase()), [symbolSet]);

  const toggle = useCallback(async (symbol) => {
    const sym = symbol.toUpperCase();
    if (isFavorite(sym)) {
      await api.removeFavorite(sym);
      setFavorites((prev) => prev.filter((f) => f.symbol !== sym));
      setSymbolSet((prev) => { const n = new Set(prev); n.delete(sym); return n; });
    } else {
      const fav = await api.addFavorite(sym);
      setFavorites((prev) => [fav, ...prev]);
      setSymbolSet((prev) => new Set(prev).add(sym));
    }
  }, [isFavorite]);

  return (
    <FavoritesContext.Provider value={{ favorites, loading, isFavorite, toggle, refresh }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
