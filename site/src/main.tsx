import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Answer, EvaluationResult } from 'sysone';
import { examples, parseCriteria, type Mode } from './examples';
import './style.css';

const repo = 'https://github.com/sysone-help/sysone';
const modes: Mode[] = ['predicate', 'classifier', 'rubric'];
type Run = EvaluationResult & { elapsedMs: number };

function Mark() { return <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true"><rect width="32" height="32" rx="8" fill="currentColor"/><path d="M10 10h12M10 16h8M10 22h12" stroke="var(--paper)" strokeWidth="2.6" strokeLinecap="round"/><circle cx="23" cy="16" r="1.5" fill="#d6ffaf"/></svg>; }
function Arrow() { return <span aria-hidden="true">↗</span>; }

function Code({ children, label = 'TypeScript' }: { children: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(children); setCopied(true); setCopyError(false); setTimeout(() => setCopied(false), 1600); }
    catch { setCopyError(true); }
  }
  return <div className="code"><div className="code-toolbar"><span>{label}</span><button onClick={copy}>{copied ? 'Copied ✓' : copyError ? 'Select code to copy' : 'Copy code'}</button></div><pre><code>{children}</code></pre></div>;
}

function Result({ answer, threshold }: { answer: Answer; threshold: number }) {
  if (answer.type === 'boolean') {
    const decision = answer.probability >= threshold ? 'yes' : answer.probability <= 1 - threshold + Number.EPSILON ? 'no' : 'uncertain';
    return <><div className="result-heading"><span className={`decision ${decision}`}>{decision === 'yes' ? 'Yes' : decision === 'no' ? 'No' : 'Not sure'}</span><strong>{(answer.probability * 100).toFixed(0)}<small>%</small></strong></div><p className="result-sub">Model probability of “yes”</p><div className="probability-track" aria-label={`${Math.round(answer.probability * 100)} percent probability of yes`}><div style={{ width: `${answer.probability * 100}%` }}/></div><p className="result-explainer">{decision === 'uncertain' ? 'The evidence is between your thresholds. Your code can keep this for review.' : `Your current threshold classifies this as “${decision}”. The probability is evidence from the model, not a guarantee.`}</p></>;
  }
  if (answer.type === 'choice') return <><div className="result-heading"><span className="decision yes">Selected label</span><strong className="choice-name">{answer.choice}</strong></div><div className="distribution">{Object.entries(answer.probabilities ?? {}).sort(([, a], [, b]) => b - a).map(([label, p]) => <div key={label}><span>{label}</span><div className="mini-track"><i style={{ width: `${p * 100}%` }}/></div><span>{Math.round(p * 100)}%</span></div>)}</div><p className="result-explainer">One category, from your list. {answer.confidence === undefined ? '' : `Provider confidence: ${answer.confidence.toFixed(2)}. This is separate from the selected label’s probability.`}</p></>;
  return <><div className="result-heading"><span className="decision yes">Rubric score</span><strong>{answer.score.toFixed(2)}</strong></div><p className="result-sub">Expected level index · first level = 0</p><div className="distribution">{Object.entries(answer.probabilities ?? {}).map(([level, p]) => <div key={level}><span>Level {level}</span><div className="mini-track"><i style={{ width: `${p * 100}%` }}/></div><span>{Math.round(p * 100)}%</span></div>)}</div><p className="result-explainer">A score of 1.6 falls between your second and third levels. It is not a percentage.</p></>;
}

