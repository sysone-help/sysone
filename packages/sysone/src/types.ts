export type Json =
  string | number | boolean | null | { readonly [key: string]: Json } | readonly Json[];
export type Input = string | { readonly [key: string]: Json } | readonly Json[];

export interface Predicate {
  readonly type: 'boolean';
  readonly instructions: string;
  readonly criteria?: { readonly true: string; readonly false: string };
}
export interface Classifier<Key extends string = string> {
  readonly type: 'choice';
  readonly instructions: string;
  readonly criteria: Readonly<Record<Key, string>>;
}
export interface Rubric {
  readonly type: 'score';
  readonly instructions: string;
  readonly criteria: readonly string[];
}
export type Question = Predicate | Classifier | Rubric;
export type Questions = Readonly<Record<string, Question>>;
export interface BooleanAnswer {
  readonly type: 'boolean';
  readonly probability: number;
}
export interface ChoiceAnswer<Key extends string = string> {
  readonly type: 'choice';
  readonly choice: Key;
  readonly probabilities?: Readonly<Record<Key, number>>;
  readonly confidence?: number;
}
export interface ScoreAnswer {
  readonly type: 'score';
  readonly score: number;
  readonly probabilities?: Readonly<Record<string, number>>;
  readonly confidence?: number;
}
export type Answer = BooleanAnswer | ChoiceAnswer | ScoreAnswer;
export type AnswerFor<Q extends Question> = Q extends Predicate
  ? BooleanAnswer
  : Q extends Classifier<infer Key>
    ? ChoiceAnswer<Key>
    : ScoreAnswer;
export type AnswersFor<Q extends Questions> = { readonly [Key in keyof Q]: AnswerFor<Q[Key]> };
export interface EvaluationMetadata {
  readonly provider: string;
  readonly requestedModel: string;
  /** Unmodified, namespaced metadata returned by the provider. */
  readonly providerMetadata?: Readonly<Record<string, unknown>>;
  readonly resolvedModel?: string;
  readonly requestId?: string;
  readonly usage?: { readonly inputTokens?: number; readonly outputTokens?: number };
  readonly rounding?: { readonly probabilityDecimals?: number; readonly scoreDecimals?: number };
}
export interface EvaluationRequest {
  /** Opaque model identifier in this provider's catalog. */
  readonly model: string;
  readonly state: Input;
  readonly questions: Questions;
}
export interface EvaluationResult<Q extends Questions = Questions> {
  readonly answers: AnswersFor<Q>;
  readonly metadata: EvaluationMetadata;
}
export interface CallOptions {
  readonly signal?: AbortSignal;
}
export interface EvaluationProvider {
  /** Identifies the transport or endpoint, independently of the selected model. */
  readonly id: string;
  evaluate(request: EvaluationRequest, options?: CallOptions): Promise<EvaluationResult>;
}
export interface CheckOptions extends CallOptions {
  readonly minProbability?: number;
}
export interface CheckResult extends BooleanAnswer {
  readonly decision: 'yes' | 'no' | 'uncertain';
  readonly metadata: EvaluationMetadata;
}
export interface CollectionOptions<T> extends CheckOptions {
  readonly select?: (item: T) => Input;
  readonly concurrency?: number;
}
export interface Partition<T> {
  readonly yes: T[];
  readonly no: T[];
  readonly uncertain: T[];
}
export interface Ranked<T> {
  readonly item: T;
  readonly score: number;
  readonly answer: ScoreAnswer;
  readonly metadata: EvaluationMetadata;
}
