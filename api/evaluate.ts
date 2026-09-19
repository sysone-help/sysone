import type { ApiRequest, ApiResponse } from '../server/http.js';
import { classifier, createSysone, predicate, rubric, SysoneError } from 'sysone';
import { vercel } from 'sysone/providers/vercel';

export const config = { maxDuration: 30 };

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST to run an evaluation.' });
  }
  if (!req.headers['content-type']?.startsWith('application/json'))
    return res.status(415).json({ error: 'Send JSON.' });
  const origin = req.headers.origin;
  const allowed = new Set([
    'https://sysone.help',
    'https://www.sysone.help',
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    ...(process.env.NODE_ENV !== 'production'
      ? ['http://127.0.0.1:5173', 'http://localhost:5173']
      : []),
  ]);
  if (origin && !allowed.has(origin))
    return res.status(403).json({ error: 'Run evaluations from sysone.help.' });
  if (!process.env.AI_GATEWAY_API_KEY)
    return res.status(503).json({
      error:
        'The shared playground is temporarily unavailable. You can still run the examples locally with your own provider key.',
    });
  let body: unknown = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON.' });
    }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body))
    return res.status(400).json({ error: 'Expected an evaluation request.' });
  const input = body as Record<string, unknown>;
  if (JSON.stringify(input).length > 12_000)
    return res.status(413).json({ error: 'Keep the complete request under 12,000 characters.' });
  if (typeof input.state !== 'string' || !input.state.trim() || input.state.length > 6000)
    return res.status(400).json({ error: 'Enter between 1 and 6,000 characters of text.' });
  if (
    typeof input.instructions !== 'string' ||
    !input.instructions.trim() ||
    input.instructions.length > 500
  )
    return res.status(400).json({ error: 'Keep your question between 1 and 500 characters.' });
  try {
    let question;
    if (input.mode === 'predicate') question = predicate(input.instructions);
    else if (input.mode === 'classifier') {
      if (!input.criteria || typeof input.criteria !== 'object' || Array.isArray(input.criteria))
        throw new Error('Use a label and description for each category.');
      const entries = Object.entries(input.criteria);
      if (
        entries.length < 2 ||
        entries.length > 8 ||
        entries.some(
          ([key, value]) => key.length > 40 || typeof value !== 'string' || value.length > 300,
        )
      )
        throw new Error(
          'Use 2–8 categories, with labels up to 40 and descriptions up to 300 characters.',
        );
      question = classifier(input.criteria as Record<string, string>, input.instructions);
    } else if (input.mode === 'rubric') {
      if (
        !Array.isArray(input.criteria) ||
        input.criteria.length < 2 ||
        input.criteria.length > 5 ||
        input.criteria.some((value) => typeof value !== 'string' || value.length > 300)
      )
        throw new Error('Use 2–5 levels of up to 300 characters each.');
      question = rubric(input.instructions, input.criteria);
    } else throw new Error('Choose a predicate, classifier or rubric.');
    const sys = createSysone({ provider: vercel(), model: 'typesafe-ai/jev', timeoutMs: 20_000 });
    const start = performance.now();
    const result = await sys.evaluate(input.state, { result: question });
    return res.status(200).json({ ...result, elapsedMs: Math.round(performance.now() - start) });
  } catch (error) {
    if (error instanceof SysoneError && error.code === 'INVALID_INPUT')
      return res.status(400).json({ error: error.message });
    if (
      error instanceof Error &&
      !(error instanceof SysoneError) &&
      error.name !== 'TimeoutError' &&
      error.name !== 'AbortError'
    ) {
      // Only the fixed local validation messages above are returned verbatim.
      if (error.message.startsWith('Use ') || error.message.startsWith('Choose '))
        return res.status(400).json({ error: error.message });
    }
    return res.status(502).json({
      error:
        'Jev could not complete this evaluation. Try again in a moment, or use the library locally.',
    });
  }
}
