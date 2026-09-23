import { useState } from 'react';
import { KeyRound, Search, Loader2 } from 'lucide-react';
import { getPsaToken, lookupCert, parseCertInput, setPsaToken, PsaLookupError, type PsaLookup } from '../../utils/psaApi';
import { formatPercent } from '../../utils/formatters';
import { primaryButton, secondaryButton } from '../shared/buttons';
import { inputClass } from './fields';

interface PsaLookupBoxProps {
  actionLabel: string;
  onResult: (lookup: PsaLookup) => void;
}

export default function PsaLookupBox({ actionLabel, onResult }: PsaLookupBoxProps) {
  const [token, setToken] = useState(getPsaToken);
  const [editingKey, setEditingKey] = useState(!token);
  const [keyDraft, setKeyDraft] = useState('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<PsaLookup | null>(null);

  const saveKey = () => {
    setPsaToken(keyDraft);
    setToken(keyDraft.trim());
    setKeyDraft('');
    setEditingKey(!keyDraft.trim());
  };

  const lookup = async () => {
    const parsed = parseCertInput(input);
    if ('error' in parsed) return setError(parsed.error);
    setError('');
    setLoading(true);
    try {
      const found = await lookupCert(parsed.cert, token);
      setResult(found);
      onResult(found);
      setInput('');
    } catch (err) {
      setError(err instanceof PsaLookupError ? err.message : 'Something went wrong looking that up.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel p-1.5 mb-4 rise rise-1">
      <div className="slab-label flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-primary">Look up a PSA cert</h3>
        {token && !editingKey && (
          <button onClick={() => setEditingKey(true)} className="flex items-center gap-1 font-mono text-[10px] text-text-secondary hover:text-text-primary">
            <KeyRound size={11} /> PSA key connected · change
          </button>
        )}
      </div>

      <div className="p-3.5">
        {editingKey ? (
          <div className="space-y-2">
            <p className="text-sm text-text-secondary">
              Paste your PSA API key. Get one free at{' '}
              <a href="https://www.psacard.com/publicapi" target="_blank" rel="noreferrer" className="text-accent underline">psacard.com/publicapi</a>{' '}
              (sign in, then generate a token). It’s saved in this browser only and isn’t included in Export.
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                type="password"
                autoComplete="off"
                value={keyDraft}
                onChange={(e) => setKeyDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && keyDraft.trim() && saveKey()}
                placeholder="PSA API key"
                aria-label="PSA API key"
                className={`${inputClass} flex-1 min-w-48`}
              />
              <button onClick={saveKey} disabled={!keyDraft.trim()} className={`${primaryButton} disabled:opacity-40`}>Save key</button>
              {token && <button onClick={() => setEditingKey(false)} className={secondaryButton}>Cancel</button>}
              {token && (
                <button onClick={() => { setPsaToken(''); setToken(''); }} className={`${secondaryButton} text-loss`}>Remove key</button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <input
                value={input}
                onChange={(e) => { setInput(e.target.value); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && !loading && lookup()}
                placeholder="Cert # from the slab or listing, e.g. 12345678"
                aria-label="PSA cert number"
                inputMode="numeric"
                className={`${inputClass} flex-1 min-w-48`}
              />
              <button onClick={lookup} disabled={loading} className={`${primaryButton} inline-flex items-center gap-1.5 disabled:opacity-60`}>
                {loading ? <Loader2 size={11} className="animate-spin" /> : <Search size={11} />} {actionLabel}
              </button>
            </div>
            {error && <p role="alert" className="mt-2 font-mono text-[11px] text-loss">{error}</p>}
            {result && !error && (
              <div className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-1 font-mono text-[11px] text-text-secondary">
                <span className="font-body text-sm font-medium text-text-primary">{result.name}</span>
                <span>cert {result.certNumber}{result.slabGrade && ` · this slab: ${result.slabGrade}`}</span>
                <span>{result.graded.toLocaleString()} graded</span>
                <span><span className="text-gem">{result.psa10.toLocaleString()} PSA 10</span> ({formatPercent(result.rate10 * 100)})</span>
                <span className="text-text-primary">{result.psa9.toLocaleString()} PSA 9 ({formatPercent(result.rate9 * 100)})</span>
              </div>
            )}
            <p className="mt-2 font-mono text-[10px] text-text-secondary">
              Fills the name and PSA 10 / 9 rates from PSA’s population report. Enter the raw price and sold comps yourself. PSA allows 100 lookups a day; repeat lookups are cached.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
