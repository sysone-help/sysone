import assert from 'node:assert/strict';
import test from 'node:test';
import { classifier, createSysone, predicate, rubric } from '../src/index.js';
import { typesafe } from '../src/providers/typesafe.js';
import { vercel } from '../src/providers/vercel.js';

test('TypeSafe translates boolean and preserves native confidence/version', async () => {
  let captured: Record<string, unknown> = {};
  const mockFetch: typeof fetch = async (url, options) => {
    assert.equal(url, 'https://api.typesafe.ai/v1/systemone');
    assert.equal(new Headers(options?.headers).get('authorization'), 'Bearer test-only');
    captured = JSON.parse(String(options?.body));
    return Response.json({ model: 'jev-1.13.0', answers: {
      reply: { type: 'noul', noul: 0.9 },
      team: { type: 'choice', choice: 'support', confidence: 0.7, probabilities: { support: 0.9, other: 0.1 } },
      urgency: { type: 'score', score: 1.2, probabilities: { 0: 0.1, 1: 0.6, 2: 0.3 } },
    }, usage: { input_tokens: 99, output_tokens: 12 } });
  };
  const sys = createSysone({ model: typesafe('jev-1.13.0', { apiKey: 'test-only', fetch: mockFetch }) });
  const result = await sys.evaluate('Help', { reply: predicate('Needs a reply?'), team: classifier({ support: 'Help', other: 'Other' }), urgency: rubric('Urgency', ['low', 'medium', 'high']) });
  assert.equal((captured.questions as Record<string, { type: string }>).reply?.type, 'noul');
  assert.equal(result.answers.reply.probability, 0.9);
  assert.equal(result.answers.team.confidence, 0.7);
  assert.equal(result.metadata.resolvedModel, 'jev-1.13.0');
  assert.equal(result.metadata.usage?.inputTokens, 99);
});
test('TypeSafe tolerates declared rounding and does not renormalize it', async () => {
  const sys = createSysone({ model: typesafe('jev-latest', { apiKey: 'test-only', fetch: async () => Response.json({ answers: { c: { type: 'choice', choice: 'a', probabilities: { a: 0.34, b: 0.34, c: 0.33 } } } }) }) });
  assert.equal((await sys.evaluate('text', { c: classifier({ a: 'a', b: 'b', c: 'c' }) })).answers.c.probabilities?.a, 0.34);
});
test('TypeSafe errors never expose provider bodies or credentials', async () => {
  const sys = createSysone({ model: typesafe('jev-latest', { apiKey: 'do-not-leak', fetch: async () => new Response('do-not-leak', { status: 401 }) }) });
  await assert.rejects(sys.check('text', predicate('test')), error => error instanceof Error && error.message.includes('401') && !JSON.stringify(error).includes('do-not-leak'));
});
test('Vercel adapter uses evaluation protocol and preserves confidence', async () => {
  let calls = 0;
  const model = vercel('typesafe-ai/jev', { apiKey: 'test-only', fetch: async (url, options) => {
    calls++;
    assert.match(String(url), /evaluation-model$/);
    assert.equal(new Headers(options?.headers).get('ai-model-id'), 'typesafe-ai/jev');
    return Response.json({ answers: { kind: { type: 'choice', choice: 'a', probabilities: { a: 0.9, b: 0.1 } } }, warnings: [], rounding: { probabilityDecimals: 2 }, usage: { inputTokens: 10, outputTokens: 0 }, providerMetadata: { typesafe: { confidence: { kind: 0.7 } } } });
  } });
  const result = await createSysone({ model }).evaluate('text', { kind: classifier({ a: 'one', b: 'two' }) });
  assert.equal(result.answers.kind.confidence, 0.7);
  assert.equal(result.metadata.resolvedModel, undefined);
  assert.equal(calls, 1);
});
test('Vercel does not silently retry paid requests', async () => {
  let calls = 0;
  const model = vercel('typesafe-ai/jev', { apiKey: 'test-only', fetch: async () => { calls++; return new Response('failure', { status: 500 }); } });
  await assert.rejects(createSysone({ model }).check('text', predicate('test')));
  assert.equal(calls, 1);
});
