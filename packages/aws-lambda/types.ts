import type { EventDocument } from "@hooksmith/core";
import type { RunReport } from "@hooksmith/runtime";

export type EventProcessor<TData = unknown> = (
  event: EventDocument<TData>,
) => Promise<RunReport>;

export type EventReader<TInput, TData = unknown> = (
  input: TInput,
) => EventDocument<TData> | Promise<EventDocument<TData>>;

export type LambdaHandler<TInput, TOutput> = (
  input: TInput,
) => Promise<TOutput>;
