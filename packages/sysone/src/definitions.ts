import { SysoneError } from './errors.js';
import type { Classifier, Predicate, Rubric } from './types.js';

function text(value: string): void {
  if (typeof value !== 'string' || !value.trim())
    throw new SysoneError('Instructions and criteria must be non-empty strings.', 'INVALID_INPUT');
}

/** Define a reusable yes/no question. No network request is made. */
export function predicate(instructions: string, criteria?: Predicate['criteria']): Predicate {
  text(instructions);
  if (criteria) {
    text(criteria.true);
    text(criteria.false);
  }
  return Object.freeze({
    type: 'boolean',
    instructions,
    ...(criteria ? { criteria: Object.freeze({ ...criteria }) } : {}),
  });
}

/** Define mutually exclusive labels. Add an explicit "other" label when needed. */
export function classifier<const Choices extends Record<string, string>>(
  criteria: Choices,
  instructions = 'Choose the category that best describes the input.',
): Classifier<Extract<keyof Choices, string>> {
  text(instructions);
  const entries = Object.entries(criteria);
  if (entries.length < 2 || entries.length > 255)
    throw new SysoneError('A classifier needs 2–255 choices.', 'INVALID_INPUT');
  for (const [key, value] of entries) {
    text(key);
    text(value);
  }
  return Object.freeze({ type: 'choice', instructions, criteria: Object.freeze({ ...criteria }) });
}

/** Define 2–10 ordered levels. The score is their expected zero-based index. */
export function rubric(instructions: string, levels: readonly string[]): Rubric {
  text(instructions);
  if (levels.length < 2 || levels.length > 10)
    throw new SysoneError('A rubric needs 2–10 ordered levels.', 'INVALID_INPUT');
  levels.forEach(text);
  return Object.freeze({ type: 'score', instructions, criteria: Object.freeze([...levels]) });
}
