import { classifier, createSysone, predicate, rubric } from '../src/index.js';
import type { EvaluationProvider, Input } from '../src/index.js';

export async function assertInference(provider: EvaluationProvider) {
  const sys = createSysone({ provider, model: 'test' });
  // @ts-expect-error The provider does not imply a default model.
  createSysone({ provider });
  // @ts-expect-error A model identifier does not imply a provider.
  createSysone({ model: 'test' });
  // @ts-expect-error Providers and model identifiers are different types.
  createSysone({ provider, model: provider });
  const result = await sys.evaluate('Hello', {
    reply: predicate('Reply?'),
    team: classifier({ sales: 'Sales', support: 'Support' }),
    quality: rubric('Quality', ['low', 'high']),
  });
  const choice: 'sales' | 'support' = result.answers.team.choice;
  const probability: number = result.answers.reply.probability;
  const score: number = result.answers.quality.score;
  // @ts-expect-error Boolean answers do not invent confidence.
  result.answers.reply.confidence;
  // @ts-expect-error Choice is a closed literal union.
  const invalid: 'legal' = result.answers.team.choice;
  // @ts-expect-error State must be text or structured JSON.
  const invalidInput: Input = 42;
  return { choice, probability, score, invalid, invalidInput };
}
