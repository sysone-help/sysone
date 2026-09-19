import { SysoneError } from '../errors.js';
import { record, validateAnswer } from '../validation.js';
import type { Answer, EvaluationModel } from '../types.js';

export interface TypeSafeOptions {
  readonly apiKey?: string;
  readonly fetch?: typeof globalThis.fetch;
}

/** Access Jev through TypeSafe's native System One endpoint. */
export function typesafe(modelId = 'jev-latest', options: TypeSafeOptions = {}): EvaluationModel {
  return {
    provider: 'typesafe',
    modelId,
    async evaluate(request, call = {}) {
      const apiKey =
        options.apiKey ??
        (typeof process !== 'undefined' ? process.env.TYPESAFE_API_KEY : undefined);
      if (!apiKey)
        throw new SysoneError(
          'Set TYPESAFE_API_KEY or pass apiKey to typesafe().',
          'CONFIGURATION',
        );
      const questions = Object.fromEntries(
        Object.entries(request.questions).map(([id, q]) => [
          id,
          { ...q, type: q.type === 'boolean' ? 'noul' : q.type },
        ]),
      );
      let response: Response;
      try {
        response = await (options.fetch ?? globalThis.fetch)(
          'https://api.typesafe.ai/v1/systemone',
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: modelId, state: request.state, questions }),
            signal: call.signal,
          },
        );
      } catch {
        call.signal?.throwIfAborted();
        throw new SysoneError(
          'Could not reach TypeSafe. Check your connection and try again.',
          'PROVIDER_ERROR',
        );
      }
      if (!response.ok)
        throw new SysoneError(`TypeSafe returned HTTP ${response.status}.`, 'PROVIDER_ERROR');
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw new SysoneError('TypeSafe returned invalid JSON.', 'INVALID_RESPONSE');
      }
      if (!record(body) || !record(body.answers))
        throw new SysoneError('TypeSafe returned an invalid evaluation.', 'INVALID_RESPONSE');
      const answers: Record<string, Answer> = Object.fromEntries(
        Object.entries(body.answers).map(([id, value]) => {
          if (!record(value))
            throw new SysoneError('TypeSafe returned an invalid answer.', 'INVALID_RESPONSE');
          const question = request.questions[id];
          if (!Object.hasOwn(request.questions, id) || !question)
            throw new SysoneError('TypeSafe returned an unexpected question.', 'INVALID_RESPONSE');
          const answer =
            value.type === 'noul' ? { type: 'boolean', probability: value.noul } : value;
          validateAnswer(answer, question, 2, 2);
          return [id, answer];
        }),
      );
      const usage = record(body.usage) ? body.usage : undefined;
      return {
        answers,
        metadata: {
          provider: 'typesafe',
          requestedModel: modelId,
          ...(typeof body.model === 'string' ? { resolvedModel: body.model } : {}),
          ...(typeof body.id === 'string' ? { requestId: body.id } : {}),
          rounding: { probabilityDecimals: 2, scoreDecimals: 2 },
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
