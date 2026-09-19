import * as React from 'react';
import { useState } from 'react';
import { Code } from './Code';
import { Arrow } from './Symbols';
import { installCommand, npmPublished } from '../release';
const repo = 'https://github.com/sysone-help/sysone';
export function Reference() {
  const [provider, setProvider] = useState<'vercel' | 'typesafe'>('typesafe');
  return (
    <section id="docs" className="documentation section-anchor">
      <div className="section-top">
        <div>
          <span className="eyebrow">REFERENCE</span>
          <h2>API reference</h2>
        </div>
        <a href={`${repo}/blob/main/packages/sysone/README.md`} className="inline-link">
          Full API reference <Arrow />
        </a>
      </div>
      <div className="docs-layout">
        <aside className="docs-nav">
          <a href="#installation">Installation</a>
          <a href="#definitions">Reusable questions</a>
          <a href="#collections">Working with lists</a>
          <a href="#providers">Adapters</a>
          <a href="#models">Models &amp; open source</a>
          <a href="#behavior">Behavior & limits</a>
        </aside>
        <div className="docs-content">
          <article id="installation" className="section-anchor">
            <h3>Install</h3>
            <p>
              Use Node.js 22 or later and ESM. Keep provider credentials in your server environment.
            </p>
            {!npmPublished && (
              <p className="doc-note">
                The first npm publication is pending. Install the same package from the GitHub
                release below; the imports and API are unchanged.
              </p>
            )}
            <div className="provider-toggle" aria-label="Installation provider">
              <button aria-pressed={provider === 'vercel'} onClick={() => setProvider('vercel')}>
                Vercel AI Gateway
              </button>
              <button
                aria-pressed={provider === 'typesafe'}
                onClick={() => setProvider('typesafe')}
              >
                TypeSafe direct
              </button>
            </div>
            <Code label="Terminal">
              {provider === 'vercel'
                ? `${installCommand}\nnpm install ai@7.0.105 @ai-sdk/gateway@4.0.85\n\n# Set AI_GATEWAY_API_KEY in your server environment`
                : `${installCommand}\n\n# Set TYPESAFE_API_KEY in your server environment`}
            </Code>
            <Code>{`import { createSysone, predicate } from "sysone";
import { ${provider} } from "sysone/providers/${provider}";

const sys = createSysone({
  provider: ${provider}(),
  model: "${provider === 'vercel' ? 'typesafe-ai/jev' : 'jev-latest'}",
});
const needsReply = predicate("Does this message need a reply?");

const result = await sys.check("Can you send the proposal?", needsReply);
// { decision: "yes" | "no" | "uncertain", probability, metadata }`}</Code>
          </article>
          <article id="definitions" className="section-anchor">
            <h3>Definitions and evaluation</h3>
            <p>
              Definitions are immutable data. Creating them is local and free. <code>evaluate</code>{' '}
              asks multiple independent questions about the same input in one request.
            </p>
            <Code>{`import { predicate, classifier } from "sysone";

const needsReply = predicate("Does this need a reply?");
const team = classifier({
  billing: "Payments, invoices and refunds",
  support: "Bugs and technical questions",
  other: "Everything else",
});

const { answers } = await sys.evaluate(message, { needsReply, team });
answers.team.choice; // "billing" | "support" | "other"
answers.needsReply.probability; // number, from 0 to 1`}</Code>
            <p className="doc-note">
              Each question sees the input, not the answers to the other questions. Raw evaluation
              returns evidence; <code>check</code> applies a yes/no threshold.
            </p>
          </article>
          <article id="collections" className="section-anchor">
            <h3>Collections</h3>
            <Code>{`const groups = await sys.partition(messages, needsReply, {
  select: message => message.body,
  minProbability: 0.85,
  concurrency: 4,
});

groups.yes;       // Keep the original objects
groups.no;        // Preserve their original order
groups.uncertain; // Review these separately

// Only need the yes group? filter uses the same policy.
const actionable = await sys.filter(messages, needsReply, {
  select: message => message.body,
});`}</Code>
            <p>For ranking, define a rubric rather than an unexplained score:</p>
            <Code>{`import { rubric } from "sysone";

const urgency = rubric("How urgent is this request?", [
  "Routine: no time pressure",
  "Soon: time-sensitive but not blocking",
  "Immediate: active outage or severe disruption",
]);

const ranked = await sys.rank(messages, urgency, {
  select: message => message.body,
});
// [{ item, score, answer, metadata }] — highest score first`}</Code>
            <p className="doc-note">
              Collections make one request per item. Ranking scores each item independently against
              the same rubric. Equal scores keep input order.
            </p>
          </article>
          <article id="providers" className="section-anchor">
            <h3>Providers and models</h3>
            <p>
              A provider configures credentials, transport and endpoint. A model selects what runs
              through it. The same provider can serve multiple evaluation models; choose a model
              explicitly.
            </p>
            <Code>{`import { createSysone } from "sysone";
import { vercel } from "sysone/providers/vercel";
import { typesafe } from "sysone/providers/typesafe";

const gateway = vercel(); // Connection and credentials.

const sys = createSysone({
  provider: gateway,
  model: "typesafe-ai/jev", // Selection within the provider's catalog.
});

// The same Jev family, through its native provider:
const direct = createSysone({
  provider: typesafe(),
  model: "jev-latest",
});`}</Code>
            <p>
              Reuse <code>gateway</code> with another model ID to create another client. IDs belong
              to the provider's evaluation catalog; Sysone does not assume that providers share
              aliases or that every model supports evaluation. There is no default model or silent
              fallback.
            </p>
            <p>
              Cloudflare and OpenRouter also offer access to Jev; their Sysone adapters are not
              included in this release. A custom integration implements the exported{' '}
              <code>EvaluationProvider</code> interface.
            </p>
            <p className="doc-note">
              The Vercel adapter uses an experimental AI SDK evaluation API. Its optional
              dependencies are pinned to tested versions. Confidence and probabilities may differ
              across models; thresholds need evaluation on your own examples. Gateway extensions
              remain namespaced in metadata.providerMetadata, without assuming TypeSafe semantics.
            </p>
            <Code>{`import { createSysone, predicate } from "sysone";
import { systemOne } from "sysone/providers/system-one";

const sys = createSysone({
  provider: systemOne({
    baseURL: "http://127.0.0.1:8080/v1",
    id: "local",
  }),
  model: "openjev-latest",
});

await sys.check("Can you help?", predicate("Needs a reply?"));`}</Code>
            <p className="doc-note">
              Start your OpenJev server first. The adapter appends <code>/systemone</code> to the
              API base. Optional <code>apiKey</code> and <code>headers</code> support authenticated
              servers. This code runs in your app; the shared playground always uses Jev.
            </p>
          </article>
          <article id="models" className="section-anchor">
            <h3>Models &amp; open alternatives</h3>
            <p>
              Sysone works with evaluation models. Jev powers this shared playground; it is one
              implementation, not a requirement of the library.
            </p>
            <div className="table-scroll">
              <table className="models-table">
                <thead>
                  <tr>
                    <th>Model / project</th>
                    <th>Access</th>
                    <th>Sysone integration</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <a href="https://docs.typesafe.ai">Jev / TypeSafe</a>
                    </td>
                    <td>Hosted API. No official open weights found.</td>
                    <td>
                      <code>typesafe()</code> or <code>vercel()</code>. The Vercel route runs here.
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <a href="https://github.com/razorback16/openjev">OpenJev / razorback16</a>
                    </td>
                    <td>
                      Independent Apache-2.0 server using DiffusionGemma. Model terms apply
                      separately.
                    </td>
                    <td>
                      <code>systemOne()</code>, experimental. Compatible HTTP contract; GPU backend
                      not tested here.
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <a href="https://huggingface.co/bespokelabs/Bespoke-Nimble-9B">
                        Bespoke Nimble 9B
                      </a>
                    </td>
                    <td>Open evaluation weights: Apache-2.0 adapter over Qwen3.5-9B.</td>
                    <td>
                      Custom adapter needed. Boolean, enum and ordinal scoring from token logits.
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <a href="https://huggingface.co/com-kotobalabs/open-jev-deberta-v3-large">
                        Kotoba Open-Jev
                      </a>
                    </td>
                    <td>Open Apache-2.0 evaluation weights. Compact encoder; 512-token context.</td>
                    <td>
                      Custom adapter needed. Narrower training domains and different confidence
                      semantics.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="doc-note">
              Reviewed September 19, 2026. An open implementation is not Jev's weights. Matching
              request shapes does not mean matching quality or calibration. OpenJev derives
              confidence from normalized entropy; validate thresholds again when switching models.
            </p>
            <p>
              <a href={`${repo}/blob/main/research/open-evaluation-models.md`}>
                Research notes, licenses and compatibility details ↗
              </a>
            </p>
          </article>
          <article id="behavior" className="section-anchor">
            <h3>Execution behavior</h3>
            <dl className="behavior-list">
              <div>
                <dt>Uncertainty</dt>
                <dd>
                  <code>check</code> defaults to 80%. <code>filter</code> excludes uncertain items;{' '}
                  <code>partition</code> keeps them available.
                </dd>
              </div>
              <div>
                <dt>Cancellation</dt>
                <dd>
                  Pass <code>{'{ signal: controller.signal }'}</code> to an operation. The default
                  per-request timeout is 30 seconds.
                </dd>
              </div>
              <div>
                <dt>Retries</dt>
                <dd>
                  No automatic retries or provider fallback. A failed collection rejects; already
                  running requests may finish and incur usage.
                </dd>
              </div>
              <div>
                <dt>Evidence</dt>
                <dd>
                  Provider confidence is separate from answer probability. Missing evidence stays
                  missing. Invalid responses throw <code>SysoneError</code>.
                </dd>
              </div>
              <div>
                <dt>Input</dt>
                <dd>
                  Text or JSON objects/arrays. Jev evaluates the supplied context; it does not
                  browse, generate explanations, or execute actions.
                </dd>
              </div>
            </dl>
          </article>
        </div>
      </div>
    </section>
  );
}
