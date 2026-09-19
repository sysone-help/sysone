import * as React from 'react';
import type { EvaluationMetadata } from 'sysone';
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
        <dt title="From sending the request to reading the response in your browser">
          Response time
        </dt>
        <dd>
          {formatDuration(responseMs)}
          <small title="Server-to-Gateway round trip, including transport and response validation">
            {formatDuration(elapsedMs)} evaluation
          </small>
        </dd>
      </div>
      <div>
        <dt title="Cost reported by Vercel AI Gateway for this request">Cost · USD</dt>
        <dd>
          {formatCost(gatewayCost(metadata))}
          <small>
            <a href="https://vercel.com/ai-gateway/models/jev">Gateway pricing ↗</a>
          </small>
        </dd>
      </div>
      <div>
        <dt>Input tokens</dt>
        <dd>
          {metadata.usage?.inputTokens?.toLocaleString('en-US') ?? 'Not reported'}
          <small>1 request · shared key</small>
        </dd>
      </div>
    </dl>
  );
}
