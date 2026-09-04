import type { Context, Event, EventEnrichment } from "@hooksmith/core";

/** Maps an AWS service response to Hooksmith event enrichment. */
export type AwsEnrichmentMap<TEvent extends Event, TResponse> = (
  event: TEvent,
  response: TResponse,
  context: Context,
) => EventEnrichment | Promise<EventEnrichment>;
