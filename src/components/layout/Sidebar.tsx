import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CreditCard, Package, Layers, Menu, X, Download, Upload } from 'lucide-react';
import { useState } from 'react';

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

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-surface p-2 rounded-lg border border-border"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-surface border-r border-border z-40 flex flex-col transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:static`}
      >
        <div className="p-6 border-b border-border">
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <CreditCard size={24} className="text-accent" />
            Card Portfolio
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
                  isActive
                    ? 'bg-accent/15 text-accent-light'
                    : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                }`
              }
              end={item.to === '/'}
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-border space-y-2">
          <div className="flex gap-2">
            <button
              onClick={exportBackup}
              title="Download your data as a JSON backup file"
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-background hover:bg-surface-hover border border-border rounded text-xs text-text-secondary hover:text-text-primary transition-colors"
            >
              <Download size={12} /> Export
            </button>
            <button
              onClick={importBackup}
              title="Restore data from a backup file"
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-background hover:bg-surface-hover border border-border rounded text-xs text-text-secondary hover:text-text-primary transition-colors"
            >
              <Upload size={12} /> Import
            </button>
          </div>
          <div className="text-xs text-text-secondary">
            160 items tracked
          </div>
        </div>
      </aside>
    </>
  );
}
