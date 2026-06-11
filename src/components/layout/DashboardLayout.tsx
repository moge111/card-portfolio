import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function DashboardLayout() {
  return (
    <div className="flex min-h-screen">
      {/* Franchise-colored aurora, drifting behind everything */}
      <div aria-hidden>
        <div className="orb h-[28rem] w-[28rem] -top-32 -left-24" style={{ background: '#facc15' }} />
        <div className="orb h-96 w-96 top-1/4 -right-32" style={{ background: '#ef4444', animationDelay: '-9s' }} />
        <div className="orb h-80 w-80 bottom-8 left-1/4" style={{ background: '#fb923c', animationDelay: '-17s' }} />
        <div className="orb h-96 w-96 -bottom-32 right-1/4" style={{ background: '#a855f7', animationDelay: '-5s' }} />
      </div>
      <Sidebar />
      <main className="flex-1 lg:ml-0 overflow-x-hidden">
        <div className="p-6 pt-16 lg:pt-10 lg:p-10 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