function Playground() {
  const [mode, setMode] = useState<Mode>('predicate');
  const [input, setInput] = useState<string>(examples.predicate.input);
  const [instructions, setInstructions] = useState<string>(examples.predicate.instructions);
  const [criteria, setCriteria] = useState<string>('');
  const [threshold, setThreshold] = useState(0.8);
  const [result, setResult] = useState<Run | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);
  const example = examples[mode];
  function clearResult() { abort.current?.abort(); abort.current = null; setLoading(false); setResult(null); setError(''); }
  function select(next: Mode) { clearResult(); setMode(next); setInput(examples[next].input); setInstructions(examples[next].instructions); setCriteria(examples[next].criteria); }
  async function run() {
    abort.current?.abort();
    const controller = new AbortController(); abort.current = controller;
    setLoading(true); setError(''); setResult(null);
    try {
      const body = { mode, state: input, instructions, ...(mode !== 'predicate' ? { criteria: parseCriteria(mode, criteria) } : {}) };
      const response = await fetch('/api/evaluate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal });
      if (response.status === 429) throw new Error('A few too many requests. Wait a minute and try again.');
      const data = await response.json().catch(() => { throw new Error('The playground could not reach its server. Please try again shortly.'); });
      if (!response.ok) throw new Error(data.error ?? 'The evaluation could not complete.');
      if (!controller.signal.aborted) setResult(data);
    } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Something went wrong. Please try again.'); }
    finally { if (abort.current === controller) { setLoading(false); abort.current = null; } }
  }
  const snippet = `import { createSysone, ${mode} } from "sysone";
import { vercel } from "sysone/providers/vercel";

const sys = createSysone({ model: vercel() });

${mode === 'predicate' ? `const needsReply = predicate(${JSON.stringify(instructions)});

const result = await sys.check(message, needsReply, {
  minProbability: ${threshold.toFixed(2)},
});
// result.decision: "yes" | "no" | "uncertain"` : mode === 'classifier' ? `const team = classifier(${(() => { try { return JSON.stringify(parseCriteria(mode, criteria), null, 2); } catch { return '{ /* label: description */ }'; } })()}, ${JSON.stringify(instructions)});

const { answers } = await sys.evaluate(message, { team });
// answers.team.choice is a union of your labels` : `const urgency = rubric(${JSON.stringify(instructions)}, ${JSON.stringify(criteria.split('\n').filter(x => x.trim()), null, 2)});

const { answers } = await sys.evaluate(message, { urgency });
// answers.urgency.score is an expected level index`}`;
  const answer = result?.answers.result;
  return <section id="playground" className="playground section-anchor" aria-labelledby="playground-title">
    <div className="section-top"><div><span className="eyebrow">01 / THE PLAYGROUND</span><h2 id="playground-title">Start with a question.</h2></div><p>Try a real evaluation. Change the text.<br/>See what changes — and what doesn’t.</p></div>
    <div className="experiment-tabs" aria-label="Example type">{modes.map((m, i) => <button key={m} aria-pressed={mode === m} onClick={() => select(m)}><span className="tab-number">0{i + 1}</span><span><strong>{examples[m].title}</strong><small>{examples[m].label}</small></span><code>{m}()</code></button>)}</div>
    <div className="experiment">
      <div className="editor"><div className="editor-title"><span className="eyebrow">YOUR INPUT</span><button className="text-button" onClick={() => select(mode)}>Reset example ↺</button></div>
        <label htmlFor="state">Message</label><textarea id="state" className="message-input" value={input} maxLength={6000} onChange={e => { clearResult(); setInput(e.target.value); }} spellCheck={false}/><div className="character-count">{input.length.toLocaleString()} / 6,000</div>
        <label htmlFor="instructions">Question</label><textarea id="instructions" className="question-input" rows={2} maxLength={500} value={instructions} onChange={e => { clearResult(); setInstructions(e.target.value); }}/>
        {mode !== 'predicate' && <><label htmlFor="criteria">{mode === 'classifier' ? 'Categories · label: description, one per line' : 'Levels · lowest to highest, one per line'}</label><textarea id="criteria" className="criteria-input" rows={4} maxLength={3000} value={criteria} onChange={e => { clearResult(); setCriteria(e.target.value); }}/></>}
        <div className="run-row"><button className="primary-button" onClick={run} disabled={loading || !input.trim() || !instructions.trim()}>{loading ? <><span className="spinner"/> Evaluating…</> : <>Run with Jev <span aria-hidden="true">↗</span></>}</button><span>Live model · no sign-up</span></div>
        <p className="privacy-note">Your text is sent to Vercel AI Gateway and TypeSafe to evaluate. Avoid personal or confidential information. <a href="#privacy">How data is handled</a></p>
      </div>
      <div className="output"><div className="editor-title"><span className="eyebrow">THE DECISION</span><span className="live-label"><i/> {result ? 'Live result' : 'Jev · TypeSafe'}</span></div>
        <div className="answer-space" aria-live="polite" aria-busy={loading}>{error ? <div className="error" role="alert"><strong>Couldn’t finish that one.</strong><p>{error}</p><button className="text-button" onClick={run}>Try again →</button></div> : answer ? <Result answer={answer} threshold={threshold}/> : <div className="empty-result"><span className="empty-symbol" aria-hidden="true">{loading ? '…' : '?'}</span><h3>{loading ? 'A little thinking space.' : 'Let’s see what Jev thinks.'}</h3><p>{loading ? 'Waiting for the model’s evaluation.' : 'Run the example to see the actual answer, its probability, and the code behind it.'}</p></div>}</div>
        {mode === 'predicate' && <div className="threshold"><div><label htmlFor="threshold">Your decision threshold</label><output htmlFor="threshold">{Math.round(threshold * 100)}%</output></div><input id="threshold" type="range" min="51" max="99" value={Math.round(threshold * 100)} onChange={e => setThreshold(Number(e.target.value) / 100)}/><p>Yes ≥ {Math.round(threshold * 100)}% · No ≤ {Math.round((1 - threshold) * 100)}% · Otherwise, uncertain.<br/>Adjusting this uses the same answer. No new model call.</p></div>}
        {result && <div className="run-metadata"><span>{(result.elapsedMs / 1000).toFixed(2)}s</span><span>{result.metadata.usage?.inputTokens ?? '—'} input tokens</span><details><summary>Raw result</summary><pre>{JSON.stringify(result, null, 2)}</pre></details></div>}
      </div>
    </div>
    <div className="under-experiment"><div><span className="eyebrow">WHAT JUST HAPPENED?</span><h3>Instructions in.<br/>Typed evidence out.</h3><p>{example.explanation}</p><a className="inline-link" href="#learn">Understand the three primitives <span>→</span></a></div><Code>{snippet}</Code></div>
  </section>;
}

