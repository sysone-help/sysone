import { createSysone } from 'sysone-help';
import { vercel } from 'sysone-help/providers/vercel';

export async function checkReply(
  input: string,
  apiKey = process.env.AI_GATEWAY_API_KEY,
  transport = globalThis.fetch,
) {
  const sys = createSysone({
    provider: vercel({ apiKey, fetch: transport }),
    model: 'typesafe-ai/jev',
  });
  const { decision, probability } = await sys.check(input, 'Does this message need a reply?');
  return { decision, probability };
}
