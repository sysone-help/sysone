import { classifier, createSysone, predicate, rubric } from '../src/index.js';
import type { EvaluationModel, Input } from '../src/index.js';

export async function assertInference(model: EvaluationModel) {
  const sys = createSysone({ model });
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
