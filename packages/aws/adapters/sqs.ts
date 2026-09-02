import type { EventDocument } from "@hooksmith/core";
import { parseEventDocument, parsePayload } from "../shared/payload.ts";

export interface SqsMessage {
  messageId: string;
  body: string;
  receiptHandle?: string;
  attributes?: Record<string, string>;
  messageAttributes?: Record<string, unknown>;
  eventSourceARN?: string;
  awsRegion?: string;
}

export function fromSqs<TData = unknown>(
  message: SqsMessage,
): EventDocument<TData> {
  const timestamp = resolveTimestamp(message.attributes?.SentTimestamp);

  return {
    type: "aws.sqs.message",
    timestamp,
    source: {
      kind: "aws.sqs",
      id: message.eventSourceARN,
    },
    subject: {
      kind: "aws.sqs.message",
      id: message.messageId,
    },
    metadata: compact({
      receiptHandle: message.receiptHandle,
      attributes: message.attributes,
      messageAttributes: message.messageAttributes,
      awsRegion: message.awsRegion,
    }),
    data: parsePayload(message.body) as TData,
  };
}

export function fromSqsRaw<TData = unknown>(
  message: Pick<SqsMessage, "body">,
): EventDocument<TData> {
  return parseEventDocument<TData>(message.body);
}

function resolveTimestamp(sentTimestamp: string | undefined): string {
  if (sentTimestamp !== undefined) {
    const milliseconds = Number(sentTimestamp);
    if (Number.isFinite(milliseconds)) {
      try {
        return Temporal.Instant.fromEpochMilliseconds(milliseconds).toString();
      } catch {
        // Fall back to the receive time for invalid or out-of-range timestamps.
      }
    }
  }

  return Temporal.Now.instant().toString();
}

function compact(
  values: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const entries = Object.entries(values).filter(([, value]) =>
    value !== undefined
  );
  return entries.length === 0 ? undefined : Object.fromEntries(entries);
}
