import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import type { EvaluationResult } from 'sysone';
import { examples, scenarios, parseCriteria, type Mode } from '../examples';
import { Code } from './Code';
import { Result } from './Result';

const modes: Mode[] = ['predicate', 'classifier', 'rubric'];
type Run = EvaluationResult & { elapsedMs: number };

export function Playground() {
  const [scenario, setScenario] = useState('predicate');
  const [mode, setMode] = useState<Mode>('predicate');
  const [input, setInput] = useState<string>(examples.predicate.input);
  const [instructions, setInstructions] = useState<string>(examples.predicate.instructions);
  const [criteria, setCriteria] = useState('');
  const [threshold, setThreshold] = useState(0.8);
  const [result, setResult] = useState<Run | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState<'result' | 'code'>('code');
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);
  const example = examples[mode];
  let validationError = '';
  if (!input.trim()) validationError = 'Enter some text to evaluate.';
  else if (!instructions.trim()) validationError = 'Enter a question about the text.';
  else if (mode !== 'predicate') {
    try {
      parseCriteria(mode, criteria);
    } catch (cause) {
      validationError = (cause as Error).message;
    }
  }
  const canRun = !validationError;

  function clearResult() {
    abort.current?.abort();
    abort.current = null;
    setLoading(false);
    setResult(null);
    setError('');
  }
  function loadScenario(id: string) {
    const next = scenarios.find((item) => item.id === id)!;
    clearResult();
    setScenario(id);
    setMode(next.mode);
    setInput(next.input);
    setInstructions(next.instructions);
    setCriteria(next.criteria);
  }
  function select(next: Mode) {
    loadScenario(next);
  }
  async function run() {
    if (!canRun || loading) return;
    const controller = new AbortController();
    abort.current = controller;
    setLoading(true);
    setError('');
    setResult(null);
    setView('result');
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
      if (response.status === 429) throw new Error('Rate limited. Wait a minute and retry.');
      const data = await response.json().catch(() => {
        throw new Error('Could not read the server response. Try again shortly.');
      });
      if (!response.ok) throw new Error(data.error ?? 'Evaluation failed.');
      if (!controller.signal.aborted) setResult(data);
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(cause instanceof Error ? cause.message : 'Evaluation failed.');
    } finally {
      if (abort.current === controller) {
        setLoading(false);
        abort.current = null;
      }
    }
  }

  let criteriaCode = '';
  if (mode !== 'predicate') {
    try {
      criteriaCode = JSON.stringify(parseCriteria(mode, criteria), null, 2);
    } catch {
      criteriaCode = '{ /* fix the categories on the left */ }';
    }
  }
  const snippet = `import { createSysone${mode === 'predicate' ? '' : `, ${mode}`} } from "sysone";
import { vercel } from "sysone/providers/vercel";

// Set AI_GATEWAY_API_KEY in your server environment.
const sys = createSysone({
  provider: vercel(),
  model: "typesafe-ai/jev",
});
const input = ${JSON.stringify(input)};

${
  mode === 'predicate'
    ? `const result = await sys.check(input, ${JSON.stringify(instructions)}, {
  minProbability: ${threshold.toFixed(2)},
});
// decision: "yes" | "no" | "uncertain"
console.log(result);`
    : mode === 'classifier'
      ? `const category = classifier(${criteriaCode}, ${JSON.stringify(instructions)});

const result = await sys.evaluate(input, { category });
console.log(result.answers.category);`
      : `const score = rubric(${JSON.stringify(instructions)}, ${criteriaCode});

