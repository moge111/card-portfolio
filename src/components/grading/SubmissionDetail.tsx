import { useState, useRef } from 'react';
import { X, Plus } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import type { GradingCard } from '../../types/portfolio';

const EBAY_FEE = 0.1325;
const SHIPPING_COST_PER_SALE = 2; // $5 charged - ~$7 FedEx avg = $2 out of pocket

interface CardEntry {
  card: GradingCard;
  subQty: number;
}

interface SubmissionDetailProps {
  title: string;
  cards: CardEntry[];
  shippingCost: number;
  onClose: () => void;
  onAddSale: (cardId: number, price: number) => void;
  onRemoveSale: (cardId: number, index: number) => void;
  onUpdateSale: (cardId: number, index: number, newPrice: number) => void;
}

function AddSaleRow({ card, onAdd }: { card: GradingCard; onAdd: (price: number) => void }) {
  const [adding, setAdding] = useState(false);
  const [qty, setQty] = useState('1');
  const [price, setPrice] = useState('');
  const [promoFee, setPromoFee] = useState('');
  const priceRef = useRef<HTMLInputElement>(null);

  const commit = () => {
    const salePrice = parseFloat(price);
    const q = parseInt(qty) || 1;
    const promo = parseFloat(promoFee) || 0;
    if (!isNaN(salePrice) && salePrice > 0) {
      const totalFeeRate = EBAY_FEE + promo / 100;
      const net = +(salePrice * (1 - totalFeeRate) - SHIPPING_COST_PER_SALE).toFixed(2);
      for (let i = 0; i < q; i++) onAdd(net);
    }
    setPrice('');
    setQty('1');
    setPromoFee('');
    setAdding(false);
  };

  const soldCount = (card.soldPrices || []).length;
  const remaining = card.gradedQty - soldCount;
  if (remaining <= 0) return null;

  if (!adding) {
    return (
      <button
        onClick={() => { setAdding(true); setTimeout(() => priceRef.current?.focus(), 0); }}
        className="flex items-center gap-1 text-xs text-accent hover:text-accent-light transition-colors mt-1"
      >
        <Plus size={10} /> Log sale
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-1 flex-wrap">
      <input
        type="text"
        inputMode="numeric"
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        className="w-10 bg-background border border-border rounded px-1 py-0.5 text-xs text-text-primary text-center outline-none focus:border-accent"
        placeholder="qty"
      />
      <span className="text-text-secondary text-xs">×</span>
      <input
        ref={priceRef}
        type="text"
        inputMode="decimal"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { setAdding(false); setPrice(''); setQty('1'); setPromoFee(''); }
        }}
        className="w-20 bg-background border border-border rounded px-1.5 py-0.5 text-xs text-text-primary outline-none focus:border-accent"
        placeholder="sale price"
      />
      <span className="text-text-secondary text-xs">- 13.25% - $2 ship</span>
      <span className="text-text-secondary text-xs">-</span>
      <input
        type="text"
        inputMode="decimal"
        value={promoFee}
        onChange={(e) => setPromoFee(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { setAdding(false); setPrice(''); setQty('1'); setPromoFee(''); }
        }}
        className="w-12 bg-background border border-border rounded px-1 py-0.5 text-xs text-text-primary text-center outline-none focus:border-accent"
        placeholder="promo%"
      />
      <button onClick={commit} className="text-xs text-profit hover:text-profit/80 font-medium">Add</button>
      <button onClick={() => { setAdding(false); setPrice(''); setQty('1'); setPromoFee(''); }} className="text-xs text-text-secondary hover:text-text-primary">Cancel</button>
    </div>
  );
}

function EditableSaleChip({ price, onUpdate, onRemove }: { price: number; onUpdate: (newPrice: number) => void; onRemove: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const ref = useRef<HTMLInputElement>(null);

  const commit = () => {
    const v = parseFloat(draft);
    if (!isNaN(v)) onUpdate(+v.toFixed(2));
    setEditing(false);
    setDraft('');
  };

  if (editing) {
    return (
      <input
        ref={ref}
        type="text"
        inputMode="decimal"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { setEditing(false); setDraft(''); }
        }}
        onBlur={commit}
        className="w-16 bg-background border border-accent rounded px-1.5 py-0.5 text-xs text-text-primary outline-none focus:ring-1 focus:ring-accent"
      />
    );
  }

  return (
    <span className="inline-flex items-center gap-1 bg-profit/10 text-profit px-2 py-0.5 rounded text-xs">
      <span
        className="cursor-pointer hover:underline"
        onClick={() => { setEditing(true); setDraft(String(price)); setTimeout(() => ref.current?.focus(), 0); }}
      >
        {formatCurrency(price)}
      </span>
      <button onClick={onRemove} className="text-profit/40 hover:text-profit transition-colors">
        <X size={10} />
      </button>
    </span>
  );
}

