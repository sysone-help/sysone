/** Direct Jev HTTP API: no library required. */
export async function checkReply(
  input: string,
  apiKey = process.env.TYPESAFE_API_KEY,
  transport = globalThis.fetch,
) {
  if (!apiKey) throw new Error('Set TYPESAFE_API_KEY');
  const response = await transport('https://api.typesafe.ai/v1/systemone', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(30_000),
    body: JSON.stringify({
      model: 'jev-latest',
      state: input,
      questions: {
        result: { type: 'noul', instructions: 'Does this message need a reply?' },
      },
    }),
  });
  if (!response.ok) throw new Error(`Jev returned HTTP ${response.status}`);
  const body = await response.json();
  const probability = body?.answers?.result?.noul;
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
