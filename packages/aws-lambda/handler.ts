import type { Event, EventDocument } from "@hooksmith/core";
import { hydrateEvent, type RunReport, type Runtime } from "@hooksmith/runtime";

export type LambdaHandler<TData = unknown> = (
  event: EventDocument<TData>,
) => Promise<RunReport>;

export function createLambdaHandler<TData = unknown>(
  runtime: Runtime<Event<TData>>,
): LambdaHandler<TData> {
  return async (document) => await runtime.process(hydrateEvent(document));
}
