import { createSysone } from '@sysone-help/sysone';
import { vercel } from '@sysone-help/sysone/providers/vercel';

const client = createSysone({ provider: vercel(), model: 'typesafe-ai/jev' });
type Chunk = { id: string; text: string };

export async function relevantContext(question: string, chunks: Chunk[], sys = client) {
  // One request per chunk, at most four running at once.
  const { yes, uncertain } = await sys.partition(
    chunks,
    'Does the passage help answer the question?',
    { select: (chunk) => ({ question, passage: chunk.text }), concurrency: 4 },
  );
  return { context: yes, review: uncertain }; // Original objects, in input order.
}
