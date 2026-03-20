export function formatCurrency(value: number): string {
  const abs = Math.abs(value);
  const formatted = abs >= 1000
    ? '$' + abs.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    : '$' + abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return value < 0 ? '-' + formatted : formatted;
}

export function formatPercent(value: number): string {
  return value.toFixed(1) + '%';
}

export function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}
