import * as React from 'react';
import type { Answer } from 'sysone';

export function Result({
  answer,
  threshold,
  levels = [],
}: {
  answer: Answer;
  threshold: number;
  levels?: string[];
}) {
  if (answer.type === 'boolean') {
    const decision =
      answer.probability >= threshold
        ? 'yes'
        : answer.probability <= 1 - threshold + Number.EPSILON
          ? 'no'
          : 'uncertain';
    return (
      <>
        <div className="result-heading">
          <span className={`decision ${decision}`}>
            {decision === 'yes' ? 'Yes' : decision === 'no' ? 'No' : 'Not sure'}
          </span>
          <strong>
            {(answer.probability * 100).toFixed(0)}
            <small>%</small>
          </strong>
        </div>
        <p className="result-sub">Model probability of “yes”</p>
        <div
          className="probability-track"
          aria-label={`${Math.round(answer.probability * 100)} percent probability of yes`}
        >
          <div style={{ width: `${answer.probability * 100}%` }} />
        </div>
        <p className="result-explainer">
          {decision === 'uncertain'
            ? 'The evidence is between your thresholds. Your code can keep this for review.'
            : `Your current threshold classifies this as “${decision}”. The probability is evidence from the model, not a guarantee.`}
        </p>
        <div className="branch-preview">
          <span>Your code takes this branch</span>
          <code>case '{decision}':</code>
        </div>
      </>
    );
  }
  if (answer.type === 'choice')
    return (
      <>
        <div className="result-heading">
          <span className="decision yes">Selected label</span>
          <strong className="choice-name">{answer.choice}</strong>
        </div>
        <div className="distribution">
          {Object.entries(answer.probabilities ?? {})
            .sort(([, a], [, b]) => b - a)
            .map(([label, p]) => (
              <div key={label}>
                <span>{label}</span>
                <div className="mini-track">
                  <i style={{ width: `${p * 100}%` }} />
                </div>
                <span>{Math.round(p * 100)}%</span>
              </div>
            ))}
        </div>
        <p className="result-explainer">
          One category, from your list.{' '}
          {answer.confidence === undefined
            ? ''
            : `Provider confidence: ${answer.confidence.toFixed(2)}. This is separate from the selected label’s probability.`}
        </p>
      </>
    );
  return (
    <>
      <div className="result-heading">
        <span className="decision yes">Rubric score</span>
        <strong>{answer.score.toFixed(2)}</strong>
      </div>
      <p className="result-sub">Expected level index · first level = 0</p>
      <div className="distribution">
        {Object.entries(answer.probabilities ?? {}).map(([level, p]) => (
          <div key={level}>
            <span title={levels[Number(level)]}>
              {level} · {levels[Number(level)] ?? `Level ${level}`}
            </span>
            <div className="mini-track">
              <i style={{ width: `${p * 100}%` }} />
            </div>
            <span>{Math.round(p * 100)}%</span>
          </div>
        ))}
      </div>
      <p className="result-explainer">
        {levels.length > 0 ? `Your scale runs from 0 to ${levels.length - 1}. ` : ''}
        This is a probability-weighted level index, not a percentage. Fractional scores sit between
        levels.
      </p>
    </>
  );
}
