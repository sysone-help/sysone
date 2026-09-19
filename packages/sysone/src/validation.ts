import { SysoneError } from './errors.js';
import type { Answer, EvaluationResult, Input, Question, Questions } from './types.js';

export function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function probability(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}
export function validateInput(input: unknown): asserts input is Input {
  if (typeof input !== 'string' && !record(input) && !Array.isArray(input))
    throw new SysoneError('State must be text, a JSON object, or a JSON array.', 'INVALID_INPUT');
  const ancestors = new Set<object>();
  function visit(value: unknown): void {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
    if (typeof value === 'number' && Number.isFinite(value)) return;
    if (typeof value !== 'object' || value === null || ancestors.has(value))
      throw new SysoneError(
        'State must contain only finite, non-circular JSON values.',
        'INVALID_INPUT',
      );
    if (
      !Array.isArray(value) &&
      Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null
    )
      throw new SysoneError(
        'Convert dates and class instances to JSON before evaluation.',
        'INVALID_INPUT',
      );
    ancestors.add(value);
    for (const item of Object.values(value)) visit(item);
    ancestors.delete(value);
  }
  visit(input);
}
export function validateQuestions(questions: Questions): void {
  if (!record(questions) || Object.keys(questions).length === 0)
    throw new SysoneError('At least one question is required.', 'INVALID_INPUT');
  for (const [id, q] of Object.entries(questions)) {
    if (!id.trim() || !record(q) || typeof q.instructions !== 'string' || !q.instructions.trim())
      throw new SysoneError('Questions need a name and instructions.', 'INVALID_INPUT');
    if (q.type === 'boolean') {
      if (
        q.criteria &&
        (typeof q.criteria.true !== 'string' ||
          !q.criteria.true.trim() ||
          typeof q.criteria.false !== 'string' ||
          !q.criteria.false.trim())
      )
        throw new SysoneError(
          'Boolean criteria need both true and false descriptions.',
          'INVALID_INPUT',
        );
    } else if (q.type === 'choice') {
      if (
        !record(q.criteria) ||
        Object.keys(q.criteria).length < 2 ||
        Object.keys(q.criteria).length > 255 ||
        Object.entries(q.criteria).some(([k, v]) => !k.trim() || typeof v !== 'string' || !v.trim())
      )
        throw new SysoneError('Invalid classifier criteria.', 'INVALID_INPUT');
    } else if (q.type === 'score') {
      if (
        !Array.isArray(q.criteria) ||
        q.criteria.length < 2 ||
        q.criteria.length > 10 ||
        q.criteria.some((v) => typeof v !== 'string' || !v.trim())
      )
        throw new SysoneError('Invalid rubric levels.', 'INVALID_INPUT');
    } else throw new SysoneError('Unknown question type.', 'INVALID_INPUT');
  }
}

export function validateAnswer(
  answer: unknown,
  question: Question,
  decimals: number | undefined,
  scoreDecimals?: number,
): asserts answer is Answer {
  const fail = () => {
    throw new SysoneError(
      'The model returned invalid or inconsistent answer evidence.',
      'INVALID_RESPONSE',
    );
  };
  if (!record(answer) || answer.type !== question.type) return fail();
  if (question.type === 'boolean') {
    if (!probability(answer.probability)) fail();
    return;
  }
  if (answer.confidence !== undefined && !probability(answer.confidence)) fail();
  if (
    question.type === 'choice' &&
    (typeof answer.choice !== 'string' || !Object.hasOwn(question.criteria, answer.choice))
  )
    fail();
  if (
    question.type === 'score' &&
    (typeof answer.score !== 'number' ||
      !Number.isFinite(answer.score) ||
      answer.score < 0 ||
      answer.score > question.criteria.length - 1)
  )
    fail();
  if (answer.probabilities !== undefined) {
    if (!record(answer.probabilities)) return fail();
    const keys =
      question.type === 'choice'
        ? Object.keys(question.criteria)
        : question.criteria.map((_, index) => String(index));
    const values = keys.map((key) =>
      answer.probabilities && record(answer.probabilities) ? answer.probabilities[key] : undefined,
    );
    if (
      Object.keys(answer.probabilities).length !== keys.length ||
      values.some((v) => !probability(v))
    )
      return fail();
    const probabilities = values as number[];
    const epsilon = decimals === undefined ? 1e-6 : 0.5 * 10 ** -decimals;
    if (Math.abs(probabilities.reduce((a, b) => a + b, 0) - 1) > epsilon * keys.length + 1e-9)
      fail();
    if (question.type === 'choice' && typeof answer.choice === 'string') {
      const selected = answer.probabilities[answer.choice];
      if (typeof selected !== 'number' || selected + epsilon < Math.max(...probabilities)) fail();
    }
    if (question.type === 'score' && typeof answer.score === 'number') {
      const expected = probabilities.reduce((sum, p, index) => sum + p * index, 0);
      const scoreEpsilon = scoreDecimals === undefined ? 1e-6 : 0.5 * 10 ** -scoreDecimals;
      const probabilityError = (epsilon * (keys.length * (keys.length - 1))) / 2;
      if (Math.abs(answer.score - expected) > probabilityError + scoreEpsilon + 1e-9) fail();
    }
  }
}

export function validateResult(result: EvaluationResult, questions: Questions): void {
  if (!record(result) || !record(result.answers) || !record(result.metadata))
    throw new SysoneError('Invalid evaluation response.', 'INVALID_RESPONSE');
  const decimals = result.metadata.rounding?.probabilityDecimals;
  const scoreDecimals = result.metadata.rounding?.scoreDecimals;
  for (const precision of [decimals, scoreDecimals]) {
    if (
      precision !== undefined &&
      (!Number.isInteger(precision) || precision < 0 || precision > 15)
    )
      throw new SysoneError('Invalid rounding metadata.', 'INVALID_RESPONSE');
  }
  if (Object.keys(result.answers).length !== Object.keys(questions).length)
    throw new SysoneError(
      'The model did not return exactly the requested questions.',
      'INVALID_RESPONSE',
    );
  for (const [id, q] of Object.entries(questions)) {
    if (!Object.hasOwn(result.answers, id))
      throw new SysoneError(`Missing answer for question ${id}.`, 'INVALID_RESPONSE');
    validateAnswer(result.answers[id], q, decimals, scoreDecimals);
  }
}
