/** Jev through Vercel AI Gateway: no library required. */
export async function checkReply(
  input: string,
  apiKey = process.env.AI_GATEWAY_API_KEY,
  transport = globalThis.fetch,
) {
  if (!apiKey) throw new Error('Set AI_GATEWAY_API_KEY');
  const response = await transport('https://ai-gateway.vercel.sh/v4/ai/evaluation-model', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'ai-gateway-protocol-version': '0.0.1',
      'ai-gateway-auth-method': 'api-key',
      'ai-evaluation-model-specification-version': '4',
      'ai-model-id': 'typesafe-ai/jev',
    },
    signal: AbortSignal.timeout(30_000),
    body: JSON.stringify({
      state: input,
      questions: {
        result: { type: 'boolean', instructions: 'Does this message need a reply?' },
      },
    }),
  });
  if (!response.ok) throw new Error(`Jev returned HTTP ${response.status}`);
  const body = await response.json();
  const probability = body?.answers?.result?.probability;
  if (
    typeof probability !== 'number' ||
    !Number.isFinite(probability) ||
    probability < 0 ||
    probability > 1
  )
    throw new Error('Invalid probability');
  const decision =
    probability >= 0.8 ? 'yes' : probability <= 0.2 + Number.EPSILON ? 'no' : 'uncertain';
  return { decision, probability };
}
