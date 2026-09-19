import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import type { EvaluationResult } from 'sysone';
import { examples, parseCriteria, type Mode } from '../examples';
import { Code } from './Code';
import { Result } from './Result';
const modes: Mode[] = ['predicate', 'classifier', 'rubric'];
type Run = EvaluationResult & { elapsedMs: number };

export function Playground() {
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
  function clearResult() {
    abort.current?.abort();
    abort.current = null;
    setLoading(false);
    setResult(null);
    setError('');
  }
  function select(next: Mode) {
    clearResult();
    setMode(next);
    setInput(examples[next].input);
    setInstructions(examples[next].instructions);
    setCriteria(examples[next].criteria);
  }
  async function run() {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const body = {
        mode,
        state: input,
        instructions,
        ...(mode !== 'predicate' ? { criteria: parseCriteria(mode, criteria) } : {}),
      };
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (response.status === 429)
        throw new Error('A few too many requests. Wait a minute and try again.');
      const data = await response.json().catch(() => {
        throw new Error('The playground could not reach its server. Please try again shortly.');
      });
      if (!response.ok) throw new Error(data.error ?? 'The evaluation could not complete.');
      if (!controller.signal.aborted) setResult(data);
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(
          cause instanceof Error ? cause.message : 'Something went wrong. Please try again.',
        );
    } finally {
      if (abort.current === controller) {
        setLoading(false);
        abort.current = null;
      }
    }
  }
  const snippet = `import { createSysone, ${mode} } from "sysone";
import { vercel } from "sysone/providers/vercel";

const sys = createSysone({ model: vercel() });

${
  mode === 'predicate'
    ? `const needsReply = predicate(${JSON.stringify(instructions)});

