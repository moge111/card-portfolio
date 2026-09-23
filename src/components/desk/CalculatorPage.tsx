import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Calculator, RotateCcw } from 'lucide-react';
import { useGradingDesk, type NewCandidate } from '../../context/GradingDeskContext';
import { useAdmin } from '../../context/AdminContext';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { formatDate, formatShortDate, parseDate, toISODate, today } from '../../utils/dates';
import {
  applyCalibration, buildTimeline, cheapestTier, eligibleTiers, gradeOutcome, verdictFor,
  DEFAULT_DAYS_TO_SELL, DEFAULT_DAYS_TO_SHIP,
} from '../../utils/gradingMath';
import { PSA_TIERS_VERIFIED } from '../../constants/psaTiers';
import { VERDICT_STYLE } from '../../constants/gradingStyles';
import { CHART_GRID, CHART_TICK, CHART_TICK_STYLE, SERIES } from '../../constants/theme';
import PageHeader from '../shared/PageHeader';
import Slab from '../shared/Slab';
import { useDeskStats } from './useDeskStats';
import PsaLookupBox from './PsaLookupBox';
import { NumField, SelectField, TextField } from './fields';
import { primaryButton, secondaryButton } from '../shared/buttons';
import type { Candidate } from '../../types/grading';
import type { Category } from '../../types/portfolio';

const CATEGORIES: Category[] = ['Pokemon', 'One Piece', 'MTG', 'Naruto', 'Sports'];

interface CalcInputs {
  name: string;
  category: Category;
  qty: number;
  rawCost: number;
  psa10Value: number;
  psa9Value: number;
  sub9Value: number;
  psa10Pct: number;
  psa9Pct: number;
  tierId: string; // 'auto' = cheapest tier that covers the PSA 10 value
  shippingPerCard: number;
  alreadyOwned: boolean;
  startDate: string;
  daysToShip: number;
  daysToSell: number;
  useCalibration: boolean;
}

function inputsFrom(c: Candidate | undefined, shippingPerCard: number): CalcInputs {
  return {
    name: c?.name ?? '',
    category: c?.category ?? 'Pokemon',
    qty: c?.qty ?? 1,
    rawCost: c?.rawCost ?? 0,
    psa10Value: c?.psa10Value ?? 0,
    psa9Value: c?.psa9Value ?? 0,
    sub9Value: c?.sub9Value ?? c?.rawCost ?? 0,
    psa10Pct: +((c?.psa10Rate ?? 0.5) * 100).toFixed(1),
    psa9Pct: +((c?.psa9Rate ?? 0.4) * 100).toFixed(1),
    tierId: 'auto',
    shippingPerCard,
    alreadyOwned: c ? c.stage !== 'watching' : false,
    startDate: toISODate(today()),
    daysToShip: DEFAULT_DAYS_TO_SHIP,
    daysToSell: DEFAULT_DAYS_TO_SELL,
    useCalibration: true,
  };
}

function formatBreakEven(rate: number): string {
  if (rate <= 0) return 'profitable with zero 10s';
  if (rate > 1) return 'never — even all 10s lose';
  return formatPercent(rate * 100);
}

