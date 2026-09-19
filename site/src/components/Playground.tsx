import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import type { EvaluationResult } from 'sysone';
import { examples, scenarios, scenarioFromSearch, parseCriteria, type Mode } from '../examples';
import { installCommand } from '../release';
import { Code } from './Code';
import { Result } from './Result';
import { RunMetrics } from './RunMetrics';

type Run = EvaluationResult & { elapsedMs: number; responseMs: number };

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
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);
  useEffect(() => {
    loadScenario(scenarioFromSearch(window.location.search).id);
  }, []);
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
  async function run() {
    if (!canRun || loading) return;
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
      const start = performance.now();
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
      if (!controller.signal.aborted)
        setResult({ ...data, responseMs: Math.round(performance.now() - start) });
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
      criteriaCode = '{ /* fix the categories in Options */ }';
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
console.log(result.decision); // "yes", "no" or "uncertain"
console.log(result.probability);`
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
      className="simple-playground section-anchor"
      aria-label="Try Sysone"
      onKeyDown={(event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
          event.preventDefault();
          void run();
        }
      }}
    >
      <div className="editor">
        <div className="example-picker">
          <label htmlFor="scenario">Try an example</label>
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
        </div>
        <label htmlFor="state">Text</label>
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
        <label htmlFor="instructions">Question</label>
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
        <details className="playground-options" key={mode}>
          <summary>
            {mode === 'predicate'
              ? 'Options'
              : mode === 'classifier'
                ? 'Edit categories & options'
                : 'Edit scoring levels & options'}
          </summary>
          {mode !== 'predicate' && (
            <>
              <label htmlFor="criteria">
                {mode === 'classifier' ? 'Categories' : 'Scoring levels'}
                <span>
                  {mode === 'classifier'
                    ? 'label: description · one per line'
                    : 'lowest → highest · one per line'}
                </span>
              </label>
              <textarea
                id="criteria"
                className="criteria-input"
                rows={4}
                maxLength={3000}
                value={criteria}
                spellCheck={false}
                aria-invalid={Boolean(validationError)}
                aria-describedby={validationError ? 'validation-error' : undefined}
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
                <label htmlFor="threshold">Decision threshold</label>
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
                Yes ≥ {threshold.toFixed(2)} · no ≤ {(1 - threshold).toFixed(2)} · otherwise not
                sure. Adjusting this uses the same response.
              </p>
            </div>
          )}
          <div className="option-actions">
            <button className="text-button" onClick={() => loadScenario(scenario)}>
              Reset example
            </button>
            <a
              href={`?example=${scenario}#playground`}
              title="Shares the original example, without your edits"
            >
              Link to this example ↗
            </a>
          </div>
        </details>
        {validationError && (
          <p id="validation-error" className="validation-error" role="status">
            {validationError}
          </p>
        )}
        <div className="run-row">
          <button className="run-button" onClick={run} disabled={loading || !canRun}>
            {loading ? 'Checking…' : 'Run example'}
          </button>
          {loading ? (
            <button className="text-button" onClick={clearResult}>
              Cancel
            </button>
          ) : (
            <span>No account or API key needed.</span>
          )}
        </div>
        <p className="model-note">
          Runs on <a href="/docs#providers">Jev via Vercel</a>. Your text is sent to the model.
        </p>
      </div>
      <div className="live-result" aria-live="polite" aria-busy={loading}>
        {loading && <p className="waiting-result">Waiting for the model…</p>}
        {error && (
          <div className="error" role="alert">
            <p>{error}</p>
            <button className="text-button" onClick={run}>
              Retry
            </button>
          </div>
        )}
        {answer && result && (
          <div className="result-panel">
            <Result
              answer={answer}
              threshold={threshold}
              levels={mode === 'rubric' ? (parseCriteria(mode, criteria) as string[]) : []}
            />
            <RunMetrics {...result} />
            <details className="raw-result">
              <summary>Full response</summary>
              <Code label="Response body">{JSON.stringify(result, null, 2)}</Code>
            </details>
          </div>
        )}
      </div>
      <details className="use-code">
        <summary>
          Use this in TypeScript <span aria-hidden="true">↗</span>
        </summary>
        <div className="code-instructions">
          <p>
            Install the library, then set <code>AI_GATEWAY_API_KEY</code> on your server.
          </p>
          <Code label="Terminal">{installCommand}</Code>
          {validationError ? (
            <p className="validation-error">
              Fix the input to generate runnable code: {validationError}
            </p>
          ) : (
            <Code label="example.ts">{snippet}</Code>
          )}
          <a href="/docs#installation">Installation & API docs ↗</a>
        </div>
      </details>
    </section>
  );
}
