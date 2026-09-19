import { createSysone, classifier, predicate } from 'sysone';
import { vercel } from 'sysone/providers/vercel';

const client = createSysone({ provider: vercel(), model: 'typesafe-ai/jev' });
const team = classifier({
  billing: 'Payments, invoices and refunds',
  support: 'Bugs, outages and technical help',
  other: 'Anything outside the listed categories',
});
const needsReply = predicate('Does this message need a reply?');

export async function route(message: string, sys = client) {
  // Independent questions, one shared input, one request.
  const { answers } = await sys.evaluate(message, { team, needsReply });
  if (answers.needsReply.probability <= 0.2) return 'archive';
  if (answers.needsReply.probability < 0.8) return 'review';
  return answers.team.choice; // 'billing' | 'support' | 'other'
}
