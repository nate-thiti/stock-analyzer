import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import ProtectedRoute, { SuperAdminRoute } from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import StockPage from './pages/StockPage';
import ComparePage from './pages/ComparePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminPage from './pages/AdminPage';
import FavoritesPage from './pages/FavoritesPage';
import PortfolioPage from './pages/PortfolioPage';
import AlertsPage from './pages/AlertsPage';
import GuidePage from './pages/GuidePage';

const AnimatedBackground = lazy(() => import('./components/AnimatedBackground'));

function BgFallback() {
  return <div className="fixed inset-0 -z-10 bg-background" aria-hidden="true" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<BgFallback />}>
        <AnimatedBackground />
      </Suspense>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
          <Route index element={<ErrorBoundary><HomePage /></ErrorBoundary>} />
          <Route path="stock/:symbol" element={<ErrorBoundary><StockPage /></ErrorBoundary>} />
          <Route path="compare" element={<ErrorBoundary><ComparePage /></ErrorBoundary>} />
          <Route path="favorites" element={<ErrorBoundary><FavoritesPage /></ErrorBoundary>} />
          <Route path="portfolio" element={<ErrorBoundary><PortfolioPage /></ErrorBoundary>} />
          <Route path="alerts" element={<ErrorBoundary><AlertsPage /></ErrorBoundary>} />
          <Route path="guide" element={<ErrorBoundary><GuidePage /></ErrorBoundary>} />
          <Route path="admin" element={<SuperAdminRoute><ErrorBoundary><AdminPage /></ErrorBoundary></SuperAdminRoute>} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