function App() {
  const [provider, setProvider] = useState<'vercel' | 'typesafe'>('vercel');
  return <><a className="skip-link" href="#main">Skip to content</a><header><a className="brand" href="#" aria-label="Sysone home"><Mark/><span>sysone<span className="brand-period">.</span></span></a><nav aria-label="Main navigation"><a href="#playground">Playground</a><a href="#learn">Learn</a><a href="#docs">Docs</a><a className="github-link" href={repo}>GitHub <Arrow/></a></nav></header>
    <main id="main"><section className="hero"><div><div className="eyebrow hero-eyebrow"><span className="tiny-dot"/> OPEN SOURCE · TYPESCRIPT · SYSTEM ONE</div><h1>Small decisions.<br/><span>Ordinary code.</span></h1><p className="hero-description">Some questions don’t fit in a regular expression.<br/>Ask them in plain language. Get answers your code can use.</p><div className="hero-actions"><a className="primary-button" href="#playground">Try Jev in your browser <span>↓</span></a><a className="quiet-link" href="#docs">Get the library →</a></div><div className="install-inline"><span>$</span><code>npm install sysone</code><span className="license">MIT licensed</span></div></div><aside className="hero-note"><div className="note-top"><span>THE IDEA</span><span aria-hidden="true">↙</span></div><p>Write the question.<br/>Keep the control.</p><pre><span className="syntax-purple">const</span> result = <span className="syntax-purple">await</span> sys.check(<br/>  message,<br/>  needsReply<br/>);<br/><br/><span className="syntax-purple">if</span> (result.decision === <span className="syntax-green">"yes"</span>) {'{'}<br/>  <span className="syntax-muted">// Your next step.</span><br/>{'}'}</pre><div className="note-bottom">A probability is evidence.<br/>Your application makes the decision.</div></aside></section>
    <div className="intro-strip"><span>Built for evaluation models.</span><p>Sysone is a small TypeScript library. Jev is its first model integration. This site helps you try it, understand it, and use it.</p><a href={repo}>Read the source <Arrow/></a></div>
    <Playground/>
    <section id="learn" className="learn section-anchor"><div className="section-top"><div><span className="eyebrow">02 / A SMALL MENTAL MODEL</span><h2>Three shapes of a decision.</h2></div><p>No chat history. No generated essay.<br/>One input, explicit questions, structured answers.</p></div><div className="primitives"><article><span className="primitive-icon">?</span><code>predicate()</code><h3>Is this true?</h3><p>Ask a yes/no question. Get the model’s probability of yes, then apply your threshold.</p><div className="example-chip">Needs a reply? → 0.94</div><small>Example values are illustrative.</small></article><article><span className="primitive-icon">⋈</span><code>classifier()</code><h3>Which one fits?</h3><p>Describe a set of categories. Get a label from your list, with a distribution when available.</p><div className="example-chip">Which team? → “billing”</div><small>Use explicit, mutually exclusive categories.</small></article><article><span className="primitive-icon">≋</span><code>rubric()</code><h3>How does it measure up?</h3><p>Define ordered levels. Get an expected level index, useful for assessment and ranking.</p><div className="example-chip">Urgency → 1.76 / 2</div><small>The scale comes from your rubric.</small></article></div><div className="uncertainty-note"><span aria-hidden="true">↳</span><div><h3>“Not sure” is a useful answer.</h3><p>At an 80% threshold, a probability of 60% becomes <code>uncertain</code>. Keep it for review, ask a more specific question, or choose another action. A network error throws; it never becomes uncertainty.</p></div></div></section>
    <section id="docs" className="documentation section-anchor"><div className="section-top"><div><span className="eyebrow">03 / TAKE IT INTO YOUR CODE</span><h2>A few lines to get started.</h2></div><a href={`${repo}/blob/main/packages/sysone/README.md`} className="inline-link">Full API reference <Arrow/></a></div><div className="docs-layout"><aside className="docs-nav"><a href="#installation">Installation</a><a href="#definitions">Reusable questions</a><a href="#collections">Working with lists</a><a href="#providers">Providers</a><a href="#behavior">Behavior & limits</a></aside><div className="docs-content"><article id="installation" className="section-anchor"><h3>1. Install and connect</h3><p>Use Node.js 22 or later and ESM. Keep provider credentials in your server environment.</p><div className="provider-toggle" aria-label="Installation provider"><button aria-pressed={provider === 'vercel'} onClick={() => setProvider('vercel')}>Vercel AI Gateway</button><button aria-pressed={provider === 'typesafe'} onClick={() => setProvider('typesafe')}>TypeSafe direct</button></div><Code label="Terminal">{provider === 'vercel' ? 'npm install sysone ai@7.0.105 @ai-sdk/gateway@4.0.85\n\n# Set AI_GATEWAY_API_KEY in your server environment' : 'npm install sysone\n\n# Set TYPESAFE_API_KEY in your server environment'}</Code><Code>{`import { createSysone, predicate } from "sysone";
import { ${provider} } from "sysone/providers/${provider}";

const sys = createSysone({ model: ${provider}() });
const needsReply = predicate("Does this message need a reply?");

const result = await sys.check("Can you send the proposal?", needsReply);
// { decision: "yes" | "no" | "uncertain", probability, metadata }`}</Code></article>
    <article id="definitions" className="section-anchor"><h3>2. Define once, ask together</h3><p>Definitions are immutable data. Creating them is local and free. <code>evaluate</code> asks multiple independent questions about the same input in one request.</p><Code>{`import { predicate, classifier } from "sysone";

const needsReply = predicate("Does this need a reply?");
const team = classifier({
  billing: "Payments, invoices and refunds",
  support: "Bugs and technical questions",
  other: "Everything else",
});

const { answers } = await sys.evaluate(message, { needsReply, team });
answers.team.choice; // "billing" | "support" | "other"
answers.needsReply.probability; // number, from 0 to 1`}</Code><p className="doc-note">Each question sees the input, not the answers to the other questions. Raw evaluation returns evidence; <code>check</code> applies a yes/no threshold.</p></article>
    <article id="collections" className="section-anchor"><h3>3. Work with the data you already have</h3><Code>{`const groups = await sys.partition(messages, needsReply, {
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
});`}</Code><p>For ranking, define a rubric rather than an unexplained score:</p><Code>{`import { rubric } from "sysone";

const urgency = rubric("How urgent is this request?", [
  "Routine: no time pressure",
  "Soon: time-sensitive but not blocking",
  "Immediate: active outage or severe disruption",
]);

const ranked = await sys.rank(messages, urgency, {
  select: message => message.body,
});
// [{ item, score, answer, metadata }] — highest score first`}</Code><p className="doc-note">Collections make one request per item. Ranking scores each item independently against the same rubric. Equal scores keep input order.</p></article>
    <article id="providers" className="section-anchor"><h3>Same questions. Your choice of connection.</h3><p>The first release supports Jev through TypeSafe and Vercel. Change the configured model without rewriting your questions.</p><Code>{`// The manufacturer's native endpoint
typesafe("jev-1.13.0")

// Through Vercel AI Gateway
vercel("typesafe-ai/jev")

// Explicit credentials are also supported
typesafe("jev-latest", { apiKey: process.env.TYPESAFE_API_KEY })`}</Code><p>Cloudflare and OpenRouter also offer access to Jev; their Sysone adapters are not included in this release. A custom integration implements the exported <code>EvaluationModel</code> interface.</p><p className="doc-note">The Vercel adapter uses an experimental AI SDK evaluation API. Its optional dependencies are pinned to tested versions. Confidence and probabilities may differ across models; thresholds need evaluation on your own examples.</p></article>
    <article id="behavior" className="section-anchor"><h3>The parts worth knowing</h3><dl className="behavior-list"><div><dt>Uncertainty</dt><dd><code>check</code> defaults to 80%. <code>filter</code> excludes uncertain items; <code>partition</code> keeps them available.</dd></div><div><dt>Cancellation</dt><dd>Pass <code>{'{ signal: controller.signal }'}</code> to an operation. The default per-request timeout is 30 seconds.</dd></div><div><dt>Retries</dt><dd>No automatic retries or provider fallback. A failed collection rejects; already running requests may finish and incur usage.</dd></div><div><dt>Evidence</dt><dd>Provider confidence is separate from answer probability. Missing evidence stays missing. Invalid responses throw <code>SysoneError</code>.</dd></div><div><dt>Input</dt><dd>Text or JSON objects/arrays. Jev evaluates the supplied context; it does not browse, generate explanations, or execute actions.</dd></div></dl></article></div></div></section>
    <section className="closing"><Mark/><h2>Try a question.<br/>Learn something. Build from there.</h2><p>Sysone is a community library, not a hosted product.<br/>No subscriptions, no sales calls. Just code and a place to explore.</p><div><a className="primary-button" href={repo}>Explore the source <Arrow/></a><a className="quiet-link" href={`${repo}/issues`}>Ask a question →</a></div></section>
    <section id="privacy" className="privacy section-anchor"><h3>A note about the playground</h3><p>Live evaluations use a shared server-side key and are provided while capacity is available. Inputs are sent through Vercel AI Gateway to TypeSafe. Sysone does not intentionally store submitted text, run results, or API keys in browser storage, and has no application database for them. Infrastructure and providers may retain logs under their own policies. This is an independent project, not an official TypeSafe or Vercel website.</p><p><a href="https://vercel.com/legal/privacy-policy">Vercel privacy</a> · <a href="https://typesafe.ai/privacy">TypeSafe privacy</a> · <a href="https://docs.typesafe.ai">Jev documentation</a></p></section>
    </main><footer><a className="brand" href="#"><Mark/><span>sysone.</span></a><span>Small library. Open source. MIT.</span><div><a href={repo}>GitHub <Arrow/></a><a href="https://www.npmjs.com/package/sysone">npm <Arrow/></a><a href="#privacy">Privacy</a></div></footer></>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
