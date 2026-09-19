import { createGateway } from '@ai-sdk/gateway';
import { experimental_evaluate } from 'ai';
import { SysoneError } from '../errors.js';
import { record } from '../validation.js';
import type { Answer, EvaluationModel } from '../types.js';

export interface VercelOptions {
  readonly apiKey?: string;
  readonly fetch?: typeof globalThis.fetch;
}

/** Access an evaluation model through Vercel AI Gateway. Requires optional AI SDK peers. */
export function vercel(modelId = 'typesafe-ai/jev', options: VercelOptions = {}): EvaluationModel {
  return {
    provider: 'vercel',
    modelId,
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
          model: gateway.evaluationModel(modelId),
          state: request.state,
          questions: request.questions,
          abortSignal: call.signal,
          maxRetries: 0,
        });
        const native = result.providerMetadata?.typesafe;
        const confidence =
          record(native) && record(native.confidence) ? native.confidence : undefined;
        const answers = Object.fromEntries(
          Object.entries(result.answers).map(([id, answer]) => [
            id,
            {
              ...answer,
              ...(answer.type !== 'boolean' && typeof confidence?.[id] === 'number'
                ? { confidence: confidence[id] }
                : {}),
            },
          ]),
        ) as Record<string, Answer>;
        return {
          answers,
          metadata: {
            provider: 'vercel',
            requestedModel: modelId,
            // Gateway may echo the requested alias. Do not claim that it is a resolved version.
            ...(result.response.modelId && result.response.modelId !== modelId
              ? { resolvedModel: result.response.modelId }
              : {}),
            ...(result.response.id ? { requestId: result.response.id } : {}),
            usage: result.usage,
            rounding: result.rounding,
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
