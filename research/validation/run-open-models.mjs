// Real-inference smoke checks, not an accuracy benchmark. No mocked model answers.
// Usage: node research/validation/run-open-models.mjs kotoba|nimble-space|systemone
import { writeFile } from 'node:fs/promises';
import { createSysone, predicate, classifier, rubric } from '../../packages/sysone/dist/index.js';
import { customProvider } from '../../packages/sysone/dist/providers/custom.js';

const backend = process.argv[2] ?? 'kotoba';
const exchanges = [];
if (!['kotoba', 'nimble-space', 'systemone'].includes(backend)) throw new Error('Unknown backend');
const model =
  process.env.MODEL ??
  (backend === 'kotoba' ? 'com-kotobalabs/open-jev-deberta-v3-large' : 'nimble-latest');
const captureFetch = async (url, options) => {
  const started = performance.now();
  const response = await fetch(url, options);
  exchanges.push({
    request: JSON.parse(options.body),
    status: response.status,
    response: await response.clone().text(),
    elapsedMs: Math.round(performance.now() - started),
  });
  return response;
};
// This demo uses Gradio, not the System One HTTP protocol. Translation stays
// outside the library; only real probabilities and expected scores are forwarded.
const nimbleSpace = {
  id: 'huggingface-space',
  async evaluate(request, { signal } = {}) {
    const schema = {};
    const scoreFields = [];
    for (const [name, q] of Object.entries(request.questions)) {
      if (q.type === 'boolean')
        schema[name] = {
          type: 'boolean',
          description: q.instructions,
          ...(q.criteria ? { choice_descriptions: q.criteria } : {}),
        };
      else {
        const descriptions =
          q.type === 'score'
            ? Object.fromEntries(q.criteria.map((description, i) => [String(i), description]))
            : q.criteria;
        schema[name] = {
          type: 'enum',
          description: q.instructions,
          choices: Object.keys(descriptions),
          choice_descriptions: descriptions,
        };
        if (q.type === 'score') scoreFields.push(name);
      }
    }
    const base = 'https://hugging-apps-bespoke-nimble-9b-demo.hf.space/gradio_api/call';
    const payload = {
      context: typeof request.state === 'string' ? request.state : JSON.stringify(request.state),
      schema_json: JSON.stringify(schema),
      score_fields: scoreFields,
    };
    const started = performance.now();
    const queued = await fetch(`${base}/v2/decide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    });
    if (!queued.ok) throw new Error(`Gradio enqueue HTTP ${queued.status}`);
    const event = await queued.json();
    const response = await fetch(`${base}/decide/${encodeURIComponent(event.event_id)}`, {
      signal,
    });
    const events = await response.text();
    exchanges.push({
      request: payload,
      status: response.status,
      events,
      elapsedMs: Math.round(performance.now() - started),
    });
    if (!response.ok) throw new Error(`Gradio result HTTP ${response.status}`);
    const completed = events.split('\n\n').find((block) => block.startsWith('event: complete\n'));
    if (!completed) throw new Error(`Gradio inference did not complete: ${events.slice(-600)}`);
    const data = JSON.parse(completed.slice(completed.indexOf('data: ') + 6));
    const raw = JSON.parse(data[2]);
    const answers = Object.fromEntries(
      Object.entries(request.questions).map(([name, q]) => {
        const value = raw[name];
        if (q.type === 'boolean')
          return [name, { type: 'boolean', probability: value.probability_true }];
        return [
          name,
          {
            type: q.type,
            ...(q.type === 'choice'
              ? { choice: value.prediction }
              : { score: value.expected_score }),
            probabilities: value.probabilities,
          },
        ];
      }),
    );
    return {
      answers,
      metadata: {
        provider: this.id,
        requestedModel: request.model,
        resolvedModel: 'bespokelabs/Bespoke-Nimble-9B',
        providerMetadata: { gradio: { gpuTime: data[3] } },
      },
    };
  },
};
const provider =
  backend === 'nimble-space'
    ? nimbleSpace
    : customProvider({
        baseURL: process.env.BASE_URL ?? 'http://127.0.0.1:8086/v1',
        apiKey: process.env.OPEN_MODEL_API_KEY,
        id: backend,
        fetch: captureFetch,
      });
const sys = createSysone({ provider, model, timeoutMs: 180000 });
const refund = predicate('Does the customer explicitly request a refund?');
const teams = {
  billing: 'Charges, invoices and refunds',
  technical: 'Software bugs and outages',
  sales: 'Buying a new subscription',
};
const urgency = rubric('Urgency of the request', [
  'Optional improvement, no impact',
  'Individual issue, normal queue',
  'Production outage for all users',
]);
const cases = [
  {
    id: 'refund-en',
    text: 'I was charged twice for order 847. Please refund the duplicate payment.',
    refund: true,
    team: 'billing',
    level: 1,
  },
  {
    id: 'no-refund-en',
    text: 'Our production API is down for every customer. Restore service immediately. We are not requesting a refund.',
    refund: false,
    team: 'technical',
    level: 2,
  },
  {
    id: 'sales-en',
    text: 'Can you send a quote for a new subscription? This is optional planning for next year; nothing is broken.',
    refund: false,
    team: 'sales',
    level: 0,
  },
  {
    id: 'refund-pt',
    text: 'Fui cobrado duas vezes pelo pedido 847. Por favor, devolvam o pagamento duplicado.',
    refund: true,
    team: 'billing',
    level: 1,
  },
  {
    id: 'no-refund-pt',
    text: 'A API de produção caiu para todos os clientes. Restaurem o serviço imediatamente. Não estamos pedindo reembolso.',
    refund: false,
    team: 'technical',
    level: 2,
  },
  {
    id: 'sales-pt',
    text: 'Podem enviar uma proposta para uma nova assinatura? É um planejamento opcional para o próximo ano; nada está quebrado.',
    refund: false,
    team: 'sales',
    level: 0,
  },
];
const results = [];
let quotaExceeded = false;
async function run(id, operation) {
  if (quotaExceeded) {
    results.push({ id, skipped: true, reason: 'Public ZeroGPU quota exhausted' });
    return;
  }
  const started = performance.now();
  try {
    const value = await operation();
    results.push({ id, ok: true, elapsedMs: Math.round(performance.now() - started), ...value });
  } catch (error) {
    quotaExceeded = error.message.includes('ZeroGPU');
    results.push({
      id,
      ok: false,
      elapsedMs: Math.round(performance.now() - started),
      error: error.message,
      code: error.code,
    });
  }
  console.log(JSON.stringify(results.at(-1)));
}
for (const c of cases)
  await run(c.id, async () => {
    const result = await sys.evaluate(c.text, { refund, team: classifier(teams), urgency });
    return {
      input: c.text,
      expected: { refund: c.refund, team: c.team, level: c.level },
      checks: {
        refund: result.answers.refund.probability > 0.5 === c.refund,
        team: result.answers.team.choice === c.team,
        level: Math.round(result.answers.urgency.score) === c.level,
      },
      result,
    };
  });
await run('shuffled-labels', async () => ({
  result: await sys.evaluate(cases[0].text, {
    team: classifier({ sales: teams.sales, technical: teams.technical, billing: teams.billing }),
  }),
}));
await run('check-explicit-criteria', async () => ({
  result: await sys.check(
    cases[0].text,
    predicate(refund.instructions, {
      true: 'An explicit request to return money',
      false: 'No explicit request to return money',
    }),
  ),
}));
await run('partition', async () => ({
  result: await sys.partition(cases.slice(0, 3), refund, {
    select: (item) => item.text,
    concurrency: 1,
  }),
}));
await run('filter', async () => ({
  result: await sys.filter(cases.slice(0, 3), refund, {
    select: (item) => item.text,
    concurrency: 1,
  }),
}));
await run('rank', async () => ({
  result: await sys.rank(cases.slice(0, 3), urgency, {
    select: (item) => item.text,
    concurrency: 1,
  }),
}));
if (backend === 'kotoba')
  await run('oversized-state', async () => {
    try {
      await sys.check('word '.repeat(300), refund);
      return { rejected: false };
    } catch (error) {
      return { rejected: true, code: error.code, message: error.message };
    }
  });
await writeFile(
  new URL(`./${backend}-results.json`, import.meta.url),
  JSON.stringify(
    { testedAt: new Date().toISOString(), backend, model, results, exchanges },
    null,
    2,
  ) + '\n',
);
