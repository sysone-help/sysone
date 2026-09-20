import type { EvaluationMetadata } from 'sysone-help';

/** Cost charged by the Gateway, not the undiscounted marketCost. */
export function gatewayCost(metadata: EvaluationMetadata): number | null {
  const gateway = metadata.providerMetadata?.gateway;
  if (!gateway || typeof gateway !== 'object' || Array.isArray(gateway)) return null;
  const value = (gateway as Record<string, unknown>).cost;
  if (
    typeof value !== 'number' &&
    !(typeof value === 'string' && /^\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(value.trim()))
  )
    return null;
  const cost = Number(value);
  return Number.isFinite(cost) && cost >= 0 ? cost : null;
}

export function formatCost(cost: number | null): string {
  if (cost === null) return 'Not reported';
  if (cost === 0) return '$0';
  if (cost < 0.000000000001) return '< $0.000000000001';
  return `$${cost.toLocaleString('en-US', { maximumFractionDigits: 12 })}`;
}

export function formatDuration(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(2)} s`;
}
