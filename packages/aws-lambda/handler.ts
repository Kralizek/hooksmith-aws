import type { Event, EventDocument } from "@hooksmith/core";
import { hydrateEvent, type RunReport, type Runtime } from "@hooksmith/runtime";

export type Processor<TData = unknown> = (
  event: EventDocument<TData>,
) => Promise<RunReport>;

export type Handler<TData = unknown> = Processor<TData>;

export function createProcessor<TData = unknown>(
  runtime: Runtime<Event<TData>>,
): Processor<TData> {
  return (document) =>
    Promise.resolve().then(() => runtime.process(hydrateEvent(document)));
}

export function createHandler<TData = unknown>(
  processor: Processor<TData>,
): Handler<TData> {
  return processor;
}
