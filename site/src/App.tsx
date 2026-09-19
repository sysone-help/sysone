import * as React from 'react';
import { useState } from 'react';
import { Code } from './components/Code';
import { Mark, Arrow } from './components/Symbols';
import { Playground } from './components/Playground';
import { installCommand, npmPublished, releaseUrl } from './release';
const repo = 'https://github.com/sysone-help/sysone';

export function App() {
  const [provider, setProvider] = useState<'vercel' | 'typesafe'>('vercel');
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header>
        <a className="brand" href="#" aria-label="Sysone home">
          <Mark />
          <span>
            sysone<span className="brand-period">.</span>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#playground">Playground</a>
          <a href="#learn">Learn</a>
          <a href="#docs">Docs</a>
          <a className="github-link" href={repo}>
            GitHub <Arrow />
          </a>
        </nav>
      </header>
      <main id="main">
        <section className="hero">
          <div>
            <div className="eyebrow hero-eyebrow">
              <span className="tiny-dot" /> OPEN SOURCE · TYPESCRIPT · SYSTEM ONE
            </div>
            <h1>
              Small decisions.
              <br />
              <span>Ordinary code.</span>
            </h1>
            <p className="hero-description">
              Some questions don’t fit in a regular expression.
              <br />
              Ask them in plain language. Get answers your code can use.
            </p>
            <div className="hero-actions">
              <a className="primary-button" href="#playground">
                Try Jev in your browser <span>↓</span>
              </a>
              <a className="quiet-link" href="#docs">
                Get the library →
              </a>
            </div>
            <div className="install-inline">
              {npmPublished ? (
                <>
                  <span>$</span>
                  <code>npm install sysone</code>
                </>
              ) : (
                <a href={releaseUrl}>Download Sysone 0.1.0 ↗</a>
              )}
              <span className="license">MIT licensed</span>
            </div>
          </div>
          <aside className="hero-note">
            <div className="note-top">
              <span>THE IDEA</span>
              <span aria-hidden="true">↙</span>
            </div>
            <p>
              Write the question.
              <br />
              Keep the control.
            </p>
            <pre>
              <span className="syntax-purple">const</span> result ={' '}
              <span className="syntax-purple">await</span> sys.check(
              <br /> message,
              <br /> needsReply
              <br />
              );
              <br />
              <br />
              <span className="syntax-purple">if</span> (result.decision ==={' '}
              <span className="syntax-green">"yes"</span>) {'{'}
              <br /> <span className="syntax-muted">// Your next step.</span>
              <br />
              {'}'}
            </pre>
            <div className="note-bottom">
              A probability is evidence.
              <br />
              Your application makes the decision.
            </div>
          </aside>
        </section>
        <div className="intro-strip">
          <span>Built for evaluation models.</span>
          <p>
            Sysone is a small TypeScript library. Jev is its first model integration. This site
            helps you try it, understand it, and use it.
          </p>
          <a href={repo}>
            Read the source <Arrow />
          </a>
        </div>
        <Playground />
        <section id="learn" className="learn section-anchor">
          <div className="section-top">
            <div>
              <span className="eyebrow">02 / A SMALL MENTAL MODEL</span>
              <h2>Three shapes of a decision.</h2>
            </div>
            <p>
              No chat history. No generated essay.
              <br />
              One input, explicit questions, structured answers.
            </p>
          </div>
          <div className="primitives">
            <article>
              <span className="primitive-icon">?</span>
              <code>predicate()</code>
              <h3>Is this true?</h3>
              <p>
                Ask a yes/no question. Get the model’s probability of yes, then apply your
                threshold.
              </p>
              <div className="example-chip">Needs a reply? → 0.94</div>
              <small>Example values are illustrative.</small>
            </article>
            <article>
              <span className="primitive-icon">⋈</span>
              <code>classifier()</code>
              <h3>Which one fits?</h3>
              <p>
                Describe a set of categories. Get a label from your list, with a distribution when
                available.
              </p>
              <div className="example-chip">Which team? → “billing”</div>
              <small>Use explicit, mutually exclusive categories.</small>
            </article>
            <article>
              <span className="primitive-icon">≋</span>
              <code>rubric()</code>
              <h3>How does it measure up?</h3>
              <p>
                Define ordered levels. Get an expected level index, useful for assessment and
                ranking.
              </p>
              <div className="example-chip">Urgency → 1.76 / 2</div>
              <small>The scale comes from your rubric.</small>
            </article>
          </div>
          <div className="uncertainty-note">
            <span aria-hidden="true">↳</span>
            <div>
              <h3>“Not sure” is a useful answer.</h3>
              <p>
                At an 80% threshold, a probability of 60% becomes <code>uncertain</code>. Keep it
                for review, ask a more specific question, or choose another action. A network error
                throws; it never becomes uncertainty.
              </p>
            </div>
          </div>
        </section>
        <section id="docs" className="documentation section-anchor">
          <div className="section-top">
            <div>
              <span className="eyebrow">03 / TAKE IT INTO YOUR CODE</span>
              <h2>A few lines to get started.</h2>
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
              <a href="#providers">Providers</a>
              <a href="#behavior">Behavior & limits</a>
            </aside>
            <div className="docs-content">
              <article id="installation" className="section-anchor">
                <h3>1. Install and connect</h3>
                <p>
                  Use Node.js 22 or later and ESM. Keep provider credentials in your server
                  environment.
                </p>
                {!npmPublished && (
                  <p className="doc-note">
                    The first npm publication is pending. Install the same package from the GitHub
                    release below; the imports and API are unchanged.
                  </p>
                )}
                <div className="provider-toggle" aria-label="Installation provider">
                  <button
                    aria-pressed={provider === 'vercel'}
                    onClick={() => setProvider('vercel')}
                  >
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

const sys = createSysone({ model: ${provider}() });
const needsReply = predicate("Does this message need a reply?");

const result = await sys.check("Can you send the proposal?", needsReply);
// { decision: "yes" | "no" | "uncertain", probability, metadata }`}</Code>
              </article>
              <article id="definitions" className="section-anchor">
                <h3>2. Define once, ask together</h3>
                <p>
                  Definitions are immutable data. Creating them is local and free.{' '}
                  <code>evaluate</code> asks multiple independent questions about the same input in
                  one request.
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
                  Each question sees the input, not the answers to the other questions. Raw
                  evaluation returns evidence; <code>check</code> applies a yes/no threshold.
                </p>
              </article>
              <article id="collections" className="section-anchor">
                <h3>3. Work with the data you already have</h3>
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
                  Collections make one request per item. Ranking scores each item independently
                  against the same rubric. Equal scores keep input order.
                </p>
              </article>
              <article id="providers" className="section-anchor">
                <h3>Same questions. Your choice of connection.</h3>
                <p>
                  The first release supports Jev through TypeSafe and Vercel. Change the configured
                  model without rewriting your questions.
                </p>
                <Code>{`// The manufacturer's native endpoint
typesafe("jev-1.13.0")

// Through Vercel AI Gateway
vercel("typesafe-ai/jev")

// Explicit credentials are also supported
typesafe("jev-latest", { apiKey: process.env.TYPESAFE_API_KEY })`}</Code>
                <p>
                  Cloudflare and OpenRouter also offer access to Jev; their Sysone adapters are not
                  included in this release. A custom integration implements the exported{' '}
                  <code>EvaluationModel</code> interface.
                </p>
                <p className="doc-note">
                  The Vercel adapter uses an experimental AI SDK evaluation API. Its optional
                  dependencies are pinned to tested versions. Confidence and probabilities may
                  differ across models; thresholds need evaluation on your own examples.
                </p>
              </article>
              <article id="behavior" className="section-anchor">
                <h3>The parts worth knowing</h3>
                <dl className="behavior-list">
                  <div>
                    <dt>Uncertainty</dt>
                    <dd>
                      <code>check</code> defaults to 80%. <code>filter</code> excludes uncertain
                      items; <code>partition</code> keeps them available.
                    </dd>
                  </div>
                  <div>
                    <dt>Cancellation</dt>
                    <dd>
                      Pass <code>{'{ signal: controller.signal }'}</code> to an operation. The
                      default per-request timeout is 30 seconds.
                    </dd>
                  </div>
                  <div>
                    <dt>Retries</dt>
                    <dd>
                      No automatic retries or provider fallback. A failed collection rejects;
                      already running requests may finish and incur usage.
                    </dd>
                  </div>
                  <div>
                    <dt>Evidence</dt>
                    <dd>
                      Provider confidence is separate from answer probability. Missing evidence
                      stays missing. Invalid responses throw <code>SysoneError</code>.
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
        <section className="closing">
          <Mark />
          <h2>
            Try a question.
            <br />
            Learn something. Build from there.
          </h2>
          <p>
            Sysone is a community library, not a hosted product.
            <br />
            No subscriptions, no sales calls. Just code and a place to explore.
          </p>
          <div>
            <a className="primary-button" href={repo}>
              Explore the source <Arrow />
            </a>
            <a className="quiet-link" href={`${repo}/issues`}>
              Ask a question →
            </a>
          </div>
        </section>
        <section id="privacy" className="privacy section-anchor">
          <h3>A note about the playground</h3>
          <p>
            Live evaluations use a shared server-side key and are provided while capacity is
            available. Inputs are sent through Vercel AI Gateway to TypeSafe. Sysone does not
            intentionally store submitted text, run results, or API keys in browser storage, and has
            no application database for them. Infrastructure and providers may retain logs under
            their own policies. This is an independent project, not an official TypeSafe or Vercel
            website.
          </p>
          <p>
            <a href="https://vercel.com/legal/privacy-policy">Vercel privacy</a> ·{' '}
            <a href="https://typesafe.ai/privacy">TypeSafe privacy</a> ·{' '}
            <a href="https://docs.typesafe.ai">Jev documentation</a>
          </p>
        </section>
      </main>
      <footer>
        <a className="brand" href="#">
          <Mark />
          <span>sysone.</span>
        </a>
        <span>Small library. Open source. MIT.</span>
        <div>
          <a href={repo}>
            GitHub <Arrow />
          </a>
          <a href={npmPublished ? 'https://www.npmjs.com/package/sysone' : releaseUrl}>
            {npmPublished ? 'npm' : 'Releases'} <Arrow />
          </a>
          <a href="#privacy">Privacy</a>
        </div>
      </footer>
    </>
  );
}
