import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DashboardLayout from './components/layout/DashboardLayout';
import OverviewPage from './components/overview/OverviewPage';
import GradingPage from './components/grading/GradingPage';
import SealedPage from './components/sealed/SealedPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/grading" element={<GradingPage />} />
          <Route path="/sealed" element={<SealedPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
