import { SysoneError } from '../errors.js';
import { record, validateAnswer } from '../validation.js';
import type { Answer, EvaluationMetadata, EvaluationProvider } from '../types.js';

export interface SystemOneOptions {
  /** API base including its version, e.g. http://localhost:8080/v1. */
  readonly baseURL: string;
  readonly apiKey?: string;
  readonly headers?: HeadersInit;
  readonly fetch?: typeof globalThis.fetch;
  /** Identifies this endpoint in metadata, not a model or model author. */
  readonly id?: string;
  /** Only declare rounding documented by the server. Values are never rounded locally. */
  readonly rounding?: EvaluationMetadata['rounding'];
}

/** Experimental transport for servers implementing the System One HTTP protocol. */
export function systemOne(options: SystemOneOptions): EvaluationProvider {
  let endpoint: URL;
  try {
    endpoint = new URL(options.baseURL);
    if (
      !['http:', 'https:'].includes(endpoint.protocol) ||
      endpoint.username ||
      endpoint.password ||
      endpoint.search ||
      endpoint.hash
    )
      throw new Error();
    endpoint.pathname = endpoint.pathname.replace(/\/+$/, '') + '/systemone';
  } catch {
    throw new SysoneError(
      'baseURL must be an HTTP(S) API base without credentials, query or fragment.',
      'CONFIGURATION',
    );
  }
  const id = options.id ?? 'system-one';
  return {
    id,
    async evaluate(request, call = {}) {
      const headers = new Headers(options.headers);
      headers.set('Content-Type', 'application/json');
      if (options.apiKey) headers.set('Authorization', `Bearer ${options.apiKey}`);
      const questions = Object.fromEntries(
        Object.entries(request.questions).map(([id, q]) => [
          id,
          { ...q, type: q.type === 'boolean' ? 'noul' : q.type },
        ]),
      );
      let response: Response;
      try {
        response = await (options.fetch ?? globalThis.fetch)(endpoint.href, {
          method: 'POST',
          headers,
          body: JSON.stringify({ model: request.model, state: request.state, questions }),
          signal: call.signal,
        });
      } catch {
        call.signal?.throwIfAborted();
        throw new SysoneError(
          'Could not reach the evaluation server. Check your connection and try again.',
          'PROVIDER_ERROR',
        );
      }
      if (!response.ok)
        throw new SysoneError(
          `The evaluation server returned HTTP ${response.status}.`,
          'PROVIDER_ERROR',
        );
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        call.signal?.throwIfAborted();
        throw new SysoneError('The evaluation server returned invalid JSON.', 'INVALID_RESPONSE');
      }
      if (!record(body) || !record(body.answers))
        throw new SysoneError(
          'The evaluation server returned an invalid evaluation.',
          'INVALID_RESPONSE',
        );
      const answers: Record<string, Answer> = Object.fromEntries(
        Object.entries(body.answers).map(([id, value]) => {
          if (!record(value))
            throw new SysoneError(
              'The evaluation server returned an invalid answer.',
              'INVALID_RESPONSE',
            );
          const question = request.questions[id];
          if (!Object.hasOwn(request.questions, id) || !question)
            throw new SysoneError(
              'The evaluation server returned an unexpected question.',
              'INVALID_RESPONSE',
            );
          const answer =
            value.type === 'noul' ? { type: 'boolean', probability: value.noul } : value;
          validateAnswer(
            answer,
            question,
            options.rounding?.probabilityDecimals,
            options.rounding?.scoreDecimals,
          );
          return [id, answer];
        }),
      );
      const usage = record(body.usage) ? body.usage : undefined;
      const requestId =
        typeof body.id === 'string'
          ? body.id
          : (response.headers.get('x-request-id') ?? response.headers.get('x-typesafe-request-id'));
      return {
        answers,
        metadata: {
          provider: id,
          requestedModel: request.model,
          ...(typeof body.model === 'string' ? { resolvedModel: body.model } : {}),
          ...(requestId ? { requestId } : {}),
          ...(options.rounding ? { rounding: options.rounding } : {}),
          ...(usage
            ? {
                usage: {
                  ...(typeof usage.input_tokens === 'number'
                    ? { inputTokens: usage.input_tokens }
                    : {}),
                  ...(typeof usage.output_tokens === 'number'
                    ? { outputTokens: usage.output_tokens }
                    : {}),
                },
              }
            : {}),
        },
      };
    },
  };
}
