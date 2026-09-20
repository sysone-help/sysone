import { createSysone, rubric } from 'sysone-help';
import { vercel } from 'sysone-help/providers/vercel';

const client = createSysone({ provider: vercel(), model: 'typesafe-ai/jev' });
const relevance = rubric('How useful is the passage for answering the question?', [
  'Unrelated: offers no useful information',
  'Partial: relevant but cannot answer the question alone',
  'Direct: contains enough information to answer the question',
]);

export async function rankPassages(question: string, passages: string[], sys = client) {
  // One request per passage. This ranks independently, not pairwise.
  return sys.rank(passages, relevance, {
    select: (passage) => ({ question, passage }),
    concurrency: 4,
  }); // [{ item, score, answer, metadata }], highest first.
}