export default function SubmissionDetail({ title, cards, shippingCost, onClose, onAddSale, onRemoveSale, onUpdateSale }: SubmissionDetailProps) {
  const [profitTarget, setProfitTarget] = useState(30);
  const totalInvest = cards.reduce((s, { card, subQty }) => s + (card.totalInvestment / card.qty) * subQty, 0);
  const totalSold = cards.reduce((s, { card }) => s + (card.soldPrices || []).reduce((a, p) => a + p, 0), 0);
  const totalSoldQty = cards.reduce((s, { card }) => s + (card.soldPrices || []).length, 0);
  const totalQty = cards.reduce((s, { subQty }) => s + subQty, 0);
  const totalProfit = totalSold - cards.reduce((s, { card }) => {
    const soldCount = (card.soldPrices || []).length;
    return s + (card.totalInvestment / card.qty) * soldCount;
  }, 0) - (totalSoldQty > 0 ? shippingCost * (totalSoldQty / totalQty) : 0);

  return (
    <div className="bg-surface rounded-xl border border-accent/30 p-5 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          <p className="text-xs text-text-secondary mt-0.5">
            {totalSoldQty}/{totalQty} sold · {formatCurrency(totalInvest)} invested
            {shippingCost > 0 && ` · ${formatCurrency(shippingCost)} shipping`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-text-secondary">Profit target:</span>
            <input
              type="text"
              inputMode="numeric"
              value={profitTarget}
              onChange={(e) => {
                const v = parseInt(e.target.value);
                if (!isNaN(v) && v >= 0) setProfitTarget(v);
                else if (e.target.value === '') setProfitTarget(0);
              }}
              className="w-12 bg-background border border-border rounded px-1.5 py-0.5 text-xs text-text-primary text-center outline-none focus:border-accent"
            />
            <span className="text-xs text-text-secondary">%</span>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {cards.map(({ card, subQty }) => {
          const investPerCard = card.totalInvestment / card.qty;
          const totalCardInvest = investPerCard * subQty;
          const sales = card.soldPrices || [];
          const salesTotal = sales.reduce((s, p) => s + p, 0);
          const cardProfit = salesTotal - investPerCard * sales.length;
          const isGraded = card.gradedQty > 0;
          const shippingPerCard = totalQty > 0 ? shippingCost / totalQty : 0;
          const costBasis = investPerCard + shippingPerCard;
          const remaining = subQty - sales.length;

          const targetMultiplier = 1 + profitTarget / 100;
          const gradeOffers = isGraded ? [
            card.actual10s > 0 && { grade: 'PSA 10', count: card.actual10s, market: card.psa10Value, minSell: +(costBasis * targetMultiplier / (1 - EBAY_FEE)).toFixed(2) },
            card.actual9s > 0 && { grade: 'PSA 9', count: card.actual9s, market: card.psa9Value, minSell: +(costBasis * targetMultiplier / (1 - EBAY_FEE)).toFixed(2) },
            card.actualSub9s > 0 && { grade: 'Sub-9', count: card.actualSub9s, market: card.costPerCard, minSell: +(costBasis * 1.0 / (1 - EBAY_FEE)).toFixed(2) },
          ].filter(Boolean) as { grade: string; count: number; market: number; minSell: number }[] : [];

          return (
            <div key={card.id} className="border border-border/50 rounded-lg p-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-medium text-text-primary">{card.name}</div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-text-secondary">
                    <span>{subQty} card{subQty > 1 ? 's' : ''}</span>
                    <span>{formatCurrency(investPerCard)}/card</span>
                    <span>Total: {formatCurrency(totalCardInvest)}</span>
                    {isGraded && (
                      <span className="flex gap-1">
                        {card.actual10s > 0 && <span className="text-profit">{card.actual10s}×10</span>}
                        {card.actual9s > 0 && <span className="text-accent-light">{card.actual9s}×9</span>}
                        {card.actualSub9s > 0 && <span className="text-loss">{card.actualSub9s}×sub9</span>}
                      </span>
                    )}
                  </div>
                  {gradeOffers.length > 0 && remaining > 0 && (
                    <div className="mt-1.5 space-y-0.5">
                      {gradeOffers.map(({ grade, count, market, minSell }) => {
                        const netAfterFees = +(minSell * (1 - EBAY_FEE)).toFixed(2);
                        const profit = +(netAfterFees - costBasis).toFixed(2);
                        return (
                          <div key={grade} className="text-xs flex items-center gap-2">
                            <span className={grade === 'PSA 10' ? 'text-profit font-medium' : grade === 'PSA 9' ? 'text-accent-light font-medium' : 'text-loss font-medium'}>
                              {grade}{count > 1 ? ` (×${count})` : ''}
                            </span>
                            <span className="text-text-secondary">Mkt: {formatCurrency(market)}</span>
                            <span className="text-amber-400 font-medium">Don't sell below {formatCurrency(minSell)}</span>
                            <span className="text-profit text-[10px]">(+{formatCurrency(profit)} profit)</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                {sales.length > 0 && (
                  <div className="text-right">
                    <div className={`text-sm font-bold ${cardProfit >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {formatCurrency(cardProfit)}
                    </div>
                    <div className="text-xs text-text-secondary">{sales.length} sold</div>
                  </div>
                )}
              </div>

              {sales.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {sales.map((price, i) => (
                    <EditableSaleChip
                      key={i}
                      price={price}
                      onUpdate={(newPrice) => onUpdateSale(card.id, i, newPrice)}
                      onRemove={() => onRemoveSale(card.id, i)}
                    />
                  ))}
                </div>
              )}

              <AddSaleRow card={card} onAdd={(price) => onAddSale(card.id, price)} />
            </div>
          );
        })}
      </div>

      {totalSoldQty > 0 && (
        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
          <div className="text-xs text-text-secondary">
            {totalSoldQty}/{totalQty} cards sold · Total revenue: {formatCurrency(totalSold)}
          </div>
          <div className={`text-sm font-bold ${totalProfit >= 0 ? 'text-profit' : 'text-loss'}`}>
            Profit: {formatCurrency(totalProfit)}
          </div>
        </div>
      )}
    </div>
  );
}
