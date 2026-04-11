import { HashRouter, Routes, Route } from 'react-router-dom';
import { AdminProvider } from './context/AdminContext';
import { PortfolioProvider } from './context/PortfolioContext';
import DashboardLayout from './components/layout/DashboardLayout';
import OverviewPage from './components/overview/OverviewPage';
import GradingPage from './components/grading/GradingPage';
import SealedPage from './components/sealed/SealedPage';
import SinglesPage from './components/singles/SinglesPage';

export default function App() {
  return (
    <AdminProvider>
    <PortfolioProvider>
      <HashRouter>
        <Routes>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/grading" element={<GradingPage />} />
            <Route path="/sealed" element={<SealedPage />} />
            <Route path="/singles" element={<SinglesPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </PortfolioProvider>
    </AdminProvider>
  );
}
