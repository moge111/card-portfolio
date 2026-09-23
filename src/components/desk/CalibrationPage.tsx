import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { usePortfolio } from '../../context/PortfolioContext';
import { formatPercent } from '../../utils/formatters';
import { CALIBRATION_BUCKETS, calibrationFor, calibrationRow, gradedCards, type CalibrationRow } from '../../utils/gradingMath';
import { BAR_RADIUS, CHART_GRID, CHART_TICK_STYLE, SERIES } from '../../constants/theme';
import PageHeader from '../shared/PageHeader';
import Slab from '../shared/Slab';
import StatCard from '../shared/StatCard';

const rate = (count: number, graded: number) => (graded > 0 ? (count / graded) * 100 : 0);

function RowCells({ row }: { row: CalibrationRow }) {
  const delta = row.actual10s - row.predicted10s;
  return (
    <>
      <td className="py-2 pr-4 text-text-secondary">{row.graded}</td>
      <td className="py-2 pr-4">{formatPercent(rate(row.predicted10s, row.graded))}</td>
      <td className="py-2 pr-4 text-text-primary">{formatPercent(rate(row.actual10s, row.graded))}</td>
      <td className={`py-2 pr-4 ${delta >= 0 ? 'text-profit' : 'text-loss'}`}>
        {delta >= 0 ? '+' : ''}{delta.toFixed(1)}
      </td>
      <td className="py-2 pr-4">{formatPercent(rate(row.predicted9s, row.graded))}</td>
      <td className="py-2">{formatPercent(rate(row.actual9s, row.graded))}</td>
    </>
  );
}

function RowHead({ first }: { first: string }) {
  return (
    <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-text-secondary">
      <th className="py-2 pr-4 font-medium">{first}</th>
      <th className="py-2 pr-4 font-medium">Graded</th>
      <th className="py-2 pr-4 font-medium">Est. 10%</th>
      <th className="py-2 pr-4 font-medium">Actual 10%</th>
      <th className="py-2 pr-4 font-medium">10s vs est.</th>
      <th className="py-2 pr-4 font-medium">Est. 9%</th>
      <th className="py-2 font-medium">Actual 9%</th>
    </tr>
  );
}

