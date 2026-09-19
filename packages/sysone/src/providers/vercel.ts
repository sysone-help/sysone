import { SysoneError } from '../errors.js';
import { validateResult } from '../validation.js';
import type { EvaluationProvider } from '../types.js';
import { postJson } from './http.js';

export interface VercelOptions {
  readonly apiKey?: string;
  readonly fetch?: typeof globalThis.fetch;
}

/** Access Vercel's evaluation protocol directly with native fetch. */
export function vercel(options: VercelOptions = {}): EvaluationProvider {
  return {
    id: 'vercel',
    async evaluate(request, call = {}) {
      const apiKey =
        options.apiKey ??
        (typeof process !== 'undefined' ? process.env.AI_GATEWAY_API_KEY : undefined);
      if (!apiKey)
        throw new SysoneError(
          'Set AI_GATEWAY_API_KEY or pass apiKey to vercel().',
          'CONFIGURATION',
        );
      const { body, response } = await postJson(
        'https://ai-gateway.vercel.sh/v4/ai/evaluation-model',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'ai-gateway-protocol-version': '0.0.1',
            'ai-gateway-auth-method': 'api-key',
            'ai-evaluation-model-specification-version': '4',
            'ai-model-id': request.model,
          },
          body: JSON.stringify({ state: request.state, questions: request.questions }),
          signal: call.signal,
        },
        options.fetch ?? globalThis.fetch,
      );
      const requestId = response.headers.get('x-request-id');
      const result = {
        answers: body.answers,
        metadata: {
          provider: 'vercel',
          requestedModel: request.model,
          // The protocol does not provide a distinct resolved model version.
          ...(requestId ? { requestId } : {}),
          ...(body.usage !== undefined ? { usage: body.usage } : {}),
          ...(body.rounding !== undefined ? { rounding: body.rounding } : {}),
          ...(body.providerMetadata !== undefined
            ? { providerMetadata: body.providerMetadata }
            : {}),
        },
      };
      validateResult(result, request.questions);
      return result;
    },
  };
}
