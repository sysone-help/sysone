import { SysoneError } from '../errors.js';
import { record } from '../validation.js';

/** One request, with sanitized failures and the original cancellation reason. */
export async function postJson(url: string, init: RequestInit, fetch: typeof globalThis.fetch) {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    init.signal?.throwIfAborted();
    throw new SysoneError('Could not reach the evaluation provider.', 'PROVIDER_ERROR');
  }
  if (!response.ok)
    throw new SysoneError(
      `Evaluation provider returned HTTP ${response.status}.`,
      'PROVIDER_ERROR',
    );
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    init.signal?.throwIfAborted();
    throw new SysoneError('Evaluation provider returned invalid JSON.', 'INVALID_RESPONSE');
  }
  if (!record(body))
    throw new SysoneError('Evaluation provider returned an invalid response.', 'INVALID_RESPONSE');
  return { body, response };
}
