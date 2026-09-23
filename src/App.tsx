import { HashRouter, Routes, Route } from 'react-router-dom';
import { AdminProvider } from './context/AdminContext';
import { PortfolioProvider } from './context/PortfolioContext';
import { GradingDeskProvider } from './context/GradingDeskContext';
import DashboardLayout from './components/layout/DashboardLayout';
import OverviewPage from './components/overview/OverviewPage';
import GradingPage from './components/grading/GradingPage';
import SealedPage from './components/sealed/SealedPage';
import SinglesPage from './components/singles/SinglesPage';
import PregradePage from './components/desk/PregradePage';
import CalculatorPage from './components/desk/CalculatorPage';
import CalibrationPage from './components/desk/CalibrationPage';

export default function App() {
  return (
    <AdminProvider>
    <PortfolioProvider>
    <GradingDeskProvider>
      <HashRouter>
        <Routes>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/grading" element={<GradingPage />} />
            <Route path="/sealed" element={<SealedPage />} />
            <Route path="/singles" element={<SinglesPage />} />
            <Route path="/pregrade" element={<PregradePage />} />
            <Route path="/calculator" element={<CalculatorPage />} />
            <Route path="/calibration" element={<CalibrationPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </GradingDeskProvider>
    </PortfolioProvider>
    </AdminProvider>
  );
}
