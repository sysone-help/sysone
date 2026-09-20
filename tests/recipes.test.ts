import assert from 'node:assert/strict';
import test from 'node:test';
import { createSysone, type EvaluationProvider } from '@sysone-help/sysone';
import { route } from '../examples/recipes/route.js';
import { relevantContext } from '../examples/recipes/filter.js';

test('routing recipe asks once and preserves a review path', async () => {
  let calls = 0;
  const provider: EvaluationProvider = {
    id: 'fixture',
    async evaluate(request) {
      calls++;
      assert.deepEqual(Object.keys(request.questions), ['team', 'needsReply']);
      return {
        answers: {
          team: { type: 'choice', choice: 'support' },
          needsReply: { type: 'boolean', probability: Number(request.state) },
        },
        metadata: { provider: 'fixture', requestedModel: request.model },
      };
    },
  };
  const sys = createSysone({ provider, model: 'fixture' });
  assert.equal(await route('0.8', sys), 'support');
  assert.equal(await route('0.5', sys), 'review');
  assert.equal(await route('0.2', sys), 'archive');
  assert.equal(calls, 3);
});
test('RAG recipe keeps original chunks and provides question context to the model', async () => {
  const chunks = [
    { id: 'a', text: 'useful' },
    { id: 'b', text: 'unclear' },
  ];
  const provider: EvaluationProvider = {
    id: 'fixture',
    async evaluate(request) {
      assert.ok(
        chunks.some(
          (chunk) =>
            JSON.stringify(request.state) ===
            JSON.stringify({ question: 'How?', passage: chunk.text }),
        ),
      );
      return {
        answers: {
          result: {
            type: 'boolean',
            probability: JSON.stringify(request.state).includes('useful') ? 0.9 : 0.5,
          },
        },
        metadata: { provider: 'fixture', requestedModel: request.model },
      };
    },
  };
  const result = await relevantContext(
    'How?',
    chunks,
    createSysone({ provider, model: 'fixture' }),
  );
  assert.equal(result.context[0], chunks[0]);
  assert.equal(result.review[0], chunks[1]);
});
