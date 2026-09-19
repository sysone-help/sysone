import assert from 'node:assert/strict';
import test from 'node:test';
import { formatCost, gatewayCost } from '../site/src/run-metrics.js';

function metadata(gateway?: unknown) {
  return {
    provider: 'vercel',
    requestedModel: 'typesafe-ai/jev',
    providerMetadata: { gateway },
  };
}

test('free Gateway calls show the actual zero charge, not the market price', () => {
  assert.equal(formatCost(gatewayCost(metadata({ cost: '0', marketCost: '0.000011424' }))), '$0');
  assert.equal(formatCost(gatewayCost(metadata({ cost: 0 }))), '$0');
  assert.equal(formatCost(gatewayCost(metadata({ cost: '0.000011424' }))), '$0.000011424');
});

test('absent or malformed cost never becomes a free call', () => {
  for (const gateway of [undefined, null, [], {}, { marketCost: '0' }])
    assert.equal(formatCost(gatewayCost(metadata(gateway))), 'Not reported');
  for (const cost of ['', ' ', null, false, -1, '-1', NaN, Infinity, 'NaN', '0x0', {}])
    assert.equal(formatCost(gatewayCost(metadata({ cost }))), 'Not reported');
});

test('a tiny positive charge is never rounded to zero', () => {
  assert.equal(formatCost(gatewayCost(metadata({ cost: '1e-8' }))), '$0.00000001');
  assert.equal(formatCost(gatewayCost(metadata({ cost: 1e-14 }))), '< $0.000000000001');
});
