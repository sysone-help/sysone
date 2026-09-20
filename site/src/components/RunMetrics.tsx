import * as React from 'react';
import type { EvaluationMetadata } from '@sysone-help/sysone';
import { formatCost, formatDuration, gatewayCost } from '../run-metrics';

export function RunMetrics({
  metadata,
  elapsedMs,
  responseMs,
}: {
  metadata: EvaluationMetadata;
  elapsedMs: number;
  responseMs: number;
}) {
  return (
    <dl className="run-metrics" aria-label="Evaluation metrics">
      <div>
        <dt title={`Browser round trip. Server evaluation: ${formatDuration(elapsedMs)}.`}>
          Response time
        </dt>
        <dd>{formatDuration(responseMs)}</dd>
      </div>
      <div>
        <dt title="Cost reported by Vercel AI Gateway for this request">Cost · USD</dt>
        <dd>{formatCost(gatewayCost(metadata))}</dd>
      </div>
    </dl>
  );
}
