import type { EventDocument } from "@hooksmith/core";
import type { RunReport } from "@hooksmith/runtime";

/** Processes a Hooksmith event document through a reusable runtime. */
export type EventProcessor<TData = unknown> = (
  event: EventDocument<TData>,
) => Promise<RunReport>;

/** Adapts an AWS input value into a Hooksmith event document. */
export type EventReader<TInput, TData = unknown> = (
  input: TInput,
) => EventDocument<TData> | Promise<EventDocument<TData>>;

/** Minimal asynchronous AWS Lambda handler contract. */
export type LambdaHandler<TInput, TOutput> = (
  input: TInput,
) => Promise<TOutput>;