export default function CalculatorPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { candidates, tiers, addCandidate, updateCandidate, updateTier, resetTiers } = useGradingDesk();
  const { calibrationFor, shippingPerCard } = useDeskStats();
  const isAdmin = useAdmin();
  const candidate = candidates.find((c) => c.id === Number(params.get('candidate')));
  const [inputs, setInputs] = useState<CalcInputs>(() => inputsFrom(candidate, shippingPerCard));
  const [psaPop, setPsaPop] = useState<Candidate['psa']>(candidate?.psa);
  const set = <K extends keyof CalcInputs>(field: K, value: CalcInputs[K]) => setInputs((prev) => ({ ...prev, [field]: value }));

  const calibration = calibrationFor(inputs.category);
  const result = useMemo(() => {
    const rates = applyCalibration(inputs.psa10Pct / 100, inputs.psa9Pct / 100, inputs.useCalibration ? calibration?.factor ?? null : null);
    const autoTier = cheapestTier(tiers, inputs.psa10Value);
    const tier = inputs.tierId === 'auto' ? autoTier : tiers.find((t) => t.id === inputs.tierId);
    const base = { ...inputs, ...rates };
    const outcomeFor = (feePerCard: number) => gradeOutcome({ ...base, feePerCard });
    const outcome = outcomeFor(tier?.feePerCard ?? 0);

    const timelineFor = (turnaroundMin: number, turnaroundMax: number, feePerCard: number, expectedNet: number) =>
      buildTimeline({
        start: parseDate(inputs.startDate),
        alreadyOwned: inputs.alreadyOwned,
        daysToShip: inputs.daysToShip,
        turnaroundMin,
        turnaroundMax,
        daysToSell: inputs.daysToSell,
        rawTotal: inputs.rawCost * inputs.qty,
        gradingTotal: feePerCard * inputs.qty,
        shippingTotal: inputs.shippingPerCard * inputs.qty,
        expectedRevenue: expectedNet * inputs.qty,
      });
    const timeline = tier ? timelineFor(tier.turnaroundMin, tier.turnaroundMax, tier.feePerCard, outcome.expectedNetPerCard) : null;

    const comparison = tiers.map((t) => {
      const o = outcomeFor(t.feePerCard);
      const tl = timelineFor(t.turnaroundMin, t.turnaroundMax, t.feePerCard, o.expectedNetPerCard);
      return {
        tier: t,
        eligible: !t.paused && t.maxDeclaredValue >= inputs.psa10Value,
        outcome: o,
        cashBack: tl.cashBack,
        profitPerMonth: tl.daysTiedUp > 0 ? o.profit / (tl.daysTiedUp / 30) : 0,
      };
    });
    const bestPerMonth = comparison.filter((r) => r.eligible).sort((a, b) => b.profitPerMonth - a.profitPerMonth)[0];

    return { rates, tier, autoTier, outcome, verdict: verdictFor(outcome, rates.psa10Rate), timeline, comparison, bestPerMonth };
  }, [inputs, tiers, calibration?.factor]);

  const saveCandidate = () => {
    const fields: NewCandidate = {
      name: inputs.name || 'Untitled card',
      category: inputs.category,
      stage: candidate?.stage ?? (inputs.alreadyOwned ? 'bought' : 'watching'),
      qty: inputs.qty,
      rawCost: inputs.rawCost,
      psa10Value: inputs.psa10Value,
      psa9Value: inputs.psa9Value,
      sub9Value: inputs.sub9Value,
      psa10Rate: inputs.psa10Pct / 100,
      psa9Rate: inputs.psa9Pct / 100,
      calls: candidate?.calls ?? {},
      psa: psaPop,
    };
    if (candidate) {
      updateCandidate(candidate.id, fields);
      navigate('/pregrade');
    } else {
      navigate(`/pregrade?open=${addCandidate(fields)}`);
    }
  };

  const { outcome, rates, timeline } = result;
  const verdict = VERDICT_STYLE[result.verdict];
  const chartData = timeline?.events.map((e) => ({ t: e.date.getTime(), balance: Math.round(e.balance), label: e.label })) ?? [];
  const breakEvenPct = Math.min(100, Math.max(0, outcome.breakEven10Rate * 100));

  return (
    <div>
      <PageHeader
        title="Should I grade?"
        detail="Grading desk · buy & grade math"
        figure={{ value: formatCurrency(outcome.profit), caption: `${verdict.label} · expected`, tone: outcome.profit >= 0 ? 'text-profit' : 'text-loss' }}
      >
        <button onClick={saveCandidate} className={primaryButton}>
          {candidate ? 'Save to candidate' : '+ Add to pre-grade queue'}
        </button>
      </PageHeader>

      <PsaLookupBox
        actionLabel="Look up"
        onResult={(found) => {
          setInputs((prev) => ({
            ...prev,
            name: found.name,
            category: found.category,
            psa10Pct: +(found.rate10 * 100).toFixed(1),
            psa9Pct: +(found.rate9 * 100).toFixed(1),
          }));
          setPsaPop({ certNumber: found.certNumber, specId: found.specId, graded: found.graded, psa10: found.psa10, psa9: found.psa9, fetchedAt: found.fetchedAt });
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
        {/* Inputs */}
        <Slab className="lg:col-span-2 rise rise-1" title="Card & comps">
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Card" value={inputs.name} onChange={(v) => set('name', v)} placeholder="e.g. Umbreon VMAX Alt Art" />
            <SelectField label="Category" value={inputs.category} onChange={(v) => set('category', v)} options={CATEGORIES.map((v) => ({ value: v, label: v }))} />
            <NumField label="Raw cost / card" prefix="$" value={inputs.rawCost} onChange={(v) => set('rawCost', v)} />
            <NumField label="Copies" value={inputs.qty} onChange={(v) => set('qty', Math.max(1, Math.round(v)))} />
            <NumField label="PSA 10 value" prefix="$" value={inputs.psa10Value} onChange={(v) => set('psa10Value', v)} />
            <NumField label="PSA 9 value" prefix="$" value={inputs.psa9Value} onChange={(v) => set('psa9Value', v)} />
            <NumField label="Your 10 rate" suffix="%" value={inputs.psa10Pct} onChange={(v) => set('psa10Pct', v)} hint={psaPop ? `PSA pop: ${psaPop.psa10.toLocaleString()} of ${psaPop.graded.toLocaleString()} graded` : undefined} />
            <NumField label="Your 9 rate" suffix="%" value={inputs.psa9Pct} onChange={(v) => set('psa9Pct', v)} hint={`sub-9: ${formatPercent(Math.max(0, 100 - inputs.psa10Pct - inputs.psa9Pct))}`} />
            <NumField label="Sub-9 resale" prefix="$" value={inputs.sub9Value} onChange={(v) => set('sub9Value', v)} hint="What an 8-or-lower slab sells for" />
            <NumField label="Shipping / card" prefix="$" value={inputs.shippingPerCard} onChange={(v) => set('shippingPerCard', v)} hint={`Your subs average ${formatCurrency(shippingPerCard)}`} />
            <div className="col-span-2">
              <SelectField
                label="PSA tier"
                value={inputs.tierId}
                onChange={(v) => set('tierId', v)}
                options={[
                  { value: 'auto', label: `Auto — cheapest that covers ${formatCurrency(inputs.psa10Value)}${result.autoTier ? ` (${result.autoTier.name})` : ''}` },
                  ...tiers.map((t) => ({
                    value: t.id,
                    label: `${t.name} · ${formatCurrency(t.feePerCard)} · ≤${formatCurrency(t.maxDeclaredValue)}${t.paused ? ' · paused' : ''}`,
                  })),
                ]}
              />
            </div>
            <label className="col-span-2 flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
              <input type="checkbox" checked={inputs.useCalibration} onChange={(e) => set('useCalibration', e.target.checked)} className="accent-accent" />
              {calibration
                ? <>Adjust for my {calibration.scope} track record (×{calibration.factor.toFixed(2)} on 10 rate → {formatPercent(rates.psa10Rate * 100)})</>
                : 'Adjust for my track record (need 10+ graded cards)'}
            </label>
            <label className="col-span-2 flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
              <input type="checkbox" checked={inputs.alreadyOwned} onChange={(e) => set('alreadyOwned', e.target.checked)} className="accent-accent" />
              I already own it (ships right away)
            </label>
            <label className="block">
              <span className="block font-mono text-[10px] uppercase tracking-wider text-text-secondary mb-1">{inputs.alreadyOwned ? 'Ship date' : 'Buy date'}</span>
              <input type="date" value={inputs.startDate} onChange={(e) => e.target.value && set('startDate', e.target.value)} className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-accent" />
            </label>
            {!inputs.alreadyOwned
              ? <NumField label="Days until shipped" value={inputs.daysToShip} onChange={(v) => set('daysToShip', Math.max(0, Math.round(v)))} hint="Seller shipping + packing your sub" />
              : <span />}
            <NumField label="Days to sell" value={inputs.daysToSell} onChange={(v) => set('daysToSell', Math.max(0, Math.round(v)))} hint="After slabs arrive home" />
          </div>
        </Slab>

        {/* Verdict */}
        <Slab className="lg:col-span-3 rise rise-2" title="Verdict">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
            <div>
              <span className={`inline-block rounded-full border px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider ${verdict.className}`}>{verdict.label}</span>
              <p className="mt-2 text-sm text-text-secondary">{verdict.blurb}</p>
            </div>
            <div className="text-right">
              <div className={`font-display text-5xl font-bold leading-none tabular-nums ${outcome.profit >= 0 ? 'text-profit' : 'text-loss'}`}>{formatCurrency(outcome.profit)}</div>
              <div className="font-mono text-[11px] text-text-secondary">expected profit · {formatPercent(outcome.roi)} ROI</div>
            </div>
          </div>

          <div className="mb-5">
            <div className="flex justify-between font-mono text-[10px] text-text-secondary mb-1.5">
              <span>Break-even 10 rate: <span className="text-text-primary">{formatBreakEven(outcome.breakEven10Rate)}</span></span>
              <span>Your 10 rate: <span className="text-accent-light">{formatPercent(rates.psa10Rate * 100)}</span></span>
            </div>
            <div className="relative h-3 rounded-full bg-loss/20 overflow-hidden">
              <div className="absolute inset-y-0 right-0 bg-profit/25" style={{ left: `${breakEvenPct}%` }} />
              <div className="absolute inset-y-0 w-0.5 bg-accent-light" style={{ left: `${Math.min(99.5, rates.psa10Rate * 100)}%` }} />
            </div>
            <div className="flex justify-between font-mono text-[9px] text-text-secondary/60 mt-1"><span>0%</span><span>loses money ← → makes money</span><span>100%</span></div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
            {[
              { label: 'All 10s', value: outcome.allTensProfit },
              { label: 'No 10s', value: outcome.noTensProfit },
              { label: 'All sub-9', value: outcome.worstCaseProfit },
              { label: 'Cost / card', value: -outcome.costPerCard, neutral: true },
            ].map((s) => (
              <div key={s.label}>
                <div className="font-mono text-[10px] uppercase tracking-wider text-text-secondary mb-1">{s.label}</div>
                <div className={`font-display text-2xl font-bold tabular-nums ${s.neutral ? 'text-text-primary' : s.value >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {formatCurrency(s.neutral ? -s.value : s.value)}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-border/60 bg-background/40 p-3 font-mono text-[11px] text-text-secondary">
            {result.tier ? (
              <>
                <span className="text-text-primary">{result.tier.name}</span> · {formatCurrency(result.tier.feePerCard)}/card · declared {formatCurrency(inputs.psa10Value)} (PSA 10 value, so no upcharge if it gems)
                {timeline && (
                  <> · grades back {formatShortDate(timeline.gradesBackEarliest)}–{formatShortDate(timeline.gradesBackLatest)} · cash back ~{formatDate(timeline.cashBack)} · {formatCurrency(timeline.peakOutlay)} tied up for {timeline.daysTiedUp} days</>
                )}
              </>
            ) : (
              <span className="text-loss">No open tier covers a {formatCurrency(inputs.psa10Value)} declared value — check PSA's premium tiers.</span>
            )}
          </div>
        </Slab>
      </div>

      {/* Cashflow timeline */}
      {timeline && (
        <Slab
          className="mb-6 rise rise-3"
          title="Cash timeline"
          actions={<span className="font-mono text-[10px] text-text-secondary">business days skip weekends, not holidays</span>}
        >
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                  <XAxis dataKey="t" type="number" scale="time" minTickGap={48} domain={['dataMin', 'dataMax']} tickFormatter={(t) => formatShortDate(new Date(t))} tick={CHART_TICK_STYLE} />
                  <YAxis tickFormatter={(v) => formatCurrency(v)} tick={CHART_TICK_STYLE} width={70} />
                  <ReferenceLine y={0} stroke={CHART_TICK} strokeDasharray="4 4" />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0].payload as { t: number; balance: number; label: string };
                      return (
                        <div className="rounded-lg border border-border-bright bg-background/95 px-3 py-2 font-mono text-xs">
                          <p className="text-text-primary">{p.label} · {formatShortDate(new Date(p.t))}</p>
                          <p className={p.balance >= 0 ? 'text-profit' : 'text-loss'}>Cash position {formatCurrency(p.balance)}</p>
                        </div>
                      );
                    }}
                  />
                  <Area type="stepAfter" dataKey="balance" stroke={SERIES.blue} fill={SERIES.blue} fillOpacity={0.12} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <ol className="lg:col-span-2 space-y-2.5">
              {timeline.events.map((e) => (
                <li key={e.label} className="flex gap-3">
                  <span className="w-14 shrink-0 font-mono text-[11px] text-accent-light">{formatShortDate(e.date)}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm text-text-primary">{e.label}</span>
                    <span className="block font-mono text-[10px] text-text-secondary">{e.detail}</span>
                  </span>
                  {e.amount !== 0 && (
                    <span className={`font-mono text-xs tabular-nums ${e.amount > 0 ? 'text-profit' : 'text-loss'}`}>
                      {e.amount > 0 ? '+' : ''}{formatCurrency(e.amount)}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </Slab>
      )}

      {/* Tier comparison */}
      <Slab
        className="mb-6 rise rise-4"
        title="Every tier, side by side"
        actions={
          <span className="font-mono text-[10px] text-text-secondary">
            {result.bestPerMonth && <>Best return on cash tied up: <span className="text-text-primary">{result.bestPerMonth.tier.name}</span> · </>}
            prices verified {formatDate(parseDate(PSA_TIERS_VERIFIED))}
          </span>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-[12px] tabular-nums">
            <thead>
              <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-text-secondary">
                <th className="py-2 pr-4 font-medium">Tier</th>
                <th className="py-2 pr-4 font-medium">Fee</th>
                <th className="py-2 pr-4 font-medium">Max value</th>
                <th className="py-2 pr-4 font-medium">Turnaround</th>
                <th className="py-2 pr-4 font-medium">Profit</th>
                <th className="py-2 pr-4 font-medium">Cash back</th>
                <th className="py-2 font-medium">Profit / month</th>
              </tr>
            </thead>
            <tbody>
              {result.comparison.map((r) => {
                const isChosen = r.tier.id === result.tier?.id;
                const edit = isAdmin
                  ? (field: 'feePerCard' | 'maxDeclaredValue' | 'turnaroundMin' | 'turnaroundMax', value: number) => (
                      <input
                        key={`${r.tier.id}-${field}-${value}`}
                        className="w-16 bg-background border border-border rounded px-1 py-0.5 text-right text-text-primary outline-none focus:border-accent"
                        defaultValue={value}
                        onBlur={(e) => {
                          const v = parseFloat(e.target.value);
                          if (Number.isFinite(v) && v !== value) updateTier(r.tier.id, { [field]: v });
                        }}
                      />
                    )
                  : null;
                return (
                  <tr key={r.tier.id} className={`border-b border-border/40 ${r.eligible ? '' : 'opacity-45'} ${isChosen ? 'bg-accent/[0.07]' : ''}`}>
                    <td className="py-2 pr-4 text-text-primary">
                      {r.tier.name}
                      {r.tier.paused && <span className="ml-1.5 text-[10px] text-text-secondary">paused</span>}
                      {isAdmin && (
                        <button onClick={() => updateTier(r.tier.id, { paused: !r.tier.paused })} className="ml-1.5 text-[10px] text-accent hover:text-accent-light">
                          {r.tier.paused ? 'reopen' : 'pause'}
                        </button>
                      )}
                    </td>
                    <td className="py-2 pr-4">{edit ? edit('feePerCard', r.tier.feePerCard) : formatCurrency(r.tier.feePerCard)}</td>
                    <td className="py-2 pr-4">{edit ? edit('maxDeclaredValue', r.tier.maxDeclaredValue) : formatCurrency(r.tier.maxDeclaredValue)}</td>
                    <td className="py-2 pr-4">
                      {edit
                        ? <span className="inline-flex gap-1">{edit('turnaroundMin', r.tier.turnaroundMin)}–{edit('turnaroundMax', r.tier.turnaroundMax)}</span>
                        : r.tier.turnaroundMin === r.tier.turnaroundMax ? r.tier.turnaroundMax : `${r.tier.turnaroundMin}–${r.tier.turnaroundMax}`}
                      <span className="text-text-secondary"> bd</span>
                    </td>
                    <td className={`py-2 pr-4 ${r.outcome.profit >= 0 ? 'text-profit' : 'text-loss'}`}>{r.eligible ? formatCurrency(r.outcome.profit) : '—'}</td>
                    <td className="py-2 pr-4 text-text-secondary">{r.eligible ? formatShortDate(r.cashBack) : '—'}</td>
                    <td className={`py-2 ${!r.eligible ? 'text-text-secondary' : r.profitPerMonth >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {r.eligible ? formatCurrency(r.profitPerMonth) : r.tier.paused ? 'paused' : `over ${formatCurrency(r.tier.maxDeclaredValue)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {isAdmin && (
          <button onClick={() => { if (confirm('Reset PSA tiers to the verified defaults?')) resetTiers(); }} className={`${secondaryButton} mt-4 inline-flex items-center gap-1.5`}>
            <RotateCcw size={11} /> Reset tiers
          </button>
        )}
        {!isAdmin && (
          <p className="mt-3 flex items-center gap-1.5 font-mono text-[10px] text-text-secondary/70">
            <Calculator size={11} /> Turn on Edit Mode to change tier prices or reopen paused tiers.
          </p>
        )}
        <p className="mt-2 font-mono text-[10px] text-text-secondary/70">
          {eligibleTiers(tiers, inputs.psa10Value).length === 0 && 'No open tier fits this declared value. '}
          Profit / month = expected profit ÷ months your cash is tied up — the faster tier wins when the fee gap is smaller than the time saved is worth.
        </p>
      </Slab>
    </div>
  );
}