const result = await sys.check(message, needsReply, {
  minProbability: ${threshold.toFixed(2)},
});
// result.decision: "yes" | "no" | "uncertain"`
    : mode === 'classifier'
      ? `const team = classifier(${(() => {
          try {
            return JSON.stringify(parseCriteria(mode, criteria), null, 2);
          } catch {
            return '{ /* label: description */ }';
          }
        })()}, ${JSON.stringify(instructions)});

const { answers } = await sys.evaluate(message, { team });
// answers.team.choice is a union of your labels`
      : `const urgency = rubric(${JSON.stringify(instructions)}, ${JSON.stringify(
          criteria.split('\n').filter((x) => x.trim()),
          null,
          2,
        )});

const { answers } = await sys.evaluate(message, { urgency });
// answers.urgency.score is an expected level index`
}`;
  const answer = result?.answers.result;
  return (
    <section
      id="playground"
      className="playground section-anchor"
      aria-labelledby="playground-title"
    >
      <div className="section-top">
        <div>
          <span className="eyebrow">01 / THE PLAYGROUND</span>
          <h2 id="playground-title">Start with a question.</h2>
        </div>
        <p>
          Try a real evaluation. Change the text.
          <br />
          See what changes — and what doesn’t.
        </p>
      </div>
      <div className="experiment-tabs" aria-label="Example type">
        {modes.map((m, i) => (
          <button key={m} aria-pressed={mode === m} onClick={() => select(m)}>
            <span className="tab-number">0{i + 1}</span>
            <span>
              <strong>{examples[m].title}</strong>
              <small>{examples[m].label}</small>
            </span>
            <code>{m}()</code>
          </button>
        ))}
      </div>
      <div className="experiment">
        <div className="editor">
          <div className="editor-title">
            <span className="eyebrow">YOUR INPUT</span>
            <button className="text-button" onClick={() => select(mode)}>
              Reset example ↺
            </button>
          </div>
          <label htmlFor="state">Message</label>
          <textarea
            id="state"
            className="message-input"
            value={input}
            maxLength={6000}
            onChange={(e) => {
              clearResult();
              setInput(e.target.value);
            }}
            spellCheck={false}
          />
          <div className="character-count">{input.length.toLocaleString()} / 6,000</div>
          <label htmlFor="instructions">Question</label>
          <textarea
            id="instructions"
            className="question-input"
            rows={2}
            maxLength={500}
            value={instructions}
            onChange={(e) => {
              clearResult();
              setInstructions(e.target.value);
            }}
          />
          {mode !== 'predicate' && (
            <>
              <label htmlFor="criteria">
                {mode === 'classifier'
                  ? 'Categories · label: description, one per line'
                  : 'Levels · lowest to highest, one per line'}
              </label>
              <textarea
                id="criteria"
                className="criteria-input"
                rows={4}
                maxLength={3000}
                value={criteria}
                onChange={(e) => {
                  clearResult();
                  setCriteria(e.target.value);
                }}
              />
            </>
          )}
          <div className="run-row">
            <button
              className="primary-button"
              onClick={run}
              disabled={loading || !input.trim() || !instructions.trim()}
            >
              {loading ? (
                <>
                  <span className="spinner" /> Evaluating…
                </>
              ) : (
                <>
                  Run with Jev <span aria-hidden="true">↗</span>
                </>
              )}
            </button>
            <span>Live model · no sign-up</span>
          </div>
          <p className="privacy-note">
            Your text is sent to Vercel AI Gateway and TypeSafe to evaluate. Avoid personal or
            confidential information. <a href="#privacy">How data is handled</a>
          </p>
        </div>
        <div className="output">
          <div className="editor-title">
            <span className="eyebrow">THE DECISION</span>
            <span className="live-label">
              <i /> {result ? 'Live result' : 'Jev · TypeSafe'}
            </span>
          </div>
          <div className="answer-space" aria-live="polite" aria-busy={loading}>
            {error ? (
              <div className="error" role="alert">
                <strong>Couldn’t finish that one.</strong>
                <p>{error}</p>
                <button className="text-button" onClick={run}>
                  Try again →
                </button>
              </div>
            ) : answer ? (
              <Result answer={answer} threshold={threshold} />
            ) : (
              <div className="empty-result">
                <span className="empty-symbol" aria-hidden="true">
                  {loading ? '…' : '?'}
                </span>
                <h3>{loading ? 'A little thinking space.' : 'Let’s see what Jev thinks.'}</h3>
                <p>
                  {loading
                    ? 'Waiting for the model’s evaluation.'
                    : 'Run the example to see the actual answer, its probability, and the code behind it.'}
                </p>
              </div>
            )}
          </div>
          {mode === 'predicate' && (
            <div className="threshold">
              <div>
                <label htmlFor="threshold">Your decision threshold</label>
                <output htmlFor="threshold">{Math.round(threshold * 100)}%</output>
              </div>
              <input
                id="threshold"
                type="range"
                min="51"
                max="99"
                value={Math.round(threshold * 100)}
                onChange={(e) => setThreshold(Number(e.target.value) / 100)}
              />
              <p>
                Yes ≥ {Math.round(threshold * 100)}% · No ≤ {Math.round((1 - threshold) * 100)}% ·
                Otherwise, uncertain.
                <br />
                Adjusting this uses the same answer. No new model call.
              </p>
            </div>
          )}
          {result && (
            <div className="run-metadata">
              <span>{(result.elapsedMs / 1000).toFixed(2)}s</span>
              <span>{result.metadata.usage?.inputTokens ?? '—'} input tokens</span>
              <details>
                <summary>Raw result</summary>
                <pre>{JSON.stringify(result, null, 2)}</pre>
              </details>
            </div>
          )}
        </div>
      </div>
      <div className="under-experiment">
        <div>
          <span className="eyebrow">WHAT JUST HAPPENED?</span>
          <h3>
            Instructions in.
            <br />
            Typed evidence out.
          </h3>
          <p>{example.explanation}</p>
          <a className="inline-link" href="#learn">
            Understand the three primitives <span>→</span>
          </a>
        </div>
        <Code>{snippet}</Code>
      </div>
    </section>
  );
}
