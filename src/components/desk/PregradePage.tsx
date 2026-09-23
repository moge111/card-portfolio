import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ExternalLink, FileUp, Trash2, X, Send, Calculator } from 'lucide-react';
import { useGradingDesk, type NewCandidate } from '../../context/GradingDeskContext';
import { usePortfolio } from '../../context/PortfolioContext';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { AXES, AXIS_CALLS, normalizeCall, suggestedTenRate } from '../../utils/gradingMath';
import { useDeskStats, evaluateCandidate, type CandidateEvaluation } from './useDeskStats';
import { NumField, SelectField, TextField, labelClass } from './fields';
import { primaryButton, secondaryButton } from '../shared/buttons';
import PageHeader from '../shared/PageHeader';
import Slab from '../shared/Slab';
import { VERDICT_STYLE } from '../../constants/gradingStyles';
import type { AxisCall, Candidate, CandidateStage, GradeAxis } from '../../types/grading';
import type { Category } from '../../types/portfolio';

const BOARD_STAGES: { stage: CandidateStage; label: string; hint: string }[] = [
  { stage: 'watching', label: 'Watching', hint: 'Listings you might buy' },
  { stage: 'bought', label: 'Bought', hint: 'In hand or on the way' },
  { stage: 'pregraded', label: 'Pre-graded', hint: 'Ran /grade or inspected' },
  { stage: 'queued', label: 'Queued', hint: 'Going in the next sub' },
];
const ALL_STAGES: { value: CandidateStage; label: string }[] = [
  ...BOARD_STAGES.map((s) => ({ value: s.stage, label: s.label })),
  { value: 'submitted', label: 'Submitted' },
  { value: 'passed', label: 'Passed' },
];
const CATEGORIES: Category[] = ['Pokemon', 'One Piece', 'MTG', 'Naruto', 'Sports'];

const CALL_STYLE: Record<AxisCall, string> = {
  '10': 'bg-gem/15 text-gem border-gem/40',
  '9-10': 'bg-accent/15 text-accent-light border-accent/30',
  '9': 'bg-caution/15 text-caution border-caution/30',
  '≤8': 'bg-loss/15 text-loss border-loss/30',
  '?': 'bg-text-secondary/10 text-text-secondary border-text-secondary/30',
};
const AXIS_SHORT: Record<GradeAxis, string> = { centering: 'CEN', corners: 'COR', edges: 'EDG', surface: 'SUR' };

const blankCandidate = (stage: CandidateStage = 'watching'): NewCandidate => ({
  name: 'New card', category: 'Pokemon', stage, qty: 1,
  rawCost: 0, psa10Value: 0, psa9Value: 0, sub9Value: 0,
  psa10Rate: 0.5, psa9Rate: 0.4, calls: {},
});

interface Findings {
  card?: string;
  verdict?: { grade?: string; confidence?: string; limiting?: string };
  axes?: { name?: string; call?: string }[];
  recommendation?: string;
}

// Turns a /grade findings.json into a candidate with the axis calls filled in.
function candidateFromFindings(f: Findings, fileName: string): NewCandidate {
  const calls: Partial<Record<GradeAxis, AxisCall>> = {};
  for (const axis of f.axes ?? []) {
    const key = axis.name?.toLowerCase() as GradeAxis;
    if (AXES.includes(key) && axis.call) calls[key] = normalizeCall(axis.call);
  }
  const confidence = f.verdict?.confidence?.toLowerCase();
  const suggested = suggestedTenRate(calls) ?? 0.5;
  return {
    ...blankCandidate('pregraded'),
    name: f.card ?? fileName.replace(/\.findings\.json$/, ''),
    calls,
    psa10Rate: +suggested.toFixed(3),
    psa9Rate: +Math.min(1 - suggested, 0.6).toFixed(3),
    confidence: confidence === 'low' || confidence === 'medium' || confidence === 'high' ? confidence : undefined,
    limitingDefect: f.verdict?.limiting,
    notes: [f.verdict?.grade, f.verdict?.confidence && `Confidence: ${f.verdict.confidence}`, f.recommendation].filter(Boolean).join('\n\n'),
    reportPath: fileName,
  };
}

