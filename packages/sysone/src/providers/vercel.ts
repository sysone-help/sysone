import { createGateway } from '@ai-sdk/gateway';
import { experimental_evaluate } from 'ai';
import { SysoneError } from '../errors.js';
import { record } from '../validation.js';
import type { EvaluationProvider } from '../types.js';

export interface VercelOptions {
  readonly apiKey?: string;
  readonly fetch?: typeof globalThis.fetch;
}

/** Access an evaluation model through Vercel AI Gateway. Requires optional AI SDK peers. */
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
      const gateway = createGateway({ apiKey, fetch: options.fetch });
      try {
        const result = await experimental_evaluate({
          model: gateway.evaluationModel(request.model),
          state: request.state,
          questions: request.questions,
          abortSignal: call.signal,
          maxRetries: 0,
        });
        return {
          answers: result.answers,
          metadata: {
            provider: 'vercel',
            requestedModel: request.model,
            // Gateway may echo the requested alias. Do not claim that it is a resolved version.
            ...(result.response.modelId && result.response.modelId !== request.model
              ? { resolvedModel: result.response.modelId }
              : {}),
            ...(result.response.id ? { requestId: result.response.id } : {}),
            usage: result.usage,
            rounding: result.rounding,
            ...(result.providerMetadata ? { providerMetadata: result.providerMetadata } : {}),
          },
        };
      } catch (error) {
        call.signal?.throwIfAborted();
        if (error instanceof SysoneError) throw error;
        const status =
          record(error) && typeof error.statusCode === 'number' ? error.statusCode : undefined;
        // SDK errors may embed request headers and user input. Keep public errors sanitized.
        throw new SysoneError(
          status
            ? `Vercel AI Gateway returned HTTP ${status}.`
            : 'Vercel AI Gateway could not complete a valid evaluation.',
          'PROVIDER_ERROR',
        );
      }
    },
  };
}
