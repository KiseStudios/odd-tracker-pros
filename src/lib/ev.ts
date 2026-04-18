/**
 * Centralized EV / probability helpers.
 * EV (per unit stake) = probability * odd - 1
 */

export type EvClass = "positive" | "negative" | "neutral";

export function computeEV(probability: number | null | undefined, odd: number | null | undefined): number | null {
  if (probability == null || odd == null) return null;
  if (probability <= 0 || probability > 1) return null;
  if (odd <= 1) return null;
  return probability * odd - 1;
}

export function classifyEV(ev: number | null | undefined): EvClass {
  if (ev == null) return "neutral";
  if (ev > 0.005) return "positive";
  if (ev < -0.005) return "negative";
  return "neutral";
}

export function impliedProbability(odd: number): number {
  return 1 / odd;
}

export function fairOdd(probability: number): number {
  return 1 / probability;
}

export function kellyStake(probability: number, odd: number, fraction = 0.25): number {
  // Kelly fraction: f* = (p*(b+1) - 1) / b , where b = odd - 1
  const b = odd - 1;
  const f = (probability * (b + 1) - 1) / b;
  return Math.max(0, f * fraction);
}

export function combinedOdd(odds: number[]): number {
  return odds.reduce((acc, o) => acc * o, 1);
}

export function combinedProbability(probs: number[]): number {
  return probs.reduce((acc, p) => acc * p, 1);
}

export function formatPct(v: number | null | undefined, digits = 2): string {
  if (v == null || Number.isNaN(v)) return "—";
  return `${(v * 100).toFixed(digits)}%`;
}

export function formatMoney(v: number | null | undefined, currency = "BRL"): string {
  if (v == null || Number.isNaN(v)) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(v);
}

export function formatNumber(v: number | null | undefined, digits = 2): string {
  if (v == null || Number.isNaN(v)) return "—";
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);
}