export default function CalibrationPage() {
  const { gradingPortfolio } = usePortfolio();

  const data = useMemo(() => {
    const graded = gradedCards(gradingPortfolio);
    const overall = calibrationRow('All returned cards', graded);
    const byCategory = [...new Set(graded.map((c) => c.category))]
      .map((cat) => calibrationRow(cat, graded.filter((c) => c.category === cat)))
      .sort((a, b) => b.graded - a.graded);
    const buckets = CALIBRATION_BUCKETS.map((b) => {
      const row = calibrationRow(b.label, graded.filter((c) => c.psa10Rate >= b.min && c.psa10Rate < b.max));
      return { ...row, estimated: +rate(row.predicted10s, row.graded).toFixed(1), actual: +rate(row.actual10s, row.graded).toFixed(1) };
    }).filter((b) => b.graded > 0);
    const byCard = graded
      .map((c) => ({ card: c, row: calibrationRow(c.name, [c]) }))
      .sort((a, b) => (a.row.actual10s - a.row.predicted10s) - (b.row.actual10s - b.row.predicted10s));
    const factors = byCategory.map((row) => ({ category: row.label, calibration: calibrationFor(gradingPortfolio, row.label) }));
    return { overall, byCategory, buckets, byCard, factors, factor: calibrationFor(gradingPortfolio)?.factor ?? null };
  }, [gradingPortfolio]);

  const { overall, factor } = data;
  const estimated10 = rate(overall.predicted10s, overall.graded);
  const actual10 = rate(overall.actual10s, overall.graded);

  return (
    <div>
      <PageHeader
        title="Calibration"
        detail="Grading desk · how your 10-rate estimates hold up"
        figure={factor ? { value: `×${factor.toFixed(2)}`, caption: 'Track-record factor', tone: factor >= 1 ? 'text-profit' : 'text-loss' } : undefined}
      />

      {overall.graded === 0 ? (
        <div className="panel p-10 text-center text-text-secondary">No graded cards yet — this fills in as subs come back.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 rise rise-1">
            {[
              { label: 'Cards graded', value: String(overall.graded), sub: `${data.byCard.length} different cards` },
              { label: 'Estimated 10 rate', value: formatPercent(estimated10), sub: `${overall.predicted10s.toFixed(1)} 10s expected` },
              { label: 'Actual 10 rate', value: formatPercent(actual10), sub: `${overall.actual10s} 10s from PSA`, tone: actual10 >= estimated10 ? 'text-profit' : 'text-loss' },
              {
                label: 'Track-record factor',
                value: factor ? `×${factor.toFixed(2)}` : '—',
                sub: factor ? (factor < 1 ? 'you over-estimate 10s' : 'your cards beat your estimates') : 'needs 10+ graded cards',
                tone: factor && factor >= 1 ? 'text-profit' : 'text-loss',
              },
            ].map((k) => (
              <StatCard key={k.label} title={k.label} value={k.value} subtitle={k.sub} tone={k.tone} />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
            <Slab className="lg:col-span-3 rise rise-2" title="Estimated vs actual, by how confident you were">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.buckets}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                  <XAxis dataKey="label" tick={CHART_TICK_STYLE} />
                  <YAxis unit="%" domain={[0, 100]} tick={CHART_TICK_STYLE} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const b = payload[0].payload as CalibrationRow & { estimated: number; actual: number };
                      return (
                        <div className="rounded-md border border-border-bright bg-surface px-3 py-2 font-mono text-xs">
                          <p className="text-text-primary mb-1">Estimated {label} · {b.graded} cards</p>
                          <p className="text-text-secondary">Estimated: <span className="text-text-primary">{b.estimated}%</span></p>
                          <p className="text-text-secondary">Actual: <span className="text-text-primary">{b.actual}%</span></p>
                        </div>
                      );
                    }}
                  />
                  <Legend iconType="circle" iconSize={7} formatter={(v: string) => <span className="text-[11px] text-text-secondary">{v}</span>} />
                  <Bar dataKey="estimated" name="Estimated 10 rate" fill={SERIES.blue} radius={BAR_RADIUS} />
                  <Bar dataKey="actual" name="Actual 10 rate" fill={SERIES.gold} radius={BAR_RADIUS} />
                </BarChart>
              </ResponsiveContainer>
              <p className="mt-3 font-mono text-[10px] text-text-secondary/80">
                Well-calibrated estimates put the gold bar level with the blue one in every group. Small groups swing hard — a single card can move them 50 points.
              </p>
            </Slab>

            <Slab className="lg:col-span-2 rise rise-3" title="By category">
              <div className="overflow-x-auto">
                <table className="w-full font-mono text-[12px] tabular-nums">
                  <thead><RowHead first="Category" /></thead>
                  <tbody>
                    {data.byCategory.map((row) => (
                      <tr key={row.label} className="border-b border-border/40">
                        <td className="py-2 pr-4 text-text-primary">{row.label}</td>
                        <RowCells row={row} />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-sm text-text-secondary">
                {factor && (
                  <>
                    Should I Grade? and the pre-grade queue scale your 10 rates by default (you can switch it off):{' '}
                    {data.factors.map(({ category, calibration }, i) => (
                      <span key={category}>
                        {i > 0 && ', '}
                        {category} <span className="text-accent-light font-mono">×{calibration!.factor.toFixed(2)}</span>
                        {calibration!.scope !== category && <span className="text-text-secondary/70"> (too few graded, uses all cards)</span>}
                      </span>
                    ))}.
                  </>
                )}
              </p>
            </Slab>
          </div>

          <Slab className="rise rise-4" title="Every returned card">
            <p className="font-mono text-[10px] text-text-secondary mb-4">Biggest misses first — look for what the disappointing ones have in common.</p>
            <div className="overflow-x-auto">
              <table className="w-full font-mono text-[12px] tabular-nums">
                <thead><RowHead first="Card" /></thead>
                <tbody>
                  {data.byCard.map(({ card, row }) => (
                    <tr key={card.id} className="border-b border-border/40">
                      <td className="py-2 pr-4 font-body text-sm text-text-primary">
                        {card.name}
                        <span className="ml-2 font-mono text-[10px] text-text-secondary">
                          {card.actual10s > 0 && `${card.actual10s}×10 `}{card.actual9s > 0 && `${card.actual9s}×9 `}{card.actualSub9s > 0 && `${card.actualSub9s}×sub-9`}
                        </span>
                      </td>
                      <RowCells row={row} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Slab>
        </>
      )}
    </div>
  );
}