function CallChips({ calls }: { calls: Candidate['calls'] }) {
  return (
    <div className="flex gap-1">
      {AXES.map((axis) => {
        const call = calls[axis];
        return (
          <span
            key={axis}
            title={`${axis}: ${call ?? 'not assessed'}`}
            className={`rounded border px-1 py-0.5 font-mono text-[9px] ${call ? CALL_STYLE[call] : 'border-border text-text-secondary/40'}`}
          >
            {AXIS_SHORT[axis]} {call ?? '–'}
          </span>
        );
      })}
    </div>
  );
}

function CandidateCard({ c, ev, selected, onSelect, onMove }: {
  c: Candidate; ev: CandidateEvaluation; selected: boolean; onSelect: () => void; onMove: (dir: -1 | 1) => void;
}) {
  const verdict = VERDICT_STYLE[ev.verdict];
  const stageIndex = BOARD_STAGES.findIndex((s) => s.stage === c.stage);
  const hasValues = c.psa10Value > 0;

  return (
    <div
      onClick={onSelect}
      className={`rounded-lg border bg-background p-1 cursor-pointer transition-colors hover:border-border-bright ${selected ? 'border-text-primary' : 'border-border'}`}
    >
      <div className="slab-label flex items-start justify-between gap-2 px-2 py-1.5">
        <div className="min-w-0">
          <div className="font-display text-base font-bold uppercase leading-tight text-text-primary">{c.name}</div>
          <div className="font-mono text-[10px] text-text-secondary">
            {c.qty > 1 && `${c.qty}× `}{formatCurrency(c.rawCost)} raw · 10 {formatCurrency(c.psa10Value)}
          </div>
        </div>
        {hasValues && (
          <span className={`shrink-0 text-right font-display text-sm font-extrabold uppercase leading-none ${verdict.textClass}`}>{verdict.label}</span>
        )}
      </div>
      <div className="px-1.5 pb-1">
      <div className="mt-2"><CallChips calls={c.calls} /></div>
      <div className="mt-2 flex items-center justify-between font-mono text-[10px]">
        {hasValues ? (
          <span className={ev.outcome.profit >= 0 ? 'text-profit' : 'text-loss'}>
            {formatCurrency(ev.outcome.profit)} EV · {ev.tier?.name ?? 'no tier'}
          </span>
        ) : (
          <span className="text-text-secondary/70">Add PSA 10/9 values for EV</span>
        )}
        <span className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
          <button disabled={stageIndex <= 0} onClick={() => onMove(-1)} aria-label="Move to previous stage" className="p-0.5 text-text-secondary hover:text-text-primary disabled:opacity-20"><ChevronLeft size={13} /></button>
          <button disabled={stageIndex >= BOARD_STAGES.length - 1} onClick={() => onMove(1)} aria-label="Move to next stage" className="p-0.5 text-text-secondary hover:text-text-primary disabled:opacity-20"><ChevronRight size={13} /></button>
        </span>
      </div>
      </div>
    </div>
  );
}

