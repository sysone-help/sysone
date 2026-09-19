import * as React from 'react';
import { Code } from './Code';
import snippets from '../comparison.json';

export function Comparison() {
  return (
    <section id="comparison" className="comparison section-anchor">
      <div className="section-top">
        <div>
          <span className="eyebrow">SAME MODEL · SAME QUESTION</span>
          <h2>From probability to a decision</h2>
        </div>
        <a href="https://github.com/sysone-help/sysone/tree/main/examples/compare">
          Executable source ↗
        </a>
      </div>
      <p>
        Both examples call Jev directly through TypeSafe. Both return <code>yes</code>,{' '}
        <code>no</code> or <code>uncertain</code> at the same 80% threshold, with a 30-second
        timeout. Neither needs a provider SDK.
      </p>
      <div className="comparison-grid">
        <div>
          <h3>With Sysone</h3>
          <Code label="sysone.ts">{snippets.sysone}</Code>
        </div>
        <div>
          <h3>Native fetch</h3>
          <Code label="native.ts">{snippets.native}</Code>
        </div>
      </div>
      <p className="doc-note">
        These are the actual files exercised by the comparison tests, including shared transport
        injection for testing. Tests verify identical request bodies, decisions and common failures.
        This is not a speed, cost or model-quality benchmark.
      </p>
      <details>
        <summary>What does the library add?</summary>
        <p>
          Threshold decisions with an explicit uncertain state, validated answers, cancellation,
          typed labels and collection operations. It also preserves provider metadata. The native
          example validates just the probability it consumes.
        </p>
        <p>
          For a single raw HTTP call, native fetch is already small and dependency-free. The{' '}
          <a href="https://docs.typesafe.ai/sdk/javascript">official TypeSafe SDK</a> also provides
          inferred types and questions. Sysone is useful when you want the same decision and
          collection API across providers, without installing an SDK.
        </p>
      </details>
    </section>
  );
}
