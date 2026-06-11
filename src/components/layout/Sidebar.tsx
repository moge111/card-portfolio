import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CreditCard, Package, Layers, Menu, X, Download, Upload, PencilLine } from 'lucide-react';
import { useState } from 'react';
import { usePortfolio } from '../../context/PortfolioContext';
import { useAdminToggle } from '../../context/AdminContext';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Overview' },
  { to: '/grading', icon: CreditCard, label: 'PSA Grading' },
  { to: '/singles', icon: Layers, label: 'Singles' },
  { to: '/sealed', icon: Package, label: 'Sealed' },
];

const BACKUP_KEYS = ['portfolio-grading', 'portfolio-singles', 'portfolio-sealed', 'portfolio-data-version'] as const;

function exportBackup() {
  const data: Record<string, string | null> = {};
  for (const key of BACKUP_KEYS) data[key] = localStorage.getItem(key);
  const payload = {
    exportedAt: new Date().toISOString(),
    schema: 'card-portfolio-backup-v1',
    data,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `card-portfolio-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importBackup() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const data = payload?.data ?? payload; // accept either wrapped or flat
      if (!confirm('This will REPLACE your current data with the backup. Continue?')) return;
      for (const key of BACKUP_KEYS) {
        const val = data[key];
        if (typeof val === 'string') localStorage.setItem(key, val);
      }
      window.location.reload();
    } catch (err) {
      alert('Could not read backup file: ' + (err as Error).message);
    }
  };
  input.click();
}

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAdmin, setAdmin } = useAdminToggle();
  const { gradingPortfolio, sealedCollection, singlesCollection } = usePortfolio();
  const itemCount = gradingPortfolio.length + sealedCollection.length + singlesCollection.length;
  const counts: Record<string, number> = {
    '/grading': gradingPortfolio.length,
    '/singles': singlesCollection.length,
    '/sealed': sealedCollection.length,
  };

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden panel p-2 text-text-primary"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-66 bg-surface/80 backdrop-blur-xl border-r border-border z-40 flex flex-col transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:static`}
      >
        <div className="logo-area px-6 pt-7 pb-6 border-b border-border">
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 40 40" className="pokeball-logo h-10 w-10 drop-shadow-[0_0_14px_rgba(239,68,68,0.5)]" aria-hidden>
              <circle cx="20" cy="20" r="18.5" fill="#171c2b" stroke="#364060" strokeWidth="1" />
              <path d="M1.5 20 a18.5 18.5 0 0 1 37 0 Z" fill="#ef4444" />
              <rect x="1.8" y="18.4" width="36.4" height="3.2" fill="#05070d" />
              <circle cx="20" cy="20" r="5.5" fill="#05070d" />
              <circle cx="20" cy="20" r="3.6" fill="#e9edf8" />
              <circle cx="20" cy="20" r="1.7" fill="#38bdf8" />
            </svg>
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-text-secondary">Gotta track 'em all</div>
              <h1 className="font-display text-lg font-semibold leading-tight tracking-tight">
                Card <span className="holo-text italic">Portfolio</span>
              </h1>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          <div className="px-4 pb-2 font-mono text-[9px] uppercase tracking-[0.3em] text-text-secondary/70">
            Collections
          </div>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm ${
                  isActive
                    ? 'bg-gradient-to-r from-accent/20 to-holo/15 text-accent-light font-medium shadow-[0_0_18px_-6px_rgba(56,189,248,0.5)]'
                    : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                }`
              }
              end={item.to === '/'}
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-gradient-to-b from-accent to-holo transition-opacity ${
                      isActive ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                  <item.icon size={17} className={isActive ? 'text-accent' : 'text-text-secondary/70 group-hover:text-text-secondary'} />
                  <span className="flex-1">{item.label}</span>
                  {counts[item.to] !== undefined && (
                    <span className={`font-mono text-[10px] tabular-nums ${isActive ? 'text-accent/80' : 'text-text-secondary/50'}`}>
                      {counts[item.to]}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-border space-y-3">
          <button
            onClick={() => setAdmin(!isAdmin)}
            title={isAdmin ? 'Editing enabled — values are clickable. Click to lock.' : 'Unlock editing — click any value to change it'}
            className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 transition-colors ${
              isAdmin
                ? 'border-accent/50 bg-accent/10'
                : 'border-border bg-background/60 hover:border-border-bright'
            }`}
          >
            <span className={`flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest ${isAdmin ? 'text-accent-light' : 'text-text-secondary'}`}>
              <PencilLine size={11} /> Edit Mode
            </span>
            <span
              className={`relative h-4 w-7 rounded-full transition-colors ${isAdmin ? 'bg-accent' : 'bg-border'}`}
            >
              <span
                className={`absolute top-0.5 h-3 w-3 rounded-full bg-text-primary transition-transform ${
                  isAdmin ? 'translate-x-3.5' : 'translate-x-0.5'
                }`}
              />
            </span>
          </button>
          <div className="flex gap-2">
            <button
              onClick={exportBackup}
              title="Download your data as a JSON backup file"
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border border-border bg-background/60 font-mono text-[10px] uppercase tracking-widest text-text-secondary transition-colors hover:border-accent/40 hover:text-accent-light"
            >
              <Download size={11} /> Export
            </button>
            <button
              onClick={importBackup}
              title="Restore data from a backup file"
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border border-border bg-background/60 font-mono text-[10px] uppercase tracking-widest text-text-secondary transition-colors hover:border-accent/40 hover:text-accent-light"
            >
              <Upload size={11} /> Import
            </button>
          </div>
          <div className="flex items-center gap-2 px-1">
            <span className="h-1.5 w-1.5 rounded-full bg-profit shadow-[0_0_8px_rgba(70,211,154,0.8)]" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-text-secondary">
              {itemCount} items tracked
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
