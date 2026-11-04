/** Chart helpers (values in euros, not cents). */
export function niceStep(range: number): number {
  const steps = [
    1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000,
  ];
  const target = range / 4;
  return steps.find(s => s >= target) ?? Math.ceil(target / 100000) * 100000;
}

export function axisLabel(v: number): string {
  return Math.abs(v) >= 1000
    ? `${String(Math.round(v / 100) / 10).replace('.', ',')}k`
    : String(Math.round(v));
}

/** Rounded-top bar path. */
export function roundedTop(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, w / 2, h);
  if (h <= 0) return '';
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}
