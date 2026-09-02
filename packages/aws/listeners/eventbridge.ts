import type { Event, Listener, ListenerResult } from "@hooksmith/core";
import {
  EventBridgeClient,
  type EventBridgeClientConfig,
  PutEventsCommand,
  type PutEventsCommandOutput,
  type PutEventsRequestEntry,
} from "@aws-sdk/client-eventbridge";
import { stringifyPayload } from "../shared/payload.ts";
import { resolve, type ValueOrFactory } from "../shared/value.ts";

export interface EventBridgeClientLike {
  send(command: PutEventsCommand): Promise<PutEventsCommandOutput>;
}

export interface PutEventBridgeEventOptions<TEvent extends Event = Event> {
  eventBusName?: ValueOrFactory<string, TEvent>;
  source?: ValueOrFactory<string, TEvent>;
  detailType?: ValueOrFactory<string, TEvent>;
  detail?: ValueOrFactory<unknown, TEvent>;
  entry?: ValueOrFactory<
    Omit<
      PutEventsRequestEntry,
      "EventBusName" | "Source" | "DetailType" | "Detail"
    >,
    TEvent
  >;
  client?: EventBridgeClientLike;
  clientConfig?: EventBridgeClientConfig;
}

export function putEventBridgeEvent<TEvent extends Event = Event>(
  options: PutEventBridgeEventOptions<TEvent> = {},
): Listener<TEvent> {
  const client = options.client ?? new EventBridgeClient(options.clientConfig ?? {});

  return {
    name: "aws-eventbridge-put-event",
    async run(event, context): Promise<ListenerResult> {
      const nativeEntry = options.entry === undefined
        ? {}
        : await resolve(options.entry, event, context);
      const source = options.source === undefined
        ? event.source.id ?? event.source.kind
        : await resolve(options.source, event, context);
      const detailType = options.detailType === undefined
        ? event.type
        : await resolve(options.detailType, event, context);
      const detail = options.detail === undefined
        ? event.data
        : await resolve(options.detail, event, context);
      const eventBusName = options.eventBusName === undefined
        ? undefined
        : await resolve(options.eventBusName, event, context);

      const response = await client.send(new PutEventsCommand({
        Entries: [{
          ...nativeEntry,
          EventBusName: eventBusName,
          Source: source,
          DetailType: detailType,
          Detail: stringifyPayload(detail),
        }],
      }));

      const entry = response.Entries?.[0];
      const success = (response.FailedEntryCount ?? 0) === 0 &&
        entry?.ErrorCode === undefined;

      return {
        success,
        message: success
          ? "EventBridge event published."
          : `EventBridge event failed: ${entry?.ErrorCode ?? "unknown error"}`,
        data: {
          eventId: entry?.EventId,
          errorCode: entry?.ErrorCode,
          errorMessage: entry?.ErrorMessage,
        },
      };
    },
  };
}