function CandidateEditor({ c, ev, onClose }: { c: Candidate; ev: CandidateEvaluation; onClose: () => void }) {
  const { updateCandidate, deleteCandidate, submissions, addSubmission } = useGradingDesk();
  const { addGradingCardFrom, updateSubQty } = usePortfolio();
  const plannedSubs = submissions.filter((s) => s.status === 'planned');
  const [targetSub, setTargetSub] = useState<string>(plannedSubs[0] ? String(plannedSubs[0].key) : 'new');
  const set = (patch: Partial<Candidate>) => updateCandidate(c.id, patch);
  const suggested = suggestedTenRate(c.calls);

  const sendToSub = () => {
    if (!ev.tier) return alert('No open PSA tier covers this card’s PSA 10 value.');
    const key = targetSub === 'new' ? addSubmission() : Number(targetSub);
    const cardId = addGradingCardFrom({
      name: c.name,
      category: c.category,
      qty: c.qty,
      costPerCard: c.rawCost,
      gradingCost: +(ev.tier.feePerCard * c.qty).toFixed(2),
      psa10Value: c.psa10Value,
      psa9Value: c.psa9Value,
      psa10Rate: c.psa10Rate,
      psa9Rate: c.psa9Rate,
      sub9Rate: Math.max(0, +(1 - c.psa10Rate - c.psa9Rate).toFixed(3)),
    });
    updateSubQty(key, cardId, c.qty);
    set({ stage: 'submitted', submissionKey: key, gradingCardId: cardId });
    onClose();
  };

  return (
    <Slab
      className="mb-6 rise"
      title={c.name}
      actions={
        <>
          <Link to={`/calculator?candidate=${c.id}`} className={`${secondaryButton} inline-flex items-center gap-1.5`}><Calculator size={11} /> Calculator</Link>
          <button onClick={onClose} aria-label="Close" className="text-text-secondary hover:text-text-primary"><X size={16} /></button>
        </>
      }
    >

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="col-span-2">
            <TextField label="Card" value={c.name} onChange={(v) => set({ name: v })} />
          </div>
          <SelectField label="Category" value={c.category} onChange={(v) => set({ category: v })} options={CATEGORIES.map((v) => ({ value: v, label: v }))} />
          <SelectField label="Stage" value={c.stage} onChange={(v) => set({ stage: v })} options={ALL_STAGES} />
          <NumField label="Raw cost / card" prefix="$" value={c.rawCost} onChange={(v) => set({ rawCost: v })} />
          <NumField label="Copies" value={c.qty} onChange={(v) => set({ qty: Math.max(1, Math.round(v)) })} />
          <NumField label="PSA 10 value" prefix="$" value={c.psa10Value} onChange={(v) => set({ psa10Value: v })} />
          <NumField label="PSA 9 value" prefix="$" value={c.psa9Value} onChange={(v) => set({ psa9Value: v })} />
          <NumField label="Sub-9 resale" prefix="$" value={c.sub9Value} onChange={(v) => set({ sub9Value: v })} />
          <NumField label="Your 10 rate" suffix="%" value={+(c.psa10Rate * 100).toFixed(1)} onChange={(v) => set({ psa10Rate: v / 100 })} />
          <NumField label="Your 9 rate" suffix="%" value={+(c.psa9Rate * 100).toFixed(1)} onChange={(v) => set({ psa9Rate: v / 100 })} />
          <SelectField
            label="Confidence"
            value={c.confidence ?? ''}
            onChange={(v) => set({ confidence: (v || undefined) as Candidate['confidence'] })}
            options={[{ value: '', label: '—' }, { value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]}
          />
          <div className="col-span-2 md:col-span-4">
            <TextField label="Limiting defect" value={c.limitingDefect ?? ''} onChange={(v) => set({ limitingDefect: v })} placeholder="The one thing that keeps it from a 10" />
          </div>
          <div className="col-span-2">
            <TextField label="Listing link" value={c.link ?? ''} onChange={(v) => set({ link: v })} placeholder="https://ebay.com/itm/…" />
          </div>
          <div className="col-span-2">
            <TextField label="/grade report" value={c.reportPath ?? ''} onChange={(v) => set({ reportPath: v })} placeholder="card grader/reports/…" />
          </div>
          <div className="col-span-2 md:col-span-4">
            <TextField label="Notes" multiline value={c.notes ?? ''} onChange={(v) => set({ notes: v })} />
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <span className={labelClass}>Pre-grade calls</span>
            <div className="space-y-2">
              {AXES.map((axis) => (
                <div key={axis} className="flex items-center gap-2">
                  <span className="w-20 font-mono text-[10px] uppercase tracking-wider text-text-secondary">{axis}</span>
                  <div className="flex gap-1">
                    {AXIS_CALLS.map((call) => (
                      <button
                        key={call}
                        onClick={() => set({ calls: { ...c.calls, [axis]: c.calls[axis] === call ? undefined : call } })}
                        className={`rounded border px-1.5 py-0.5 font-mono text-[10px] transition-colors ${c.calls[axis] === call ? CALL_STYLE[call] : 'border-border text-text-secondary/60 hover:border-border-bright'}`}
                      >
                        {call}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {suggested !== null && (
              <p className="mt-2 font-mono text-[10px] text-text-secondary">
                Calls suggest a <span className="text-accent-light">{formatPercent(suggested * 100)}</span> 10 rate.{' '}
                {Math.abs(suggested - c.psa10Rate) > 0.005 && (
                  <button onClick={() => set({ psa10Rate: +suggested.toFixed(3), psa9Rate: +Math.min(c.psa9Rate, 1 - suggested).toFixed(3) })} className="text-accent hover:text-accent-light">Use it</button>
                )}
              </p>
            )}
          </div>

          <div className="rounded-lg border border-border/60 bg-background/40 p-3 font-mono text-[11px] space-y-1">
            <div className="flex justify-between"><span className="text-text-secondary">Verdict</span><span className={VERDICT_STYLE[ev.verdict].textClass}>{VERDICT_STYLE[ev.verdict].label}</span></div>
            <div className="flex justify-between"><span className="text-text-secondary">Tier</span><span className="text-text-primary">{ev.tier ? `${ev.tier.name} ${formatCurrency(ev.tier.feePerCard)}` : 'none open'}</span></div>
            <div className="flex justify-between"><span className="text-text-secondary">Expected profit</span><span className={ev.outcome.profit >= 0 ? 'text-profit' : 'text-loss'}>{formatCurrency(ev.outcome.profit)} · {formatPercent(ev.outcome.roi)}</span></div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Break-even 10 rate</span>
              <span className="text-text-primary">{ev.outcome.breakEven10Rate <= 0 ? 'any' : ev.outcome.breakEven10Rate > 1 ? 'never' : formatPercent(ev.outcome.breakEven10Rate * 100)}</span>
            </div>
            {ev.calibration && (
              <div className="text-text-secondary/70 pt-1">
                Your 10 rate × {ev.calibration.factor.toFixed(2)} ({ev.calibration.scope} track record) → {formatPercent(ev.psa10Rate * 100)}
              </div>
            )}
          </div>

          {c.link && (
            <a href={c.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-mono text-[10px] text-accent hover:text-accent-light">
              <ExternalLink size={11} /> Open listing
            </a>
          )}

          {c.stage === 'submitted' ? (
            <p className="font-mono text-[10px] text-profit">
              In {submissions.find((s) => s.key === c.submissionKey)?.name ?? 'a submission'} — track it on PSA Grading.
            </p>
          ) : (
            <div>
              <span className={labelClass}>Send to submission</span>
              <div className="flex gap-2">
                <select value={targetSub} onChange={(e) => setTargetSub(e.target.value)} className="flex-1 bg-background border border-border rounded-lg px-2 py-1.5 text-sm text-text-primary outline-none focus:border-accent">
                  {plannedSubs.map((s) => <option key={s.key} value={s.key}>{s.name}{s.description ? ` · ${s.description}` : ''}</option>)}
                  <option value="new">+ New submission</option>
                </select>
                <button onClick={sendToSub} className={`${primaryButton} inline-flex items-center gap-1.5`}><Send size={11} /> Send</button>
              </div>
              <p className="mt-1 font-mono text-[10px] text-text-secondary/70">Adds it to PSA Grading with the {ev.tier?.name ?? 'cheapest eligible'} fee.</p>
            </div>
          )}

          <div className="flex justify-between">
            {c.stage !== 'passed' && c.stage !== 'submitted' && (
              <button onClick={() => set({ stage: 'passed' })} className={secondaryButton}>Pass on it</button>
            )}
            <button
              onClick={() => { if (confirm(`Delete ${c.name}?`)) { deleteCandidate(c.id); onClose(); } }}
              className="ml-auto inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-loss/70 hover:text-loss"
            >
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </div>
      </div>
    </Slab>
  );
}

export default function PregradePage() {
  const { candidates, tiers, addCandidate, updateCandidate } = useGradingDesk();
  const { calibrationFor, shippingPerCard } = useDeskStats();
  const [params, setParams] = useSearchParams();
  const selectedId = Number(params.get('open')) || null;
  const select = (id: number | null) => setParams(id ? { open: String(id) } : {}, { replace: true });

  const evaluations = useMemo(() => {
    const map = new Map<number, CandidateEvaluation>();
    for (const c of candidates) map.set(c.id, evaluateCandidate(c, tiers, shippingPerCard, calibrationFor(c.category)));
    return map;
  }, [candidates, tiers, shippingPerCard, calibrationFor]);

  const selected = candidates.find((c) => c.id === selectedId);
  const done = candidates.filter((c) => c.stage === 'submitted' || c.stage === 'passed');
  const queued = candidates.filter((c) => c.stage === 'queued');
  const queuedProfit = queued.reduce((s, c) => s + evaluations.get(c.id)!.outcome.profit, 0);

  const move = (c: Candidate, dir: -1 | 1) => {
    const i = BOARD_STAGES.findIndex((s) => s.stage === c.stage);
    const next = BOARD_STAGES[i + dir];
    if (next) updateCandidate(c.id, { stage: next.stage });
  };

  const importFindings = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.multiple = true;
    input.onchange = async () => {
      let lastId: number | null = null;
      for (const file of Array.from(input.files ?? [])) {
        try {
          lastId = addCandidate(candidateFromFindings(JSON.parse(await file.text()), file.name));
        } catch (err) {
          alert(`Could not read ${file.name}: ${(err as Error).message}`);
        }
      }
      if (lastId) select(lastId);
    };
    input.click();
  };

  return (
    <div>
      <PageHeader
        title="Pre-grade queue"
        detail="Grading desk · before you pay PSA"
        figure={{ value: String(candidates.length - done.length), caption: 'Cards in play' }}
      >
        <button onClick={importFindings} className={`${secondaryButton} inline-flex items-center gap-1.5`}><FileUp size={11} /> Import /grade findings</button>
        <button onClick={() => select(addCandidate(blankCandidate()))} className={primaryButton}>+ Candidate</button>
      </PageHeader>

      {queued.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-md bg-text-primary px-4 py-2.5 font-mono text-[11px] text-bg rise rise-1">
          <span className="text-[10px] uppercase tracking-[0.14em]">Next sub</span>
          <span>{queued.reduce((s, c) => s + c.qty, 0)} cards queued</span>
          <span>{queuedProfit >= 0 ? '+' : ''}{formatCurrency(queuedProfit)} expected profit</span>
          {queued.some((c) => evaluations.get(c.id)!.verdict === 'pass') && <span>· includes cards that don't pencil out</span>}
        </div>
      )}

      {selected && <CandidateEditor key={selected.id} c={selected} ev={evaluations.get(selected.id)!} onClose={() => select(null)} />}

      {candidates.length === 0 ? (
        <div className="panel p-10 text-center rise rise-2">
          <p className="text-text-primary mb-2">No candidates yet.</p>
          <p className="text-sm text-text-secondary max-w-lg mx-auto">
            Add a card you're eyeing, or import the <span className="font-mono">.findings.json</span> from a <span className="font-mono">/grade</span> run
            (in <span className="font-mono">card grader/reports/</span>) — the centering/corners/edges/surface calls come in automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6 rise rise-2">
          {BOARD_STAGES.map(({ stage, label, hint }) => {
            const items = candidates.filter((c) => c.stage === stage);
            return (
              <div key={stage} className="panel p-3">
                <div className="flex items-baseline justify-between px-1 mb-3">
                  <h3 className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-primary">{label} <span className="text-text-secondary">{items.length}</span></h3>
                  <span className="font-mono text-[10px] text-text-secondary">{hint}</span>
                </div>
                <div className="space-y-2">
                  {items.map((c) => (
                    <CandidateCard key={c.id} c={c} ev={evaluations.get(c.id)!} selected={c.id === selectedId} onSelect={() => select(c.id)} onMove={(dir) => move(c, dir)} />
                  ))}
                  <button
                    onClick={() => select(addCandidate(blankCandidate(stage)))}
                    className="w-full rounded-lg border border-dashed border-border py-2 font-mono text-[10px] uppercase tracking-wider text-text-secondary hover:border-border-bright hover:text-text-primary"
                  >
                    + Add
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {done.length > 0 && (
        <Slab className="rise rise-3" title="Submitted & passed">
          <div className="divide-y divide-border/40">
            {done.map((c) => (
              <button key={c.id} onClick={() => select(c.id)} className="w-full flex flex-wrap items-center gap-x-4 gap-y-1 py-2 text-left hover:bg-accent/[0.04]">
                <span className={`font-mono text-[9px] uppercase tracking-wider ${c.stage === 'submitted' ? 'text-profit' : 'text-text-secondary'}`}>{c.stage}</span>
                <span className="flex-1 min-w-0 text-sm text-text-primary truncate">{c.name}</span>
                <CallChips calls={c.calls} />
                {c.limitingDefect && <span className="w-full font-mono text-[10px] text-text-secondary truncate">{c.limitingDefect}</span>}
              </button>
            ))}
          </div>
        </Slab>
      )}
    </div>
  );
}
