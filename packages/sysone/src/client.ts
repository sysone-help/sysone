import { SysoneError } from './errors.js';
import { validateInput, validateQuestions, validateResult } from './validation.js';
import type {
  CallOptions,
  CheckOptions,
  CheckResult,
  CollectionOptions,
  EvaluationModel,
  EvaluationResult,
  Input,
  Partition,
  Predicate,
  Questions,
  Ranked,
  Rubric,
} from './types.js';

function threshold(value = 0.8): number {
  if (!Number.isFinite(value) || value <= 0.5 || value > 1)
    throw new SysoneError(
      'minProbability must be greater than 0.5 and at most 1.',
      'INVALID_INPUT',
    );
  return value;
}

async function mapConcurrent<T, R>(
  items: readonly T[],
  concurrency: number,
  signal: AbortSignal | undefined,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 100)
    throw new SysoneError('concurrency must be an integer from 1 to 100.', 'INVALID_INPUT');
  const result = new Array<R>(items.length);
  let index = 0;
  let failed = false;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (!failed && index < items.length) {
      signal?.throwIfAborted();
      const current = index++;
      try {
        result[current] = await fn(items[current]!);
      } catch (error) {
        failed = true;
        throw error;
      }
    }
  });
  await Promise.all(workers);
  signal?.throwIfAborted();
  return result;
}

/** Create a client. Definitions are pure; execution happens only when awaited. */
export function createSysone({
  model,
  timeoutMs = 30_000,
}: {
  model: EvaluationModel;
  timeoutMs?: number;
}) {
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 2_147_483_647)
    throw new SysoneError('timeoutMs must be a positive 32-bit integer.', 'INVALID_INPUT');

  async function evaluate<const Q extends Questions>(
    state: Input,
    questions: Q,
    options: CallOptions = {},
  ): Promise<EvaluationResult<Q>> {
    validateInput(state);
    validateQuestions(questions);
    options.signal?.throwIfAborted();
    const signal = options.signal
      ? AbortSignal.any([options.signal, AbortSignal.timeout(timeoutMs)])
      : AbortSignal.timeout(timeoutMs);
    const result = await model.evaluate({ state, questions }, { signal });
    signal.throwIfAborted();
    validateResult(result, questions);
    // Runtime validation above establishes the question-to-answer correspondence.
    return result as EvaluationResult<Q>;
  }

  async function check(
    state: Input,
    question: Predicate,
    options: CheckOptions = {},
  ): Promise<CheckResult> {
    const min = threshold(options.minProbability);
    const result = await evaluate(state, { result: question }, options);
    const answer = result.answers.result;
    const decision =
      answer.probability >= min
        ? 'yes'
        : answer.probability <= 1 - min + Number.EPSILON
          ? 'no'
          : 'uncertain';
    return { ...answer, decision, metadata: result.metadata };
  }

  async function partition<T>(
    items: readonly T[],
    question: Predicate,
    options: CollectionOptions<T> = {},
  ): Promise<Partition<T>> {
    threshold(options.minProbability);
    validateQuestions({ result: question });
    const states = items.map((item) => {
      const state = options.select ? options.select(item) : item;
      validateInput(state);
      return state;
    });
    const results = await mapConcurrent(states, options.concurrency ?? 4, options.signal, (state) =>
      check(state, question, options),
    );
    const groups: Partition<T> = { yes: [], no: [], uncertain: [] };
    results.forEach((result, i) => groups[result.decision].push(items[i]!));
    return groups;
  }

  async function filter<T>(
    items: readonly T[],
    question: Predicate,
    options: CollectionOptions<T> = {},
  ): Promise<T[]> {
    return (await partition(items, question, options)).yes;
  }

  async function rank<T>(
    items: readonly T[],
    question: Rubric,
    options: Omit<CollectionOptions<T>, 'minProbability'> = {},
  ): Promise<Ranked<T>[]> {
    validateQuestions({ result: question });
    const states = items.map((item) => {
      const state = options.select ? options.select(item) : item;
      validateInput(state);
      return state;
    });
    const results = await mapConcurrent(states, options.concurrency ?? 4, options.signal, (state) =>
      evaluate(state, { result: question }, options),
    );
    return results
      .map((result, i) => ({
        item: items[i]!,
        score: result.answers.result.score,
        answer: result.answers.result,
        metadata: result.metadata,
      }))
      .sort((a, b) => b.score - a.score);
  }

  return Object.freeze({ evaluate, check, partition, filter, rank });
}
