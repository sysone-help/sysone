import { createSysone } from 'sysone';
import { typesafe } from 'sysone/providers/typesafe';

export async function checkReply(
  input: string,
  apiKey = process.env.TYPESAFE_API_KEY,
  transport = globalThis.fetch,
) {
  const sys = createSysone({
    provider: typesafe({ apiKey, fetch: transport }),
    model: 'jev-latest',
  });
  const { decision, probability } = await sys.check(input, 'Does this message need a reply?');
  return { decision, probability };
}
