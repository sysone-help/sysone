import * as React from 'react';
import { useState } from 'react';
import { Code } from './Code';
import { Arrow } from './Symbols';
import { installCommand, npmPublished } from '../release';
import size from '../../../packages/sysone/size.json';
const repo = 'https://github.com/sysone-help/sysone';
export function Reference() {
  const [provider, setProvider] = useState<'vercel' | 'typesafe'>('vercel');
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
          <a href="#size">Size & dependencies</a>
          <a href="#choose">Choose a function</a>
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
              Zero runtime, optional or peer dependencies — including the Vercel provider. Uses
              native fetch. Requires Node.js 22+ and ESM; keep credentials on your server.
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
                ? `${installCommand}\n\n# Set AI_GATEWAY_API_KEY in your server environment`
                : `${installCommand}\n\n# Set TYPESAFE_API_KEY in your server environment`}
            </Code>
            <Code label="demo.mjs · JavaScript and TypeScript compatible">{`import { createSysone } from "sysone";
import { ${provider} } from "sysone/providers/${provider}";

const sys = createSysone({
  provider: ${provider}(),
  model: "${provider === 'vercel' ? 'typesafe-ai/jev' : 'jev-latest'}",
});
const result = await sys.check(
  "Can you send the proposal?", "Does this message need a reply?",
);
console.log(result.decision, result.probability);
// { decision: "yes" | "no" | "uncertain", probability, metadata }`}</Code>
            <Code label="Terminal">{`node demo.mjs`}</Code>
            <p className="doc-note">
              Save the example as demo.mjs after setting your provider key. This uses your own
              account; the playground above uses the shared account.
            </p>
          </article>
          <article id="size" className="section-anchor">
            <h3>Small by design</h3>
            <p>
              No SDK, schema library, polyfill or third-party code is installed or bundled into
              Sysone. Providers are separate ESM entry points; import the ones you use. TypeScript
              declarations are included.
            </p>
            <div className="table-scroll">
              <table className="models-table">
                <thead>
                  <tr>
                    <th>Included code</th>
                    <th>Minified</th>
                    <th>Minified + gzip</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Core', size.bundles.core],
                    ['Core + Vercel', size.bundles.vercel],
                    ['Core + TypeSafe', size.bundles.typesafe],
                    ['Core + custom HTTP', size.bundles.customProvider],
                    ['Core + all providers', size.bundles.all],
                  ].map(
                    ([label, measurement]) =>
                      typeof measurement === 'object' && (
                        <tr key={String(label)}>
                          <td>{String(label)}</td>
                          <td>{measurement.minifiedBytes.toLocaleString('en-US')} B</td>
                          <td>{measurement.gzipBytes.toLocaleString('en-US')} B</td>
                        </tr>
                      ),
                  )}
                </tbody>
              </table>
            </div>
            <p className="doc-note">
              Version {size.version}. All core exports retained, esbuild {size.esbuild}, ESM/ES2022,
              gzip level {size.gzipLevel} (zlib {size.zlib}). Compression versions may differ
              slightly. These are JavaScript bundle sizes, not package download size or this
              website's size. Types and docs are excluded. CI enforces a 4,000-byte gzip budget for
              the complete bundle.
            </p>
            <p>
              <a href={`${repo}/blob/main/scripts/package-size.mjs`}>
                Reproduce with npm run build &amp;&amp; npm run size ↗
              </a>
            </p>
          </article>
          <article id="choose" className="section-anchor">
            <h3>Which function do I need?</h3>
            <dl className="behavior-list">
              <div>
                <dt>
                  <code>check</code>
                </dt>
                <dd>One yes/no question. Returns a decision, probability and metadata.</dd>
              </div>
              <div>
                <dt>
                  <code>evaluate</code>
                </dt>
                <dd>
                  Several questions about one input. Typed labels, scores and raw probabilities in
                  one request.
                </dd>
              </div>
              <div>
                <dt>
                  <code>partition</code>
                </dt>
                <dd>Split a list into yes, no and uncertain. Keep the original items.</dd>
              </div>
              <div>
                <dt>
                  <code>filter</code>
                </dt>
                <dd>Keep only yes items. Use partition if uncertain items need review.</dd>
              </div>
              <div>
                <dt>
                  <code>rank</code>
                </dt>
                <dd>Order a list by a descriptive rubric. Highest score first.</dd>
              </div>
            </dl>
            <p>
              <code>check</code> returns an object, not a boolean. Read its decision explicitly:
            </p>
            <Code>{`const result = await sys.check(message, "Needs a reply?");
if (result.decision === "yes") {
  console.log("Take the yes branch");
}
// Treat "no" and "uncertain" according to your application's policy.
// Network errors throw; they are not an "uncertain" answer.`}</Code>
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
              The Vercel adapter calls the Gateway evaluation protocol directly using native fetch.
              The protocol is experimental; no SDK or additional package is required. Confidence and
              probabilities may differ across models; thresholds need evaluation on your own
              examples. Gateway extensions remain namespaced in metadata.providerMetadata, without
              assuming TypeSafe semantics.
            </p>
            <Code>{`import { createSysone, predicate } from "sysone";
import { customProvider } from "sysone/providers/custom";

const sys = createSysone({
  provider: customProvider({
    baseURL: "http://127.0.0.1:8080/v1",
    id: "local",
  }),
  model: "openjev-latest",
});

await sys.check("Can you help?", predicate("Needs a reply?"));`}</Code>
            <p className="doc-note">
              Use customProvider for your own endpoint, regardless of the model’s license. An open
              model offered through Vercel still uses vercel(). Start your OpenJev server first.
              This provider currently supports the System One HTTP protocol and appends{' '}
              <code>/systemone</code> to the API base. Optional <code>apiKey</code> and{' '}
              <code>headers</code> support authenticated servers. This code runs in your app; the
              shared playground always uses Jev.
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
                      <code>customProvider()</code>, experimental. Compatible HTTP contract; GPU
                      backend not tested here.
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
