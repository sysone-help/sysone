export type Mode = 'predicate' | 'classifier' | 'rubric';
export const examples = {
  predicate: {
    title: 'Does it need a reply?',
    label: 'Yes, no, or not sure',
    method: 'check',
    input: 'Hi! Could you send me the updated proposal before our meeting tomorrow? Thanks, Alex.',
    instructions: 'Does this message need a reply from its recipient?',
    criteria: '',
    explanation:
      'A predicate asks one yes/no question. Jev returns a probability; you choose how much evidence is enough to act.',
  },
  classifier: {
    title: 'Where should it go?',
    label: 'Choose a category',
    method: 'evaluate',
    input: 'I was charged twice for my subscription this month. Can you help me get a refund?',
    instructions: 'Which team should handle this message?',
    criteria:
      'billing: Payments, invoices and refunds\nsupport: Bugs, outages and technical help\nsales: Pricing, plans and new accounts\nother: Anything that does not fit these categories',
    explanation:
      'A classifier chooses one of your labels. The labels become a TypeScript union, so downstream code knows the possible answers.',
  },
  rubric: {
    title: 'How urgent is it?',
    label: 'Score against a rubric',
    method: 'evaluate',
    input:
      'Our checkout has been failing for every customer for the last 20 minutes. We cannot take any orders.',
    instructions: 'How urgently does this message need attention?',
    criteria:
      'Routine: no time pressure or impact on operations\nSoon: time-sensitive, but a workaround is available\nImmediate: active outage or severe disruption',
    explanation:
      'A rubric defines ordered levels. The score is the expected level index, starting at zero. It can fall between levels.',
  },
} as const;

export function parseCriteria(mode: Mode, value: string): Record<string, string> | string[] {
  const lines = value
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean);
  if (mode === 'rubric') return lines;
  const entries = lines.map((line) => {
    const index = line.indexOf(':');
    if (index <= 0 || !line.slice(index + 1).trim())
      throw new Error('Use one label: description per line.');
    return [line.slice(0, index).trim(), line.slice(index + 1).trim()] as const;
  });
  if (new Set(entries.map(([key]) => key)).size !== entries.length)
    throw new Error('Each label must be unique.');
  return Object.fromEntries(entries);
}

export interface Scenario {
  id: string;
  title: string;
  mode: Mode;
  input: string;
  instructions: string;
  criteria: string;
}
export const scenarios: readonly Scenario[] = [
  ...(['predicate', 'classifier', 'rubric'] as const).map((mode) => ({
    ...examples[mode],
    id: mode,
    mode,
  })),
  {
    id: 'rag',
    title: 'Keep useful RAG context',
    mode: 'predicate',
    input:
      'Question: How do I cancel my subscription?\nPassage: Open Settings → Billing → Cancel plan. Access continues until the current billing period ends.',
    instructions: 'Does the passage contain information that helps answer the question?',
    criteria: '',
  },
  {
    id: 'agent',
    title: 'Route an agent request',
    mode: 'classifier',
    input:
      'Calculate the percentage change between revenue of 12000 last month and 15300 this month.',
    instructions: 'Choose the smallest capability needed to complete the request.',
    criteria:
      'calculator: Arithmetic with numbers already supplied\nsearch: Requires information not present in the request\nreply: Can be answered directly without tools\nother: Does not fit the listed capabilities',
  },
  {
    id: 'answer',
    title: 'Evaluate an answer against its source',
    mode: 'rubric',
    input:
      'Source: Returns are accepted within 30 days with a receipt. Opened software is excluded.\nAnswer: You can return any item within 30 days, even opened software.',
    instructions: 'How well is the answer supported by the supplied source?',
    criteria:
      'Contradicted: includes a claim that conflicts with the source\nIncomplete: no contradiction, but key claims lack support\nSupported: all material claims are supported by the source',
  },
];
