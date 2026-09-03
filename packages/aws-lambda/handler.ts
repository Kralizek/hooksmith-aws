import type { EventDocument } from "@hooksmith/core";
import type { RunReport } from "@hooksmith/runtime";
import type { EventProcessor, LambdaHandler } from "./types.ts";

export function createHandler<TData = unknown>(
  processor: EventProcessor<TData>,
): LambdaHandler<EventDocument<TData>, RunReport> {
  return processor;
}
