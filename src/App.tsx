import { HashRouter, Routes, Route } from 'react-router-dom';
import DashboardLayout from './components/layout/DashboardLayout';
import OverviewPage from './components/overview/OverviewPage';
import GradingPage from './components/grading/GradingPage';
import SealedPage from './components/sealed/SealedPage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/grading" element={<GradingPage />} />
          <Route path="/sealed" element={<SealedPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
