import type { Event } from "@hooksmith/core";
import { hydrateEvent, type Runtime } from "@hooksmith/runtime";
import type { EventProcessor } from "./types.ts";

export function createProcessor<TData = unknown>(
  runtime: Runtime<Event<TData>>,
): EventProcessor<TData> {
  return (document) =>
    Promise.resolve().then(() => runtime.process(hydrateEvent(document)));
}
