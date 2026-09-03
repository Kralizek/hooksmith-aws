import type { EventDocument } from "@hooksmith/core";

/** AWS EventBridge event shape adapted into a Hooksmith event document. */
export interface EventBridgeEvent<TDetail = unknown> {
  version: string;
  id: string;
  "detail-type": string;
  source: string;
  account: string;
  time: string;
  region: string;
  resources: string[];
  detail: TDetail;
}

export function fromEventBridge<TData = unknown>(
  event: EventBridgeEvent<TData>,
): EventDocument<TData> {
  return {
    type: event["detail-type"],
    timestamp: Temporal.Instant.from(event.time).toString(),
    source: {
      kind: "aws.eventbridge",
      id: event.source,
    },
    metadata: {
      id: event.id,
      version: event.version,
      account: event.account,
      region: event.region,
      resources: event.resources,
    },
    data: event.detail,
  };
}
