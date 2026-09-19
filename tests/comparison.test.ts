import assert from 'node:assert/strict';
import test from 'node:test';
import { checkReply as native } from '../examples/compare/native.js';
import { checkReply as sysone } from '../examples/compare/sysone.js';

test('published comparison sends identical Jev requests and makes identical decisions', async () => {
  for (const probability of [0, 0.2, 0.21, 0.5, 0.79, 0.8, 1]) {
    const requests: unknown[] = [];
    const transport: typeof fetch = async (url, init) => {
      requests.push({ url: String(url), body: JSON.parse(String(init?.body)) });
      assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer fixture');
      assert.ok(init?.signal instanceof AbortSignal);
      return Response.json({ answers: { result: { type: 'noul', noul: probability } } });
    };
    assert.deepEqual(
      await native('Please reply', 'fixture', transport),
      await sysone('Please reply', 'fixture', transport),
    );
    assert.deepEqual(requests[0], requests[1]);
  }
});

test('both examples reject HTTP failures and invalid probabilities', async () => {
  for (const evaluate of [native, sysone]) {
    await assert.rejects(
      evaluate('input', 'fixture', async () => new Response(null, { status: 429 })),
    );
    for (const probability of [-1, 2, '0.9', null]) {
      await assert.rejects(
        evaluate('input', 'fixture', async () =>
          Response.json({ answers: { result: { type: 'noul', noul: probability } } }),
        ),
      );
    }
  }
});
