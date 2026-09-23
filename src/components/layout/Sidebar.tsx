import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CreditCard, Package, Layers, Menu, X, Download, Upload, PencilLine, ScanSearch, Calculator, Crosshair, Sun, Moon, Monitor } from 'lucide-react';
import { useState } from 'react';
import { usePortfolio } from '../../context/PortfolioContext';
import { useAdminToggle } from '../../context/AdminContext';
import { useGradingDesk } from '../../context/GradingDeskContext';
import { useTheme, type ThemePreference } from './useTheme';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Overview' },
  { to: '/grading', icon: CreditCard, label: 'PSA Grading' },
  { to: '/singles', icon: Layers, label: 'Singles' },
  { to: '/sealed', icon: Package, label: 'Sealed' },
];

const deskItems = [
  { to: '/pregrade', icon: ScanSearch, label: 'Pre-grade Queue' },
  { to: '/calculator', icon: Calculator, label: 'Should I Grade?' },
  { to: '/calibration', icon: Crosshair, label: 'Calibration' },
];

const BACKUP_KEYS = [
  'portfolio-grading', 'portfolio-singles', 'portfolio-sealed', 'portfolio-submissions',
  'portfolio-submission-meta', 'portfolio-candidates', 'portfolio-psa-tiers', 'portfolio-data-version',
] as const;

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

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'auto', label: 'Auto', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
];

const footerButton =
  'flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md border border-border font-mono text-[10px] uppercase tracking-wider text-text-secondary transition-colors hover:border-border-bright hover:text-text-primary';

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAdmin, setAdmin } = useAdminToggle();
  const { preference, choose } = useTheme();
  const { gradingPortfolio, sealedCollection, singlesCollection } = usePortfolio();
  const { candidates } = useGradingDesk();
  const counts: Record<string, number> = {
    '/pregrade': candidates.filter((c) => c.stage !== 'submitted' && c.stage !== 'passed').length,
    '/grading': gradingPortfolio.length,
    '/singles': singlesCollection.length,
    '/sealed': sealedCollection.length,
  };

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        className="fixed top-3 left-3 z-50 lg:hidden rounded-md border border-border bg-surface p-2 text-text-primary shadow"
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={`fixed top-0 left-0 h-screen w-60 shrink-0 bg-surface border-r border-border z-40 flex flex-col transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:sticky`}
      >
        <div className="px-4 pt-5 pb-4">
          <div className="slab-label px-3 pt-2 pb-2">
            <div className="font-display text-2xl font-extrabold uppercase leading-[0.85] text-text-primary">Card<br />Portfolio</div>
            <div className="barcode mt-2" />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {[{ title: 'Collections', items: navItems }, { title: 'Grading desk', items: deskItems }].map((section) => (
            <div key={section.title} className="pb-4">
              <div className="px-3 pb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-text-secondary">{section.title}</div>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive ? 'bg-text-primary text-bg' : 'text-text-primary hover:bg-surface-hover'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon size={15} className={isActive ? 'text-bg' : 'text-text-secondary'} />
                      <span className="flex-1">{item.label}</span>
                      {counts[item.to] !== undefined && (
                        <span className={`font-mono text-[10px] tabular-nums ${isActive ? 'text-bg/70' : 'text-text-secondary'}`}>{counts[item.to]}</span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-border space-y-2">
          <div className="flex rounded-md border border-border p-0.5" role="radiogroup" aria-label="Theme">
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                role="radio"
                aria-checked={preference === opt.value}
                onClick={() => choose(opt.value)}
                className={`flex-1 flex items-center justify-center gap-1 rounded py-1 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                  preference === opt.value ? 'bg-text-primary text-bg' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <opt.icon size={11} /> {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setAdmin(!isAdmin)}
            aria-pressed={isAdmin}
            title={isAdmin ? 'Editing on — values are clickable. Click to lock.' : 'Turn on editing — click any value to change it'}
            className={`flex w-full items-center justify-between rounded-md border px-3 py-1.5 transition-colors ${
              isAdmin ? 'border-label bg-label/10' : 'border-border hover:border-border-bright'
            }`}
          >
            <span className={`flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider ${isAdmin ? 'text-label' : 'text-text-secondary'}`}>
              <PencilLine size={11} /> Edit mode
            </span>
            <span className={`relative h-4 w-7 rounded-full transition-colors ${isAdmin ? 'bg-label' : 'bg-border'}`}>
              <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-surface transition-transform ${isAdmin ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
            </span>
          </button>
          <div className="flex gap-2">
            <button onClick={exportBackup} title="Download your data as a JSON backup file" className={footerButton}>
              <Download size={11} /> Export
            </button>
            <button onClick={importBackup} title="Restore data from a backup file" className={footerButton}>
              <Upload size={11} /> Import
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