const result = await sys.evaluate(input, { score });
console.log(result.answers.score);`
}`;
  const answer = result?.answers.result;

  return (
    <section
      id="playground"
      className="playground section-anchor"
      aria-label="Evaluation playground"
      onKeyDown={(event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
          event.preventDefault();
          void run();
        }
      }}
    >
      <div className="workspace-toolbar">
        <div className="experiment-tabs" aria-label="Question type">
          {modes.map((m) => (
            <button key={m} aria-pressed={mode === m} onClick={() => select(m)}>
              <code>{m === 'predicate' ? 'check()' : `${m}()`}</code>
            </button>
          ))}
        </div>
        <a
          className="model-label"
          href="#providers"
          aria-label="Model: Jev. Provider: Vercel AI Gateway."
        >
          <span className="status-dot" />
          Jev · Vercel
          <span aria-hidden="true">⌄</span>
        </a>
      </div>
      <div className="workspace">
        <div className="editor">
          <div className="panel-heading">
            <h2>Input</h2>
            <button className="text-button" onClick={() => loadScenario(scenario)}>
              Reset example
            </button>
          </div>
          <label htmlFor="scenario">Try a use case</label>
          <select
            id="scenario"
            value={scenario}
            onChange={(event) => loadScenario(event.target.value)}
          >
            {scenarios.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
          <label htmlFor="state">
            state <span>string</span>
          </label>
          <textarea
            id="state"
            className="message-input"
            value={input}
            maxLength={6000}
            spellCheck={false}
            onChange={(event) => {
              clearResult();
              setInput(event.target.value);
            }}
          />
          <div className="character-count">{input.length.toLocaleString('en-US')} / 6,000</div>
          <label htmlFor="instructions">
            instructions <span>string</span>
          </label>
          <textarea
            id="instructions"
            className="question-input"
            rows={2}
            maxLength={500}
            value={instructions}
            spellCheck={false}
            onChange={(event) => {
              clearResult();
              setInstructions(event.target.value);
            }}
          />
          {mode !== 'predicate' && (
            <>
              <label htmlFor="criteria">
                criteria{' '}
                <span>
                  {mode === 'classifier'
                    ? 'label: description · one per line'
                    : 'lowest → highest · one per line'}
                </span>
              </label>
              <textarea
                id="criteria"
                aria-invalid={Boolean(validationError)}
                aria-describedby={validationError ? 'validation-error' : undefined}
                className="criteria-input"
                rows={4}
                maxLength={3000}
                spellCheck={false}
                value={criteria}
                onChange={(event) => {
                  clearResult();
                  setCriteria(event.target.value);
                }}
              />
            </>
          )}
          {mode === 'predicate' && (
            <div className="threshold">
              <div>
                <label htmlFor="threshold">minProbability</label>
                <output htmlFor="threshold">{threshold.toFixed(2)}</output>
              </div>
              <input
                id="threshold"
                type="range"
                min="51"
                max="99"
                value={Math.round(threshold * 100)}
                onChange={(event) => setThreshold(Number(event.target.value) / 100)}
              />
              <p>
                yes ≥ {threshold.toFixed(2)} · no ≤ {(1 - threshold).toFixed(2)} · otherwise
                uncertain
              </p>
            </div>
          )}
          {validationError && (
            <p id="validation-error" className="validation-error" role="status">
              {validationError}
            </p>
          )}
          <div className="run-row">
            <button className="run-button" onClick={run} disabled={loading || !canRun}>
              {loading ? 'Running…' : 'Run'}
              <kbd>⌘ / Ctrl ↵</kbd>
            </button>
            {loading && (
              <button className="text-button" onClick={clearResult}>
                Cancel
              </button>
            )}
            <span>
              {result
                ? `${result.elapsedMs} ms · ${result.metadata.usage?.inputTokens ?? '—'} input tokens`
                : '1 request · shared access'}
            </span>
          </div>
        </div>
        <div className="output">
          <div className="output-tabs" aria-label="Output view">
            <button aria-pressed={view === 'code'} onClick={() => setView('code')}>
              TypeScript
            </button>
            <button aria-pressed={view === 'result'} onClick={() => setView('result')}>
              Result {result && <span className="result-indicator" />}
            </button>
            <span>
              {view === 'code'
                ? 'example.ts'
                : loading
                  ? 'pending'
                  : result
                    ? '200 OK'
                    : error
                      ? 'error'
                      : 'idle'}
            </span>
          </div>
          {view === 'code' ? (
            validationError ? (
              <p className="empty-result">
                Fix the input to generate runnable code: {validationError}
              </p>
            ) : (
              <>
                <Code label="Copy and run on your server">{snippet}</Code>
                <p className="code-next">
                  <a href="#installation">Install & run this example ↗</a> · Your own provider key
                  is required.
                </p>
              </>
            )
          ) : (
            <div className="result-panel">
              <div className="answer-space" aria-live="polite" aria-busy={loading}>
                {error ? (
                  <div className="error" role="alert">
                    <strong>Evaluation failed</strong>
                    <p>{error}</p>
                    <button className="text-button" onClick={run}>
                      Retry
                    </button>
                  </div>
                ) : answer ? (
                  <Result answer={answer} threshold={threshold} />
                ) : (
                  <div className="empty-result">
                    <code>{loading ? 'await model.evaluate(…)' : '// No result yet'}</code>
                    <p>
                      {loading
                        ? 'Waiting for the model response.'
                        : 'Run the input to inspect its decision and probabilities.'}
                    </p>
                  </div>
                )}
              </div>
              {result && (
                <details className="raw-result">
                  <summary>JSON response</summary>
                  <Code label="Response body">{JSON.stringify(result, null, 2)}</Code>
                </details>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="workspace-notes">
        <p>
          <code>{mode}()</code> {example.explanation}
        </p>
        <details>
          <summary>Execution &amp; data</summary>
          <p>
            Text is evaluated by Jev through Vercel AI Gateway.{' '}
            <a href="#privacy">Data policy and limits.</a> Changing the threshold reuses the
            response; it does not make another request. Code runs on your server, with your own
            provider key.
          </p>
        </details>
      </div>
    </section>
  );
}
